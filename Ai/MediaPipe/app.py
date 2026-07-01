# app.py - WareLens AI 3D 체형 분석 및 고정밀 가상 피팅 통합 서버
# ================================================================
# 코드 배치 순서 및 변수 정의 시점을 완벽하게 교정한 최종 배포본입니다.
# 
# [실행 방법]
#     pip install -r requirements.txt
#     uvicorn app:app --host 0.0.0.0 --port 8002

import os
import sys
import io
import logging
import base64
import cv2
import numpy as np
import torch
from contextlib import asynccontextmanager
from fastapi import FastAPI, File, Form, UploadFile, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# 프로젝트 내 의존성 AI 컴포넌트 패키지 매핑
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from core.analyzer.pipeline import BodyAnalyzerPipeline
from core.analyzer.recommender import StandardSizeRecommender
from core.generator.run_catvton import CatVtonEngine

# ----------------------------------------------------------
# 1. 로깅 및 전역 세션 캐시 초기화
# ----------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

_state = {
    "initialized": False,
    "analyzer_pipeline": None,
    "catvton_engine": None
}

USER_CACHE = {}


# ----------------------------------------------------------
# 2. 커스텀 예외 클래스 선언
# ----------------------------------------------------------
class EngineError(Exception):
    """자바 백엔드 표준 규격 연동을 위한 전역 핵심 에러 객체"""
    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message
        super().__init__(message)


# ----------------------------------------------------------
# 3. 서버 시작/종료 이벤트 관리 (FastAPI Lifespan 패턴)
# ----------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """서버 부팅 시 무거운 AI 모델 가중치들을 VRAM 메모리에 선행 적재합니다."""
    logger.info("서버 시작 중 - 듀얼 트랙 AI 코어 메모리 적재 가동...")
    try:
        # Track A: 체형 분석 가중치 초기화
        logger.info("[Lifespan] Loading Track A: MediaPipe Real-World 3D pipeline...")
        _state["analyzer_pipeline"] = BodyAnalyzerPipeline(model_path="models/pose_landmarker_heavy.task")
        
        # Track B: 가상 피팅 가중치 초기화
        logger.info("[Lifespan] Loading Track B: SegFormer & Official CatVTON pipeline...")
        _state["catvton_engine"] = CatVtonEngine()
        
        _state["initialized"] = True
        logger.info("초기화 완료 - 듀얼 트랙 AI 핵심 코어가 요청을 처리할 준비가 되었습니다.")
    except Exception as e:
        logger.error(f"AI 인프라 부팅 초기화 단계 치명적 크래시: {str(e)}")
        raise RuntimeError(f"AI Core initialization failed: {str(e)}")

    yield  # 서버 활성화 상태 유지 (요청 대기)

    logger.info("서버 종료 중 - 인메모리 세션 캐시 및 GPU 자원 반환...")
    USER_CACHE.clear()


# ----------------------------------------------------------
# 4. [교정 핵심] FastAPI 인스턴스 조기 생성 (데코레이터 에러 방지)
# ----------------------------------------------------------
app = FastAPI(
    title="WareLens AI 체형 분석 및 고정밀 가상 피팅 API",
    description="3D 입체 체형 실측 규격 추천 및 오피셜 CatVTON 기반 가상 피팅 엔진",
    version="3.1.0",
    lifespan=lifespan  # 생성자 단계에서 Lifespan 매니저 바인딩
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------------------------------------------------
# 5. 전역 예외 핸들러 바인딩 (app이 상단에 정의되어 이제 에러 없음)
# ----------------------------------------------------------
@app.exception_handler(EngineError)
async def engine_error_handler(request, exc: EngineError):
    """비전 분석 실패 피드백 코드를 표준 JSON 포맷으로 가로챕니다."""
    logger.warning(f"EngineError 발생: [{exc.code}] {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error_code": exc.code,
            "message": exc.message,
        },
    )


# ----------------------------------------------------------
# 6. 헬스체크 엔드포인트
# ----------------------------------------------------------
@app.get(
    "/health",
    summary="헬스체크 및 모델 모니터링",
    description="AI 가중치 모델들이 GPU 메모리에 안전하게 적재되어 작동 가능한 상태인지 관제합니다.",
    tags=["관리"],
)
async def health_check():
    return {
        "status": "ok",
        "initialized": _state["initialized"],
        "gpu_available": torch.cuda.is_available()
    }


# ----------------------------------------------------------
# 7. Track A: 체형 분석 및 사이즈 추천 엔드포인트
# ----------------------------------------------------------
@app.post(
    "/api/v1/analyze/body",
    summary="3D 부피 기반 체형 실측 및 KS 규격 사이즈 추천",
    description="정면 전신 사진과 키를 기반으로 가슴둘레와 두께를 실측하고 세션 캐시를 적재합니다.",
    tags=["체형 분석"],
)
async def analyze_body(
    user_id: str = Form(..., description="유저 고유 ID 식별자 (가상 피팅 연계 매핑 키)", examples=["1차테스트"]),
    height_cm: float = Form(..., description="사용자 실제 키 (cm 단위, 스케일 보정 기준점)", examples=[175.0]),
    gender: str = Form(..., description="사용자 성별 (MALE / FEMALE)", examples=["MALE"]),
    file: UploadFile = File(..., description="사용자 정면 전신 사진 원본 파일")
):
    if not _state["initialized"]:
        raise EngineError(status_code=503, code="NOT_INITIALIZED", message="AI 분석 코어가 아직 메모리에 로드되지 않았습니다.")

    try:
        image_bytes = await file.read()
        
        # 3D 부피 연산 파이프라인 구동
        pipeline_result = _state["analyzer_pipeline"].run(image_bytes=image_bytes, actual_height_cm=height_cm)
        
        if not pipeline_result.get("success"):
            raise EngineError(
                status_code=422,
                code="BODY_NOT_DETECTED",
                message=pipeline_result.get("error_message", "사진에서 신체 윤곽 정보를 검출하는 데 실패했습니다.")
            )
            
        origin_cv_img = pipeline_result.get("origin_cv_img")
        if origin_cv_img is None:
            nparr = np.frombuffer(image_bytes, np.uint8)
            origin_cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # [실제 프로젝트 코드 동기화] 인메모리 유저 캐시 매핑 적재
        USER_CACHE[user_id] = {
            "origin_cv_img": origin_cv_img
        }
        
        # 대한민국 국가 표준 KS 호칭 매칭 엔진 실행
        recommender = StandardSizeRecommender(
            height_cm=height_cm,
            measurements_cm=pipeline_result["measurements_cm"],
            gender=gender
        )
        size_recommendation = recommender.recommend()

        annotated_b64 = pipeline_result.get("annotated_image_base64")
        if not annotated_b64:
            _, buffer = cv2.imencode('.jpg', origin_cv_img)
            annotated_b64 = base64.b64encode(buffer).decode('utf-8')
        
        logger.info(f"체형 분석 및 사이즈 실측 성공 완료 - 세션 생성 [ID: {user_id}]")
        return {
            "status": "SUCCESS",
            "data": {
                "user_id": user_id,
                "annotated_image_base64": annotated_b64,
                "size_analysis": size_recommendation
            }
        }
    except EngineError:
        raise
    except Exception as e:
        logger.error(f"체형 실측 프로세스 도중 내부 심각한 추론 크래시 발생: {str(e)}")
        raise EngineError(status_code=500, code="ANALYSIS_CRASH", message=f"신체 부피 실측 시스템 에러: {str(e)}")


# ----------------------------------------------------------
# 8. Track B: 고정밀 가상 피팅 엔드포인트
# ----------------------------------------------------------
@app.post(
    "/api/v1/tryon",
    summary="오피셜 CatVTON 기반 왜곡 보정형 고정밀 가상 착장",
    description="선행 적재 완료된 유저 캐시 키를 매핑하여 주입된 상의 의류를 자연스럽게 합성합니다.",
    tags=["가상 피팅"],
)
async def execute_virtual_tryon(
    user_id: str = Form(..., description="체형 분석 완료 후 세션 캐시가 확보된 유저 고유 ID", examples=["1차테스트"]),
    garment_file: UploadFile = File(None, description="피팅해볼 상의 의류 사진 파일 (직접 업로드용)"),
    garment_name: str = Form(None, description="CLIP 기추천 저장소 연계 파일명 (예: 15970.jpg)")
):
    if not _state["initialized"]:
        raise EngineError(status_code=503, code="NOT_INITIALIZED", message="가상 피팅 추론 파이프라인이 로드되지 않았습니다.")
        
    if user_id not in USER_CACHE:
        raise EngineError(
            status_code=400,
            code="CACHE_NOT_FOUND",
            message=f"유저 '{user_id}'의 데이터가 만료되었거나 부재합니다. API 1번을 선행하세요."
        )
        
    if not garment_file and not garment_name:
        raise EngineError(status_code=400, code="EMPTY_GARMENT_SOURCE", message="합성 대상 의류 바이트 소스를 감지하지 못했습니다.")
        
    try:
        logger.info(f"가상 피팅 요청 수신 - 인메모리 매핑 타겟 세션 탐색: {user_id}")
        cached_data = USER_CACHE[user_id]
        origin_cv_img = cached_data["origin_cv_img"]
        
        if garment_file:
            garment_bytes = await garment_file.read()
        else:
            clip_dataset_path = os.path.join("..", "Clip", "fashion_dataset", garment_name)
            if not os.path.exists(clip_dataset_path):
                raise EngineError(status_code=404, code="GARMENT_FILE_LOST", message=f"데이터셋 저장소 내에 파일({garment_name})이 유실되었습니다.")
            with open(clip_dataset_path, "rb") as f:
                garment_bytes = f.read()
                
        logger.info("[Try-On Route] 실제 run_catvton 인터페이스 기반 가상 착장 추론 위임")
        
        # [연동 보정 완료] 실제 run_catvton.py 명세에 맞춰 2개의 인자만 정확하게 매핑
        tryon_base64 = _state["catvton_engine"].execute_tryon(
            garment_bytes=garment_bytes,
            origin_cv_img=origin_cv_img
        )
        
        logger.info(f"가상 피팅 이미지 융합 완료 - 결과 스트림 반환 [유저: {user_id}]")
        return {
            "status": "SUCCESS",
            "data": {
                "tryon_image_base64": tryon_base64
            }
        }
    except EngineError:
        raise
    except Exception as e:
        logger.error(f"가상 피팅 확산 연산 중 내부 파이프라인 크래시: {str(e)}")
        raise EngineError(status_code=500, code="TRYON_INFERENCE_FAILED", message=f"가상 피팅 메인 추론 코어 오퍼레이션 크래시: {str(e)}")


# ----------------------------------------------------------
# 직접 구동 스크립트 구성 (python app.py)
# ----------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8002,
        reload=False  # 무거운 딥러닝 가중치 파일의 이중 적재 및 메모리 누수 방지
    )
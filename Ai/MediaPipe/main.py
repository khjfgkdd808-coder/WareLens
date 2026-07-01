# main.py
import os
import sys
import logging
import base64
import cv2
import numpy as np
from fastapi import FastAPI, File, Form, UploadFile, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("WareLensAI")

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from core.analyzer.pipeline import BodyAnalyzerPipeline
from core.analyzer.recommender import StandardSizeRecommender
from core.generator.run_catvton import CatVtonEngine  # [수정] 누락된 코어 가상피팅 엔진 연동

app = FastAPI(title="WareLens AI Integrated Engine", version="3.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

USER_CACHE = {}

# 전역 싱글톤 인프라 인스턴스 초기화 선언
analyzer_pipeline = None
catvton_engine = None

@app.on_event("startup")
def startup_event():
    """서버 기동 시 한 번에 모든 AI 가중치를 메모리에 적재하여 에러를 방지합니다."""
    global analyzer_pipeline, catvton_engine
    try:
        logger.info("서버 부팅 중: MediaPipe 체형 분석 모델 로드...")
        analyzer_pipeline = BodyAnalyzerPipeline(model_path="models/pose_landmarker_heavy.task")
        
        logger.info("서버 부팅 중: SegFormer + 공식 CatVTON 파이프라인 적재...")
        catvton_engine = CatVtonEngine()  # [수정] 정상적으로 싱글톤 스냅샷 활성화
        
        logger.info("🚀 듀얼 트랙(Track A & B) 통합 AI 코어 적재 완료.")
    except Exception as e:
        logger.exception("⚠️ 서버 부팅 단계 초기화 치명적 크래시 발생")

@app.post("/api/v1/analyze/body", summary="3D 부피 기반 체형 분석 및 캐시 적재 API")
async def analyze_body(
    user_id: str = Form(..., description="유저 고유 ID 식별자", examples=["1차테스트"]),
    height_cm: float = Form(..., description="사용자 키 (cm)", examples=[175.0]),
    gender: str = Form(..., description="사용자 성별 (MALE / FEMALE)", examples=["MALE"]),
    file: UploadFile = File(..., description="사용자 정면 전신 사진 원본")
):
    if analyzer_pipeline is None:
        raise HTTPException(status_code=503, detail="AI 체형 분석 엔진 인프라가 대기 상태가 아닙니다.")
        
    try:
        image_bytes = await file.read()
        pipeline_result = analyzer_pipeline.run(image_bytes=image_bytes, actual_height_cm=height_cm)
        
        if not pipeline_result.get("success"):
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={"status": "FAIL", "error_message": pipeline_result.get("error_message")}
            )
            
        origin_cv_img = pipeline_result.get("origin_cv_img")
        if origin_cv_img is None:
            nparr = np.frombuffer(image_bytes, np.uint8)
            origin_cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # [최적화] 대용량 바이너리 최소화 보존 캐싱 전략
        USER_CACHE[user_id] = {
            "origin_cv_img": origin_cv_img
        }
        
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
        
        return {
            "status": "SUCCESS",
            "data": {
                "user_id": user_id,
                "annotated_image_base64": annotated_b64,
                "size_analysis": size_recommendation
            }
        }
    except Exception as e:
        logger.exception("체형 분석 레이어 트랜잭션 에러")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/tryon", summary="오피셜 CatVTON 기반 초고속 가상 피팅 API")
async def execute_virtual_tryon(
    user_id: str = Form(..., description="체형 분석이 이미 처리된 유저 ID 식별자", examples=["1차테스트"]),
    garment_file: UploadFile = File(None, description="피팅해볼 상의 의류 사진 파일 (직접 업로드 시)"),
    garment_name: str = Form(None, description="CLIP 추천 파트 연계용 파일명 (예: 15970.jpg)")
):
    if catvton_engine is None:
        raise HTTPException(status_code=503, detail="오피셜 가상 피팅 연산 코어가 적재되지 않았습니다.")
        
    if user_id not in USER_CACHE:
        raise HTTPException(
            status_code=400,
            detail=f"유저 '{user_id}'의 데이터가 만료되었거나 부재합니다. API 1번을 선행하세요."
        )
        
    if not garment_file and not garment_name:
        raise HTTPException(status_code=400, detail="합성 대상 의류 바이트 소스를 감지하지 못했습니다.")
        
    try:
        logger.info(f"[Fast Try-On] 유저 {user_id} 세션 메모리 매핑 기동...")
        cached_data = USER_CACHE[user_id]
        origin_cv_img = cached_data["origin_cv_img"]  # [수정] 피팅 아키텍처에 랜드마크 의존성 제거
        
        if garment_file:
            garment_bytes = await garment_file.read()
        else:
            clip_dataset_path = os.path.join("..", "Clip", "fashion_dataset", garment_name)
            if not os.path.exists(clip_dataset_path):
                raise HTTPException(status_code=404, detail=f"데이터셋 저장소 내에 파일({garment_name})이 유실되었습니다.")
            with open(clip_dataset_path, "rb") as f:
                garment_bytes = f.read()
                
        logger.info("[Main API] 오리지널 CatVTON Core Engine 추론 연산 위임")
        
        # [수정] 순수 이미지 파싱(S->D) 구조로 파라미터 최적화 연동
        tryon_base64 = catvton_engine.execute_tryon(
            garment_bytes=garment_bytes,
            origin_cv_img=origin_cv_img
        )
        
        return {
            "status": "SUCCESS",
            "data": {
                "tryon_image_base64": tryon_base64
            }
        }
    except Exception as e:
        logger.exception("가상 피팅 메인 추론 코어 오퍼레이션 크래시")
        raise HTTPException(status_code=500, detail=str(e))
# app.py
import os  # 💡 로컬 파일 탐색을 위해 추가됨
import io
import logging
import base64
import cv2
import numpy as np
from contextlib import asynccontextmanager
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# 설정 관리자 임포트
from core.config import settings

# 💡 TODO: 향후 모듈화된 파이프라인으로 교체될 예정입니다.
from core.analyzer.pipeline import BodyAnalyzerPipeline
from core.analyzer.recommender import StandardSizeRecommender
from core.generator.run_catvton import CatVTONPipeline

# 로깅 설정
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# 임시 인메모리 스토리지 (실서비스 시 Redis 등으로 교체 권장)
SESSION_STORAGE = {}

class EngineError(Exception):
    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message

@asynccontextmanager
async def lifespan(app: FastAPI):
    """설정 관리자를 통해 안전하게 경로를 주입받아 모델을 로드합니다."""
    logger.info(f"🚀 AI Core 부팅 중... (Device: {settings.device})")
    try:
        # FastAPI의 전역 상태 객체(app.state)를 사용하여 스레드-안전하게 모델 보관
        app.state.analyzer = BodyAnalyzerPipeline(model_path=settings.pose_model_path)
        app.state.catvton = CatVTONPipeline() # 차후 리팩토링된 클래스로 변경될 예정
        logger.info("✅ 듀얼 트랙 AI 코어 메모리 적재 완료!")
    except Exception as e:
        logger.error(f"AI 초기화 실패: {e}")
        raise RuntimeError(f"AI Core initialization failed: {e}")

    yield 
    
    logger.info("🛑 서버 종료 중 - 자원 반환")
    SESSION_STORAGE.clear()

app = FastAPI(title="WareLens AI API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.exception_handler(EngineError)
async def engine_error_handler(request, exc: EngineError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error_code": exc.code, "message": exc.message},
    )

@app.get("/health")
async def health_check():
    return {"status": "ok", "target_resolution": f"{settings.target_width}x{settings.target_height}"}

@app.post("/api/v1/analyze/body")
async def analyze_body(
    user_id: str = Form(...),
    height_cm: float = Form(...),
    gender: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        image_bytes = await file.read()
        pipeline_result = app.state.analyzer.run(image_bytes=image_bytes, actual_height_cm=height_cm)
        
        if not pipeline_result.get("success"):
            raise EngineError(422, "BODY_NOT_DETECTED", pipeline_result.get("error_message", "검출 실패"))
            
        origin_cv_img = pipeline_result.get("origin_cv_img")
        
        # 세션 저장 (이후 DB나 Redis로 분리하기 쉽게 구조화)
        SESSION_STORAGE[user_id] = {"origin_cv_img": origin_cv_img}
        
        recommender = StandardSizeRecommender(height_cm=height_cm, measurements_cm=pipeline_result["measurements_cm"], gender=gender)
        size_recommendation = recommender.recommend()

        return {
            "status": "SUCCESS",
            "data": {
                "user_id": user_id,
                "annotated_image_base64": pipeline_result.get("annotated_image_base64"),
                "size_analysis": size_recommendation
            }
        }
    except EngineError:
        raise
    except Exception as e:
        raise EngineError(500, "ANALYSIS_CRASH", str(e))

# 💡 수정된 VTON API 엔드포인트
@app.post("/api/v1/tryon")
async def execute_virtual_tryon(
    user_id: str = Form(...),
    garment_file: UploadFile = File(None),  # 필수(...)에서 선택(None)으로 변경
    garment_name: str = Form(None)          # 프론트엔드가 보내는 텍스트 데이터 허용
):
    if user_id not in SESSION_STORAGE:
        raise EngineError(400, "CACHE_NOT_FOUND", "유저 세션이 없습니다. 분석 API를 선행하세요.")
        
    # 둘 다 안 보냈을 경우 방어
    if not garment_file and not garment_name:
        raise EngineError(400, "EMPTY_GARMENT_SOURCE", "합성 대상 의류 소스(파일 또는 파일명)가 제공되지 않았습니다.")
        
    try:
        origin_cv_img = SESSION_STORAGE[user_id]["origin_cv_img"]
        
        # 💡 프론트엔드 요청 방식에 따라 유연하게 바이트 데이터 확보
        if garment_file:
            garment_bytes = await garment_file.read()
        else:
            # 로컬 데이터셋에서 이미지 찾아오기
            clip_dataset_path = os.path.join("..", "Clip", "fashion_dataset", garment_name)
            if not os.path.exists(clip_dataset_path):
                raise EngineError(404, "GARMENT_FILE_LOST", f"데이터셋 저장소 내에 파일({garment_name})을 찾을 수 없습니다.")
            with open(clip_dataset_path, "rb") as f:
                garment_bytes = f.read()
        
        # Base64 반환 구조 유지
        tryon_base64 = app.state.catvton.execute_tryon(garment_bytes=garment_bytes, origin_cv_img=origin_cv_img)
        
        return {
            "status": "SUCCESS",
            "data": {"tryon_image_base64": tryon_base64}
        }
    except EngineError:
        raise
    except Exception as e:
        raise EngineError(500, "TRYON_INFERENCE_FAILED", str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.server_host, port=settings.server_port)
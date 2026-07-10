# app.py
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

@app.post("/api/v1/tryon")
async def execute_virtual_tryon(
    user_id: str = Form(...),
    garment_file: UploadFile = File(...)
):
    if user_id not in SESSION_STORAGE:
        raise EngineError(400, "CACHE_NOT_FOUND", "유저 세션이 없습니다. 분석 API를 선행하세요.")
        
    try:
        origin_cv_img = SESSION_STORAGE[user_id]["origin_cv_img"]
        garment_bytes = await garment_file.read()
        
        # 💡 Base64 반환 구조 유지 (이전 브레인스토밍의 옵션 A 채택)
        tryon_base64 = app.state.catvton.execute_tryon(garment_bytes=garment_bytes, origin_cv_img=origin_cv_img)
        
        return {
            "status": "SUCCESS",
            "data": {"tryon_image_base64": tryon_base64}
        }
    except Exception as e:
        raise EngineError(500, "TRYON_INFERENCE_FAILED", str(e))

if __name__ == "__main__":
    import uvicorn
    # "app:app" 문자열 대신, 위에 선언된 app 인스턴스를 직접 넘깁니다.
    uvicorn.run(app, host=settings.server_host, port=settings.server_port)
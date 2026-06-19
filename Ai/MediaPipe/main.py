# main.py
from fastapi import FastAPI, File, Form, UploadFile, HTTPException, status
from fastapi.responses import JSONResponse
import logging

# 분리된 독립 패키지 모듈들을 로드합니다.
from core.analyzer.pipeline import BodyAnalyzerPipeline
from core.analyzer.recommender import SizeRecommender

# 로그 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("WareLensAI")

app = FastAPI(
    title="WareLens AI Body Analyzer API",
    description="MediaPipe 기반 신체 체형 분석 및 의류 사이즈 맞춤 추천 API 서버",
    version="1.0.0"
)

# 서버 시작 시 AI 파이프라인 인스턴스 초기화
try:
    analyzer_pipeline = BodyAnalyzerPipeline(model_path="models/pose_landmarker_heavy.task")
except Exception as e:
    logger.exception("서버 초기화 중 모델 가중치 파일 로드 실패")
    analyzer_pipeline = None


@app.post("/api/v1/analyze/body", summary="사용자 체형 분석 및 사이즈 추천 API")
async def analyze_body_specs(
    height_cm: float = Form(..., description="사용자 키 (cm)", example=175.0),
    weight_kg: float = Form(..., description="사용자 몸무게 (kg)", example=70.0),
    gender: str = Form(..., description="사용자 성별 (MALE 또는 FEMALE)", example="MALE"), # ✨ 성별 폼 데이터 추가 수신
    file: UploadFile = File(..., description="분석할 전신 사진 이미지 파일")
):
    # 1. 모델 준비 상태 검증 방어 코드
    if analyzer_pipeline is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI 추론 모델 엔진이 준비되지 않았습니다. 서버 관리자에게 문의하세요."
        )

    # 2. 입력 파라미터 값 바운더리 유효성 검증
    if height_cm <= 50 or height_cm >= 250 or weight_kg <= 10 or weight_kg >= 250:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="입력된 키 혹은 몸무게 값이 비정상적인 범주입니다."
        )

    # 3. 성별 입력값 유효성 검증 (MALE / FEMALE 이외의 유실 데이터 방어)
    gender = gender.upper().strip()
    if gender not in ["MALE", "FEMALE"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="성별(gender) 값은 무조건 'MALE' 또는 'FEMALE' 이어야 합니다."
        )

    # 4. 이미지 파일 확장자 1차 필터링
    allowed_extensions = ["jpg", "jpeg", "png", "webp"]
    file_ext = file.filename.split(".")[-1].lower() if file.filename else ""
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"지원하지 않는 이미지 포맷입니다. 허용 확장자: {allowed_extensions}"
        )

    try:
        logger.info(f"체형 분석 요청 수신 -> 성별: {gender}, 키: {height_cm}cm, 몸무게: {weight_kg}kg")
        image_bytes = await file.read()

        # 5. MediaPipe 관절 랜드마크 추출 수행 (AI 모듈 호출)
        pipeline_result = analyzer_pipeline.run(image_bytes)

        # 6. 관절 인식 실패 처리
        if not pipeline_result["success"]:
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={
                    "status": "FAIL",
                    "error_message": pipeline_result["error_message"]
                }
            )

        # 7. 분리된 추천 보정 엔진 레이어 가동 (✨ 검증된 gender 변수를 함께 파라미터로 바인딩)
        ratios = pipeline_result["ratios"]
        recommender = SizeRecommender(height=height_cm, weight=weight_kg, ratios=ratios, gender=gender)
        rec_result = recommender.recommend()

        # 8. 표준화된 최종 Response DTO 반환
        return {
            "status": "SUCCESS",
            "data": {
                "bmi": rec_result["bmi"],
                "bmi_grade": rec_result["bmi_grade"],
                "ratios": {
                    "shoulder_ratio": round(ratios["shoulder_ratio"], 4),
                    "upper_lower_ratio": round(ratios["upper_lower_ratio"], 4),
                    "hip_shoulder_ratio": round(ratios["hip_shoulder_ratio"], 4)
                },
                "recommendation": {
                    "final_size": rec_result["final_size"],
                    "fit_type": rec_result["fit_type"],
                    "fit_desc": rec_result["fit_desc"],
                    "reasons": rec_result["reasons"]
                },
                "annotated_image_base64": pipeline_result["annotated_image"]
            }
        }

    except ValueError as val_err:
        logger.error(f"데이터 연산 런타임 오류: {str(val_err)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as e:
        logger.exception("시스템 내부 예측 불가 오류 발생")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 내부에서 비즈니스 처리를 완료하지 못했습니다."
        )

@app.get("/health", summary="서버 헬스 체크용 엔드포인트")
def health_check():
    return {"status": "UP", "model_loaded": analyzer_pipeline is not None}
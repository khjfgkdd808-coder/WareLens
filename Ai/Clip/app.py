"""
app.py - CLIP 추천 시스템 FastAPI 서버
========================================
Java 백엔드 또는 Swagger UI에서 호출하는 HTTP API 서버입니다.

[실행 방법]
    pip install fastapi uvicorn python-multipart
    uvicorn app:app --host 0.0.0.0 --port 8001

[Swagger UI]
    http://localhost:8001/docs

[API 명세]
    POST /internal/clip/recommend
    Content-Type: multipart/form-data
    필드: style_images (File[], 1장 이상, jpg/png/webp)

[설정값]
    이 파일 상단의 설정값 섹션에서 TOP_K 등을 변경할 수 있습니다.
    main.py(CLI)와 완전히 독립적으로 동작하므로 각자 따로 수정하면 됩니다.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse

import service
from exceptions import ServiceError

# ----------------------------------------------------------
# 설정값 - 필요에 따라 여기서만 수정하면 됩니다
# ----------------------------------------------------------

# 추천 결과 수
# main.py(CLI)의 TOP_K와 독립적입니다 - 여기를 바꿔도 main.py에 영향 없음
TOP_K = 10

# ----------------------------------------------------------
# 로깅 설정
# ----------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


# ----------------------------------------------------------
# 서버 시작/종료 이벤트
# lifespan: FastAPI 권장 방식 (on_event는 deprecated 예정)
# ----------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    서버 시작 시 CLIP 모델, 캐시, 메타데이터를 메모리에 로드합니다.
    요청마다 재로딩하지 않기 위해 서버 생명주기 동안 메모리에 유지합니다.
    """
    logger.info("서버 시작 중 - 모델 및 캐시 로딩...")
    try:
        service.initialize()
        logger.info("초기화 완료 - 요청을 받을 준비가 됐습니다.")
    except ServiceError as e:
        # 캐시나 모델이 없으면 서버가 뜨지 않도록 에러를 그대로 전파
        # → 운영자가 build_vectors.py 미실행 등 설정 문제를 바로 인지 가능
        logger.error(f"초기화 실패: [{e.code}] {e}")
        raise

    yield  # 서버 실행 중 (요청 처리)

    logger.info("서버 종료 중...")


# ----------------------------------------------------------
# FastAPI 앱 생성
# ----------------------------------------------------------
app = FastAPI(
    title="WearLens CLIP 추천 API",
    description="""
## 의류 이미지 유사도 추천 시스템

사용자가 업로드한 스타일 이미지를 기반으로 유사한 의류를 추천합니다.

### 사용 방법
1. `/internal/clip/recommend` 엔드포인트에 이미지를 업로드합니다.
2. 이미지가 여러 장이면 평균 임베딩 벡터로 추천합니다.
3. 추천 결과와 각 의류의 메타데이터(카테고리, 색상 등)를 반환합니다.

### 주의사항
- 지원 확장자: jpg, jpeg, png, webp
- `style_analysis`(취향 분석)는 1차 고도화 단계에서 추가될 예정입니다.
    """,
    version="1.0.0",
    lifespan=lifespan,
)


# ----------------------------------------------------------
# 전역 예외 핸들러
# ServiceError 계열 예외를 HTTP 응답으로 일괄 변환
# ----------------------------------------------------------
@app.exception_handler(ServiceError)
async def service_error_handler(request, exc: ServiceError):
    """
    service.py에서 발생하는 모든 ServiceError를 JSON 에러 응답으로 변환합니다.
    백엔드(Java)는 이 형태의 응답을 파싱해서 에러를 처리하면 됩니다.

    응답 형태:
        {
            "error_code": "INVALID_IMAGE",
            "message": "이미지를 읽을 수 없습니다..."
        }
    """
    logger.warning(f"ServiceError 발생: [{exc.code}] {exc}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error_code": exc.code,
            "message": str(exc),
        },
    )


# ----------------------------------------------------------
# 헬스체크 엔드포인트
# 서버가 살아있는지, 모델 초기화가 됐는지 빠르게 확인
# ----------------------------------------------------------
@app.get(
    "/health",
    summary="헬스체크",
    description="서버 상태 및 모델 초기화 여부를 확인합니다.",
    tags=["관리"],
)
async def health_check():
    """
    Java 백엔드가 CLIP 서버 상태를 확인할 때 사용합니다.
    모델이 정상적으로 로드된 상태면 200을 반환합니다.
    """
    return {
        "status": "ok",
        "initialized": service._state["initialized"],
        "top_k": TOP_K,
    }


# ----------------------------------------------------------
# 추천 엔드포인트
# ----------------------------------------------------------
@app.post(
    "/internal/clip/recommend",
    summary="의류 유사도 추천",
    description="""
스타일 이미지를 업로드하면 유사한 의류 Top-K를 추천합니다.

- 이미지는 1장 이상 업로드 가능합니다.
- 여러 장 업로드 시 평균 임베딩 벡터로 추천을 수행합니다.
- 지원 형식: jpg, jpeg, png, webp
    """,
    tags=["추천"],
)
async def recommend(
    style_images: list[UploadFile] = File(
        ...,
        description="스타일 이미지 파일 (1장 이상, jpg/png/webp 지원)",
    ),
):
    """
    [요청]
    - Content-Type: multipart/form-data
    - style_images: 이미지 파일 1장 이상

    [응답]
    - recommendations: 추천 결과 리스트 (rank 순 정렬)
        - rank        : 순위 (1부터 시작)
        - image_name  : 추천 이미지 파일명 (예: "15970.jpg")
        - score       : 유사도 점수 (0~1, 높을수록 유사)
        - clip_score  : CLIP 코사인 유사도
        - category    : 카테고리 (예: "TOP")
        - sub_category: 세부 카테고리 (예: "SHIRT")
        - article_type: 상품 유형 (예: "Shirts")
        - color       : 색상 (예: "NAVY")
        - season      : 시즌 (예: "Fall")
        - usage       : 용도 (예: "Casual")
        - gender      : 성별 (예: "Men")
        - pattern     : 패턴 (예: "SOLID")
        - fit         : 핏 (예: "SLIM")
        - fabric      : 소재 (예: "COTTON")

    [에러 응답]
    - 400 EMPTY_IMAGE_LIST : 이미지가 0장
    - 400 INVALID_IMAGE    : 이미지로 읽을 수 없는 파일
    - 400 INVALID_TOP_K    : top_k 값이 잘못됨 (내부 설정 오류)
    - 500 INFERENCE_FAILED : 추론 중 예기치 못한 오류
    - 503 NOT_INITIALIZED  : 서버 초기화 안 됨 (재시작 필요)
    - 503 CACHE_NOT_FOUND  : 캐시 없음 (build_vectors.py 실행 필요)
    - 503 MODEL_LOAD_FAILED: 모델 로딩 실패
    """
    logger.info(f"추천 요청 - 이미지 {len(style_images)}장")

    # 업로드된 파일을 바이트로 읽기
    # (service.get_recommendations는 bytes 리스트를 받음)
    image_bytes_list = [await img.read() for img in style_images]

    # 추천 실행 (ServiceError는 전역 핸들러에서 처리)
    recommendations = service.get_recommendations(
        query_images=image_bytes_list,
        top_k=TOP_K,
    )

    logger.info(f"추천 완료 - Top-{len(recommendations)} 결과 반환")

    return {"recommendations": recommendations}


# ----------------------------------------------------------
# 직접 실행 시 (python app.py)
# ----------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8001,
        reload=False,  # 운영 환경에서는 reload=False 권장
    )

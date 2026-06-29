"""
service.py - 백엔드 연동용 인터페이스
=====================================
FastAPI 등 백엔드 서버에서 이 모듈을 import해서 사용합니다.
서버 코드는 내부 구현(CLIP, YOLO, 캐시 등)을 몰라도
initialize()와 get_recommendations() 두 함수만 호출하면 됩니다.

[사용 예시 - 백엔드 담당자용]

    import service
    from exceptions import ServiceError

    # 서버 시작 시 1회만 호출 (예: FastAPI의 startup 이벤트)
    @app.on_event("startup")
    def on_startup():
        service.initialize()

    # ServiceError 계열 예외를 한 곳에서 일괄 처리
    @app.exception_handler(ServiceError)
    async def service_error_handler(request, exc: ServiceError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error_code": exc.code, "message": str(exc)},
        )

    # 매 요청마다 호출
    @app.post("/internal/clip/recommend")
    async def recommend(style_images: list[UploadFile]):
        image_bytes_list = [await f.read() for f in style_images]
        recommendations = service.get_recommendations(image_bytes_list, top_k=10)
        return {"recommendations": recommendations}

[API 명세 대응 현황]
get_recommendations()가 반환하는 각 항목은 POST /internal/clip/recommend
응답의 "recommendations" 배열 항목과 1:1로 대응합니다.

    - item_id   : 포함하지 않음. image_name을 식별자로 사용하기로 결정.
    - image_url : 포함하지 않음. 백엔드에서 image_name 기준으로 조립.
    - style_images 개수(1~3장) : 이 모듈은 개수를 제한하지 않습니다.
      명세상의 1~3장 제약은 프론트엔드/백엔드가 관리하는 정책이며,
      AI 추론 로직(get_average_embedding)은 1장이든 N장이든 동일하게 동작합니다.
    - style_analysis : 이 모듈은 추천(recommendations)만 책임집니다.
      취향 분석(style_analysis)은 현재 미구현이며, 1차 고도화 단계에서
      별도 함수(예: analyze_style())로 추가할 예정입니다.
      현재 응답에는 이 키 자체를 포함하지 마세요.

[에러 처리]
이 모듈에서 발생하는 모든 예외는 exceptions.py의 ServiceError(및 하위 클래스)입니다.
각 예외는 code(문자열)와 status_code(HTTP 상태코드)를 가지고 있어
백엔드가 exceptions.ServiceError 하나만 잡아도 모든 케이스를 처리할 수 있습니다.
자세한 에러 코드 목록은 exceptions.py 상단 docstring을 참고하세요.

[주의사항]
- initialize()를 호출하기 전에 get_recommendations()를 호출하면
  exceptions.NotInitializedError가 발생합니다.
- initialize()는 서버 생명주기 동안 단 1회만 호출하세요.
  (요청마다 호출하면 매번 모델을 다시 로드하여 응답이 매우 느려집니다)
"""

import io
from PIL import Image

from embedding     import load_clip_model, get_average_embedding
from cache_manager import load_cache
from recommend     import find_top_k
from metadata      import load_metadata, attach_metadata
from exceptions    import (
    ServiceError,
    NotInitializedError,
    CacheNotFoundError,
    EmptyImageListError,
    InvalidImageError,
    InvalidTopKError,
    ModelLoadFailedError,
    InferenceFailedError,
)

# [설계 노트] 쿼리 이미지 개수 제한은 이 모듈에서 두지 않습니다.
# API 명세상 프론트엔드/백엔드가 1~3장으로 제한하기로 되어 있지만,
# 그 제약은 UI/API 정책의 영역이고 AI 추론 로직은 입력 개수와 무관하게
# 동작해야 책임이 깔끔하게 분리됩니다. (1장이든 10장이든 평균 임베딩으로 처리 가능)
# 개수 제한이 필요해지면 exceptions.py의 TooManyImagesError를 재사용하면 됩니다.

# ----------------------------------------------------------
# 전역 상태
# initialize() 호출 시 채워지고, 서버가 살아있는 동안 메모리에 유지됩니다.
# (요청마다 다시 로드하지 않기 위함 - 속도에 매우 중요)
# ----------------------------------------------------------
_state = {
    "model"             : None,  # CLIPModel
    "processor"         : None,  # CLIPProcessor
    "dataset_embeddings": None,  # np.ndarray, shape (N, 512)
    "dataset_paths"     : None,  # list[str]
    "metadata_dict"     : None,  # dict[str, dict[str, str]]
    "initialized"       : False,
}


def initialize() -> None:
    """
    서버 시작 시 1회 호출해야 하는 초기화 함수.

    아래 항목들을 메모리에 로드합니다:
    1. CLIP 모델 + 프로세서
    2. fashion_dataset 임베딩 캐시 (cache/vectors.npy, filenames.npy)
    3. metadata.csv

    [주의] cache/vectors.npy가 없으면 에러가 발생합니다.
           반드시 먼저 `python build_vectors.py`를 실행해 캐시를 만들어두세요.

    Raises:
        CacheNotFoundError  : 데이터셋 임베딩 캐시가 없는 경우
        ModelLoadFailedError: CLIP 모델 로딩에 실패한 경우 (네트워크 차단 등)
    """
    if _state["initialized"]:
        print("[service] 이미 초기화되어 있습니다. 다시 로드하지 않습니다.")
        return

    print("[service] 초기화 시작...")

    try:
        model, processor = load_clip_model()
    except Exception as e:
        raise ModelLoadFailedError(f"CLIP 모델 로딩에 실패했습니다: {e}")

    try:
        dataset_embeddings, dataset_paths = load_cache()
    except FileNotFoundError as e:
        raise CacheNotFoundError(str(e))

    metadata_dict = load_metadata()

    _state["model"]              = model
    _state["processor"]          = processor
    _state["dataset_embeddings"] = dataset_embeddings
    _state["dataset_paths"]      = dataset_paths
    _state["metadata_dict"]      = metadata_dict
    _state["initialized"]        = True

    print(f"[service] 초기화 완료 - 데이터셋 {len(dataset_paths)}장 준비됨")


def _ensure_initialized() -> None:
    """
    initialize()가 먼저 호출되었는지 확인합니다.
    호출되지 않았다면 명확한 에러와 함께 예외를 발생시킵니다.

    Raises:
        NotInitializedError: initialize()가 호출되지 않은 경우
    """
    if not _state["initialized"]:
        raise NotInitializedError(
            "service.initialize()가 호출되지 않았습니다. "
            "서버 시작 시 반드시 먼저 initialize()를 호출하세요."
        )


def _bytes_to_image(image_bytes: bytes) -> Image.Image:
    """
    이미지 바이트 데이터(업로드된 파일 등)를 PIL Image(RGB)로 변환합니다.

    Args:
        image_bytes (bytes): 이미지 파일의 바이트 데이터

    Returns:
        PIL.Image.Image: RGB 이미지 객체

    Raises:
        InvalidImageError: 이미지로 디코딩할 수 없는 데이터인 경우
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.load()  # 실제로 디코딩을 수행시켜 손상된 이미지를 여기서 바로 잡아냄
    except Exception as e:
        raise InvalidImageError(
            f"이미지를 읽을 수 없습니다. 올바른 jpg/png/webp 파일인지 확인하세요: {e}"
        )

    # PNG, WEBP 등 투명도(Alpha 채널)가 있는 이미지를 RGB로 변환
    if img.mode != "RGB":
        img = img.convert("RGB")

    return img


def get_recommendations(
    query_images: list[bytes],
    top_k       : int = 10,
) -> list[dict]:
    """
    쿼리 이미지(바이트 데이터)를 받아 유사한 의류 Top-K를 추천합니다.
    백엔드에서 호출하는 메인 함수입니다.

    처리 순서:
    1. 입력값 검증 (이미지 개수, top_k 값)
    2. 바이트 → PIL Image 변환
    3. CLIP 임베딩 생성 (여러 장이면 평균 벡터 사용)
    4. 데이터셋과 코사인 유사도 비교 → Top-K 추출
    5. 메타데이터(category/color/pattern 등) 결합
    6. JSON 직렬화 가능한 dict 리스트로 반환

    Args:
        query_images (list[bytes]): 쿼리 이미지의 바이트 데이터 리스트.
                                     1장 이상이면 모두 사용 (개수 제한 없음.
                                     API 명세상 1~3장이지만, 그 제한은
                                     프론트엔드/백엔드가 관리합니다).
                                     예: [업로드된 파일1.read(), 업로드된 파일2.read()]
        top_k        (int)       : 추천 개수 (기본값: 10, 1 이상이어야 함)

    Returns:
        list[dict]: 추천 결과 리스트. 각 항목은 아래 필드를 포함합니다.
            {
                "rank"        : int,    # 순위 (1부터 시작)
                "image_name"  : str,    # 추천 이미지 파일명 (예: "15970.jpg")
                "score"       : float,  # 최종 유사도 점수 (0~1)
                "clip_score"  : float,  # CLIP 코사인 유사도
                "category"    : str,    # metadata.csv 필드 (매칭 안 되면 "-")
                "sub_category": str,
                "article_type": str,
                "color"       : str,
                "season"      : str,
                "usage"       : str,
                "gender"      : str,
                "pattern"     : str,
                "fit"         : str,
                "fabric"      : str,
            }
            ※ item_id는 포함하지 않습니다. image_name을 식별자로 사용하세요.
            ※ image_url은 포함하지 않습니다. 백엔드에서 image_name 기준으로 조립하세요.
            ※ style_analysis는 이 함수의 책임이 아닙니다 (1차 고도화 단계에서 별도 구현 예정).

    Raises:
        NotInitializedError : initialize()가 먼저 호출되지 않은 경우
        EmptyImageListError : query_images가 비어있는 경우
        InvalidImageError   : 이미지로 디코딩할 수 없는 데이터인 경우
        InvalidTopKError    : top_k가 1 미만인 경우
        InferenceFailedError: 추론 중 예기치 못한 오류가 발생한 경우 (예: GPU 메모리 부족)
    """
    _ensure_initialized()

    # ----------------------------------------------------------
    # 1. 입력값 검증
    # 이미지 개수 상한은 의도적으로 두지 않습니다 (위 설계 노트 참고).
    # ----------------------------------------------------------
    if not query_images:
        raise EmptyImageListError("query_images가 비어 있습니다. 이미지를 1장 이상 전달하세요.")

    if not isinstance(top_k, int) or top_k < 1:
        raise InvalidTopKError(f"top_k는 1 이상의 정수여야 합니다. (전달된 값: {top_k!r})")

    # ----------------------------------------------------------
    # 2. 바이트 → PIL Image 변환
    # (InvalidImageError는 _bytes_to_image 내부에서 그대로 전파됨)
    # ----------------------------------------------------------
    pil_images = [_bytes_to_image(img_bytes) for img_bytes in query_images]

    # ----------------------------------------------------------
    # 3~5. 임베딩 생성 → 추천 계산 → 메타데이터 결합
    # 이 구간에서 예기치 못한 에러(GPU OOM 등)가 나면 InferenceFailedError로 통일
    # ----------------------------------------------------------
    try:
        query_embedding = get_average_embedding(
            pil_images, _state["model"], _state["processor"]
        )

        recommendations = find_top_k(
            query_embedding    = query_embedding,
            dataset_paths      = _state["dataset_paths"],
            dataset_embeddings = _state["dataset_embeddings"],
            top_k              = top_k,
        )

        recommendations = attach_metadata(recommendations, _state["metadata_dict"])
    except ServiceError:
        # 이미 명확한 ServiceError라면 그대로 전파 (불필요한 이중 래핑 방지)
        raise
    except Exception as e:
        raise InferenceFailedError(f"추천 처리 중 오류가 발생했습니다: {e}")

    # ----------------------------------------------------------
    # 6. 백엔드 API 응답 형식에 맞춰 필드 정리
    #    - path(내부 절대경로)는 제거: 서버 로컬 경로를 외부에 노출할 필요 없음
    #    - filename -> image_name으로 키 이름 변경 (API 명세 기준)
    #      (CLI용 main.py/recommend.py 쪽 "filename" 키는 그대로 유지하고,
    #       여기 service.py 응답에서만 별도로 이름을 바꿔서 내보냅니다)
    # ----------------------------------------------------------
    for rec in recommendations:
        rec.pop("path", None)
        rec["image_name"] = rec.pop("filename")

    return recommendations

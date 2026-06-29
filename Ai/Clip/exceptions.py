"""
exceptions.py - 백엔드 연동용 커스텀 예외 클래스
===================================================
service.py에서 발생할 수 있는 모든 예외를 이 파일에 정의된 클래스로 통일합니다.

[설계 의도]
백엔드(FastAPI 등)가 예외 타입 하나(ServiceError)만 잡아도
모든 에러 케이스를 처리할 수 있게 하고, 동시에 각 예외가
고유한 code(문자열)와 status_code(HTTP 상태코드)를 가지고 있어
세부적인 분기 처리도 가능하게 합니다.

[백엔드 사용 예시]

    from service import ServiceError
    import service

    @app.exception_handler(ServiceError)
    async def service_error_handler(request, exc: ServiceError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error_code": exc.code, "message": str(exc)},
        )

    @app.post("/internal/clip/recommend")
    async def recommend(style_images: list[UploadFile]):
        image_bytes_list = [await f.read() for f in style_images]
        # ServiceError 계열 예외는 위 핸들러가 자동으로 처리하므로
        # 라우트 코드에서 따로 try/except 할 필요 없음
        recommendations = service.get_recommendations(image_bytes_list)
        return {"recommendations": recommendations}

[에러 코드 목록]

    code                    | status_code | 발생 상황
    ------------------------|-------------|----------------------------------
    NOT_INITIALIZED         | 503         | initialize() 호출 전 요청이 들어옴
    CACHE_NOT_FOUND         | 503         | 데이터셋 임베딩 캐시가 없음 (build_vectors.py 미실행)
    EMPTY_IMAGE_LIST        | 400         | 업로드된 이미지가 0장
    TOO_MANY_IMAGES         | 400         | 업로드된 이미지가 허용 개수(기본 3장) 초과
    INVALID_IMAGE           | 400         | 이미지로 디코딩할 수 없는 데이터
    INVALID_TOP_K           | 400         | top_k가 0 이하 등 잘못된 값
    MODEL_LOAD_FAILED       | 503         | CLIP/YOLO 모델 로딩 실패 (네트워크 차단 등)
    INFERENCE_FAILED        | 500         | 추론 중 예기치 못한 에러 (GPU OOM 등)
"""


class ServiceError(Exception):
    """
    모든 service.py 예외의 베이스 클래스.
    백엔드는 이 타입 하나만 잡아도 모든 에러 케이스를 처리할 수 있습니다.
    """
    code: str = "INTERNAL_ERROR"
    status_code: int = 500

    def __init__(self, message: str | None = None):
        self.message = message or self.__class__.__doc__ or self.code
        super().__init__(self.message)


class NotInitializedError(ServiceError):
    """service.initialize()가 호출되지 않은 상태에서 요청이 들어왔습니다."""
    code = "NOT_INITIALIZED"
    status_code = 503  # Service Unavailable


class CacheNotFoundError(ServiceError):
    """데이터셋 임베딩 캐시가 없습니다. build_vectors.py를 먼저 실행해야 합니다."""
    code = "CACHE_NOT_FOUND"
    status_code = 503


class EmptyImageListError(ServiceError):
    """업로드된 이미지가 0장입니다. 최소 1장 이상 필요합니다."""
    code = "EMPTY_IMAGE_LIST"
    status_code = 400  # Bad Request


class TooManyImagesError(ServiceError):
    """업로드된 이미지 수가 허용된 최대 개수를 초과했습니다."""
    code = "TOO_MANY_IMAGES"
    status_code = 400


class InvalidImageError(ServiceError):
    """이미지로 디코딩할 수 없는 데이터입니다. 올바른 jpg/png/webp 파일인지 확인하세요."""
    code = "INVALID_IMAGE"
    status_code = 400


class InvalidTopKError(ServiceError):
    """top_k 값이 올바르지 않습니다. 1 이상의 정수여야 합니다."""
    code = "INVALID_TOP_K"
    status_code = 400


class ModelLoadFailedError(ServiceError):
    """CLIP 또는 YOLO 모델 로딩에 실패했습니다. 네트워크 연결이나 모델 파일을 확인하세요."""
    code = "MODEL_LOAD_FAILED"
    status_code = 503


class InferenceFailedError(ServiceError):
    """추론 처리 중 예기치 못한 오류가 발생했습니다 (예: GPU 메모리 부족)."""
    code = "INFERENCE_FAILED"
    status_code = 500

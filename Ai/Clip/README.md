# 의류 이미지 유사도 추천 시스템

CLIP 모델과 코사인 유사도를 이용해 입력 이미지와 유사한 의류를 추천합니다.

---

## 프로젝트 구조

```
project/
│
├── fashion_dataset/       # 검색 대상 의류 이미지 (jpg, jpeg, png, webp)
├── test_img/              # 쿼리 이미지 1장 이상 (jpg, jpeg, png, webp)
├── cache/                 # 자동 생성되는 캐시 폴더
│   ├── vectors.npy        # 데이터셋 임베딩 벡터 행렬 (N, 512)
│   └── filenames.npy      # 데이터셋 이미지 경로 목록
│
├── main.py                # 전체 실행 흐름 관리 (CLI 단독 실행용)
├── service.py             # 백엔드(FastAPI 등) 연동용 인터페이스
├── exceptions.py          # 백엔드 연동용 커스텀 예외 클래스
├── build_vectors.py       # 데이터셋 임베딩 생성 및 캐시 저장
├── detector.py            # YOLO 기반 사람 영역 탐지/crop
├── embedding.py           # CLIP 모델 로드 / 이미지 임베딩 생성
├── recommend.py           # 유사도 계산 / Top-K 추천 / 시각화 / CSV 저장
├── cache_manager.py       # 캐시 저장 / 로드
├── metadata.py            # 의류 메타데이터(csv) 로드 및 결합
├── metadata.csv           # 이미지별 속성 정보 (category, color, pattern 등)
├── utils.py               # 공통 유틸리티 (이미지 로드, 경로 처리)
├── result.csv             # 실행 결과 (자동 생성, main.py 기준 위치)
└── README.md              # 이 파일
```

---

## 환경 요구사항

- Python 3.10 이상
- Windows 환경 기준

---

## 설치 방법

```bash
pip install torch transformers Pillow scikit-learn matplotlib tqdm ultralytics pandas
```

GPU(NVIDIA)를 사용하려면 CUDA 버전 PyTorch가 설치되어 있어야 합니다. 아래 명령어로 확인하세요:

```bash
python -c "import torch; print(torch.cuda.is_available())"
```

`True`가 나오면 GPU를 사용합니다. `False`가 나오면 CPU로 동작하며,
`build_vectors.py`(YOLO + CLIP 임베딩) 실행 시간이 크게 늘어날 수 있습니다.

---

## 실행 방법

### 순서 1 - 데이터셋 준비

`fashion_dataset/` 폴더에 의류 이미지를 넣습니다.
사람이 착용한 사진과 옷만 펼쳐놓은 사진이 섞여 있어도 됩니다.
(착용샷은 build_vectors.py 실행 시 YOLO가 자동으로 사람 영역만 crop합니다)

```
fashion_dataset/
├── tee_001.webp        # 옷만 펼쳐놓은 사진
├── tee_002.jpg         # 사람이 착용한 사진 (자동으로 사람 영역만 crop됨)
└── ...
```

### 순서 2 - 벡터 캐시 생성 (최초 1회 / 데이터셋 변경 시)

```bash
python build_vectors.py
```

최초 실행 시 YOLOv8m 가중치 파일이 자동으로 다운로드됩니다 (1회만).
실행 결과로 `cache/vectors.npy`와 `cache/filenames.npy`가 생성됩니다.
데이터셋에 이미지를 추가하거나 삭제한 경우 다시 실행해야 합니다.

처리 과정에서 각 이미지마다 다음을 수행합니다:
1. YOLO로 사람(person) 영역 탐지
2. 사람이 탐지되면 → 해당 영역만 crop 후 임베딩
3. 사람이 탐지되지 않으면 → 원본 이미지 그대로 임베딩
   (이미 누끼 처리된 사진, 옷만 펼쳐놓은 사진 등)

### 순서 3 - 쿼리 이미지 준비

`test_img/` 폴더에 검색 기준이 될 이미지를 1장 이상 넣습니다.
여러 장을 넣으면 임베딩 평균값으로 추천이 수행됩니다.

**현재 MVP는 옷만 펼쳐놓고 촬영한 사진만 지원합니다.**
(사람이 착용한 사진은 main.py에 YOLO crop이 아직 적용되지 않았습니다 - 향후 확장 예정)

```
test_img/
├── query_001.webp
└── query_002.webp
```

### 순서 4 - 추천 실행

```bash
python main.py
```

---

## 출력 예시

콘솔에는 간단한 정보(순위/파일명/유사도)만 출력됩니다.

```
Top 10 Recommendations

 1. 15970.jpg
    Similarity: 0.9630

 2. 19547.jpg
    Similarity: 0.8385

...

  결과 CSV 저장 완료: result.csv  (10행)
```

전체 메타데이터(category, color, pattern 등)는 `result.csv`에 모두 저장됩니다.

```
rank,filename,score,clip_score,category,sub_category,article_type,color,season,usage,gender,pattern,fit,fabric
1,15970.jpg,0.963,0.963,TOP,SHIRT,Shirts,NAVY,Fall,Casual,Men,CHECK,SLIM,COTTON
2,19547.jpg,0.8385,0.8385,TOP,SWEATSHIRT,Sweatshirts,BLUE,Fall,Casual,Men,SOLID,OTHER,COTTON
...
```

시각화 창에는 쿼리 이미지와 Top-5 추천 결과가 함께 표시되며,
각 추천 이미지 아래에 순위/파일명/유사도와 메타데이터 전체 필드가 표시됩니다.

---

## 각 파일 역할 요약

| 파일 | 역할 |
|---|---|
| `main.py` | CLI 단독 실행 (콘솔 출력 + 시각화 + CSV 저장) |
| `service.py` | 백엔드(FastAPI 등) 연동용 인터페이스 |
| `exceptions.py` | 백엔드 연동용 커스텀 예외 클래스 (에러 코드/HTTP 상태코드) |
| `build_vectors.py` | 데이터셋 임베딩 생성 및 캐시 저장 (YOLO crop 포함) |
| `detector.py` | YOLO로 사람 영역 탐지 및 crop |
| `embedding.py` | CLIP 모델 로드, 이미지 → 벡터 변환 |
| `recommend.py` | 유사도 계산, Top-K 추천, 시각화, CSV 저장 |
| `cache_manager.py` | 캐시 저장/로드 |
| `metadata.py` | metadata.csv 로드 및 추천 결과에 결합 |
| `utils.py` | 이미지 로드, 경로 처리 등 공통 함수 |

---

## 설정값 변경 방법

`main.py` 상단의 설정값을 수정하면 됩니다.

```python
TOP_K         = 10   # 추천 수 (텍스트 출력 기준)
TOP_K_DISPLAY = 5    # 시각화에서 보여줄 추천 수
```

---

## 캐시 관련 안내

| 상황 | 해결 방법 |
|---|---|
| `main.py` 실행 시 캐시 없음 오류 | `python build_vectors.py` 먼저 실행 |
| 데이터셋에 이미지 추가/삭제 | `python build_vectors.py` 재실행 |
| 캐시를 초기화하고 싶을 때 | `cache/` 폴더 삭제 후 재실행 |

---

## 메타데이터 안내

`metadata.csv`는 `image_name` 컬럼(예: `15970.jpg`)을 기준으로 `fashion_dataset`의 파일명과 매칭됩니다.

- 매칭되는 이미지: category, color, pattern 등 11개 필드가 결과에 표시됩니다.
- 매칭되지 않는 이미지(metadata.csv에 없는 파일): 모든 필드가 `-`로 표시되며, 프로그램은 에러 없이 계속 진행됩니다.

`metadata.csv`가 아예 없어도 프로그램은 정상 동작합니다 (메타데이터 없이 CLIP 유사도만으로 추천).

---

## 백엔드 연동 (FastAPI 등)

`service.py`가 백엔드에서 import할 단일 진입점입니다. 백엔드 담당자는 CLIP/YOLO/캐시 내부 구현을 몰라도 아래 두 함수만 사용하면 됩니다.

### 대응 API 명세

```
POST /internal/clip/recommend
Content-Type: multipart/form-data

필드: style_images (File[], 1~3장, jpg/png/webp)
```

### 사용 예시

```python
import service

# 서버 시작 시 1회만 호출
@app.on_event("startup")
def on_startup():
    service.initialize()

# 매 요청마다 호출
@app.post("/internal/clip/recommend")
async def recommend(style_images: list[UploadFile]):
    image_bytes_list = [await f.read() for f in style_images]
    recommendations = service.get_recommendations(image_bytes_list, top_k=10)
    return {"recommendations": recommendations}
```

### 함수 스펙

**`service.initialize() -> None`**
서버 생명주기 동안 단 1회만 호출하세요. CLIP 모델, 데이터셋 임베딩 캐시, metadata.csv를 메모리에 로드합니다. 캐시(`cache/vectors.npy`)가 없으면 `CacheNotFoundError`가 발생하므로 `python build_vectors.py`를 먼저 실행해야 합니다.

**`service.get_recommendations(query_images: list[bytes], top_k: int = 10) -> list[dict]`**
쿼리 이미지의 바이트 데이터(업로드된 파일을 `.read()`한 결과)를 받아 추천 결과를 반환합니다. 이미지는 1장 이상이면 모두 사용되며 **개수 제한이 없습니다** — API 명세상 1~3장 정책은 프론트엔드/백엔드가 관리하고, 이 함수는 입력 개수와 무관하게 평균 임베딩으로 추천을 수행합니다.

### 에러 처리

이 모듈이 발생시키는 모든 예외는 `exceptions.py`의 `ServiceError`(또는 하위 클래스)입니다. 백엔드는 `ServiceError` 하나만 잡아도 모든 케이스를 처리할 수 있고, 필요하면 `code`로 세부 분기도 가능합니다.

```python
from exceptions import ServiceError

@app.exception_handler(ServiceError)
async def service_error_handler(request, exc: ServiceError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error_code": exc.code, "message": str(exc)},
    )
```

| code | status_code | 발생 상황 |
|---|---|---|
| `NOT_INITIALIZED` | 503 | `initialize()` 호출 전 요청이 들어옴 |
| `CACHE_NOT_FOUND` | 503 | 데이터셋 임베딩 캐시가 없음 (`build_vectors.py` 미실행) |
| `EMPTY_IMAGE_LIST` | 400 | 업로드된 이미지가 0장 |
| `INVALID_IMAGE` | 400 | 이미지로 디코딩할 수 없는 데이터 (손상된 파일 포함) |
| `INVALID_TOP_K` | 400 | `top_k`가 1 미만 등 잘못된 값 |
| `MODEL_LOAD_FAILED` | 503 | CLIP 모델 로딩 실패 (네트워크 차단 등) |
| `INFERENCE_FAILED` | 500 | 추론 중 예기치 못한 에러 (GPU 메모리 부족 등) |

> `TOO_MANY_IMAGES`는 `exceptions.py`에 정의는 되어 있지만 `service.py`에서는 사용하지 않습니다. 이미지 개수(1~3장) 제한은 프론트엔드/백엔드의 정책 영역으로 판단해 AI 쪽에서는 강제하지 않기로 결정했습니다. 필요해지면 `service.py`에서 다시 활성화할 수 있습니다.

반환값 예시 (= API 응답의 `recommendations` 배열 항목):
```python
[
    {
        "rank": 1, "image_name": "15970.jpg", "score": 0.963, "clip_score": 0.963,
        "category": "TOP", "sub_category": "SHIRT", "article_type": "Shirts",
        "color": "NAVY", "season": "Fall", "usage": "Casual", "gender": "Men",
        "pattern": "CHECK", "fit": "SLIM", "fabric": "COTTON",
    },
    ...
]
```

`initialize()`를 호출하지 않고 `get_recommendations()`를 호출하면 `NotInitializedError`(503)가 발생합니다. 자세한 에러 코드는 위 표를 참고하세요.

### API 명세와의 차이점 (협의된 사항)

| 명세 필드 | 처리 방식 |
|---|---|
| `item_id` | 미포함. `image_name`을 식별자로 사용 |
| `image_url` | 미포함. 백엔드에서 `image_name` 기준으로 정적 파일 경로를 조립 |
| `style_images` 개수(1~3장) | AI 쪽(`service.py`)에서는 개수를 제한하지 않음. 프론트엔드/백엔드가 정책으로 관리 |
| `style_analysis` | **이번 단계에서 미구현.** `recommendations`만 제공하며, 취향 분석은 1차 고도화 단계에서 별도 추가 예정 |
| 메타데이터 필드 | 명세보다 많은 11개 필드를 전부 포함 (`article_type`, `season`, `usage`, `gender`, `fit`, `fabric` 추가) — 필요한 필드만 프론트에서 선택적으로 사용 |

---

## 향후 확장 계획

### 1. 취향 분석 (style_analysis) - 1차 고도화
API 명세의 `style_analysis` 필드는 현재 미구현입니다. 계획된 구현 방식:

1. 업로드된 각 쿼리 이미지를 CLIP으로 데이터셋에서 가장 유사한 이미지 1장에 매칭
2. 매칭된 이미지들의 `category`, `color`를 모아 비율 집계
3. `service.py`에 `analyze_style()` 함수를 추가하고, `get_recommendations()`와 함께 호출

```python
{
    "style_analysis": {
        "top_categories": [{"name": "HOODIE", "ratio": 0.60}, ...],
        "top_colors": ["BLACK", "GRAY"],
    },
    "recommendations": [...],
}
```

### 2. 사용자 착용샷 지원
현재 `main.py`/`service.py`는 옷만 펼쳐놓은 사진만 가정합니다.
사용자가 착용샷을 업로드하는 기능을 추가할 경우, `detector.py`의
`crop_person_region()`을 적용하면 됩니다.
(이미 `build_vectors.py`에서 검증된 동일 함수를 재사용)

### 3. 메타데이터 가중치
현재는 CLIP 유사도만 사용하지만, 아래와 같이 메타데이터 가중치를 추가할 예정입니다.

```
최종 점수 = CLIP 유사도 * 0.7
          + category 점수 * 0.2
          + color 점수    * 0.1
```

확장 시 `recommend.py`의 `find_top_k()` 함수 내 주석 처리된 확장 포인트를 참고하세요.

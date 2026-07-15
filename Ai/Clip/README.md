# 의류 이미지 유사도 추천 시스템

CLIP 모델과 코사인 유사도를 이용해 입력 이미지와 유사한 의류를 추천합니다.
추천 이유를 자동 생성하고, 색상 보정으로 추천 정확도를 높입니다.

---

## 프로젝트 구조

```
project/
│
├── fashion_dataset/       # 검색 대상 의류 이미지 (jpg, jpeg, png, webp)
├── archive/               # 데이터셋에서 제거된 이미지 보관 (복구 가능)
├── test_img/              # 쿼리 이미지 1장 이상 (jpg, jpeg, png, webp)
├── cache/                 # 자동 생성되는 캐시 폴더
│   ├── vectors.npy        # 데이터셋 임베딩 벡터 행렬 (N, 768)
│   └── filenames.npy      # 데이터셋 이미지 경로 목록
│
├── main.py                # 전체 실행 흐름 관리 (CLI 단독 실행용)
├── app.py                 # FastAPI 서버 (백엔드 연동 / Swagger UI)
├── service.py             # 백엔드(FastAPI 등) 연동용 인터페이스
├── exceptions.py          # 백엔드 연동용 커스텀 예외 클래스
├── explainer.py           # CLIP 텍스트 프로브 기반 추천 이유 생성
├── build_vectors.py       # 데이터셋 임베딩 생성 및 캐시 저장
├── remove_items.py        # 데이터셋 항목 제거 스크립트
├── detector.py            # YOLO 기반 사람 영역 탐지/crop
├── embedding.py           # CLIP 모델 로드 / 이미지 임베딩 생성
├── recommend.py           # 유사도 계산 / Top-K 추천 / 색상 보정 / 시각화 / CSV 저장
├── color_analysis.py      # 쿼리 이미지 색상 추출 및 metadata 색상 카테고리 매핑
├── cache_manager.py       # 캐시 저장 / 로드
├── metadata.py            # 의류 메타데이터(csv) 로드 및 결합
├── metadata.csv           # 이미지별 속성 정보 (category, color, pattern 등)
├── exclude_list.txt       # 데이터셋에서 제거할 이미지 파일명 목록
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
pip install torch transformers Pillow scikit-learn matplotlib tqdm ultralytics pandas fastapi uvicorn python-multipart
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

### 순서 4 - 추천 실행 (CLI)

```bash
python main.py
```

### 순서 4-B - FastAPI 서버 실행 (백엔드 연동 / Swagger 테스트)

```bash
uvicorn app:app --host 0.0.0.0 --port 8001
```

실행 후 브라우저에서 아래 주소로 접속하면 Swagger UI에서 바로 테스트할 수 있습니다.

```
http://localhost:8001/docs
```

서버 상태 확인:
```
http://localhost:8001/health
```

> `main.py`(CLI)와 `app.py`(서버)는 완전히 독립적입니다.
> TOP_K 등 설정값도 각 파일에서 따로 관리합니다.

---

## 출력 예시

콘솔에는 순위/파일명/유사도/추천 이유가 출력됩니다.

```
=======================================================
  [ 추천 결과 ]
-------------------------------------------------------
   1. 15970.jpg
      score: 0.9120  → 색상(네이비)·패턴(체크)이 유사한 셔츠입니다

   2. 19547.jpg
      score: 0.8870  → 색상(블루)이 유사한 맨투맨 스웨트셔츠입니다

   3. 23451.jpg
      score: 0.8550  → 전반적인 스타일이 유사한 티셔츠입니다

   4. 09823.jpg
      score: 0.8210              ← Top-5 이후는 reason 없음
=======================================================
```

전체 메타데이터(category, color, pattern 등)와 추천 이유는 `result.csv`에 모두 저장됩니다.

```
rank,filename,score,clip_score,color_score,reason,category,sub_category,...
1,15970.jpg,0.912,0.890,0.62,색상(네이비)·패턴(체크)이 유사한 셔츠입니다,TOP,SHIRT,...
2,19547.jpg,0.887,0.870,0.00,색상(블루)이 유사한 맨투맨 스웨트셔츠입니다,TOP,SWEATSHIRT,...
```

시각화 창에는 쿼리 이미지와 Top-5 추천 결과가 함께 표시되며,
각 추천 이미지 아래에 순위/파일명/유사도와 메타데이터 전체 필드가 표시됩니다.

---

## 각 파일 역할 요약

| 파일 | 역할 |
|---|---|
| `main.py` | CLI 단독 실행 (콘솔 출력 + 시각화 + CSV 저장) |
| `app.py` | FastAPI HTTP 서버 (백엔드 연동 + Swagger UI) |
| `service.py` | 백엔드(FastAPI 등) 연동용 인터페이스 |
| `exceptions.py` | 백엔드 연동용 커스텀 예외 클래스 (에러 코드/HTTP 상태코드) |
| `explainer.py` | CLIP 텍스트 프로브로 추천 이유 자동 생성 |
| `build_vectors.py` | 데이터셋 임베딩 생성 및 캐시 저장 (YOLO crop 포함) |
| `remove_items.py` | 데이터셋 항목 제거 스크립트 (이미지 이동 + metadata 삭제 + 캐시 재생성) |
| `detector.py` | YOLO로 사람 영역 탐지 및 crop |
| `embedding.py` | CLIP 모델 로드, 이미지 → 벡터 변환 |
| `recommend.py` | 유사도 계산, Top-K 추천, 색상 점수 보정, 시각화, CSV 저장 |
| `color_analysis.py` | 쿼리 이미지 색상 추출(K-means) 및 metadata 색상 카테고리 매핑 |
| `cache_manager.py` | 캐시 저장/로드 |
| `metadata.py` | metadata.csv 로드 및 추천 결과에 결합 |
| `utils.py` | 이미지 로드, 경로 처리 등 공통 함수 |
| `exclude_list.txt` | 데이터셋에서 제거할 이미지 파일명 목록 (remove_items.py에서 사용) |

---

## 설정값 변경 방법

`main.py` 상단의 설정값을 수정하면 됩니다.

```python
TOP_K                    = 10  # 추천 수
TOP_K_DISPLAY            = 5   # 시각화에서 보여줄 추천 수
EXPLAIN_TOP_N            = 5   # 추천 이유를 생성할 상위 N개 (늘리면 더 많은 항목에 이유 표시)
CANDIDATE_POOL_MULTIPLIER = 3  # 색상 보정을 위해 1차로 가져올 후보군 배수 (TOP_K × 이 값)
```

`app.py`(서버)와 `service.py`(서버 내부)의 설정값은 독립적으로 관리됩니다.

---

## 캐시 관련 안내

| 상황 | 해결 방법 |
|---|---|
| `main.py` 실행 시 캐시 없음 오류 | `python build_vectors.py` 먼저 실행 |
| 데이터셋에 이미지 추가/삭제 | `python build_vectors.py` 재실행 |
| 캐시를 초기화하고 싶을 때 | `cache/` 폴더 삭제 후 재실행 |

---

## 데이터셋 항목 제거 (remove_items.py)

품질 기준에 맞지 않는 이미지(오분류, 다수 객체 포함 등)를 데이터셋에서 제거할 때 사용합니다.
이미지는 완전 삭제가 아니라 `archive/` 폴더로 이동하므로 실수 시 복구할 수 있습니다.

### 사용 방법

```
1. exclude_list.txt에 제거할 파일명을 한 줄씩 추가
   # 주석은 # 으로 시작
   12345.jpg
   67890.jpg

2. python remove_items.py 실행

3. 확인 프롬프트에서 y 입력
```

### 처리 순서

1. `fashion_dataset/` → `archive/` 폴더로 이미지 이동
2. `metadata.csv`에서 해당 행 삭제
3. `build_vectors.py` 자동 실행 → 캐시 재생성 (기존 캐시 자동 덮어쓰기)

### 주의사항

- `exclude_list.txt`에 있는 파일이 `fashion_dataset/`에 없으면 경고만 출력하고 계속 진행합니다.
- 나중에 같은 이미지를 다시 추가하려면 `archive/`에서 `fashion_dataset/`으로 이동 후 `build_vectors.py`를 재실행하면 됩니다.
- 제거 후에는 `metadata.csv`도 함께 정리되므로 별도로 수정할 필요 없습니다.

---

## 메타데이터 안내

`metadata.csv`는 `image_name` 컬럼(예: `15970.jpg`)을 기준으로 `fashion_dataset`의 파일명과 매칭됩니다.

- 매칭되는 이미지: category, color, pattern 등 11개 필드가 결과에 표시됩니다.
- 매칭되지 않는 이미지(metadata.csv에 없는 파일): 모든 필드가 `-`로 표시되며, 프로그램은 에러 없이 계속 진행됩니다.

`metadata.csv`가 아예 없어도 프로그램은 정상 동작합니다 (메타데이터 없이 CLIP 유사도만으로 추천).

---

## 색상 보정 (color boost)

CLIP은 모양/카테고리는 잘 잡지만 색상 구분은 상대적으로 약해서, 추천 결과에 색상이 크게 다른 의류가 섞여 나올 수 있습니다. 이를 보완하기 위해 쿼리 이미지의 주요 색상을 추출해 보조 점수로 반영합니다.

### 동작 방식

1. `color_analysis.py`가 K-means로 쿼리 이미지 **중앙 50% 영역**의 주요 색상을 최대 3개까지 추출하고, 각 색상을 metadata.csv의 14개 색상 카테고리(BLACK, WHITE, NAVY 등) 중 가장 가까운 것으로 매핑합니다.
2. CLIP 유사도로 1차 후보군을 `TOP_K * CANDIDATE_POOL_MULTIPLIER`(기본 3배)만큼 넉넉하게 가져옵니다.
3. 각 후보의 `color` 메타데이터가 쿼리의 주요 색상과 일치하면 가산점을 받습니다.
4. 최종 점수로 재정렬한 뒤 `TOP_K`만큼 잘라 반환합니다.

```
최종 score = clip_score * 0.85 + color_score * 0.15
```

### 왜 중앙 50% 영역만 사용하는가

이미지 전체 픽셀을 쓰면 흰 배경처럼 넓은 단색 배경이 주요 색상으로 잘못 추출됩니다. 중앙 50% 영역만 사용하면 의류가 중앙에 있는 경우(펼쳐놓은 사진, 착용샷 모두) 배경 영향을 자연스럽게 줄일 수 있습니다. 추가 모델 없이 속도 영향도 거의 없습니다.

### 왜 후보군을 넉넉하게 가져오는가

CLIP 1차 순위에서는 11~20위권이었지만 색상이 일치해서 보정 후 Top-10 안에 들어오는 경우가 있습니다. `find_top_k()`가 처음부터 Top-10만 반환하면 이런 역전이 반영되지 않으므로, `recommend.py`의 `apply_color_boost()`를 호출하기 전에 더 넓은 후보군(`CANDIDATE_POOL_MULTIPLIER`)을 가져오도록 설계했습니다.

### 쿼리 이미지가 여러 장인 경우

`color_analysis.merge_color_profiles()`가 각 이미지의 색상 비율을 평균내어 병합합니다. 단순 합산이 아니라 평균을 내는 이유는, 합산하면 이미지 장수만큼 비율 합이 커져서(예: 2장이면 합이 2.0) `color_score`가 0~1 범위를 벗어나 점수 체계가 깨지기 때문입니다.

### 설정값 변경

`recommend.py`의 `COLOR_WEIGHT`(기본 0.15)로 색상 점수의 영향력을 조절할 수 있습니다. `main.py`/`service.py`의 `CANDIDATE_POOL_MULTIPLIER`로 1차 후보군 크기를 조절할 수 있습니다.

### 색상 매핑 기준 조정

`color_analysis.py`의 `COLOR_REFERENCE_RGB`에 14개 색상 카테고리의 기준 RGB 값이 정의되어 있습니다. 실제 추천 결과를 보면서 특정 색상이 자주 잘못 분류되면 이 표의 값만 조정하면 됩니다.

---

## 추천 이유 생성 (explainer)

추천 결과마다 "왜 이 옷이 추천됐는지"를 자동으로 생성합니다.

### 동작 원리 (CLIP 텍스트 프로브 - 비교형)

1. 쿼리 이미지(들)의 특성을 CLIP 텍스트 프로브로 분석 (색상/패턴/핏/카테고리)
   - 쿼리가 여러 장이면 교집합 전략으로 공통 특성만 추출
   - 색상은 K-means 결과를 우선 사용 (CLIP 프로브보다 정확)
2. 추천 결과의 특성을 분석 (metadata 우선, 없으면 CLIP 프로브)
3. 쿼리 특성 vs 결과 특성 비교 → 일치 항목으로 이유 문구 생성

```
쿼리: 네이비 체크 셔츠
결과: 네이비 체크 셔츠
→ "색상(네이비)·패턴(체크)이 유사한 셔츠입니다"

쿼리: 블랙 맨투맨 (여러 장, 패턴 불일치)
결과: 블랙 단색 맨투맨
→ "색상(블랙)이 유사한 맨투맨 스웨트셔츠입니다"
```

### 패턴 처리 규칙

- 쿼리와 결과 패턴이 정확히 일치할 때만 패턴을 이유로 표시
- `OTHER` 패턴은 분류 불가로 이유에서 생략 (억지 추론 방지)
- `SOLID`(단색)는 색상에 이미 반영되므로 패턴 이유에서 생략

### 설정값

`main.py`와 `service.py`의 `EXPLAIN_TOP_N`(기본 5)으로 이유를 생성할 항목 수를 조정할 수 있습니다. 이 값 이후 항목은 `reason: null`로 반환됩니다.

---

## 백엔드 연동 (FastAPI 등)

`service.py`가 백엔드에서 import할 단일 진입점입니다. 백엔드 담당자는 CLIP/YOLO/캐시 내부 구현을 몰라도 아래 두 함수만 사용하면 됩니다.

### 대응 API 명세

```
POST /internal/clip/recommend
Content-Type: multipart/form-data

필드: style_images (File[], 1장 이상, jpg/png/webp)
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

> `TOO_MANY_IMAGES`는 `exceptions.py`에 정의는 되어 있지만 `service.py`에서는 사용하지 않습니다. 이미지 개수(1~3장) 제한은 프론트엔드/백엔드의 정책 영역으로 판단해 AI 쪽에서는 강제하지 않기로 결정했습니다.

반환값 예시 (= API 응답의 `recommendations` 배열 항목):
```python
[
    {
        "rank": 1,
        "image_name": "15970.jpg",
        "score": 0.912,
        "clip_score": 0.890,
        "color_score": 0.620,
        "reason": "색상(네이비)·패턴(체크)이 유사한 셔츠입니다",
        "category": "TOP", "sub_category": "SHIRT", "article_type": "Shirts",
        "color": "NAVY", "season": "Fall", "usage": "Casual", "gender": "Men",
        "pattern": "CHECK", "fit": "SLIM", "fabric": "COTTON",
    },
    {
        "rank": 6,
        "image_name": "23451.jpg",
        "score": 0.810,
        "clip_score": 0.790,
        "color_score": 0.000,
        "reason": null,   ← EXPLAIN_TOP_N(기본 5) 이후는 null
        ...
    },
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
| `reason` | **추가됨 (명세 외).** CLIP 텍스트 프로브로 자동 생성. Top-5만 생성, 이후는 null |
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

### 3. 메타데이터 가중치 고도화
현재 색상(COLOR_WEIGHT=0.15)만 보조 점수로 반영하고 있습니다.
카테고리 등 다른 메타데이터도 가중치에 추가할 예정입니다.

```
최종 점수 = CLIP 유사도 * 0.7
          + category 점수 * 0.2
          + color 점수    * 0.1
```

확장 시 `recommend.py`의 `apply_color_boost()` 함수를 참고해 동일 패턴으로 확장하면 됩니다.

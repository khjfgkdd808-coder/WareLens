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
├── main.py                # 전체 실행 흐름 관리
├── build_vectors.py       # 데이터셋 임베딩 생성 및 캐시 저장
├── embedding.py           # CLIP 모델 로드 / 이미지 임베딩 생성
├── recommend.py           # 유사도 계산 / Top-K 추천 / 시각화
├── cache_manager.py       # 캐시 저장 / 로드
├── utils.py               # 공통 유틸리티 (이미지 로드, 경로 처리)
└── README.md              # 이 파일
```

---

## 환경 요구사항

- Python 3.10 이상
- Windows 환경 기준

---

## 설치 방법

```bash
pip install torch transformers Pillow scikit-learn matplotlib tqdm
```

---

## 실행 방법

### 순서 1 - 데이터셋 준비

`fashion_dataset/` 폴더에 의류 이미지를 넣습니다.

```
fashion_dataset/
├── tee_001.webp
├── tee_002.jpg
└── ...
```

### 순서 2 - 벡터 캐시 생성 (최초 1회 / 데이터셋 변경 시)

```bash
python build_vectors.py
```

실행 결과로 `cache/vectors.npy`와 `cache/filenames.npy`가 생성됩니다.
데이터셋에 이미지를 추가하거나 삭제한 경우 다시 실행해야 합니다.

### 순서 3 - 쿼리 이미지 준비

`test_img/` 폴더에 검색 기준이 될 이미지를 1~3장 넣습니다.
여러 장을 넣으면 임베딩 평균값으로 추천이 수행됩니다.

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

```
Top 10 Recommendations

 1. tee_020.webp
    Similarity: 0.9630

 2. tee_019.webp
    Similarity: 0.8385

 3. tee_017.webp
    Similarity: 0.7901

...
```

시각화 창이 별도로 열리며 쿼리 이미지와 Top-5 추천 결과를 함께 보여줍니다.

---

## 각 파일 역할 요약

| 파일 | 역할 |
|---|---|
| `main.py` | 전체 실행 흐름 관리 |
| `build_vectors.py` | 데이터셋 임베딩 생성 및 캐시 저장 |
| `embedding.py` | CLIP 모델 로드, 이미지 → 벡터 변환 |
| `recommend.py` | 유사도 계산, Top-K 추천, 시각화 |
| `cache_manager.py` | 캐시 저장/로드 |
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

## 향후 확장 계획

현재는 CLIP 유사도만 사용하지만, 아래와 같이 메타데이터 가중치를 추가할 예정입니다.

```
metadata.csv 컬럼: category, sub_category, color, pattern

최종 점수 = CLIP 유사도 * 0.7
          + category 점수 * 0.2
          + color 점수    * 0.1
```

확장 시 `recommend.py`의 `find_top_k()` 함수 내 주석 처리된 확장 포인트를 참고하세요.

# AI 체형 분석 및 사이즈 추천 시스템 (MediaPipe Module)

MediaPipe Pose Landmarker와 보정 알고리즘을 활용하여 사용자의 전신 사진과 신체 스펙(키, 몸무게)으로부터 최적의 상의 사이즈 및 체형 맞춤형 핏 스타일을 추천합니다.

---

## 프로젝트 구조

```
project/
│
├── models/
│   └── pose_landmarker_heavy.task  # MediaPipe AI 모델 가중치 파일
│
├── core/
│   └── analyzer/
│       ├── __init__.py
│       ├── pipeline.py             # OpenCV 이미지 변환 및 관절 좌표 추출
│       └── recommender.py          # 사이즈 보정 및 핏 스타일 판정 엔진
│
├── main.py                         # FastAPI 웹 인터페이스 및 라우터 관리
└── README.md                       # 이 파일
```

---

## 환경 요구사항

- Python 3.10 이상
- 리눅스 / 윈도우 서버 배포 환경 (Headless OpenCV 적용)

---

## 설치 방법

```bash
pip install fastapi uvicorn mediapipe opencv-python-headless numpy pydantic python-multipart
```

---

## 실행방법

### 순서 1 - AI 핵심 가중치 모델 준비
서버 초기화 에러를 방지하기 위해 구동 전에 반드시 아래 가중치 파일을 외부에서 다운로드하여 `models/` 디렉토리 하위에 수동 배치해야 합니다.

```bash
mkdir models
wget https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task -O models/pose_landmarker_heavy.task
```

### 순서 2 - 추천 서버 실행
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
실행 후 `http://localhost:8000/docs`에 접속하여 대화형 Swagger UI 문서 및 API 테스트를 진행할 수 있습니다.

---

## 출력 예시

### API 요청 구조 (POST /api/v1/analyze/body)
- **Multipart Form Data**: `height_cm=175.0`, `weight_kg=70.0`, `gender=MALE`, `file=[전신사진 이미지 바이너리]`

### 응답 결과 구조 (200 OK)
```json
{
  "status": "SUCCESS",
  "data": {
    "bmi": 22.86,
    "bmi_grade": "정상",
    "ratios": {
      "shoulder_ratio": 0.2251,
      "upper_lower_ratio": 0.6841,
      "hip_shoulder_ratio": 0.7812
    },
    "recommendation": {
      "final_size": "M",
      "fit_type": "레귤러핏",
      "fit_desc": "표준적인 핏입니다. 너무 끼거나 크지 않아 편안하고 대중적인 착용감을 줍니다.",
      "reasons": [
        "[MALE 규격 지표] 키(175.0cm) / 몸무게(70.0kg) 기준 기본 M 사이즈 후보 선정",
        "신체 실루엣 지표 종합 분석 -> 최종 레귤러핏 스타일 가이드 확정"
      ]
    },
    "annotated_image_base64": "iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```

---

## 각 파일 역할 요약

| 파일명 | 역할 |
|---|---|
| `main.py` | FastAPI 엔드포인트 라우팅, HTTP 상태 코드 매핑 및 입력 데이터 유효성 검증 |
| `core/analyzer/pipeline.py` | OpenCV 이미지 디코딩 및 MediaPipe를 통한 33개 신체 관절 좌표 정밀 추출 |
| `core/analyzer/recommender.py` | 키/몸무게 기반 점수제 알고리즘 수행, BMI 및 어깨 비율 데이터 연동 다차원 보정 |

---

## 설정값 변경 방법
`core/analyzer/recommender.py` 상단의 `KS_SIZE_CHART` 의류 규격 범주를 수정하면 남성(MALE) 및 여성(FEMALE)의 기성복 채점 매칭 기준을 각각 변경할 수 있습니다.

```python
KS_SIZE_CHART = {
    "MALE": {
        "S": {"height": (165, 175), "weight": (55, 65)},
        "M": {"height": (170, 180), "weight": (63, 73)},
        "L": {"height": (175, 185), "weight": (70, 82)},
        "XL": {"height": (180, 190), "weight": (80, 95)}
    },
    "FEMALE": {
        "XS": {"height": (155, 165), "weight": (43, 50)},
        "S": {"height": (160, 170), "weight": (48, 55)},
        "M": {"height": (165, 175), "weight": (53, 62)},
        "L": {"height": (170, 180), "weight": (60, 70)},
        "XL": {"height": (175, 185), "weight": (68, 80)}
    }
}
```

---

## 캐시 관련 안내

| 상황 | 해결 방법 |
|---|---|
| 서버 시작 시 모델 로드 실패 오류 | `models/pose_landmarker_heavy.task` 가중치 파일 경로 및 다운로드 유무 재확인 |
| 실시간 API 속도 최적화 필요 시 | 서버 가동 시 메모리에 싱글톤 형태로 AI 모델 상시 적재(캐싱) 자동 적용 완료 |

---

## 향후 확장 계획 및 기술적 고도화 방안

### 1. 2D 정면 이미지 기반 부피(Z축) 측정 한계 극복
- **현상 및 한계**: 현재 정면 사진 기반의 MediaPipe Pose Landmarker 추론은 골격(X, Y축) 중심 연산과 BMI(평균 체중 비율)에 의존하므로, 여성 의류 상의 치수 결정의 핵심인 '가슴 볼륨(Bust Volume/Depth)'을 독립적으로 정밀 측정하는 데 기술적 한계가 존재합니다.
- **1단계 대응 (현재 반영)**: 사용자 인지 기반의 '선택적 컵 사이즈(Cup Size) 직접 입력 룰'을 도입하여, 여성(FEMALE) 유저가 C컵 이상의 고볼륨 체형일 경우 상의 가슴 부위 압박 및 실루엣 붕괴를 방지하기 위한 업사이징(Size-Up) 보정 레이어를 탑재했습니다.
- **2단계 고도화 플랜 (컴퓨터 비전 확장)**: 사용자 이탈률을 고려한 UX 리서치를 선행한 후, 90도 측면(Side-Profile) 전신 사진을 추가 수용하는 파이프라인 개설을 검토 합니다. 정면 가슴 너비(Front Chest Width)와 측면 가슴 두께(Side Chest Depth)를 연동한 타원 단면적 기하학 공식을 도입하여 실제 가슴둘레(cm)를 1대1 물리 수치로 정밀 산출할 계획입니다.
### 2. 의류 원단 속성 메타데이터(Fabric Properties) 연동을 통한 추천 정교화
- **현상 및 필요성**: 동일한 체형 지표와 가슴 볼륨을 가진 사용자라 하더라도, 선택한 의류의 원단 특성에 따라 실제 착용 시 체감 핏과 불편함(예: 블레이저 서포트 부족, 셔츠 가슴 단추 벌어짐 현상)이 극명하게 갈리는 한계가 있습니다.
- **고도화 방안**: 추천 대상 상품 정보에 '신축성 레벨(높음/보통/없음)' 및 '원단 두께' 속성을 메타데이터(Metadata) 팩터로 추가 수집하여 AI 추천 엔진과 연동합니다.
- **알고리즘 반영 스펙(Logic)**:
  - **신축성 없음(Non-stretch)** 의류(예: 우븐 셔츠, 블레이저 타깃): 여성 고볼륨(C컵 이상) 체형 혹은 골격 발달형 유저가 매칭될 경우, 전면 유실 및 활동성 제약을 방지하기 위해 알고리즘 내부에서 무조건 1단계 업사이징(`Size-Up`) 보정 가중치를 더합니다.
  - **신축성 높음(Stretch)** 의류(예: 니트웨어, 스판 맨투맨 타깃): 원단 고유의 신축성 및 체형 수용 능력을 감안하여, 별도의 보정 패널티 없이 데이터 본연의 정사이즈(`True Size`)를 제안하도록 알고리즘 예외 분기를 정교화할 계획입니다.
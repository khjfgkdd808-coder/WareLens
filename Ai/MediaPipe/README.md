# AI 3D 체형 분석 및 KS 규격 사이즈 추천 시스템 (WareLens AI)

MediaPipe Pose Landmarker의 Z축(깊이) 데이터를 활용하여 단 한 장의 정면 2D 사진으로부터 사용자의 **입체적인 3D 부피(몸통 두께 및 가슴둘레)**를 추정합니다. 계산된 실제 치수(cm)를 대한민국 KS 표준 의류 규격(KS K 0050/0051)과 매칭하여 가장 정확한 상의 사이즈와 체형 맞춤형 핏(Fit)을 추천하는 시스템입니다.

---

## 프로젝트 구조

```text
project/
│
├── models/
│   └── pose_landmarker_heavy.task  # MediaPipe AI 모델 가중치 파일
│
├── core/
│   ├── analyzer/
│   │   ├── __init__.py
│   │   ├── pipeline.py             # 3D 랜드마크 추출 및 타원 공식 기반 가슴둘레(cm), 부피 연산
│   │   └── recommender.py          # KS 표준 규격(가슴둘레) 매칭 및 입체감 기반 핏(Fit) 판정 엔진
│   │  
│   └── generator/
│       └── run_catvton.py          # CatVTON 모델 기반 초고속 가상 피팅 코어
│
├── CatVTON/                        # CatVTON 의존성 및 모델 디렉토리
│
├── main.py                         # FastAPI 웹 인터페이스 및 통합 파이프라인 라우터
└── README.md                       # 이 파일
```

---

## 환경 요구사항

- Python 3.10 이상
- 리눅스 / 윈도우 서버 배포 환경 (Headless OpenCV 적용)
- (선택) CatVTON 구동을 위한 PyTorch 및 CUDA 지원 GPU 환경

---

## 설치 방법

```bash
# 통합 웹 및 비전 분석 필수 패키지 설치
pip install fastapi uvicorn python-multipart opencv-python-headless numpy mediapipe

# CatVTON 피팅 엔진 가동 시 추가 의존성 (필요시)
# pip install torch torchvision diffusers transformers accelerate
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
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```
실행 후 `http://localhost:8002/docs`에 접속하여 대화형 Swagger UI 문서 및 API 테스트를 진행할 수 있습니다.

---

## 출력 예시

### API 요청 구조 (POST `/api/v1/analyze/body`)
- **Multipart Form Data**: 
  - `height_cm=175.0` (필수: 스케일 변환을 위한 기준 키)
  - `weight_kg=70.0` (호환성 유지를 위해 남겨둠)
  - `gender=MALE`
  - `file=[전신사진 이미지 바이너리]`

### 응답 결과 구조 (200 OK)
```json
{
  "status": "SUCCESS",
  "data": {
    "user_id": "1차테스트",
    "annotated_image_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "size_analysis": {
      "measured_chest_girth_cm": 96.5,
      "measured_torso_depth_cm": 21.3,
      "final_size": "95 (M)",
      "fit_type": "레귤러핏",
      "fit_desc": "표준적인 KS 규격에 딱 맞는 편안한 핏입니다.",
      "reasons": [
        "분석된 3D 가슴둘레(96.5cm) 기준, KS 표준 95 (M) 사이즈가 가장 적합합니다.",
        "몸통의 입체적 부피감이 표준 범위 내에 있어 레귤러핏 연출이 가능합니다."
      ]
    }
  }
}
```

---

## 각 파일 역할 요약

| 파일명 | 역할 |
|---|---|
| `main.py` | FastAPI 엔드포인트 라우팅, 전역 메모리 캐싱, 파이프라인 및 추천 엔진 통합 제어 |
| `core/analyzer/pipeline.py` | MediaPipe의 Z축(깊이) 데이터를 활용하여 3D 거리를 측정하고, Ramanujan의 타원 둘레 공식을 적용해 실제 가슴둘레(cm)와 부피를 산출 |
| `core/analyzer/recommender.py` | 추출된 가슴둘레(cm)와 키(cm)를 KS K 0050/0051 국가 표준 의류 규격과 대조하여 최적 사이즈 추천 및 몸통 두께 비례에 따른 핏(Fit) 보정 |

---

## 설정값 변경 방법
`core/analyzer/recommender.py` 상단의 `KS_SIZE_CHART` 딕셔너리를 수정하면 남성(MALE) 및 여성(FEMALE)의 기성복 채점 매칭 기준(가슴둘레 및 키)을 브랜드 자사몰 규격에 맞게 커스텀할 수 있습니다.

```python
KS_SIZE_CHART = {
    "MALE": {
        "90 (S)": {"chest_girth": 90, "height": 165},
        "95 (M)": {"chest_girth": 95, "height": 170},
        "100 (L)": {"chest_girth": 100, "height": 175},
        "105 (XL)": {"chest_girth": 105, "height": 180},
        "110 (XXL)": {"chest_girth": 110, "height": 185}
    },
    "FEMALE": {
        "85 (S)": {"chest_girth": 85, "height": 155},
        "90 (M)": {"chest_girth": 90, "height": 160},
        "95 (L)": {"chest_girth": 95, "height": 165},
        "100 (XL)": {"chest_girth": 100, "height": 170}
    }
}
```

---

## 향후 확장 계획 및 기술적 고도화 방안

### 1. 다중 앵글(Multi-Angle) 이미지 지원을 통한 부피 측정 극대화
- **현재 달성 성과**: 기존 2D 정면 사진의 평면적 한계를 극복하기 위해 MediaPipe의 Z축 뎁스(Depth) 추정과 수학적 단면적 공식(타원 둘레 공식)을 결합하여 가상의 3D 가슴둘레와 몸통 두께를 성공적으로 도출했습니다.
- **고도화 플랜**: 단일 사진에서의 추정(Estimation)을 넘어, 사용자가 90도 측면(Side-Profile) 사진을 추가로 업로드할 경우 시스템이 이를 융합 처리하는 다중 앵글 파이프라인을 기획 중입니다. 이를 통해 흉곽의 실제 두께를 픽셀 단위로 직접 실측하여 3D 스캐너급의 정밀도를 구현할 예정입니다.

### 2. 의류 원단 속성 메타데이터(Fabric Properties) 연동을 통한 추천 정교화
- **현상 및 필요성**: 동일한 체형(가슴둘레 100cm)을 가진 사용자라 하더라도, 선택한 의류의 원단 특성(신축성)에 따라 체감 핏과 활동성이 극명하게 갈립니다.
- **고도화 방안**: 상품 메타데이터에 '신축성 레벨' 및 '원단 두께'를 추가하여 추천 엔진의 보정 팩터로 사용합니다.
  - **신축성 없음(Non-stretch)**: 우븐 셔츠나 블레이저 등 늘어나지 않는 소재를 입을 때, 가슴 부피(Z축 깊이)가 큰 사용자에게는 단추 벌어짐 방지를 위해 알고리즘 내부에서 1단계 업사이징(Size-Up)을 자동 권장합니다.
  - **신축성 높음(Stretch)**: 니트웨어 등 신축성이 좋은 원단의 경우, 추출된 정사이즈(True Size)를 그대로 유지하여 최적의 실루엣을 제안합니다.

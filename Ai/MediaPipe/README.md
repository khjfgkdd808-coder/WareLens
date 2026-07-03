# AI 3D 체형 분석 및 고정밀 가상 피팅 통합 시스템 (WareLens AI)

MediaPipe Pose Landmarker의 Z축(깊이) 데이터를 활용하여 단 한 장의 정면 2D 사진으로부터 사용자의 입체적인 3D 부피(몸통 두께 및 가슴둘레)를 추정합니다. 계산된 실제 치수(cm)를 대한민국 KS 표준 의류 규격(KS K 0050/0051)과 매칭하여 가장 정확한 상의 사이즈와 체형 맞춤형 핏(Fit)을 추천하는 시스템입니다.

나아가 고도화된 가상 피팅(Track B) 파이프라인을 연동하여, SegFormer Clothes Parser 기반의 자동 상의 마스킹(S-Step)과 공식 CatVTON 확산 모델 기반의 인페인팅 추론(D-Step)을 통해 왜곡 없는 자연스러운 상의 가상 착장 이미지를 실시간으로 생성합니다. 본 엔진은 백엔드의 연속 대량 호출(Top-5 루프) 및 자원 제어 환경에 최적화되어 있습니다.

---

## 프로젝트 구조

```text
project/
│
├── models/                         # [최신화] 타 파트와의 자원 매핑 규격을 통일한 전역 모델 폴더
│   └── analyzer_pose_heavy.task    # [최신화] 체형 분석용 포즈 추정 3D 핵심 가중치 파일
│
├── core/
│   ├── analyzer/
│   │   ├── __init__.py
│   │   ├── pipeline.py             # 3D 랜드마크 추출 및 타원 공식 기반 가슴둘레(cm), 부피 연산
│   │   └── recommender.py          # KS 표준 규격(가슴둘레) 매칭 및 입체감 기반 핏(Fit) 판정 엔진
│   │  
│   └── generator/
│       └── run_catvton.py          # [최신화] 연속 루프 대응형 고정밀 가상 피팅 코어 파이프라인
│
├── CatVTON/                        # CatVTON 오픈소스 의존성 및 모델 디렉토리
│
├── app.py                          # [최신화] Lifespan 컨텍스트 및 자바 백엔드 공용 에러 레이어가 통합된 메인 웹 API 서버
└── README.md                       # 이 파일
```

---

## 핵심 비전 아키텍처 (Core Solved Issues)

본 가상 피팅 엔진은 확산 모델(Diffusion) 계열 모델이 가진 고질적인 연산 오류 및 구조적 가변성을 제어하기 위해 다음과 같은 자체 예외 처리 기술이 탑재되어 있습니다.

1. **종횡비 왜곡 교정 (Preserve Aspect Ratio)**
   - 입력 이미지를 강제로 3:4 비율로 리사이즈할 때 발생하는 인물 찌부러짐 및 핏 훼손을 차단하기 위해, 원본 이미지의 고유 비율을 유지한 채 부족한 축만 패딩 처리하는 전처리 레이어를 구현했습니다.
2. **자동 배경색 동기화 (Auto-Background Sampling)**
   - 패딩 여백을 단순 순백색(255, 255, 255)으로 채울 때 생성되는 유령 실루엣(Halo 아티팩트)을 방지하기 위해, 원본 사진의 좌상단(0,0) 좌표에서 배경색을 실시간 추출하여 도화지 톤을 완벽하게 동기화합니다.
3. **양방향 AI 스마트 크롭 (Smart Garment Crop)**
   - 제공된 옷 사진에 다른 모델이 착장하고 있거나 마네킹 컷인 경우에도 `SegFormer` AI가 실제 '상의(Label 4)' 픽셀만 감지하여 물리적 스케일을 최대화하므로, 합성 시 어깨가 극도로 작아지는 부작용을 원천 해결합니다.
4. **턱선 보호 및 목선 개방형 뺄셈 마스킹 (Jawline Protection & Neck Opening)**
   - 과도한 마스크 확장이 무지 검은 티셔츠를 셔츠 카라로 왜곡시키거나 턱선 영역을 오염시키는 것을 막기 위해, 얼굴 및 머리카락 영역은 수학적으로 차감(Subtract)하되 목 영역은 개방하여 의류 고유의 넥라인 구조를 복원합니다.
5. **골든 파라미터 및 포스트 알파 블렌딩 (Golden Inference & Post-Blending)**
   - 무지 원단의 색상 과포화 환각을 방지하기 위해 `guidance_scale=2.9`, `steps=40` 골든 밸런스를 고정하였으며, 추론 이후 가우시안 소프트 마스크 맵을 통해 하의(바지)와의 허리 경계선을 자연스럽게 알파 합성 처리합니다.
6. **Top-5 호출 루프 안정화 레이어 (VRAM OOM Prevention)**
   - 백엔드 서버의 다중 연속 요청 시 생성형 인공지능 내부의 임시 연산 행렬이 비워지지 않고 VRAM에 누적되어 다운되는 현상을 방지하기 위해, `try-finally` 블록 기반의 파이토치 캐시 완전 강제 플러시 로직을 도입했습니다.

---

## 환경 요구사항

- Python 3.10 이상
- 리눅스 / 윈도우 서버 배포 환경 (Headless OpenCV 적용)
- NVIDIA GPU 가속 환경 (VRAM 12GB 이상 필수, VRAM 16GB 이상 권장)

---

## 설치 방법

```bash
# 가상환경 생성 및 활성화 (파이썬 표준 venv 또는 conda 지원)
python3 -m venv venv
source venv/bin/activate

# 통합 웹 및 딥러닝 비전 분석 필수 패키지 일괄 설치
pip install -r requirements.txt

# 3. 독립 오픈소스 CatVTON 엔진 소스코드 로컬 직접 다운로드 및 동기화
# 메인 저장소의 정결함을 위해 가속 엔진은 로컬에서 독립 빌드합니다.
git clone https://github.com/zhengchong/CatVTON.git CatVTON
```

---

## 실행 방법

### 순서 1 - AI 핵심 가중치 모델 준비
서버 부팅 단계 크래시를 방지하기 위해 구동 전에 반드시 아래 가중치 파일을 외부에서 다운로드하여 최상위 `model/` 디렉토리 하위에 배치해야 합니다. CatVTON 및 SegFormer 가중치는 서버 기동 시 HuggingFace Hub를 통해 최초 1회 자동으로 통합 격리 다운로드됩니다.

```bash
mkdir models

wget https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task -O models/analyzer_pose_heavy.task

혹은

curl -L https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task -o models/analyzer_pose_heavy.task
```

### 순서 2 - 추천 및 피팅 서버 실행
```bash
# 무거운 가중치 인프라가 이중 적재되는 리스크를 막기 위해 최적화된 독립 코어로 실행합니다.
python app.py
```
실행 후 `http://localhost:8002/docs`에 접속하여 대화형 Swagger UI 문서 및 API 테스트를 진행할 수 있습니다.

---

## 출력 예시 (Output Examples)

### 1. 체형 분석 API 요청 및 응답 구조 (POST `/api/v1/analyze/body`)
- **Multipart Form Data**:
  - `user_id=1차테스트` (필수: 세션 매핑용 고유 키)
  - `height_cm=175.0` (필수: 백엔드 규격 데이터 이름 일치, 스케일 변환의 보정 기준 키)
  - `gender=MALE`
  - `file=[전신사진 이미지 바이너리]`

- **응답 결과 구조 (200 OK)**
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

### 2. 가상 피팅 API 요청 및 응답 구조 (POST `/api/v1/tryon`)
- **Multipart Form Data**:
  - `user_id=1차테스트` (필수: 분석 단계에서 적재 완료된 세션 매핑 키)
  - `garment_file=[의류 스냅샷/모델 컷 이미지 바이너리]` (선택)
  - `garment_name=15970.jpg` (선택: CLIP 연동 내부 데이터셋 파일명)

- **응답 결과 구조 (200 OK)**
```json
{
  "status": "SUCCESS",
  "data": {
    "tryon_image_base64": "iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```

---

## 각 파일 역할 요약

| 파일명 | 역할 |
|---|---|
| `app.py` | FastAPI 엔드포인트 라우팅, 전역 메모리 세션 캐싱(`USER_CACHE`), 3D 파이프라인 및 가상 착장 엔진 싱글톤 자원 로드 제어 |
| `core/analyzer/pipeline.py` | MediaPipe의 Z축 데이터를 기반으로 가중치 파일 상대 경로를 정규화하여 탐색하고, Ramanujan 타원 둘레 공식을 결합하여 신체 실측 부피값 도출 |
| `core/analyzer/recommender.py` | 추출된 가슴둘레와 키를 대조하여 최적 기성복 사이즈 채점 및 몸통 두께 비례에 따른 맞춤형 핏(Fit) 필터링 |
| `core/generator/run_catvton.py` | SegFormer 기반 상의 전처리 마스킹 연산 및 다중 연속 루프 구동 시 가비지 컬렉션을 보장하는 오피셜 CatVTON 추론 컴포넌트 |

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

## 향후 확장 계획
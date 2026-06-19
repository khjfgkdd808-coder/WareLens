WareLens - AI Platform / Integration 기획서

##1.개발 목표
목록: AI 서비스 통합 및 운영 환경 구축

핵심 과제:

FastAPI 기반의 고성능 비동기 AI 공통 서버 및 Gateway 구축

CLIP, MediaPipe, FAISS 기반의 벡터 인프라 및 추천·평가 체계 정립

Spring 및 Docker 환경과의 안정적인 서비스 통합 및 배포 프로세스 확립

##2. 세부 기획 및 개발 범위
[1] AI 플랫폼 (AI Platform)

###[1]FastAPI 공통 서버 구축

대용량 AI 추론 요청 처리를 위한 비동기(async/await) 기반의 FastAPI 아키텍처 수립

라우터 분리 및 데이터 검증을 위한 Pydantic 모델 도입

AI API Gateway 설계

메인 서버(Spring) 및 클라이언트의 요청을 엔드포인트별로 라우팅하는 단일 진입점 구축

서비스 과부하 방지를 위한 처리율 제한(Rate Limiting) 및 모니터링 인터셉터 설계

공통 응답 구조 설계

시스템 전반의 정합성을 위한 표준 응답 형식을 JSON 포맷으로 정의

{
  "success": true,
  "code": "SUCCESS_200",
  "message": "AI 추천 결과 반환 성공",
  "data": {
    "results": [
      { "id": "item_102", "score": 0.942 }
    ],
    "latency_ms": 32.5
  },
  "timestamp": "2026-06-15T10:35:00Z"
}

###[2] AI 인프라 (AI Infrastructure)
FAISS 운영 지원 & 벡터 데이터 관리

CLIP 모델이 추출한 임베딩 벡터를 실시간 유사도 검색이 가능하도록 FAISS 인덱스(IndexIVFFlat 등)에 저장 및 관리

신규 데이터 추가 시 인덱스를 점진적으로 업데이트(Incremental Update)하고 파일로 백업/로드하는 관리 모듈 개발

성능 측정 지원

임베딩 추출 속도, FAISS 검색 속도(Query Latency), 메모리 사용량을 실시간 로깅 및 프로파일링하는 기능 제공

###[3] 모델 평가 (Model Evaluation)
추천 결과 평가 및 성능 비교 분석

제공된 추천 아이템 리스트의 정확도를 평가하기 위한 지표(Hit Rate, NDCG) 계산 엔진 구현

모델 버전 업그레이드 또는 하이퍼파라미터 변경 시 A/B 테스트 형태의 성능 비교 보고서 자동 생성

테스트 데이터셋 관리

평가 신뢰성을 확보하기 위해 정답셋(Ground Truth) 및 벤치마크용 테스트 데이터셋을 버전별로 관리

###[4] 서비스 통합 (Service Integration)
CLIP ↔ MediaPipe 통합

MediaPipe로 사용자의 신체 특징점(Pose/Gesture 등) 또는 마스크 영역을 추출한 뒤, 해당 영역의 이미지를 CLIP의 입력값으로 가공하여 연동하는 멀티모달 파이프라인 구축

FastAPI ↔ Spring 통합

비즈니스 로직(Spring)과 AI 로직(FastAPI) 간의 REST API 통신 연동 및 RestTemplate/WebClient 연동 규격 정의

API 통합 테스트 및 이슈 해결

Mock 데이터 기반의 통합 테스트 시나리오 작성 및 데이터 유실, 타임아웃, 직렬화 에러 등 통합 이슈 모니터링 및 해결

###[5] 배포 (Deployment)
Docker 환경 구축 및 서비스 배포

CPU/GPU 가속 라이브러리(PyTorch, FAISS 등)가 포함된 경량화된 Dockerfile 정의

FastAPI 서버와 FAISS 백업 볼륨을 묶어서 관리하는 docker-compose.yml 작성

운영 환경 관리

컨테이너 헬스 체크(Health Check) 및 서버 자원(CPU, GPU Memory) 모니터링 환경 구성

###[6] 개발 환경 (Development Environment)
GitHub 관리 지원 및 브랜치 전략

Git Flow 기반 전략 채택: main(운영) - develop(통합) - feature/기능명(단위 개발) 구조의 안정적인 형상 관리

협업 환경 지원

FastAPI 자동 생성 Swagger Docs(/docs)를 상시 개방하여 Spring 개발자와의 API 규격 공유 가속화

##3. 사용 기술 스택 (Tech Stack)

Backend Framework	FastAPI, Spring Boot	

AI Model & Inference CLIP, MediaPipe, PyTorch

Vector DB / Search FAISS 

Data & Evaluation	Pandas, NumPy, Scikit-learn

DevOps / Infra	Docker, Docker Compose

Collaboration	GitHub, Swagger (OpenAPI)

##4. API 및 데이터 흐름

[클라이언트 / Spring] 
       │ 
       │ 1. 추천 요청 (이미지 또는 텍스트 데이터 전송)
       ▼
[FastAPI AI Gateway / 공통 서버]
       │ 
       │ 2. 특징점 추출 및 임베딩 변환 요청
       ▼
 ┌───────────[ AI 모델 파이프라인 ]───────────┐
 │                                           │
 │  [MediaPipe] 신체 특징점 영역 크롭/추출    │
 │       │                                   │
 │       ▼                                   │
 │  [CLIP] 고차원 임베딩 벡터($1 \times N$) 생성   │
 └───────────────────┬───────────────────────┘
                     │
                     │ 3. 쿼리 벡터 탐색 요청
                     ▼
       [FAISS 백너 데이터 인덱스] ──► 최적 유사도 아이템 ID 검색
                     │
                     │ 4. 검색 결과 및 성능 지표 결합
                     ▼
[FastAPI 공통 응답 구조 규격화] ──► [Spring / 클라이언트로 최종 반환]

##5. 예상 아키텍처 및 아웃풋 구조

ai-platform/
├── app/
│   ├── api/
│   │   ├── gateway.py          # AI API Gateway 라우팅 및 인증
│   │   └── v1/
│   │       ├── recommend.py    # 추천 API 엔드포인트
│   │       └── evaluate.py     # 모델 평가 및 데이터셋 관리 API
│   ├── core/
│   │   ├── config.py           # 환경 설정 및 모델 경로 관리
│   │   └── response.py         # 공통 응답 구조 정의 (Pydantic)
│   ├── infrastructure/
│   │   └── faiss_manager.py    # FAISS 인덱스 로드, 검색, 저장 관리
│   └── services/
│       ├── clip_service.py     # CLIP 임베딩 추출 로직
│       └── mediapipe_service.py# MediaPipe 특징점 추출 로직
├── tests/
│   ├── dataset/                # 테스트 데이터셋 관리 폴더
│   └── test_integration.py     # API 통합 테스트 코드
├── Dockerfile                  # 운영 배포용 도커 파일
└── docker-compose.yml          # 로컬 및 통합 테스트 환경 구성

##6. 최종목표
CLIP과 MediaPipe 기반의 멀티모달 AI 기술을 고성능 인프라(FastAPI, FAISS)에 안정적으로 이식하고, 

독립적인 AI 플랫폼 구조(AI Gateway)를 확립함으로써, 메인 서비스와의 결합도를 낮추고 

대규모 트래픽에서도 유연하게 확장 및 평가 가능한 최첨단 AI 서비스 환경을 구축한다




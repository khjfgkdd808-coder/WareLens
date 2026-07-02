# WareLens

AI 기반 의류 추천 및 체형 분석 서비스

---

# 프로젝트 소개

WareLens는 사용자의:
- 키
- 몸무게
- 전신사진
- 현재 보유 중인 의류 사진

을 입력받아:
- 사용자의 체형을 간단히 분석하고
- 의류 취향 및 스타일 특징을 추출한 뒤
- 쇼핑몰 상품 중 유사한 의류를 추천하는

웹 기반 AI 패션 추천 서비스입니다.

---

# 프로젝트 목표

## 핵심 목표

사용자가 이미 가지고 있는 옷과 체형을 기반으로:

- 취향과 유사한 의류 추천
- 체형 기반 사이즈 추천
- 간단한 핏 추천

을 제공하는 AI 기반 추천 시스템 구현.

---

# 주요 기능

## 1. 의류 유사도 추천

사용자가 업로드한 의류 사진을 기반으로:

- 색상
- 패턴
- 스타일
- 의류 카테고리

등의 특징을 분석하여 유사한 상품을 추천.

### 사용 기술

- CLIP embedding
- Cosine Similarity
- Vector Retrieval

---

## 2. 체형 기반 사이즈 추천

사용자의:
- 키
- 몸무게
- 전신사진

을 기반으로:

- BMI 계산
- 어깨 비율
- 상하체 비율

등의 feature를 추출하여 사이즈를 추천.

### 사용 기술

- MediaPipe Pose
- Rule-based Recommendation
- Size Chart 기반 보정

---

## 3. 추천 결과 제공

예시:

- 추천 사이즈: L
- 추천 핏: 세미오버핏
- 추천 이유:
  - 키/몸무게 기준 M~L 범위
  - 어깨 비율이 큰 편
  - 상체 비율이 긴 편

---

# 기술 스택

## AI / ML

- Python
- OpenAI CLIP
- MediaPipe
- OpenCV
- PyTorch
- Pandas
- NumPy

---

## Backend

- Spring Boot
- FastAPI

---

## Frontend

- React

---

## Infra / Tools

- Google Colab
- GitHub
- Google Drive

---

# AI 파이프라인

## 의류 추천 파이프라인

사용자 의류 이미지
↓
전처리
↓
CLIP Embedding
↓
Vector Similarity Search
↓
Top-K 추천

---

## 체형 분석 파이프라인

사용자 전신사진
↓
MediaPipe Pose Landmark 추출
↓
체형 Feature 계산
↓
사이즈표 기반 추천
↓
체형 보정
↓
최종 사이즈 추천

---

# 전처리 구조

## 학습용 전처리

- 데이터 수집
- 라벨링
- 카테고리 정리
- 이미지 정제
- 데이터셋 구축

---

## 서비스용 전처리

1. 입력 검증
2. 카테고리 분류
3. Detection / Crop
4. (선택) Segmentation
5. Normalize

---

# 기술 검증(PoC)

## 1. 의류 추천 PoC

### 목표

CLIP 기반 이미지 유사도 추천 가능 여부 검증.

### 진행 내용

- 반팔 이미지 약 50장 수집
- CLIP embedding 생성
- Cosine similarity 기반 유사 상품 검색
- Top-K 추천 테스트

### 결과

- 패턴 및 스타일 기반 유사도 검색 확인
- 기본 의류 추천 파이프라인 검증 완료

---

## 2. 체형 분석 / 사이즈 추천 PoC

### 목표

MediaPipe Pose 기반 체형 feature 추출 가능 여부 검증.

### 진행 내용

- 전신사진 landmark 추출
- 어깨 비율 계산
- 상하체 비율 계산
- BMI 계산
- Rule-based 사이즈 추천 구현

### 결과

- landmark 안정적 추출 확인
- 체형 비율 계산 가능 확인
- 사이즈 추천 로직 검증 완료

---

# 프로젝트 구조

```text
WareLens/
│
├── poc/
│   ├── clip/
│   └── mediapipe/
│
├── ai/
│
├── backend/
│
├── frontend/
│
├── dataset/
│
├── docs/
│
└── README.md

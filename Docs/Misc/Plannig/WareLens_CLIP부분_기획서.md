# WareLens - CLIP 기반 의류 추천 시스템 기획서

## 1. 담당 분야

AI 기반 의류 추천 시스템 개발

담당 기술
- CLIP (Contrastive Language-Image Pretraining)
- Python
- FastAPI
- Vector Similarity Search

---

## 2. 개발 목표

사용자가 선호하는 의류 이미지를 업로드하면

CLIP을 이용하여 이미지 특징을 벡터화하고,

유사한 스타일의 의류를 추천하는 기능 구현

---

## 3. 서비스 시나리오

### Step 1

사용자가 선호하는 의류 이미지 2~3장을 업로드

예시

- 검정 후드
- 오버핏 맨투맨
- 스트릿 스타일 티셔츠

---

### Step 2

업로드된 이미지들을 CLIP으로 임베딩

이미지1 → 벡터

이미지2 → 벡터

이미지3 → 벡터

---

### Step 3

벡터 평균 계산

(A + B + C) / 3

사용자의 종합 취향 벡터로 활용

---

### Step 4

상품 데이터셋의 벡터와 비교

코사인 유사도 계산

---

### Step 5

유사도가 높은 의류 추천

Top 10 추천

---

## 4. 데이터 구조

### 이미지 데이터

- 상품 이미지

---

### 메타데이터

#### Category

TOP
BOTTOM
OUTER
DRESS

---

#### Sub Category

TSHIRT
SHIRT
HOODIE
SWEATSHIRT
KNIT
SLEEVELESS
POLO
OTHER

---

#### Pattern

SOLID
STRIPE
CHECK
GRAPHIC

---

#### Color

BLACK
WHITE
GRAY
NAVY
BLUE
BEIGE
BROWN
GREEN
RED
PINK
YELLOW
PURPLE
ORANGE
MULTI
OTHER

---

## 5. 추천 방식

### 기본 추천

CLIP 벡터 유사도 기반 추천

---

### 추천 프리셋

사용자가 추천 성향을 선택 가능

#### 1. 색상 우선

- Color 가중치 증가
- 유사 색상 의류 우선 추천

#### 2. 균형형

- CLIP + Color + Pattern
- 요소를 균형 있게 반영

#### 3. 스타일 우선

- CLIP 유사도 비중 증가
- 색상보다 전체 스타일 반영

---

## 6. 시스템 구조

사용자

↓

이미지 업로드

↓

Spring Server

↓

FastAPI (CLIP)

↓

이미지 임베딩

↓

평균 벡터 생성

↓

유사도 검색

↓

추천 결과 생성

↓

Spring

↓

Frontend

---

## 7. API 설계

### 추천 요청

POST /recommend

---

### Request

{
  "images": [
    "image1",
    "image2",
    "image3"
  ],
  "preset": "balanced"
}

---

### Response

{
  "recommendations": [
    {
      "image_id": "0001",
      "score": 0.91
    },
    {
      "image_id": "0123",
      "score": 0.89
    }
  ]
}

---

## 8. 구현 범위

### 데이터 처리

- 상품 이미지 수집
- 이미지 전처리
- 메타데이터 관리
- 임베딩 생성

### 추천 엔진

- CLIP 적용
- 벡터 생성
- 평균 벡터 계산
- 코사인 유사도 검색

### API

- FastAPI 서버 구축
- 추천 API 구현
- 결과 반환

### 테스트

- 단일 이미지 추천 테스트
- 다중 이미지 추천 테스트
- 프리셋별 추천 결과 비교
- 추천 품질 검증

---

## 9. 기대 효과

- 사용자가 선호하는 스타일 기반 추천 가능
- 단순 카테고리 추천보다 높은 개인화 제공
- 여러 장의 이미지를 활용하여 취향을 종합적으로 반영
- 향후 사용자 맞춤 가중치 기능으로 확장 가능

---

## 10. 향후 확장 계획

### 추천 가중치 직접 조절

예시

- 색상 중요도 70%
- 패턴 중요도 20%
- 스타일 중요도 10%

슬라이더 UI를 통해 사용자 직접 설정 가능

---

### 카테고리 확장

현재

TOP

향후

- BOTTOM
- OUTER
- DRESS

지원 예정

---

### 추천 품질 향상

- 데이터셋 확대
- 메타데이터 고도화
- 벡터 검색 최적화
- 추천 알고리즘 개선

---

## 11. 개발 일정

~ 2026-06-15

- 추천 시스템 기획서 작성
- 추천 알고리즘 설계
- 데이터 구조 설계

2026-06-16 ~ 2026-06-30

- CLIP 추천 시스템 구현
- FastAPI 추천 서버 구축
- 추천 API 개발
- 데이터셋 적용
- Frontend 및 Backend 연동

2026-07-01 ~ 2026-07-15

- 추천 정확도 테스트
- 프리셋 튜닝
- 데이터 품질 개선
- 통합 테스트
- 최종 발표 버전 완성

---

## 최종 목표

사용자가 선호하는 의류 이미지 2~3장을 업로드하면

CLIP 기반으로 취향을 분석하여

유사한 스타일의 의류를 추천하는 서비스를 구현한다.

공모전 MVP에서는 상의(TOP)를 대상으로 개발하며,

향후 하의(BOTTOM), 아우터(OUTER), 원피스(DRESS)까지 확장 가능한 구조를 목표로 한다.

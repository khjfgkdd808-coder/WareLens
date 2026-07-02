# WareLens - CLIP 기반 의류 추천 시스템 기획서

## 1. 담당 분야

AI 기반 의류 추천 시스템 개발

담당 기술

* CLIP (Contrastive Language-Image Pretraining)
* Python
* FastAPI
* FAISS
* NumPy

---

## 2. 개발 목표

사용자가 선호하는 의류 이미지를 업로드하면

CLIP을 이용하여 이미지 특징을 임베딩 벡터로 변환하고,

FAISS 기반 유사도 검색을 통해

사용자가 선호하는 스타일과 유사한 의류를 추천하는 기능 구현

---

## 3. 서비스 시나리오

### Step 1

사용자가 선호하는 의류 이미지 2~3장을 업로드

예시

* 검정 후드
* 오버핏 맨투맨
* 스트릿 스타일 티셔츠

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

사용자의 종합 선호 벡터 생성

---

### Step 4

상품 데이터셋 벡터와 비교

FAISS 기반 Top-K 유사도 검색 수행

코사인 유사도를 활용하여 유사도가 높은 후보군 추출

---

### Step 5

유사도가 높은 의류 추천

Top 10 추천

---

## 4. 데이터 구조

### 이미지 데이터

* 상품 이미지

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

OTHER

---

#### Pattern

SOLID

STRIPE

CHECK

GRAPHIC

OTHER

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

### 벡터 캐시

* dataset_vectors.npy
* image_paths.npy

생성된 임베딩 벡터를 저장하여

서비스 재시작 시 재사용

불필요한 임베딩 재생성을 방지

---

## 5. 추천 방식

### 기본 추천

CLIP 임베딩 기반 유사도 추천

사용자가 업로드한 이미지들의 평균 벡터를 생성하고

FAISS를 이용하여 가장 유사한 의류를 검색한다.

---

### 메타데이터 기반 후처리

Category

Color

Pattern

정보를 활용하여

추천 결과를 필터링하거나 재정렬할 수 있다.

MVP에서는 메타데이터를 저장하고

향후 추천 품질 개선에 활용한다.

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

FAISS 유사도 검색

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

```json
{
  "style_images": [
    "image1",
    "image2",
    "image3"
  ]
}
```

---

### Response

```json
{
  "recommendations": [
    {
      "image_id": "0001",
      "score": 0.91,
      "category": "TOP",
      "sub_category": "HOODIE"
    },
    {
      "image_id": "0123",
      "score": 0.89,
      "category": "TOP",
      "sub_category": "SWEATSHIRT"
    }
  ]
}
```

---

## 8. 구현 범위

### 데이터 처리

* 상품 이미지 수집
* 이미지 전처리
* 메타데이터 관리
* 임베딩 생성
* 임베딩 캐시 생성
* npy 기반 벡터 저장
* 벡터 로드 최적화

---

### 추천 엔진

* CLIP 적용
* 벡터 생성
* 평균 벡터 계산
* FAISS 인덱스 생성
* Top-K 검색
* 코사인 유사도 기반 정렬

---

### API

* FastAPI 서버 구축
* 추천 API 구현
* 결과 반환

---

### 테스트

* 단일 이미지 추천 검증
* 다중 이미지 추천 검증
* 데이터셋별 추천 결과 비교
* 추천 품질 검증

---

## 9. 기대 효과

* 사용자가 선호하는 스타일 기반 추천 가능
* 단순 카테고리 추천보다 높은 개인화 제공
* 여러 장의 이미지를 활용하여 취향을 종합적으로 반영
* 향후 메타데이터 기반 추천 품질 향상 가능

---

## 10. 향후 확장 계획

### 추천 프리셋 확장

* 색상 중심 추천
* 스타일 중심 추천
* 사용자 지정 가중치 추천

Metadata 기반 후처리 알고리즘을 적용하여

추천 결과를 재정렬할 수 있도록 확장

---

### 카테고리 확장

현재

TOP

향후

* BOTTOM
* OUTER
* DRESS

지원 예정

---

### 추천 품질 향상

* 데이터셋 확대
* 메타데이터 고도화
* 벡터 검색 최적화
* 추천 알고리즘 개선

---

## 11. 개발 일정

~ 2026-06-15

* 추천 시스템 기획서 작성
* 추천 알고리즘 설계
* 데이터 구조 설계

---

2026-06-16 ~ 2026-06-30

* CLIP 추천 시스템 구현
* FastAPI 추천 서버 구축
* FAISS 연동
* 임베딩 캐시 구축
* 추천 API 개발
* 데이터셋 적용
* Frontend 및 Backend 연동

---

2026-07-01 ~ 2026-07-15

* 추천 품질 검증
* 데이터 품질 개선
* 통합 테스트
* 최종 발표 버전 완성

---

## 최종 목표

사용자가 선호하는 의류 이미지 2~3장을 업로드하면

CLIP 임베딩과 FAISS 기반 유사도 검색을 활용하여

사용자가 선호하는 스타일과 유사한 의류를 추천하는 서비스를 구현한다.

공모전 MVP에서는 상의(TOP)를 대상으로 개발하며,

향후 하의(BOTTOM), 아우터(OUTER), 원피스(DRESS)까지 확장 가능한 구조를 목표로 한다.

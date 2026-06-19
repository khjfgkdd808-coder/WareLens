# WareLens

AI-powered Fashion Recommendation Platform

---

# 1. Project Overview

WareLens는 사용자의 취향 이미지와 신체 정보를 기반으로 개인 맞춤형 의류를 추천하는 AI 기반 웹 서비스이다.

사용자가 선호하는 의류 이미지를 업로드하면 CLIP 기반 취향 분석을 수행하고, 전신 사진 및 신체 정보를 활용한 MediaPipe 기반 체형 분석 결과를 결합하여 적합한 의류와 추천 사이즈를 제공한다.

본 프로젝트는 AI 기술과 웹 서비스를 통합하여 온라인 의류 구매 시 발생하는 스타일 선택 및 사이즈 선택 문제를 해결하는 것을 목표로 한다.

---

# 2. Project Goals

## AI Fashion Recommendation

* CLIP 기반 의류 이미지 임베딩 생성
* 사용자 취향 벡터 생성
* FAISS 기반 유사 의류 검색
* 이미지 기반 의류 추천 시스템 구축

## Body Analysis & Size Recommendation

* MediaPipe Pose 기반 신체 랜드마크 추출
* 키, 몸무게 기반 BMI 계산
* 신체 비율 분석
* KS 표준 사이즈표 기반 상의 사이즈 추천

## System Integration

* Spring Boot ↔ FastAPI 연동
* AI 분석 결과 API 제공
* React 기반 사용자 서비스 구축
* Docker 기반 서비스 배포 환경 구성

---

# 3. Core Features

## Style Analysis

사용자가 업로드한 취향 이미지를 분석하여

* 선호 스타일
* 주요 색상
* 주요 패턴

정보를 제공한다.

## Clothing Recommendation

CLIP 임베딩 벡터를 활용하여 사용자의 취향과 유사한 의류를 추천한다.

추천 방식

* 균형형(Balanced)
* 색상 중심(Color Focus)
* 스타일 중심(Style Focus)

## Body Analysis

사용자의

* 성별
* 키
* 몸무게
* 전신 사진

정보를 기반으로 신체 특징을 분석한다.

## Size Recommendation

MediaPipe 랜드마크 기반 신체 비율 분석 결과와

KS 표준 사이즈표를 활용하여 추천 상의 사이즈를 제공한다.

---

# 4. System Architecture

User

↓

React Frontend

↓

Spring Boot Backend

↓

FastAPI AI Platform

├─ CLIP Recommendation Engine

└─ MediaPipe Body Analysis Engine

↓

Recommendation Result

↓

Frontend Result Page

---

# 5. Tech Stack

## Frontend

* React
* TypeScript
* Tailwind CSS

## Backend

* Java 21 LTS
* Spring Boot
* WebClient
* Swagger (OpenAPI)

## AI Recommendation

* CLIP
* PyTorch
* FAISS

## Body Analysis

* MediaPipe Pose
* OpenCV

## AI Platform

* FastAPI
* Pydantic

## Infrastructure

* Docker
* Docker Compose
* GitHub

---

# 6. Repository Structure

```text
WareLens
├─ Ai
│   ├─ Clip
│   └─ MediaPipe
│
├─ Backend
├─ Frontend
├─ Dataset
├─ Deploy
├─ Docs
└─ Tools
```

---

# 7. MVP Scope

현재 MVP는 상의(TOP) 카테고리를 대상으로 개발한다.

제공 기능

* 취향 이미지 기반 의류 추천
* 체형 분석 기반 상의 사이즈 추천
* 추천 근거 제공
* 취향 분석 결과 제공

---

# 8. Future Expansion

* 하의(BOTTOM) 추천
* 아우터(OUTER) 추천
* 브랜드별 사이즈 보정
* 메타데이터 가중치 기반 추천 고도화
* 취향 분류기(Classifier) 도입
* 사용자 맞춤 추천 고도화

---

# 9. Notice

본 서비스의 사이즈 추천은 KS 표준 사이즈표와 사용자의 신체 정보, MediaPipe 기반 신체 비율 분석 결과를 활용한 참고용 추천 기능이다.

실제 의류 브랜드별 사이즈 차이는 반영되지 않으며, 최종 구매 시 브랜드별 실측 사이즈 확인을 권장한다.

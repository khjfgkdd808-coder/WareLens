# WareLens 역할 분담안 B (AI 통합형)

## 공통 작업

### 데이터 수집 및 전처리 (전원 참여)

- 상품 이미지 수집
- 이미지 정리
- 파일명 규칙 적용
- 카테고리 분류
- 색상 분류
- 패턴 분류
- 메타데이터 작성
- CSV 생성
- 데이터 검수

※ 데이터 확보 후 전원 참여하여 진행

---

# 역할 1. AI 총괄 (CLIP + MediaPipe)

## AI 아키텍처 설계

- 추천 파이프라인 설계
- 체형 분석 파이프라인 설계
- AI 서버 구조 설계
- 데이터 구조 설계

## CLIP 추천 시스템

- CLIP 모델 적용
- 이미지 임베딩 생성
- 벡터 저장
- 코사인 유사도 검색
- Top-K 추천 구현
- 추천 성능 테스트

## MediaPipe 체형 분석

- Pose Landmark 추출
- 어깨 비율 계산
- 상하체 비율 계산
- BMI 계산
- 체형 Feature 추출

## 사이즈 추천

- Rule-Based 추천 설계
- 체형 보정 로직 구현
- 브랜드별 사이즈 적용

## FastAPI AI 서버

- 추천 API 구현
- 체형 분석 API 구현
- 응답 포맷 정의
- 모델 통합

## 테스트

- 추천 정확도 검증
- 체형 분석 검증
- AI 성능 검증
- 예외 처리 검증

---

# 역할 2. Backend (Spring)

## 설계

- API 명세 작성
- DTO 설계
- DB 스키마 설계

## 구현

- Spring 프로젝트 구축
- 회원 기능
- 로그인 기능
- 이미지 업로드 기능
- 추천 요청 기능

## 연동

- FastAPI 연동
- 결과 저장
- 사용자 데이터 관리

## DB

- User 테이블
- Product 테이블
- Recommendation 테이블

## 테스트

- API 테스트
- 통합 테스트

---

# 역할 3. Frontend (React)

## 설계

- 와이어프레임 작성
- 사용자 흐름 설계
- UI 설계

## 구현

- 메인 페이지
- 로그인 페이지
- 의류 업로드 페이지
- 전신사진 업로드 페이지
- 추천 결과 페이지

## 연동

- Backend API 연동
- 이미지 업로드 기능 구현
- 추천 결과 출력

## UI/UX

- 반응형 UI
- 로딩 화면
- 오류 처리 화면

## 테스트

- 사용자 시나리오 테스트
- UI 검증
- 통합 테스트 지원

---

# 역할 4. Integration / AI Platform

## 서비스 통합

- React ↔ Spring 연동 지원
- Spring ↔ FastAPI 연동 지원
- API 응답 검증
- 통합 이슈 분석

## API 테스트

- Postman 테스트
- 예외 상황 테스트
- 통합 테스트 수행

## 데이터 자동화

- 이미지 정리 자동화
- 파일명 일괄 변경
- CSV 자동 생성
- 메타데이터 자동화 지원

## 배포

- Docker 환경 구성
- 서버 배포
- 데모 서버 운영

## 기술 검토

- 벡터 DB(FAISS, Chroma) 검토
- 성능 최적화 지원
- 서비스 구조 개선

## 개발 지원

- AI/Backend/Frontend 개발 지원
- 공통 유틸 개발
- 버그 분석 및 수정 지원

---

# 현재 추천 역할 구조

A : AI 총괄 (CLIP + MediaPipe)

B : Backend (Spring)

C : Frontend (React)

D : Integration / AI Platform

---

# 현재 PoC 완료 사항

- CLIP 기반 의류 추천 검증 완료
- MediaPipe 기반 체형 분석 검증 완료
- Rule-Based 사이즈 추천 검증 완료
- Spring Boot ↔ FastAPI 통신 검증 완료

---

# 향후 개발 순서

1. 역할 확정
2. React 프로젝트 구축
3. Spring API 구축
4. FastAPI 구조 구축
5. 데이터셋 확보 및 전처리
6. 추천 API 통합
7. UI 연동
8. 통합 테스트
9. 배포 및 발표 준비


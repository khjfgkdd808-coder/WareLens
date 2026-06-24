Frontend API v1 (Draft)
=======================


목적
----
Frontend에서 필요한 API 구조를 정리한 문서입니다.

사용자 입력 데이터를 Backend로 전달하고,
Backend에서 AI 분석 결과를 받아 화면에 출력하는 구조입니다.

현재는 프론트 개발 기준 초안이며,
Backend 구현 방식에 따라 Endpoint / Request / Response 구조는 협의 가능합니다.


Frontend 역할
-------------
- 사용자 입력 UI 제공
- 이미지 업로드
- Backend API 요청
- AI 분석 결과 화면 출력



1. API Endpoint 요약
====================


| API 구분 | Method | Endpoint | 역할 |
| 사용자 분석 요청 | POST | /api/v1/recommend | Backend 통합 추천 요청 |
| 체형 분석 | POST | /api/v1/analyze/body | MediaPipe 체형 분석 (AI 내부 호출용) |
| 스타일 추천 | POST | /internal/clip/recommend | CLIP 스타일 분석 (AI 내부 호출용) |



2. Frontend → Backend API
=========================


[통합 추천 요청]

POST /api/v1/recommend


사용자의 신체 정보와 이미지를 Backend로 전달하고
AI 분석 결과를 통합하여 최종 추천 결과를 반환



Request
--------


Content-Type

multipart/form-data


전송 데이터


gender
- 사용자 성별 (male / female)

height_cm
- 키(cm)

weight_kg
- 몸무게(kg)

body_image
- 전신 이미지 파일 (1장)

style_images
- 사용자 취향 이미지 리스트 (1~5장)



Example

gender=male

height_cm=175

weight_kg=70

body_image=user.png

style_images=style1.png, style2.png




3. Response 데이터
==================


Backend 응답 예시


{
 "status": "SUCCESS",

 "data": {

   "body_result": {
     "bmi": 22.86,
     "bmi_grade": "NORMAL",
     "body_analysis": {
       "shoulder_ratio": 0.225,
       "upper_body_ratio": 0.684
     },
     "annotated_image_url": "/results/body_analysis_001.png"
   },


   "size_recommendation": {
     "recommended_size": "100",
     "ks_label": "100-95-170",
     "reasons": [
       "신장 기준 100 사이즈 범위 해당",
       "BMI 정상 범위",
       "어깨 비율 평균 범위"
     ]
   },


   "style_analysis": {
     "top_categories": [
       {
         "name": "HOODIE",
         "ratio": 0.60
       },
       {
         "name": "SWEATSHIRT",
         "ratio": 0.30
       }
     ],
     "top_colors": [
       "BLACK",
       "GRAY"
     ]
   },


   "recommendations": [
     {
       "rank": 1,
       "item_id": 1,
       "image_url": "/dataset/0001.jpg",
       "score": 0.91,
       "category": "TOP",
       "sub_category": "HOODIE",
       "color": "BLACK",
       "pattern": "SOLID"
     }
   ]

 }

}




4. Frontend 화면 사용 데이터
============================


BodyVisualization

사용 데이터

- bmi
- bmi_grade
- shoulder_ratio
- upper_body_ratio
- annotated_image_url


화면

사용자 체형 분석 결과 영역



SizeCard

사용 데이터

- recommended_size
- ks_label
- reasons


화면

추천 사이즈 카드



StyleAnalysisCard

사용 데이터

- top_categories
- top_colors


화면

AI 취향 분석 영역



RecommendationGrid

사용 데이터

- image_url
- category
- sub_category
- color
- pattern
- score
- rank


화면

추천 상품 리스트




5. 전체 데이터 흐름
===================


Frontend (React)

↓

Backend (Spring Boot)

↓

AI Server (FastAPI)

↓

MediaPipe / CLIP

↓

분석 결과 반환

↓

Frontend Result Page 출력




6. 실패 응답 처리
=================


Backend 요청 실패

{
 "status": "FAIL",
 "error_code": "INVALID_REQUEST",
 "message": "필수 입력값이 누락되었습니다."
}



체형 분석 실패 (인물 인식 불가)

{
 "status": "FAIL",
 "error_code": "BODY_NOT_DETECTED",
 "message": "전신 사진에서 인물을 인식하지 못했습니다."
}



체형 분석 실패 (신뢰도 부족)

{
 "status": "FAIL",
 "error_code": "LOW_VISIBILITY",
 "message": "신체 랜드마크 신뢰도가 낮아 분석할 수 없습니다."
}



추천 결과 없음

{
 "status": "FAIL",
 "error_code": "NO_RESULT",
 "message": "추천 상품을 찾을 수 없습니다."
}




7. Frontend 개발 Workflow
========================


1) Upload Page

사용자 입력

- 키
- 몸무게
- 성별
- 전신사진
- 스타일 이미지


↓


2) POST /api/v1/recommend 요청


↓


3) Backend 처리

- MediaPipe 체형 분석
- CLIP 스타일 분석
- 추천 결과 통합


↓


4) Result Page 출력




참고
====


Frontend에서는 MediaPipe API와 CLIP API를 직접 호출하지 않고

Backend 통합 API를 통해 결과를 전달받는 구조입니다.


MVP 단계에서는 Mock Data 구조와 동일하게 개발 후

추후 Backend API 연결 시 교체 가능하도록 설계합니다.
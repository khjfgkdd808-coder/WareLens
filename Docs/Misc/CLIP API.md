CLIP API 명세 (현재 구현 기준)

[Request]

POST /internal/clip/recommend
Content-Type: multipart/form-data

필드
* style_images (File[])
  * 사용자가 업로드한 취향 이미지
  * 1장 이상 (개수 제한은 프론트엔드/백엔드에서 관리)
  * jpg / png / webp 지원

---

[Response]

{
  "recommendations": [
    {
      "rank": 1,
      "image_name": "15970.jpg",
      "score": 0.91,
      "clip_score": 0.89,
      "color_score": 0.62,
      "category": "TOP",
      "sub_category": "SHIRT",
      "article_type": "Shirts",
      "color": "NAVY",
      "season": "Fall",
      "usage": "Casual",
      "gender": "Men",
      "pattern": "CHECK",
      "fit": "SLIM",
      "fabric": "COTTON"
    }
  ]
}

---

[변경 사항 및 사유]

item_id
* 제거
* image_name이 식별자 역할을 하므로 중복 필드 불필요

image_url
* 제거
* 백엔드에서 image_name 기준으로 정적 파일 경로를 직접 조립

style_analysis
* 미포함 (1차 고도화 예정)
* 현재 응답에 키 자체를 포함하지 않음
* 구현 예정 방식: 추천 결과의 메타데이터를 집계하여
  top_categories(비율 포함), top_colors 반환

메타데이터 필드
* 명세의 4개(category / sub_category / color / pattern)에서
  11개 전체로 확장
  (article_type / season / usage / gender / fit / fabric 추가)
* 프론트엔드에서 필요한 필드만 선택적으로 사용

score 구성
* clip_score (CLIP 코사인 유사도)와
  color_score (쿼리 이미지 색상 일치도)의 가중합
* score = clip_score * 0.85 + color_score * 0.15
* clip_score, color_score를 개별 필드로 함께 반환
  (디버깅 및 향후 가중치 조정 용도)

---

[에러 응답]

{
  "error_code": "INVALID_IMAGE",
  "message": "이미지를 읽을 수 없습니다."
}

error_code 목록

* 400 EMPTY_IMAGE_LIST  : 이미지 0장
* 400 INVALID_IMAGE     : 이미지로 읽을 수 없는 파일
* 400 INVALID_TOP_K     : top_k 값 오류 (내부 설정 문제)
* 500 INFERENCE_FAILED  : 추론 중 예기치 못한 오류
* 503 NOT_INITIALIZED   : 서버 초기화 안 됨
* 503 CACHE_NOT_FOUND   : 캐시 없음 (build_vectors.py 미실행)
* 503 MODEL_LOAD_FAILED : 모델 로딩 실패

---

※ 최종 필드명 및 응답 구조는 Integration 단계에서 조정 가능
CLIP API 초안

[Request]

POST /internal/clip/recommend

Content-Type:
multipart/form-data

필드

* style_images (File[])

  * 사용자가 업로드한 취향 이미지
  * 1~3장
  * jpg/png/webp 지원

예시

style_images:

* image1.jpg
* image2.jpg
* image3.jpg

---

[Response]

{
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
"image_name": "0001.jpg",
"image_url": "/dataset/0001.jpg",
"score": 0.91,
"category": "TOP",
"sub_category": "HOODIE",
"color": "BLACK",
"pattern": "SOLID"
}
]
}

---

설명

style_analysis

* 업로드 이미지 기반 취향 분석 결과
* UI의 "AI 취향 분석" 영역에서 사용

recommendations

* 최종 추천 의류 목록
* score는 CLIP 기반 유사도 점수
* rank 순으로 정렬

※ 최종 필드명 및 응답 구조는 Integration 단계에서 조정 가능

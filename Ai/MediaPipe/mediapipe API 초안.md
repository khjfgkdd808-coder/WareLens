# WareLens AI 체형 분석 API 명세서 (초안)

본 API는 사용자가 입력한 실제 신체 스펙(키, 몸무게)과 전신 사진 이미지를 전달받아, 정규화된 신체 비율을 계산하고 최종 권장 사이즈 및 핏 스타일을 반환합니다.

---

## 1. 엔드포인트 개요 (Endpoint)

* **HTTP Method**: `POST`
* **URI**: `/api/v1/analyze/body`
* **Content-Type**: `multipart/form-data` (이미지 파일 전송을 위해 필수)

---

## 2. 요청 데이터 스펙 (Request Body)

스프링 백엔드나 리액트 프론트엔드에서 서버로 데이터를 보낼 때 채워야 하는 폼 데이터 규격입니다.

| 파라미터명 (Key) | 타입 (Type) | 필수 여부 | 설명 | 예시 (Example) |
| :--- | :--- | :--- | :--- | :--- |
| `height_cm` | `float` | **필수 (Required)** | 사용자의 실제 키 (단위: cm) | `175.5` |
| `weight_kg` | `float` | **필수 (Required)** | 사용자의 실제 몸무게 (단위: kg) | `68.2` |
| `gender` | `string` | **필수 (Required)** | 사용자의 성별 (`MALE` 또는 `FEMALE` 대소문자 무관) | `MALE` |
| `file` | `File (Binary)` | **필수 (Required)** | 촬영한 인물 전신 사진 이미지 (`jpg`, `png` 등) | `my_body.jpg` |

---

## 3. 응답 데이터 스펙 (Response Body)

### 성공 응답 (200 OK)
AI 체형 분석 및 사이즈 추천이 성공적으로 완료되었을 때 반환되는 JSON 데이터 구조입니다.

```json
{
  "status": "SUCCESS",
  "data": {
    "bmi": 22.13,
    "bmi_grade": "정상",
    "ratios": {
      "shoulder_ratio": 0.2345,
      "upper_lower_ratio": 0.6782,
      "hip_shoulder_ratio": 0.7654
    },
    "recommendation": {
      "final_size": "M",
      "fit_type": "레귤러핏",
      "fit_desc": "표준적인 핏입니다. 너무 끼거나 크지 않아 편안하고 대중적인 착용감을 줍니다.",
      "reasons": [
        "[MALE 규격 지표] 키(175.5cm) / 몸무게(68.2kg) 기준 기본 M 사이즈 후보 선정",
        "신체 실루엣 지표 종합 분석 -> 최종 레귤러핏 스타일 가이드 확정"
      ]
    },
    "annotated_image_base64": "iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```

#### 주요 응답 필드 설명
* `ratios`: 카메라 왜곡을 제거하여 계산된 어깨, 상/하체, 골반 정규화 비율 데이터입니다.
* `final_size`: BMI와 어깨 골격 발달 상태를 조합해 도출한 최종 추천 의류 사이즈(S/M/L/XL)입니다.
* `annotated_image_base64`: OpenCV를 통해 인물의 주요 관절선과 스켈레톤 라인을 시각화하여 그려 넣은 이미지의 Base64 인코딩 문자열입니다. 프론트엔드에서 `<img src="data:image/jpeg;base64,...">` 형태로 즉시 화면에 띄울 수 있습니다.

---

## 4. 예외 및 에러 응답 스펙 (Error Response)

서버 내부 크래시를 방지하고, 프론트엔드에서 유저에게 알림창(Alert)을 올바르게 띄울 수 있도록 설계된 에러 규격입니다.

### 클라이언트 요청 오류 (400 Bad Request)
* **상황 1**: 키나 몸무게에 말도 안 되는 음수나 0을 입력했거나, 허용되지 않는 확장자(예: `.pdf`, `.txt`)의 파일을 업로드했을 때 발생합니다.
```json
{
  "detail": "입력된 키 혹은 몸무게 값이 비정상적인 범주입니다."
}
```
* **상황 2**: 성별(`gender`) 파라미터에 규정되지 않은 잘못된 문자열이 전송된 경우 발생합니다.
```json
{
  "detail": "성별(gender) 값은 무조건 'MALE' 또는 'FEMALE' 이어야 합니다."
}
```

### AI 인식 불가 오류 (422 Unprocessable Entity)
* **상황**: 사진은 정상적으로 업로드되었으나, 인물이 너무 멀리 있거나, 옷/장애물에 가려져 MediaPipe가 신체 33개 관절을 찾아내지 못했을 때 발생합니다.
```json
{
  "status": "FAIL",
  "error_message": "사진에서 사람의 체형을 인식하지 못했습니다. 밝은 곳에서 전신이 모두 보이도록 다시 촬영해 주세요."
}
```

# WareLens AI 체형 분석 및 사이즈 추천 API 명세서 (API Specification)

본 문서는 WareLens AI Integrated Engine의 체형 분석 및 3D 부피 기반 KS 표준 사이즈 추천 API에 대한 명세서입니다. 백엔드 및 클라이언트 개발자 간의 연동을 위해 작성되었습니다.

---

## 1. 체형 분석 및 사이즈 추천 API

단 한 장의 정면 전신 사진과 사용자의 키(cm)를 입력받아, MediaPipe Real-World 3D 랜드마크를 통해 실제 가슴둘레와 몸통 두께를 계산하고 대한민국 KS 표준 규격에 맞는 상의 사이즈를 추천합니다.

- **Endpoint**: `/api/v1/analyze/body`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`

### 📥 Request 파라미터 (Input Data)

| 파라미터명 | 타입 | 필수 여부 | 위치 | 설명 | 예시 |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `user_id` | `string` | 필수 | Form | 유저 고유 ID 식별자 (세션/캐시 관리용) | `"1차테스트"` |
| `height_cm` | `number (float)` | 필수 | Form | 사용자의 실제 키 (센티미터 단위, 3D 스케일 캘리브레이션의 기준점) | `184.0` |
| `gender` | `string` | 필수 | Form | 사용자 성별 (`MALE` 또는 `FEMALE`) | `"MALE"` |
| `file` | `binary` | 필수 | File | 사용자 정면 전신 사진 원본 이미지 파일 | `person.jpg` |

---

### 📤 Response 데이터 구조 (Output Data)

#### 🟢 성공 응답 (200 OK)
- **Content-Type**: `application/json`

```json
{
  "status": "SUCCESS",
  "data": {
    "user_id": "1차테스트",
    "annotated_image_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "size_analysis": {
      "measured_chest_girth_cm": 92.5,
      "measured_torso_depth_cm": 22.0,
      "final_size": "95 (M)",
      "fit_type": "레귤러핏",
      "fit_desc": "표준적인 KS 규격에 딱 맞는 편안한 핏입니다.",
      "reasons": [
        "분석된 3D 가슴둘레(92.5cm) 기준, KS 표준 95 (M) 사이즈가 가장 적합합니다."
      ]
    }
  }
}
```

#### Response 필드 상세 설명

| 필드명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `status` | `string` | 요청 처리 결과 상태 (`SUCCESS` 또는 `FAIL`) |
| `data` | `object` | 성공 시 반환되는 핵심 데이터 객체 |
| `data.user_id` | `string` | 요청한 유저의 고유 식별자 |
| `data.annotated_image_base64` | `string` | 어깨, 골반, 팔, 다리 등 관절 포인트(빨간 점)와 스켈레톤 라인(초록 선)이 시각화된 결과 이미지의 Base64 인코딩 스트링 |
| `data.size_analysis` | `object` | 3D 부피 연산 및 KS 규격 추천 결과 객체 |
| `data.size_analysis.measured_chest_girth_cm` | `number (float)` | 구글 3D 월드 랜드마크와 타원 둘레 공식을 활용해 실측한 실제 가슴둘레 (cm) |
| `data.size_analysis.measured_torso_depth_cm` | `number (float)` | 신체 실루엣 비율을 연동하여 추정한 몸통의 앞뒤 두께 (cm) |
| `data.size_analysis.final_size` | `string` | 대한민국 KS 표준 규격(KS K 0050/0051)에 매칭된 최종 추천 상의 호칭 (예: `95 (M)`) |
| `data.size_analysis.fit_type` | `string` | 몸통 두께 비례에 따라 판정된 추천 핏 스타일 (`슬림핏`, `레귤러핏`, `체형보완핏`) |
| `data.size_analysis.fit_desc` | `string` | 추천된 핏 스타일에 대한 직관적인 설명 문구 |
| `data.size_analysis.reasons` | `array (string)` | AI 엔진이 해당 사이즈와 핏을 추천하게 된 측정 근거 및 판정 이유 목록 |

---

#### 🔴 실패 응답 예시 (422 Unprocessable Entity)
사진에서 사람을 찾지 못했거나 주요 관절이 가려져 연산이 불가능할 때 반환됩니다.

```json
{
  "status": "FAIL",
  "error_message": "사진에서 사람의 체형을 인식하지 못했습니다. 다시 촬영해 주세요."
}
```

---

## 2. 가상 피팅 API (참고용)

- **Endpoint**: `/api/v1/tryon`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`

### 📥 Request 파라미터 (Input Data)

| 파라미터명 | 타입 | 필수 여부 | 위치 | 설명 |
| :--- | :--- | :---: | :--- | :--- |
| `user_id` | `string` | 필수 | Form | 체형 분석이 선행되어 캐시에 적재된 유저 ID |
| `garment_file` | `binary` | 선택 | File | 피팅해볼 상의 의류 사진 파일 (직접 업로드 시) |
| `garment_name` | `string` | 선택 | Form | CLIP 추천 파트 연계용 파일명 (예: `15970.jpg`) |

### 📤 Response 데이터 구조 (Output Data)
```json
{
  "status": "SUCCESS",
  "data": {
    "tryon_image_base64": "iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```

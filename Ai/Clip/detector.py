"""
detector.py - YOLO 기반 사람 탐지 후 의류 영역 crop
=====================================================
사람이 착용한 의류 사진에서 사람 영역을 탐지하여 crop합니다.
배경(벽, 바닥, 다른 사물)을 최대한 제거하여 CLIP 임베딩 정확도를 높입니다.

사용 모델: ultralytics YOLOv8m (COCO 80개 클래스 중 'person' 클래스 사용)

[동작 방식]
- 사람이 탐지되면: 가장 큰 person bounding box로 crop
- 사람이 탐지되지 않으면: 원본 이미지 그대로 반환
  (이미 누끼 처리되었거나 옷만 펼쳐놓은 사진인 경우)

[향후 확장 포인트]
- main.py(사용자 업로드 사진)에도 착용샷이 들어올 경우 동일 함수를 그대로 재사용 가능
- 의류 전용 학습 모델(예: DeepFashion2 기반)로 교체 시 load_yolo_model()의
  모델 경로만 변경하면 됩니다.
"""

from PIL import Image
from ultralytics import YOLO

# COCO 데이터셋 기준 'person' 클래스 ID
PERSON_CLASS_ID = 0

# 사용할 YOLO 모델 (medium 모델 - 정확도 우선, 속도는 nano보다 느림)
YOLO_MODEL_NAME = "yolov8m.pt"

# 탐지 신뢰도 임계값 (이 값 이상인 탐지 결과만 사용)
CONFIDENCE_THRESHOLD = 0.5


def load_yolo_model() -> YOLO:
    """
    YOLOv8m 모델을 불러옵니다.
    최초 실행 시 가중치 파일을 자동으로 다운로드합니다 (최초 1회만).

    Returns:
        YOLO: 로드된 YOLO 모델 객체
    """
    print(f"  YOLO 모델 로딩 중... ({YOLO_MODEL_NAME})")
    model = YOLO(YOLO_MODEL_NAME)
    print(f"  완료 - {YOLO_MODEL_NAME}")
    return model


def detect_person_box(image: Image.Image, yolo_model: YOLO) -> tuple[int, int, int, int] | None:
    """
    이미지에서 가장 큰 사람(person) bounding box를 탐지합니다.
    사람이 여러 명 탐지되면 면적이 가장 큰 박스를 선택합니다.
    (의류 사진의 메인 모델이 화면 중심에 가장 크게 나오는 경우가 많기 때문)

    Args:
        image      (PIL.Image.Image): 원본 이미지
        yolo_model (YOLO)           : 로드된 YOLO 모델

    Returns:
        tuple[int, int, int, int] | None:
            (x1, y1, x2, y2) 형태의 bounding box 좌표.
            사람이 탐지되지 않으면 None을 반환합니다.
    """
    # verbose=False: 콘솔에 매 이미지마다 로그가 출력되는 것을 방지
    results = yolo_model(image, verbose=False)[0]

    best_box  = None
    best_area = 0

    for box in results.boxes:
        class_id   = int(box.cls[0])
        confidence = float(box.conf[0])

        # person 클래스가 아니거나 신뢰도가 낮으면 건너뜀
        if class_id != PERSON_CLASS_ID or confidence < CONFIDENCE_THRESHOLD:
            continue

        x1, y1, x2, y2 = box.xyxy[0].tolist()
        area = (x2 - x1) * (y2 - y1)

        # 가장 면적이 큰 person 박스를 선택
        if area > best_area:
            best_area = area
            best_box  = (int(x1), int(y1), int(x2), int(y2))

    return best_box


def crop_person_region(image: Image.Image, yolo_model: YOLO) -> Image.Image:
    """
    이미지에서 사람 영역을 탐지하여 crop합니다.
    사람이 탐지되지 않으면 원본 이미지를 그대로 반환합니다.
    (이미 누끼 처리된 사진이나 옷만 펼쳐놓은 사진의 경우)

    Args:
        image      (PIL.Image.Image): 원본 이미지
        yolo_model (YOLO)           : 로드된 YOLO 모델

    Returns:
        PIL.Image.Image: crop된 이미지 (사람 미탐지 시 원본 그대로)
    """
    box = detect_person_box(image, yolo_model)

    # 사람이 탐지되지 않으면 원본 이미지 그대로 사용
    if box is None:
        return image

    x1, y1, x2, y2 = box
    cropped = image.crop((x1, y1, x2, y2))

    return cropped

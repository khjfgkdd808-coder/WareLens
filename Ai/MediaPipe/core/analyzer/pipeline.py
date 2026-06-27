# core/analyzer/pipeline.py
import cv2
import mediapipe as mp
import numpy as np
import base64
import logging
from typing import Dict, Tuple, Any
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

logger = logging.getLogger("WareLensAI")

class BodyAnalyzerPipeline:
    def __init__(self, model_path: str = "models/pose_landmarker_heavy.task"):
        try:
            base_options = python.BaseOptions(model_asset_path=model_path)
            options = vision.PoseLandmarkerOptions(
                base_options=base_options,
                running_mode=vision.RunningMode.IMAGE,
                output_segmentation_masks=False
            )
            self.detector = vision.PoseLandmarker.create_from_options(options)
            logger.info(f"✅ AI 체형 분석 모델 로드 완료: {model_path}")
        except Exception:
            logger.exception(f"❌ 모델 로드 중 오류 발생")
            raise RuntimeError(f"모델 파일({model_path})을 찾을 수 없거나 초기화에 실패했습니다.")

    def _convert_to_mp_image(self, image_bytes: bytes) -> Tuple[np.ndarray, mp.Image]:
        nparr = np.frombuffer(image_bytes, np.uint8)
        image_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image_bgr is None:
            raise ValueError("올바르지 않은 이미지 포맷이거나 파일이 손상되었습니다.")
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
        return image_bgr, mp_image

    def _calculate_metrics(self, landmarks: list, img_w: int, img_h: int) -> Tuple[Dict[str, float], Dict[str, float]]:
        pt11 = np.array([landmarks[11].x * img_w, landmarks[11].y * img_h])
        pt12 = np.array([landmarks[12].x * img_w, landmarks[12].y * img_h])
        pt23 = np.array([landmarks[23].x * img_w, landmarks[23].y * img_h])
        pt24 = np.array([landmarks[24].x * img_w, landmarks[24].y * img_h])
        pt27 = np.array([landmarks[27].x * img_w, landmarks[27].y * img_h])
        pt28 = np.array([landmarks[28].x * img_w, landmarks[28].y * img_h])

        shoulder_width_px = np.linalg.norm(pt11 - pt12)
        hip_width_px = np.linalg.norm(pt23 - pt24)
        upper_body_len_px = (np.linalg.norm(pt11 - pt23) + np.linalg.norm(pt12 - pt24)) / 2
        lower_body_len_px = (np.linalg.norm(pt23 - pt27) + np.linalg.norm(pt24 - pt28)) / 2

        all_y = [lm.y * img_h for lm in landmarks]
        total_height_px = max(all_y) - min(all_y)

        if total_height_px <= 0 or upper_body_len_px <= 0 or shoulder_width_px <= 0:
            raise ValueError("신체 픽셀 거리 계산 결과가 유효하지 않습니다. 올바른 전신 사진이 아닙니다.")

        ratios = {
            "shoulder_ratio": shoulder_width_px / total_height_px,
            "upper_lower_ratio": upper_body_len_px / lower_body_len_px,
            "hip_shoulder_ratio": hip_width_px / shoulder_width_px
        }
        raw_pixels = {
            "shoulder_width_px": shoulder_width_px,
            "total_height_px": total_height_px
        }
        return ratios, raw_pixels

    def _draw_overlay(self, image: np.ndarray, landmarks: list) -> str:
        img_h, img_w, _ = image.shape
        annotated_image = image.copy()

        connections = [
            (11, 12), (11, 23), (12, 24), (23, 24), (23, 27), (24, 28),
            (11, 13), (13, 15),  # 우측 상전체 관절 궤적 복원
            (12, 14), (14, 16)   # 좌측 상전체 관절 궤적 복원
        ]

        for start_idx, end_idx in connections:
            pt1 = (int(landmarks[start_idx].x * img_w), int(landmarks[start_idx].y * img_h))
            pt2 = (int(landmarks[end_idx].x * img_w), int(landmarks[end_idx].y * img_h))
            cv2.line(annotated_image, pt1, pt2, (0, 255, 0), 3)

        for idx in [11, 12, 13, 14, 15, 16, 23, 24, 27, 28]:
            pt = (int(landmarks[idx].x * img_w), int(landmarks[idx].y * img_h))
            cv2.circle(annotated_image, pt, 8, (0, 0, 255), -1)

        _, buffer = cv2.imencode('.jpg', annotated_image)
        return base64.b64encode(buffer).decode('utf-8')

    def run(self, image_bytes: bytes) -> Dict[str, Any]:
        image_bgr, mp_image = self._convert_to_mp_image(image_bytes)
        img_h, img_w, _ = image_bgr.shape
        detection_result = self.detector.detect(mp_image)

        if not detection_result.pose_landmarks:
            return {
                "success": False,
                "error_message": "사진에서 사람의 체형을 인식하지 못했습니다. 다시 촬영해 주세요."
            }

        landmarks = detection_result.pose_landmarks[0]

        # 다양한 포즈 대응 유연화 필터
        for critical_idx in [11, 12, 23, 24]:
            if landmarks[critical_idx].visibility < 0.5:
                return {
                    "success": False,
                    "error_message": "상반신 중심축이 과도하게 가려져 분석이 불가능합니다."
                }

        ratios, raw_pixels = self._calculate_metrics(landmarks, img_w, img_h)
        annotated_image_b64 = self._draw_overlay(image_bgr, landmarks)

        return {
            "success": True,
            "ratios": ratios,
            "raw_pixels": raw_pixels,
            # main.py 스캔 규격에 맞춰 키 명칭을 엄격하게 일치시킵니다.
            "annotated_image_base64": annotated_image_b64,
            "raw_landmarks": landmarks,
            "origin_cv_img": image_bgr
        }
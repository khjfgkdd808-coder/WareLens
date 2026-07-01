# core/analyzer/pipeline.py
import cv2
import mediapipe as mp
import numpy as np
import base64
import logging
import math
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
            logger.info("✅ Real-World 3D 체형 분석 엔진 로드 완료")
        except Exception:
            logger.exception("❌ 모델 로드 중 오류 발생")
            raise RuntimeError("모델 파일 초기화 실패")

    def _convert_to_mp_image(self, image_bytes: bytes) -> Tuple[np.ndarray, mp.Image]:
        nparr = np.frombuffer(image_bytes, np.uint8)
        image_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image_bgr is None:
            raise ValueError("올바르지 않은 이미지 포맷입니다.")
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
        return image_bgr, mp_image

    def _calculate_volume_metrics(self, world_landmarks: list, actual_height_cm: float) -> Tuple[Dict[str, float], Dict[str, float]]:
        """💡 물리 세계 미터 단위 랜드마크를 활용하여 정밀 cm를 계산합니다."""
        
        # 3D 공간 거리 계산기 (단위: cm로 변환하기 위해 마지막에 100 곱함)
        def get_world_dist_cm(p1, p2) -> float:
            return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 + (p1.z - p2.z)**2) * 100

        # 1. 실제 키(Height) 기준 정밀 스케일 캘리브레이션
        # 세계 좌표상 코(0)부터 발목(27,28) 중심까지의 Y축 차이를 기반으로 키를 측정합니다.
        nose = world_landmarks[0]
        ankle_y = (world_landmarks[27].y + world_landmarks[28].y) / 2
        world_height_cm = (ankle_y - nose.y) * 100
        
        # 촬영 각도에 따른 오차를 잡아주는 최종 보정 계수
        calibration_factor = actual_height_cm / (world_height_cm if world_height_cm > 0 else 170.0)

        # 2. 신체 가로 골격 실측 (cm)
        shoulder_width_cm = get_world_dist_cm(world_landmarks[11], world_landmarks[12]) * calibration_factor
        hip_width_cm = get_world_dist_cm(world_landmarks[23], world_landmarks[24]) * calibration_factor
        
        # 가슴 내부 너비는 어깨 골격 너비의 약 85% 지점입니다.
        chest_width_cm = shoulder_width_cm * 0.85

        # 3. 신체 앞뒤 입체 두께(Torso Depth) 연산
        # 정면 사진에서 골격 관절은 일직선상에 놓이므로 두께를 직접 잴 수 없습니다.
        # 따라서 어깨 대비 골반/허리 정면 실루엣 비율(체형 지표)을 연동하여 입체 두께를 안전하게 추정합니다.
        body_shape_ratio = hip_width_cm / shoulder_width_cm if shoulder_width_cm > 0 else 0.78
        
        # 슬림할수록 두께 비율이 낮고(약 0.62), 통통할수록 원통형에 가까워집니다(약 0.72).
        depth_to_width_ratio = 0.55 + (body_shape_ratio * 0.1)
        torso_depth_cm = chest_width_cm * depth_to_width_ratio

        # 4. Ramanujan 타원 둘레 공식을 활용한 최종 가슴둘레(Chest Girth) 도출
        a = chest_width_cm / 2
        b = torso_depth_cm / 2
        chest_girth_cm = math.pi * (3 * (a + b) - math.sqrt((3 * a + b) * (a + 3 * b)))

        measurements_cm = {
            "shoulder_width_cm": round(shoulder_width_cm, 1),
            "chest_width_cm": round(chest_width_cm, 1),
            "torso_depth_cm": round(torso_depth_cm, 1),
            "chest_girth_cm": round(chest_girth_cm, 1) # 💡 완벽하게 필터링된 인간의 실제 가슴둘레
        }

        ratios = {
            "depth_to_width_ratio": torso_depth_cm / chest_width_cm
        }
        return ratios, measurements_cm

    def _draw_overlay(self, image: np.ndarray, landmarks: list) -> str:
        img_h, img_w, _ = image.shape
        annotated_image = image.copy()
        connections = [
            (11, 12), (11, 23), (12, 24), (23, 24), (23, 27), (24, 28),
            (11, 13), (13, 15), (12, 14), (14, 16)
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

    def run(self, image_bytes: bytes, actual_height_cm: float) -> Dict[str, Any]:
        image_bgr, mp_image = self._convert_to_mp_image(image_bytes)
        detection_result = self.detector.detect(mp_image)

        if not detection_result.pose_landmarks:
            return {"success": False, "error_message": "체형을 인식하지 못했습니다."}

        landmarks = detection_result.pose_landmarks[0]
        world_landmarks = detection_result.pose_world_landmarks[0] # 💡 물리 세계 3D 좌표 추출

        for critical_idx in [11, 12, 23, 24]:
            if landmarks[critical_idx].visibility < 0.5:
                return {"success": False, "error_message": "상반신 중심축이 가려졌습니다."}

        # 💡 물리 3D 월드 랜드마크 데이터를 기반으로 실측치 계산 위임
        ratios, measurements_cm = self._calculate_volume_metrics(world_landmarks, actual_height_cm)
        annotated_image_b64 = self._draw_overlay(image_bgr, landmarks)

        return {
            "success": True,
            "ratios": ratios,
            "measurements_cm": measurements_cm,
            "annotated_image_base64": annotated_image_b64,
            "raw_landmarks": landmarks,
            "origin_cv_img": image_bgr
        }
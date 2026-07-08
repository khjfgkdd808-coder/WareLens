<<<<<<< HEAD
# core/analyzer/pipeline.py
import os
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
    def __init__(self, model_path: str = "models/analyzer_pose_heavy.task", **kwargs):
        try:
            # 실행 위치에 구애받지 않도록 파일 시스템 상대 경로 자동 보정 로직
            if not os.path.isabs(model_path):
                current_dir = os.path.dirname(os.path.abspath(__file__))
                project_root = os.path.abspath(os.path.join(current_dir, "..", ".."))
                corrected_path = os.path.join(project_root, model_path)
                
                if os.path.exists(corrected_path):
                    model_path = corrected_path

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

    def _calculate_volume_metrics(self, world_landmarks: list, actual_height_cm: float, weight_kg: float = None) -> Tuple[Dict[str, float], Dict[str, float]]:
        """💡 물리 세계 미터 단위 랜드마크와 생체기계학적 보정을 활용하여 정밀 cm를 계산합니다."""
        
        def get_world_dist_cm(p1, p2) -> float:
            return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 + (p1.z - p2.z)**2) * 100

        # 1. 실제 키(Height) 기준 정밀 스케일 캘리브레이션
        nose = world_landmarks[0]
        ankle_y = (world_landmarks[27].y + world_landmarks[28].y) / 2
        pure_world_height_cm = (ankle_y - nose.y) * 100
        
        anatomical_ratio = 0.875
        estimated_total_world_height_cm = pure_world_height_cm / anatomical_ratio
        calibration_factor = actual_height_cm / (estimated_total_world_height_cm if estimated_total_world_height_cm > 0 else 170.0)

        # 2. 주요 신체 관절 랜드마크 변수 할당 (가독성 최적화)
        shoulder_l, shoulder_r = world_landmarks[11], world_landmarks[12]
        hip_l, hip_r = world_landmarks[23], world_landmarks[24]
        
        # 어깨에서 골반 방향으로 25% 내려온 지점을 가슴 너비 레벨(chest_l, chest_r)로 보간
        chest_l = lambda: None
        chest_r = lambda: None
        for attr in ['x', 'y', 'z']:
            setattr(chest_l, attr, getattr(shoulder_l, attr) * 0.75 + getattr(hip_l, attr) * 0.25)
            setattr(chest_r, attr, getattr(shoulder_r, attr) * 0.75 + getattr(hip_r, attr) * 0.25)

        # 3. 관절 중심 간 거리(Raw Distance) 측정
        raw_shoulder_width = get_world_dist_cm(shoulder_l, shoulder_r) * calibration_factor
        raw_hip_width = get_world_dist_cm(hip_l, hip_r) * calibration_factor
        raw_chest_width = get_world_dist_cm(chest_l, chest_r) * calibration_factor

        # 💡 [방안A 핵심] MediaPipe는 뼈대(관절 중심)를 찍으므로, 피부와 근육 두께를 더해 실제 표면 사이즈로 확장합니다!
        SKIN_MUSCLE_BUFFER_RATIO = 1.23

        shoulder_width_cm = raw_shoulder_width * SKIN_MUSCLE_BUFFER_RATIO
        hip_width_cm = raw_hip_width * SKIN_MUSCLE_BUFFER_RATIO
        chest_width_cm = raw_chest_width * SKIN_MUSCLE_BUFFER_RATIO

        # 4. 신체 앞뒤 입체 두께(Torso Depth) 연산 (체중 입력 유무에 따른 하이브리드 보정)
        if weight_kg and weight_kg > 0:
            estimated_bmi = weight_kg / ((actual_height_cm / 100) ** 2)
            depth_to_width_ratio = 0.58 + ((estimated_bmi - 20) * 0.015)
            depth_to_width_ratio = max(0.45, min(depth_to_width_ratio, 0.85))
        else:
            body_shape_ratio = hip_width_cm / shoulder_width_cm if shoulder_width_cm > 0 else 0.78
            depth_to_width_ratio = 0.58 + (body_shape_ratio * 0.08)

        torso_depth_cm = chest_width_cm * depth_to_width_ratio

        # 5. Ramanujan 타원 둘레 공식을 활용한 최종 가슴둘레(Chest Girth) 도출
        a = chest_width_cm / 2
        b = torso_depth_cm / 2
        
        inside_sqrt = (3 * a + b) * (a + 3 * b)
        if inside_sqrt < 0:
            raise ValueError("신체 랜드마크 역전 현상으로 기하학적 연산이 불가능합니다.")
            
        chest_girth_cm = math.pi * (3 * (a + b) - math.sqrt(inside_sqrt))

        measurements_cm = {
            "shoulder_width_cm": round(shoulder_width_cm, 1),
            "chest_width_cm": round(chest_width_cm, 1),
            "torso_depth_cm": round(torso_depth_cm, 1),
            "chest_girth_cm": round(chest_girth_cm, 1)
        }

        ratios = {
            "depth_to_width_ratio": round(depth_to_width_ratio, 3)
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
            return {"success": False, "error_message": "사진에서 전신 신체 형상을 감지하지 못했습니다. 정면 정자세 사진인지 확인해 주세요."}

        landmarks = detection_result.pose_landmarks[0]
        world_landmarks = detection_result.pose_world_landmarks[0]

        # 1차 관문: 주요 신체 랜드마크의 가시성 및 화면 내 존재 여부 1차 스캔 (코, 어깨, 골반, 발목)
        critical_indices = [0, 11, 12, 23, 24, 27, 28]
        for critical_idx in critical_indices:
            lm = landmarks[critical_idx]
            if lm.visibility < 0.5 or not (0.0 <= lm.x <= 1.0 and 0.0 <= lm.y <= 1.0):
                return {
                    "success": False, 
                    "error_message": "머리(코)부터 발목까지의 주요 신체 축이 화면 밖으로 잘렸거나 흐릿합니다. 완벽한 정면 전신 사진을 업로드해 주세요."
                }

        # 2차 관문: MediaPipe의 하반신 구겨 넣기 환각 및 하이앵글(항공샷) 왜곡 방어 레이어
        # 어깨 중심, 골반 중심, 발목 중심의 Y축 위치를 파악하여 '몸통 대비 다리 비율'을 계산합니다.
        shoulder_y = (landmarks[11].y + landmarks[12].y) / 2
        hip_y = (landmarks[23].y + landmarks[24].y) / 2
        ankle_y = (landmarks[27].y + landmarks[28].y) / 2

        torso_height = hip_y - shoulder_y  # 몸통 세로 픽셀 길이
        leg_height = ankle_y - hip_y        # 다리 세로 픽셀 길이

        # 정상적인 수평 정면 사진은 골반~발목(다리)이 어깨~골반(몸통)보다 무조건 1.15배 이상 길어야 합니다.
        # 항공샷이나 반신 사진처럼 다리가 몸통보다 짧게 왜곡된 경우는 사이즈 오차가 심하므로 컷트합니다.
        if leg_height < torso_height * 1.15:
            return {
                "success": False,
                "error_message": "상반신 위주의 사진 또는 왜곡이 심한 앵글이 감지되었습니다. 정밀한 사이즈 측정을 위해 반드시 카메라를 가슴 높이에 두고 똑바로 서서 찍은 전신 사진을 사용해 주세요."
            }

        # 2.5차 관문: 사선(반측면) 촬영 감지 방어 레이어
        # 월드 랜드마크의 Z축(카메라와의 거리, 미터 단위)을 이용해 양쪽 어깨와 골반의 깊이 차이를 계산합니다.
        left_shoulder_z = world_landmarks[11].z
        right_shoulder_z = world_landmarks[12].z
        left_hip_z = world_landmarks[23].z
        right_hip_z = world_landmarks[24].z

        # 양쪽 어깨 또는 양쪽 골반의 깊이(Z축) 차이가 절대값 기준 0.07m(7cm) 이상 나면 사선으로 선 것으로 판단
        shoulder_z_diff = abs(left_shoulder_z - right_shoulder_z)
        hip_z_diff = abs(left_hip_z - right_hip_z)

        if shoulder_z_diff > 0.07 or hip_z_diff > 0.07:
            logger.warning(f"⚠️ 사선 각도 감지 됨: 어깨 깊이 오차({shoulder_z_diff*100:.1f}cm), 골반 깊이 오차({hip_z_diff*100:.1f}cm)")
            return {
                "success": False,
                "error_message": "몸이 측면이나 사선으로 틀어진 자세가 감지되었습니다. 정확한 가슴둘레 측정을 위해 카메라를 정면으로 똑바로 바라보고 서서 다시 촬영해 주세요!"
            }
        
        # 3차 관문: 인체 비례가 검증된 무결한 사진만 실제 cm 및 부피 연산으로 진입 허용
        try:
            ratios, measurements_cm = self._calculate_volume_metrics(world_landmarks, actual_height_cm)
        except Exception as e:
            logger.error(f"[Pipeline Logic Error] {str(e)}")
            return {
                "success": False,
                "error_message": "신체 기하학적 치수를 계산하는 도중 오류가 발생했습니다. 카메라를 정면으로 바라본 자세인지 확인해 주세요."
            }

        annotated_image_b64 = self._draw_overlay(image_bgr, landmarks)

        return {
            "success": True,
            "ratios": ratios,
            "measurements_cm": measurements_cm,
            "annotated_image_base64": annotated_image_b64,
            "raw_landmarks": landmarks,
            "origin_cv_img": image_bgr
=======
# core/analyzer/pipeline.py
import os
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
    def __init__(self, model_path: str = "models/analyzer_pose_heavy.task", **kwargs):
        try:
            # 실행 위치에 구애받지 않도록 파일 시스템 상대 경로 자동 보정 로직
            if not os.path.isabs(model_path):
                current_dir = os.path.dirname(os.path.abspath(__file__))
                project_root = os.path.abspath(os.path.join(current_dir, "..", ".."))
                corrected_path = os.path.join(project_root, model_path)
                
                if os.path.exists(corrected_path):
                    model_path = corrected_path

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
        
        def get_world_dist_cm(p1, p2) -> float:
            return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 + (p1.z - p2.z)**2) * 100

        # 1. 실제 키(Height) 기준 정밀 스케일 캘리브레이션
        nose = world_landmarks[0]
        ankle_y = (world_landmarks[27].y + world_landmarks[28].y) / 2
        
        # [기존] 코 ~ 발목 거리 (전체 인체의 약 87.5% 영역에 해당)
        pure_world_height_cm = (ankle_y - nose.y) * 100
        
        # 💡 [보정 핵심] 인체 비례 상수를 적용하여 생략된 정수리와 발바닥 스페이스(12.5%)를 포함한 100% 진짜 전신 키를 역산합니다.
        anatomical_ratio = 0.875
        estimated_total_world_height_cm = pure_world_height_cm / anatomical_ratio
        
        # 복원된 진짜 전신 키를 기준으로 캘리브레이션 팩터를 잡아야 가슴둘레 오차가 사라집니다.
        calibration_factor = actual_height_cm / (estimated_total_world_height_cm if estimated_total_world_height_cm > 0 else 170.0)

        # 2. 신체 가로 골격 실측 (cm)
        shoulder_width_cm = get_world_dist_cm(world_landmarks[11], world_landmarks[12]) * calibration_factor
        hip_width_cm = get_world_dist_cm(world_landmarks[23], world_landmarks[24]) * calibration_factor
        
        chest_width_cm = shoulder_width_cm * 0.85

        # 3. 신체 앞뒤 입체 두께(Torso Depth) 연산
        body_shape_ratio = hip_width_cm / shoulder_width_cm if shoulder_width_cm > 0 else 0.78
        
        depth_to_width_ratio = 0.55 + (body_shape_ratio * 0.1)
        torso_depth_cm = chest_width_cm * depth_to_width_ratio

        # 4. Ramanujan 타원 둘레 공식을 활용한 최종 가슴둘레(Chest Girth) 도출
        a = chest_width_cm / 2
        b = torso_depth_cm / 2
        
        inside_sqrt = (3 * a + b) * (a + 3 * b)
        if inside_sqrt < 0:
            raise ValueError("신체 랜드마크 역전 현상으로 기하학적 연산이 불가능합니다.")
            
        chest_girth_cm = math.pi * (3 * (a + b) - math.sqrt(inside_sqrt))

        measurements_cm = {
            "shoulder_width_cm": round(shoulder_width_cm, 1),
            "chest_width_cm": round(chest_width_cm, 1),
            "torso_depth_cm": round(torso_depth_cm, 1),
            "chest_girth_cm": round(chest_girth_cm, 1)
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
            return {"success": False, "error_message": "사진에서 전신 신체 형상을 감지하지 못했습니다. 정면 정자세 사진인지 확인해 주세요."}

        landmarks = detection_result.pose_landmarks[0]
        world_landmarks = detection_result.pose_world_landmarks[0]

        # 1차 관문: 주요 신체 랜드마크의 가시성 및 화면 내 존재 여부 1차 스캔 (코, 어깨, 골반, 발목)
        critical_indices = [0, 11, 12, 23, 24, 27, 28]
        for critical_idx in critical_indices:
            lm = landmarks[critical_idx]
            if lm.visibility < 0.5 or not (0.0 <= lm.x <= 1.0 and 0.0 <= lm.y <= 1.0):
                return {
                    "success": False, 
                    "error_message": "머리(코)부터 발목까지의 주요 신체 축이 화면 밖으로 잘렸거나 흐릿합니다. 완벽한 정면 전신 사진을 업로드해 주세요."
                }

        # 2차 관문: MediaPipe의 하반신 구겨 넣기 환각 및 하이앵글(항공샷) 왜곡 방어 레이어
        # 어깨 중심, 골반 중심, 발목 중심의 Y축 위치를 파악하여 '몸통 대비 다리 비율'을 계산합니다.
        shoulder_y = (landmarks[11].y + landmarks[12].y) / 2
        hip_y = (landmarks[23].y + landmarks[24].y) / 2
        ankle_y = (landmarks[27].y + landmarks[28].y) / 2

        torso_height = hip_y - shoulder_y  # 몸통 세로 픽셀 길이
        leg_height = ankle_y - hip_y        # 다리 세로 픽셀 길이

        # 정상적인 수평 정면 사진은 골반~발목(다리)이 어깨~골반(몸통)보다 무조건 1.15배 이상 길어야 합니다.
        # 항공샷이나 반신 사진처럼 다리가 몸통보다 짧게 왜곡된 경우는 사이즈 오차가 심하므로 컷트합니다.
        if leg_height < torso_height * 1.15:
            return {
                "success": False,
                "error_message": "상반신 위주의 사진 또는 왜곡이 심한 앵글이 감지되었습니다. 정밀한 사이즈 측정을 위해 반드시 카메라를 가슴 높이에 두고 똑바로 서서 찍은 전신 사진을 사용해 주세요."
            }

        # 3차 관문: 인체 비례가 검증된 무결한 사진만 실제 cm 및 부피 연산으로 진입 허용
        try:
            ratios, measurements_cm = self._calculate_volume_metrics(world_landmarks, actual_height_cm)
        except Exception as e:
            logger.error(f"[Pipeline Logic Error] {str(e)}")
            return {
                "success": False,
                "error_message": "신체 기하학적 치수를 계산하는 도중 오류가 발생했습니다. 카메라를 정면으로 바라본 자세인지 확인해 주세요."
            }

        annotated_image_b64 = self._draw_overlay(image_bgr, landmarks)

        return {
            "success": True,
            "ratios": ratios,
            "measurements_cm": measurements_cm,
            "annotated_image_base64": annotated_image_b64,
            "raw_landmarks": landmarks,
            "origin_cv_img": image_bgr
>>>>>>> c2a8d2c (feat: 피팅 캐싱 로직 및 테스트용  UI 적용)
        }
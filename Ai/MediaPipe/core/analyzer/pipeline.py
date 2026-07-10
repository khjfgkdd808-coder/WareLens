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
from dataclasses import dataclass

# 설정 관리자 가져오기
from core.config import settings

logger = logging.getLogger("WareLensAI")

# 💡 lambda 해킹 대신 안전하고 명확한 데이터 클래스 사용
@dataclass
class Point3D:
    x: float
    y: float
    z: float

class BodyAnalyzerPipeline:
    # --- MediaPipe 랜드마크 인덱스 상수화 (가독성 극대화) ---
    MP_NOSE = 0
    MP_L_SHOULDER, MP_R_SHOULDER = 11, 12
    MP_L_ELBOW, MP_R_ELBOW = 13, 14
    MP_L_WRIST, MP_R_WRIST = 15, 16
    MP_L_HIP, MP_R_HIP = 23, 24
    MP_L_ANKLE, MP_R_ANKLE = 27, 28

    # --- 생체역학 수학 보정 상수 ---
    ANATOMICAL_HEIGHT_RATIO = 0.875
    SKIN_MUSCLE_BUFFER_RATIO = 1.23
    Z_AXIS_TOLERANCE = 0.07 # 사선 촬영 허용 오차 (7cm)

    def __init__(self, model_path: str = None, **kwargs):
        # 파라미터가 없으면 config의 안전한 절대 경로 사용
        target_model_path = model_path or settings.pose_model_path
        try:
            base_options = python.BaseOptions(model_asset_path=target_model_path)
            options = vision.PoseLandmarkerOptions(
                base_options=base_options,
                running_mode=vision.RunningMode.IMAGE,
                output_segmentation_masks=False
            )
            self.detector = vision.PoseLandmarker.create_from_options(options)
            logger.info("✅ Real-World 3D 체형 분석 엔진 로드 완료")
        except Exception as e:
            logger.exception(f"❌ 포즈 추정 모델 로드 실패: {target_model_path}")
            raise RuntimeError(f"모델 파일 초기화 실패: {str(e)}")

    def _convert_to_mp_image(self, image_bytes: bytes) -> Tuple[np.ndarray, mp.Image]:
        nparr = np.frombuffer(image_bytes, np.uint8)
        image_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image_bgr is None:
            raise ValueError("올바르지 않은 이미지 포맷입니다.")
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        return image_bgr, mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)

    @staticmethod
    def _get_world_dist_cm(p1, p2) -> float:
        """두 점 사이의 3D 물리적 거리 연산 (유틸리티 함수 분리)"""
        return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 + (p1.z - p2.z)**2) * 100

    def _validate_pose(self, landmarks, world_landmarks) -> Tuple[bool, str]:
        """이미지 내 인물 자세가 실측에 적합한지 3단계 관문을 통해 검증합니다."""
        
        # [1차 관문] 주요 랜드마크 가시성
        critical_indices = [
            self.MP_NOSE, self.MP_L_SHOULDER, self.MP_R_SHOULDER, 
            self.MP_L_HIP, self.MP_R_HIP, self.MP_L_ANKLE, self.MP_R_ANKLE
        ]
        for idx in critical_indices:
            lm = landmarks[idx]
            if lm.visibility < 0.5 or not (0.0 <= lm.x <= 1.0 and 0.0 <= lm.y <= 1.0):
                return False, "주요 신체 축이 잘렸거나 흐릿합니다. 완벽한 정면 전신 사진을 업로드해 주세요."

        # [2차 관문] 하이앵글(항공샷) 왜곡 방어 (몸통 vs 다리 비율)
        shoulder_y = (landmarks[self.MP_L_SHOULDER].y + landmarks[self.MP_R_SHOULDER].y) / 2
        hip_y = (landmarks[self.MP_L_HIP].y + landmarks[self.MP_R_HIP].y) / 2
        ankle_y = (landmarks[self.MP_L_ANKLE].y + landmarks[self.MP_R_ANKLE].y) / 2

        torso_height = hip_y - shoulder_y
        leg_height = ankle_y - hip_y

        if leg_height < torso_height * 1.15:
            return False, "상반신 위주 또는 왜곡된 앵글(항공샷 등)이 감지되었습니다. 카메라를 가슴 높이에 두고 똑바로 서주세요."

        # [2.5차 관문] 사선(반측면) 촬영 감지 (Z축 깊이 오차)
        shoulder_z_diff = abs(world_landmarks[self.MP_L_SHOULDER].z - world_landmarks[self.MP_R_SHOULDER].z)
        hip_z_diff = abs(world_landmarks[self.MP_L_HIP].z - world_landmarks[self.MP_R_HIP].z)

        if shoulder_z_diff > self.Z_AXIS_TOLERANCE or hip_z_diff > self.Z_AXIS_TOLERANCE:
            logger.warning(f"⚠️ 사선 감지: 어깨 오차({shoulder_z_diff*100:.1f}cm), 골반 오차({hip_z_diff*100:.1f}cm)")
            return False, "몸이 사선으로 틀어졌습니다. 정확한 측정을 위해 정면을 똑바로 바라봐 주세요."

        return True, "Success"

    def _calculate_volume_metrics(self, world_landmarks, actual_height_cm: float, weight_kg: float = None) -> Tuple[Dict, Dict]:
        # 가독성을 높이기 위해 랜드마크 매핑
        nose = world_landmarks[self.MP_NOSE]
        shoulder_l = world_landmarks[self.MP_L_SHOULDER]
        shoulder_r = world_landmarks[self.MP_R_SHOULDER]
        hip_l = world_landmarks[self.MP_L_HIP]
        hip_r = world_landmarks[self.MP_R_HIP]
        ankle_y = (world_landmarks[self.MP_L_ANKLE].y + world_landmarks[self.MP_R_ANKLE].y) / 2

        # 1. 스케일 캘리브레이션
        pure_world_height_cm = (ankle_y - nose.y) * 100
        estimated_total_height_cm = pure_world_height_cm / self.ANATOMICAL_HEIGHT_RATIO
        calibration_factor = actual_height_cm / (estimated_total_height_cm if estimated_total_height_cm > 0 else 170.0)

        # 2. 가슴 너비 레벨 보간 (안전한 데이터 클래스 사용)
        chest_l = Point3D(
            x = shoulder_l.x * 0.75 + hip_l.x * 0.25,
            y = shoulder_l.y * 0.75 + hip_l.y * 0.25,
            z = shoulder_l.z * 0.75 + hip_l.z * 0.25
        )
        chest_r = Point3D(
            x = shoulder_r.x * 0.75 + hip_r.x * 0.25,
            y = shoulder_r.y * 0.75 + hip_r.y * 0.25,
            z = shoulder_r.z * 0.75 + hip_r.z * 0.25
        )

        # 3. 관절 중심 간 거리 및 피부/근육 보정
        raw_shoulder_width = self._get_world_dist_cm(shoulder_l, shoulder_r) * calibration_factor
        raw_hip_width = self._get_world_dist_cm(hip_l, hip_r) * calibration_factor
        raw_chest_width = self._get_world_dist_cm(chest_l, chest_r) * calibration_factor

        shoulder_width_cm = raw_shoulder_width * self.SKIN_MUSCLE_BUFFER_RATIO
        hip_width_cm = raw_hip_width * self.SKIN_MUSCLE_BUFFER_RATIO
        chest_width_cm = raw_chest_width * self.SKIN_MUSCLE_BUFFER_RATIO

        # 4. 신체 두께(Torso Depth) 연산
        if weight_kg and weight_kg > 0:
            estimated_bmi = weight_kg / ((actual_height_cm / 100) ** 2)
            depth_ratio = 0.58 + ((estimated_bmi - 20) * 0.015)
            depth_ratio = max(0.45, min(depth_ratio, 0.85))
        else:
            body_shape_ratio = hip_width_cm / shoulder_width_cm if shoulder_width_cm > 0 else 0.78
            depth_ratio = 0.58 + (body_shape_ratio * 0.08)

        torso_depth_cm = chest_width_cm * depth_ratio

        # 5. Ramanujan 타원 둘레 공식
        a, b = chest_width_cm / 2, torso_depth_cm / 2
        inside_sqrt = (3 * a + b) * (a + 3 * b)
        if inside_sqrt < 0:
            raise ValueError("신체 랜드마크 역전 현상 발생 (기하학적 연산 불가)")
            
        chest_girth_cm = math.pi * (3 * (a + b) - math.sqrt(inside_sqrt))

        return (
            {"depth_to_width_ratio": round(depth_ratio, 3)},
            {
                "shoulder_width_cm": round(shoulder_width_cm, 1),
                "chest_width_cm": round(chest_width_cm, 1),
                "torso_depth_cm": round(torso_depth_cm, 1),
                "chest_girth_cm": round(chest_girth_cm, 1)
            }
        )

    def _draw_overlay(self, image: np.ndarray, landmarks) -> str:
        """검증용 뼈대 그리기 분리"""
        img_h, img_w, _ = image.shape
        annotated_image = image.copy()
        
        connections = [
            (self.MP_L_SHOULDER, self.MP_R_SHOULDER), (self.MP_L_SHOULDER, self.MP_L_HIP), 
            (self.MP_R_SHOULDER, self.MP_R_HIP), (self.MP_L_HIP, self.MP_R_HIP), 
            (self.MP_L_HIP, self.MP_L_ANKLE), (self.MP_R_HIP, self.MP_R_ANKLE),
            (self.MP_L_SHOULDER, self.MP_L_ELBOW), (self.MP_L_ELBOW, self.MP_L_WRIST), 
            (self.MP_R_SHOULDER, self.MP_R_ELBOW), (self.MP_R_ELBOW, self.MP_R_WRIST)
        ]
        
        for start_idx, end_idx in connections:
            pt1 = (int(landmarks[start_idx].x * img_w), int(landmarks[start_idx].y * img_h))
            pt2 = (int(landmarks[end_idx].x * img_w), int(landmarks[end_idx].y * img_h))
            cv2.line(annotated_image, pt1, pt2, (0, 255, 0), 3)

        dots = [
            self.MP_L_SHOULDER, self.MP_R_SHOULDER, self.MP_L_ELBOW, self.MP_R_ELBOW, 
            self.MP_L_WRIST, self.MP_R_WRIST, self.MP_L_HIP, self.MP_R_HIP, 
            self.MP_L_ANKLE, self.MP_R_ANKLE
        ]
        for idx in dots:
            pt = (int(landmarks[idx].x * img_w), int(landmarks[idx].y * img_h))
            cv2.circle(annotated_image, pt, 8, (0, 0, 255), -1)

        _, buffer = cv2.imencode('.jpg', annotated_image)
        return base64.b64encode(buffer).decode('utf-8')

    def run(self, image_bytes: bytes, actual_height_cm: float) -> Dict[str, Any]:
        """메인 실행 함수: 이제 읽기 쉬운 하나의 파이프라인 스토리라인이 되었습니다."""
        try:
            # 1. 전처리
            image_bgr, mp_image = self._convert_to_mp_image(image_bytes)
            detection_result = self.detector.detect(mp_image)

            if not detection_result.pose_landmarks:
                return {"success": False, "error_message": "사진에서 전신 신체 형상을 감지하지 못했습니다."}

            landmarks = detection_result.pose_landmarks[0]
            world_landmarks = detection_result.pose_world_landmarks[0]

            # 2. 자세 검증 (모든 검증 로직이 분리되어 깔끔해짐)
            is_valid, err_msg = self._validate_pose(landmarks, world_landmarks)
            if not is_valid:
                return {"success": False, "error_message": err_msg}

            # 3. 수치 계산
            ratios, measurements_cm = self._calculate_volume_metrics(world_landmarks, actual_height_cm)
            
            # 4. 결과 시각화
            annotated_image_b64 = self._draw_overlay(image_bgr, landmarks)

            return {
                "success": True,
                "ratios": ratios,
                "measurements_cm": measurements_cm,
                "annotated_image_base64": annotated_image_b64,
                "raw_landmarks": landmarks,
                "origin_cv_img": image_bgr
            }
            
        except Exception as e:
            logger.error(f"[Pipeline Logic Error] {str(e)}")
            return {
                "success": False,
                "error_message": "신체 기하학적 치수를 계산하는 도중 오류가 발생했습니다."
            }
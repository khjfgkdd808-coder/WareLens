import cv2
import mediapipe as mp
import numpy as np
import base64
import logging  # 1. 로깅 모듈 추가
from typing import Dict, Tuple, Any
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# 2. main.py와 동일한 전역 로거 이름 지정
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
            # 3. print -> logger.info 변경
            logger.info(f"✅ AI 체형 분석 모델 로드 완료: {model_path}")
        except Exception as e:
            # 4. print -> logger.exception 변경 (에러 트레이스백 전체 추적)
            logger.exception(f"❌ 모델 로드 중 오류 발생")
            raise RuntimeError(f"모델 파일({model_path})을 찾을 수 없거나 초기화에 실패했습니다.")

    def _convert_to_mp_image(self, image_bytes: bytes) -> Tuple[np.ndarray, mp.Image]:
        """
        입력받은 바이너리 바이트 데이터를 OpenCV 이미지와 MediaPipe 전용 이미지 객체로 변환합니다.
        """
        nparr = np.frombuffer(image_bytes, np.uint8)
        image_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image_bgr is None:
            raise ValueError("올바르지 않은 이미지 포맷이거나 파일이 손상되었습니다.")
            
        # MediaPipe 추론을 위해 BGR 포맷을 RGB로 변환
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
        
        return image_bgr, mp_image

    def _calculate_metrics(self, landmarks: list, img_w: int, img_h: int) -> Tuple[Dict[str, float], Dict[str, float]]:
        """
        추출된 관절 좌표를 기반으로 유클리드 거리 및 신체 비율(Scale-Invariant)을 계산합니다.
        """
        # 핵심 관절 인덱스 매핑 (MediaPipe Pose 표준)
        # 11, 12: 어깨 / 23, 24: 골반 / 11~23: 상체 측면 / 23~27: 하체(골반-발목)
        pt11 = np.array([landmarks[11].x * img_w, landmarks[11].y * img_h])
        pt12 = np.array([landmarks[12].x * img_w, landmarks[12].y * img_h])
        pt23 = np.array([landmarks[23].x * img_w, landmarks[23].y * img_h])
        pt24 = np.array([landmarks[24].x * img_w, landmarks[24].y * img_h])
        pt27 = np.array([landmarks[27].x * img_w, landmarks[27].y * img_h])
        pt28 = np.array([landmarks[28].x * img_w, landmarks[28].y * img_h])

        # 1. 픽셀 공간 내 절대 길이(유클리드 거리) 계산
        shoulder_width_px = np.linalg.norm(pt11 - pt12)
        hip_width_px = np.linalg.norm(pt23 - pt24)
        
        # 상체 및 하체 길이 프록시 산출
        upper_body_len_px = (np.linalg.norm(pt11 - pt23) + np.linalg.norm(pt12 - pt24)) / 2
        lower_body_len_px = (np.linalg.norm(pt23 - pt27) + np.linalg.norm(pt24 - pt28)) / 2

        # 전신 높이 픽셀 스케일 기준 (가장 높은 관절의 최소 Y값 ~ 가장 낮은 관절의 최대 Y값)
        all_y = [lm.y * img_h for lm in landmarks]
        total_height_px = max(all_y) - min(all_y)

        # ⚠️ 방어 코드: Zero Division 예외 처리
        if total_height_px <= 0 or upper_body_len_px <= 0 or shoulder_width_px <= 0:
            raise ValueError("신체 픽셀 거리 계산 결과가 유효하지 않습니다. 올바른 전신 사진이 아닙니다.")

        # 2. 카메라 거리 왜곡을 없애기 위한 정규화 비율(Ratios) 계산
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
        """
        OpenCV를 이용하여 이미지 위에 포즈 선과 관절 포인트를 드로잉한 후 Base64로 인코딩합니다.
        """
        img_h, img_w, _ = image.shape
        annotated_image = image.copy()

        # 주요 추천 관련 상반신 결속 관계 정의
        connections = [(11, 12), (11, 23), (12, 24), (23, 24), (23, 27), (24, 28)]

        # 1. 스켈레톤 선 그리기
        for start_idx, end_idx in connections:
            pt1 = (int(landmarks[start_idx].x * img_w), int(landmarks[start_idx].y * img_h))
            pt2 = (int(landmarks[end_idx].x * img_w), int(landmarks[end_idx].y * img_h))
            cv2.line(annotated_image, pt1, pt2, (0, 255, 0), 3) # 녹색선

        # 2. 주요 관절 포인트 그리기
        for idx in [11, 12, 23, 24, 27, 28]:
            pt = (int(landmarks[idx].x * img_w), int(landmarks[idx].y * img_h))
            cv2.circle(annotated_image, pt, 8, (0, 0, 255), -1) # 빨간 원

        # 3. 바이너리 인코딩 및 Base64 변환
        _, buffer = cv2.imencode('.jpg', annotated_image)
        base64_str = base64.b64encode(buffer).decode('utf-8')
        return base64_str

    def run(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        메인 파이프라인 프로세스 실행 함수
        """
        # 1. 이미지 전처리
        image_bgr, mp_image = self._convert_to_mp_image(image_bytes)
        img_h, img_w, _ = image_bgr.shape

        # 2. AI 모델 추론 수행
        detection_result = self.detector.detect(mp_image)

        # 3. 예외 처리: 인물이 검출되지 않았거나 랜드마크 데이터가 유실된 경우
        if not detection_result.pose_landmarks:
            return {
                "success": False,
                "error_message": "사진에서 사람의 체형을 인식하지 못했습니다. 밝은 곳에서 전신이 모두 보이도록 다시 촬영해 주세요."
            }

        # 첫 번째 검출된 사람의 랜드마크 리스트 추출
        landmarks = detection_result.pose_landmarks[0]

        # 4. 방어 코드: 주요 상반신 관절의 신뢰도(Visibility) 검증 (임계값 0.5 미만시 예외)
        for critical_idx in [11, 12, 23, 24]:
            if landmarks[critical_idx].visibility < 0.5:
                return {
                    "success": False,
                    "error_message": "신체 일부가 옷이나 장애물에 과도하게 가려져 분석이 불가능합니다."
                }

        # 5. 수치 분석 및 시각화 이미지 생성
        ratios, raw_pixels = self._calculate_metrics(landmarks, img_w, img_h)
        annotated_image_b64 = self._draw_overlay(image_bgr, landmarks)

        return {
            "success": True,
            "ratios": ratios,
            "raw_pixels": raw_pixels,
            "annotated_image": annotated_image_b64
        }
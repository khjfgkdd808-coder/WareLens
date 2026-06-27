# core/generator/run_catvton.py
import os
import sys
import io
import base64
import torch
import numpy as np
import cv2
from PIL import Image
from huggingface_hub import snapshot_download

# CatVTON 소스코드 폴더를 파이썬 시스템 환경 경로에 동적 주입
current_dir = os.path.dirname(os.path.abspath(__file__))
catvton_root = os.path.abspath(os.path.join(current_dir, "..", "..", "CatVTON"))
if catvton_root not in sys.path:
    sys.path.append(catvton_root)

# CatVTON 전용 파이프라인만 단독 수입
from model.pipeline import CatVTONPipeline

class CatVtonEngine:
    def __init__(self):
        """
        비전 픽셀 매칭만 수행하는 가상 피팅 코어
        """
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.torch_dtype = torch.float16 if self.device == "cuda" else torch.float32
        
        print("[CatVTON Engine] Downloading official weights from HuggingFace Hub...")
        repo_path = snapshot_download(repo_id="zhengchong/CatVTON")
        
        print(f"[CatVTON Engine] Assembling official CatVTON Pipeline on {self.device}...")
        self.pipeline = CatVTONPipeline(
            base_ckpt="runwayml/stable-diffusion-inpainting",
            attn_ckpt=repo_path,
            attn_ckpt_version="mix",
            weight_dtype=self.torch_dtype,
            device=self.device,
            skip_safety_check=True
        )
        print("🎉 [CatVTON Engine] CatVTON 엔진 적재 완료!")

    def generate_agnostic_mask_from_landmarks(self, image_np: np.ndarray, landmarks: list) -> np.ndarray:
        """pipeline.py가 제공하는 33개 관절 중 상반신 8대 노드를 추적하여 정석 마스크 매트릭스 생성"""
        h, w, _ = image_np.shape
        mask = np.zeros((h, w), dtype=np.uint8) # 0(검은색): 원본 신체 및 배경 보존

        try:
            # 8대 무결성 관절 좌표 파싱
            flat_landmarks = landmarks
            if hasattr(landmarks, "landmark"):
                flat_landmarks = landmarks.landmark
            elif isinstance(landmarks, list) and len(landmarks) > 0:
                if isinstance(landmarks[0], list):
                    flat_landmarks = landmarks[0]

            def get_pix(idx):
                lm = flat_landmarks[idx]
                x = getattr(lm, 'x', lm.get('x', 0) if isinstance(lm, dict) else 0)
                y = getattr(lm, 'y', lm.get('y', 0) if isinstance(lm, dict) else 0)
                return int(x * w), int(y * h)

            # 8대 관절 추출: 어깨(11,12), 팔꿈치(13,14), 손목(15,16), 골반(23,24)
            pt11, pt12 = get_pix(11), get_pix(12)
            pt13, pt14 = get_pix(13), get_pix(14)
            pt15, pt16 = get_pix(15), get_pix(16)
            pt23, pt24 = get_pix(23), get_pix(24)

            # 몸통 기본 다각형 베이스 설정
            pts = np.array([pt11, pt12, pt24, pt23], dtype=np.int32)
            
            # 하단 시보리 오버핏 자락을 안전하게 지우기 위한 하단 10% 최소 여백 확장 패딩
            torso_height = abs(pt23[1] - pt11[1])
            pad_y = int(torso_height * 0.10)
            extra_pts = np.array([
                [pt23[0], pt23[1] + pad_y],
                [pt24[0], pt24[1] + pad_y]
            ], dtype=np.int32)
            
            # 최종 정석 상반신 컨벡스헐 조형
            hull_extended = cv2.convexHull(np.vstack([pts, extra_pts]))
            cv2.fillConvexPoly(mask, hull_extended, 255)

            # 인체 비례에 맞는 두꺼운 소매 브러시 두께 산출
            shoulder_width = np.linalg.norm(np.array(pt11) - np.array(pt12))
            arm_thickness = int(shoulder_width * 0.50)

            # 주머니 속 숨은 팔 궤적을 따라 소매 영역을 255(흰색: 교체 구역)로 마스킹
            cv2.line(mask, pt11, pt13, 255, thickness=arm_thickness)
            cv2.line(mask, pt13, pt15, 255, thickness=arm_thickness)
            cv2.line(mask, pt12, pt14, 255, thickness=arm_thickness)
            cv2.line(mask, pt14, pt16, 255, thickness=arm_thickness)

            # =================================================================
            # [마스크 스케일 정형화]
            # 블랙 테두리와 외곽 붕괴를 방지하기 위해 인위적인 자르기 로직을 전면 제거하고,
            # 경계면 잔상을 깨끗하게 포획할 (31, 31) 팽창 커널을 삽입합니다.
            # =================================================================
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (31, 31))
            mask = cv2.dilate(mask, kernel, iterations=1)
            mask = cv2.GaussianBlur(mask, (15, 15), 0)

        except Exception as e:
            print(f"[Mask Fallback Active] Error: {str(e)}")
            cv2.rectangle(mask, (int(w*0.12), int(h*0.22)), (int(w*0.88), int(h*0.85)), 255, -1)

        return mask

    def execute_tryon(self, garment_bytes: bytes, raw_landmarks: list, origin_cv_img: np.ndarray) -> str:
        """
        [오리지널 순수 CatVTON 추론 인터페이스] 인위적 이미지 조작을 100% 배제한 정석 런타임
        """
        target_size = (768, 1024)
        
        # 1. 정석 마스크 매트릭스 연산 수행 (인위적 컷 없이 자연스러운 하단 유입)
        mask_np = self.generate_agnostic_mask_from_landmarks(origin_cv_img, raw_landmarks)
        
        # 2. 원본 피사체가 가진 해부학적 광원 주름 정보를 있는 그대로 PIL 이미지로 변환합니다.
        person_pil = Image.fromarray(cv2.cvtColor(origin_cv_img, cv2.COLOR_BGR2RGB)).resize(target_size)
        mask_pil = Image.fromarray(mask_np).resize(target_size)
        
        # 3. 의류 이미지 1:1 정종횡비 레터박스 패딩 연산 (로고 짜부라짐 방지)
        garment_pil = Image.open(io.BytesIO(garment_bytes)).convert("RGB")
        garment_resized = garment_pil.resize((768, 768), Image.Resampling.LANCZOS)
        garment_padded = Image.new("RGB", (768, 1024), (255, 255, 255))
        garment_padded.paste(garment_resized, (0, 128)) 
        
        print("[CatVTON Core Inference] Running pure image-conditioned cross-attention mapping...")
        
        # =================================================================
        # [핵심 튜닝: 가중치 스케일 강화 고정]
        # 오직 [원본 인물, 패딩 옷, 정석 마스크] 텐서만 주입하되,
        # guidance_scale 강도를 4.5로 상향하여 입히는 옷 고유의 색상 특징이
        # 바탕색을 찍어누르고 이식되도록 유도합니다.
        # =================================================================
        with torch.inference_mode():
            output = self.pipeline(
                image=person_pil,
                condition_image=garment_padded,
                mask=mask_pil,
                num_inference_steps=30,
                guidance_scale=4.5  # ◀ ⚠️ 4.5 수치 강화를 통해 칠흑 같은 원단 전압 사영 강제화!
            )
            
        final_tryon_pil = output[0] if isinstance(output, list) else getattr(output, "images", [output])[0]

        buffered = io.BytesIO()
        final_tryon_pil.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode("utf-8")
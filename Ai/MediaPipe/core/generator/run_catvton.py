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

current_dir = os.path.dirname(os.path.abspath(__file__))
catvton_root = os.path.abspath(os.path.join(current_dir, "..", "..", "CatVTON"))
if catvton_root not in sys.path:
    sys.path.append(catvton_root)

from model.pipeline import CatVTONPipeline

class CatVtonEngine:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.torch_dtype = torch.float16 if self.device == "cuda" else torch.float32

        print("[CatVTON Engine] Downloading official weights from HuggingFace Hub...")
        repo_path = snapshot_download(repo_id="zhengchong/CatVTON")

        print(f"[CatVTON Engine] Assembling official CatVTON Pipeline on {self.device}...")
        # 디테일을 살려낸 정답 모델 유지
        self.pipeline = CatVTONPipeline(
            base_ckpt="booksforcharlie/stable-diffusion-inpainting",
            attn_ckpt=repo_path,
            attn_ckpt_version="mix",
            weight_dtype=self.torch_dtype,
            device=self.device,
            skip_safety_check=True
        )

    def generate_agnostic_mask_from_landmarks(self, image_np: np.ndarray, landmarks: list) -> np.ndarray:
        """모든 억지 확장을 버리고 정상적인 사람 체형으로 회귀한 표준 마스크"""
        h, w, _ = image_np.shape
        mask = np.zeros((h, w), dtype=np.uint8)

        try:
            flat_landmarks = landmarks
            if hasattr(landmarks, "landmark"):
                flat_landmarks = landmarks.landmark
            elif isinstance(landmarks, list) and len(landmarks) > 0:
                if isinstance(landmarks[0], list):
                    flat_landmarks = landmarks[0]

            def get_pix(idx):
                lm = flat_landmarks[idx]
                x = getattr(lm, "x", lm.get("x", 0) if isinstance(lm, dict) else 0)
                y = getattr(lm, "y", lm.get("y", 0) if isinstance(lm, dict) else 0)
                return int(x * w), int(y * h)

            pt11, pt12 = get_pix(11), get_pix(12)  # 어깨
            pt13, pt14 = get_pix(13), get_pix(14)  # 팔꿈치
            pt15, pt16 = get_pix(15), get_pix(16)  # 손목
            pt23, pt24 = get_pix(23), get_pix(24)  # 골반

            shoulder_w = np.linalg.norm(np.array(pt11) - np.array(pt12))
            torso_h = abs(pt23[1] - pt11[1])

            # 1. 몸통 베이스 (과도한 확장 없이 뼈대 그대로)
            torso_pts = np.array([pt11, pt12, pt24, pt23], dtype=np.int32)
            cv2.fillConvexPoly(mask, torso_pts, 255)

            # 2. 하단 덮기 (바지 라인 위까지만)
            pad_y = int(torso_h * 0.10)
            bottom_pts = np.array([
                pt23, pt24,
                [pt24[0], pt24[1] + pad_y],
                [pt23[0], pt23[1] + pad_y]
            ], dtype=np.int32)
            cv2.fillConvexPoly(mask, bottom_pts, 255)

            # 3. 카라를 위한 목 중앙 공간
            center_x = int((pt11[0] + pt12[0]) / 2)
            center_y = int((pt11[1] + pt12[1]) / 2)
            cv2.ellipse(mask, (center_x, center_y), (int(shoulder_w * 0.25), int(torso_h * 0.15)), 0, 180, 360, 255, -1)

            # 4. 팔 두께 정상화 (어깨너비의 70% -> 40% 표준 사이즈로 강등)
            arm_thick = int(shoulder_w * 0.40)
            cv2.line(mask, pt11, pt13, 255, thickness=arm_thick)
            cv2.line(mask, pt12, pt14, 255, thickness=arm_thick)
            cv2.line(mask, pt13, pt15, 255, thickness=arm_thick)
            cv2.line(mask, pt14, pt16, 255, thickness=arm_thick)

            # 5. 이염 방지를 위한 기본 팽창 및 이진화
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
            mask = cv2.dilate(mask, kernel, iterations=1)
            _, mask = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)

        except Exception as e:
            print(f"[Mask Fallback Active] Error: {str(e)}")
            cv2.rectangle(mask, (int(w * 0.15), int(h * 0.20)), (int(w * 0.85), int(h * 0.80)), 255, -1)

        return mask

    def execute_tryon(self, garment_bytes: bytes, raw_landmarks: list, origin_cv_img: np.ndarray) -> str:
        target_size = (768, 1024)
        mask_np = self.generate_agnostic_mask_from_landmarks(origin_cv_img, raw_landmarks)

        person_pil = Image.fromarray(cv2.cvtColor(origin_cv_img, cv2.COLOR_BGR2RGB)).resize(target_size)
        mask_pil = Image.fromarray(mask_np).resize(target_size)

        garment_raw = Image.open(io.BytesIO(garment_bytes))
        if garment_raw.mode in ("RGBA", "LA") or (garment_raw.mode == "P" and "transparency" in garment_raw.info):
            alpha = garment_raw.convert("RGBA").split()[-1]
            bg = Image.new("RGBA", garment_raw.size, (255, 255, 255, 255))
            bg.paste(garment_raw, mask=alpha)
            garment_pil = bg.convert("RGB")
        else:
            garment_pil = garment_raw.convert("RGB")

        garment_resized = garment_pil.resize((768, 768), Image.Resampling.LANCZOS)
        garment_padded = Image.new("RGB", (768, 1024), (255, 255, 255))
        garment_padded.paste(garment_resized, (0, 128))

        with torch.inference_mode():
            output = self.pipeline(
                image=person_pil,
                condition_image=garment_padded,
                mask=mask_pil,
                num_inference_steps=30,
                guidance_scale=2.5 
            )

        final_tryon_pil = output[0] if isinstance(output, list) else getattr(output, "images", [output])[0]

        buffered = io.BytesIO()
        final_tryon_pil.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode("utf-8")
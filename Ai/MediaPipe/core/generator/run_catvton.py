# core/generator/run_catvton.py
import os
import sys
import io
import base64
import torch
import torch.nn as nn
import numpy as np
import cv2
from PIL import Image
from huggingface_hub import snapshot_download
from transformers import AutoImageProcessor, SegformerForSemanticSegmentation

current_dir = os.path.dirname(os.path.abspath(__file__))
catvton_root = os.path.abspath(os.path.join(current_dir, "..", "..", "CatVTON"))
if catvton_root not in sys.path:
    sys.path.append(catvton_root)

from model.pipeline import CatVTONPipeline

class CatVtonEngine:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.torch_dtype = torch.float16 if self.device == "cuda" else torch.float32

        # 1. 양방향 AI 마스킹 및 전처리를 위한 SegFormer Clothes Parser 적재
        print("[CatVTON Engine] Loading Dual-Directional SegFormer Clothes Parser...")
        self.parser_processor = AutoImageProcessor.from_pretrained("mattmdjaga/segformer_b0_clothes")
        self.parser_model = SegformerForSemanticSegmentation.from_pretrained("mattmdjaga/segformer_b0_clothes").to(self.device)

        # 2. 공식 CatVTON 모델 가중치 다운로드 및 빌드
        print("[CatVTON Engine] Downloading official weights from HuggingFace Hub...")
        repo_path = snapshot_download(repo_id="zhengchong/CatVTON")

        print(f"[CatVTON Engine] Assembling official CatVTON Pipeline on {self.device}...")
        self.pipeline = CatVTONPipeline(
            base_ckpt="booksforcharlie/stable-diffusion-inpainting",
            attn_ckpt=repo_path,
            attn_ckpt_version="mix",
            weight_dtype=self.torch_dtype,
            device=self.device,
            skip_safety_check=True
        )

    def preserve_aspect_ratio_and_pad(self, pil_img: Image.Image, target_size=(768, 1024)) -> Image.Image:
        """
        [왜곡 및 Halo 해결] 원본 사진의 비율을 보존하면서 부족한 축만 실제 배경색으로 채웁니다.
        강제 리사이즈로 인한 체형 찌부러짐과 흰색 패딩으로 인한 유령 실루엣을 완벽 차단합니다.
        """
        target_w, target_h = target_size
        orig_w, orig_h = pil_img.size
        
        # 이미지 좌상단 (0,0)에서 실제 배경색을 스캔하여 동기화
        bg_color = pil_img.getpixel((0, 0))
        
        aspect_orig = orig_w / orig_h
        aspect_target = target_w / target_h
        
        if aspect_orig > aspect_target:
            new_w = target_w
            new_h = int(target_w / aspect_orig)
        else:
            new_h = target_h
            new_w = int(target_h * aspect_orig)
            
        resized_img = pil_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        padded_img = Image.new("RGB", target_size, bg_color)
        paste_x = (target_w - new_w) // 2
        paste_y = (target_h - new_h) // 2
        padded_img.paste(resized_img, (paste_x, paste_y))
        
        return padded_img

    def smart_crop_garment(self, garment_pil: Image.Image) -> Image.Image:
        """
        [어깨 왜소화 해결] 모델/마네킹 사진이 들어와도 진짜 '상의' 영역만 AI로 검출하여 확대 크롭합니다.
        의류 이미지 주변 여백을 바짝 제거하여 피팅 시 정상적인 어깨 핏(오버핏 등)을 보장합니다.
        """
        inputs = self.parser_processor(images=garment_pil, return_tensors="pt").to(self.device)
        with torch.no_grad():
            outputs = self.parser_model(**inputs)
        
        upsampled_logits = nn.functional.interpolate(
            outputs.logits, size=garment_pil.size[::-1], mode="bilinear", align_corners=False
        )
        pred_labels = upsampled_logits.argmax(dim=1)[0].cpu().numpy()
        
        y_indices, x_indices = np.where(pred_labels == 4)  # Label 4 = Upper-clothes (상의)
        
        if len(x_indices) > 0 and len(y_indices) > 0:
            x_min, x_max = np.min(x_indices), np.max(x_indices)
            y_min, y_max = np.min(y_indices), np.max(y_indices)
            
            pad = 12
            img_np = np.array(garment_pil)
            h, w = img_np.shape[:2]
            
            cropped_np = img_np[max(0, y_min-pad):min(h, y_max+pad), 
                                max(0, x_min-pad):min(w, x_max+pad)]
            return Image.fromarray(cropped_np)
        else:
            return self.legacy_contour_crop(garment_pil)

    def legacy_contour_crop(self, garment_pil: Image.Image) -> Image.Image:
        """단독 평면 의류 사진용 배경 기반 크롭 백업 시스템"""
        cv_img = cv2.cvtColor(np.array(garment_pil), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 250, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            x, y, w, h = cv2.boundingRect(np.concatenate(contours))
            pad = 5
            x_min, x_max = max(0, x - pad), min(cv_img.shape[1], x + w + pad)
            y_min, y_max = max(0, y - pad), min(cv_img.shape[0], y + h + pad)
            return Image.fromarray(cv2.cvtColor(cv_img[y_min:y_max, x_min:x_max], cv2.COLOR_BGR2RGB))
        return garment_pil

    def generate_segmentation_mask(self, person_padded_pil: Image.Image) -> Image.Image:
        """
        [넥라인 환각 및 턱선 붕괴 해결] 턱선 위쪽(얼굴/머리)은 칼같이 방어하여 훼손을 차단하고,
        목덜미 영역은 열어두어 의류 고유의 넥라인(셔츠 칼라 또는 라운드넥)을 자연스럽게 살려냅니다.
        """
        inputs = self.parser_processor(images=person_padded_pil, return_tensors="pt").to(self.device)
        with torch.no_grad():
            outputs = self.parser_model(**inputs)
            
        upsampled_logits = nn.functional.interpolate(
            outputs.logits, size=(1024, 768), mode="bilinear", align_corners=False
        )
        pred_labels = upsampled_logits.argmax(dim=1)[0].cpu().numpy()
        
        upper_mask = np.where(pred_labels == 4, 255, 0).astype(np.uint8)
        
        # 절대 침범 금지 영역: Hair(2), Face(11) 지정
        avoid_mask = np.where((pred_labels == 2) | (pred_labels == 11), 255, 0).astype(np.uint8)
        
        if np.any(upper_mask):
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
            expanded_upper = cv2.dilate(upper_mask, kernel, iterations=2)
            
            # 사방 팽창 후 얼굴/머리카락 영역만 수학적으로 뺄셈(Bitwise And Not) 연산
            final_mask = cv2.bitwise_and(expanded_upper, cv2.bitwise_not(avoid_mask))
            final_mask = cv2.GaussianBlur(final_mask, (5, 5), 0)
        else:
            final_mask = np.zeros((1024, 768), dtype=np.uint8)
            cv2.rectangle(final_mask, (200, 256), (568, 768), 255, -1)
            
        return Image.fromarray(final_mask)

    def execute_tryon(self, garment_bytes: bytes, origin_cv_img: np.ndarray) -> str:
        """모든 비전 리스크가 해결된 최종 가상 착장 파이프라인"""
        target_size = (768, 1024)
        
        # 1. 인물 정렬 및 패딩 적용
        raw_person_pil = Image.fromarray(cv2.cvtColor(origin_cv_img, cv2.COLOR_BGR2RGB))
        person_pil = self.preserve_aspect_ratio_and_pad(raw_person_pil, target_size=target_size)
        
        # 2. 턱선 방어 및 넥라인 개방형 고정밀 상의 마스크 자동 생성 (S-Step)
        mask_pil = self.generate_segmentation_mask(person_pil)

        # 3. 의류 알파 전처리 및 AI 스마트 크롭 적용
        garment_raw = Image.open(io.BytesIO(garment_bytes))
        if garment_raw.mode in ("RGBA", "LA") or (garment_raw.mode == "P" and "transparency" in garment_raw.info):
            alpha = garment_raw.convert("RGBA").split()[-1]
            bg = Image.new("RGBA", garment_raw.size, (255, 255, 255, 255))
            bg.paste(garment_raw, mask=alpha)
            garment_pil = bg.convert("RGB")
        else:
            garment_pil = garment_raw.convert("RGB")

        cropped_garment_pil = self.smart_crop_garment(garment_pil)
        garment_resized = cropped_garment_pil.resize((768, 768), Image.Resampling.LANCZOS)
        garment_padded = Image.new("RGB", (768, 1024), (255, 255, 255))
        garment_padded.paste(garment_resized, (0, 128))

        # 4. 고정 시드 부여 및 가이드 스케일 튜닝 추론 (D-Step)
        generator = torch.Generator(device=self.device).manual_seed(42)

        with torch.inference_mode():
            output = self.pipeline(
                image=person_pil,
                condition_image=garment_padded,
                mask=mask_pil,
                num_inference_steps=40,
                guidance_scale=2.9,  # 색상 과포화 환각을 완벽히 잡는 검증된 최적 스케일
                generator=generator
            )

        final_tryon_pil = output[0] if isinstance(output, list) else getattr(output, "images", [output])[0]

        # 5. [허리 경계선 보정] 옷이 바뀐 파트 외에 바지, 신발, 배경은 100% 원본 유지 블렌딩
        final_np = cv2.cvtColor(np.array(final_tryon_pil), cv2.COLOR_RGB2BGR)
        person_np = cv2.cvtColor(np.array(person_pil), cv2.COLOR_RGB2BGR)
        mask_np = np.array(mask_pil)
        
        blur_mask = cv2.GaussianBlur(mask_np, (15, 15), 0) / 255.0
        blur_mask = np.expand_dims(blur_mask, axis=2)
        
        blended_np = (final_np * blur_mask + person_np * (1.0 - blur_mask)).astype(np.uint8)
        final_tryon_pil = Image.fromarray(cv2.cvtColor(blended_np, cv2.COLOR_BGR2RGB))

        # 6. 연산 직후 GPU 메모리 즉시 청소 (OOM 원천 방지)
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        buffered = io.BytesIO()
        final_tryon_pil.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode("utf-8")
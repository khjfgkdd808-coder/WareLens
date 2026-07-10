# core/generator/run_catvton.py
import os
import sys
import io
import gc
import base64
import torch
import torch.nn as nn
import numpy as np
import cv2
from PIL import Image
from huggingface_hub import snapshot_download
from transformers import AutoImageProcessor, SegformerForSemanticSegmentation

# 앞서 만든 전역 설정 관리자 임포트
from core.config import settings

sys.path.insert(0, settings.catvton_repo_dir)
try:
    from model.pipeline import CatVTONPipeline as InternalCatVTONPipeline
except ImportError:
    raise ImportError(f"CatVTON 모듈을 찾을 수 없습니다. 경로를 확인하세요: {settings.catvton_repo_dir}")
finally:
    # 💡 핵심 방어 코드: import가 끝나면 삽입했던 경로를 즉시 제거하여 Uvicorn 충돌을 막습니다!
    if sys.path[0] == settings.catvton_repo_dir:
        sys.path.pop(0)


class CatVTONPipeline:
    def __init__(self):
        self.device = settings.device
        self.torch_dtype = torch.float16 if self.device == "cuda" else torch.float32
        self.target_size = (settings.target_width, settings.target_height)

        print("[CatVTON Engine] 1. SegFormer Clothes Parser (마스크/누끼용) 로드 중...")
        self.parser_processor = AutoImageProcessor.from_pretrained("mattmdjaga/segformer_b0_clothes")
        self.parser_model = SegformerForSemanticSegmentation.from_pretrained("mattmdjaga/segformer_b0_clothes").to(self.device)

        print("[CatVTON Engine] 2. 오피셜 CatVTON 모델 다운로드 및 로드 중...")
        repo_path = snapshot_download(repo_id="zhengchong/CatVTON")
        self.pipeline = InternalCatVTONPipeline(
            base_ckpt="booksforcharlie/stable-diffusion-inpainting",
            attn_ckpt=repo_path,
            attn_ckpt_version="mix",
            weight_dtype=self.torch_dtype,
            device=self.device,
            skip_safety_check=True
        )
        print("[CatVTON Engine] 🚀 듀얼 모델 파이프라인 구축 완료!")

    # -------------------------------------------------------------------------
    # 1. 이미지 전처리 (Preprocessing Utilities)
    # -------------------------------------------------------------------------
    def _preserve_aspect_ratio_and_pad(self, pil_img: Image.Image) -> Image.Image:
        """비율을 유지하며 설정된 해상도 도화지 가운데에 이미지를 얹습니다."""
        target_w, target_h = self.target_size
        orig_w, orig_h = pil_img.size
        
        # 좌상단 픽셀을 배경색으로 자동 샘플링 (기존 아이디어 유지)
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
        padded_img = Image.new("RGB", self.target_size, bg_color)
        
        paste_x = (target_w - new_w) // 2
        paste_y = (target_h - new_h) // 2
        padded_img.paste(resized_img, (paste_x, paste_y))
        
        return padded_img

    def _smart_crop_garment(self, garment_pil: Image.Image) -> Image.Image:
        """주어진 옷 이미지에서 SegFormer를 사용해 순수 '상의(Label 4)' 영역만 크롭합니다."""
        inputs = self.parser_processor(images=garment_pil, return_tensors="pt").to(self.device)
        with torch.no_grad():
            outputs = self.parser_model(**inputs)
        
        upsampled_logits = nn.functional.interpolate(
            outputs.logits, size=garment_pil.size[::-1], mode="bilinear", align_corners=False
        )
        pred_labels = upsampled_logits.argmax(dim=1)[0].cpu().numpy()
        
        # 4번(상의) 라벨의 좌표 추출
        y_indices, x_indices = np.where(pred_labels == 4)
        
        if len(x_indices) > 0 and len(y_indices) > 0:
            pad = 12
            x_min, x_max = np.min(x_indices), np.max(x_indices)
            y_min, y_max = np.min(y_indices), np.max(y_indices)
            
            img_np = np.array(garment_pil)
            h, w = img_np.shape[:2]
            
            cropped_np = img_np[max(0, y_min-pad):min(h, y_max+pad), max(0, x_min-pad):min(w, x_max+pad)]
            return Image.fromarray(cropped_np)
            
        # Segformer 실패 시 원본 반환 (구형 레거시 코드는 복잡도 감소를 위해 제거)
        return garment_pil

    # -------------------------------------------------------------------------
    # 2. 마스크 생성 (Mask Generation)
    # -------------------------------------------------------------------------
    def _generate_vton_mask(self, person_padded_pil: Image.Image) -> Image.Image:
        """사람 이미지에서 상의 부분을 하얗게, 얼굴/머리카락(턱선)을 보호하여 마스크를 생성합니다."""
        inputs = self.parser_processor(images=person_padded_pil, return_tensors="pt").to(self.device)
        with torch.no_grad():
            outputs = self.parser_model(**inputs)
            
        # 타겟 사이즈(1024x768)로 복원
        upsampled_logits = nn.functional.interpolate(
            outputs.logits, size=(self.target_size[1], self.target_size[0]), mode="bilinear", align_corners=False
        )
        pred_labels = upsampled_logits.argmax(dim=1)[0].cpu().numpy()
        
        # 4번: 상의, 2번/11번: 머리카락/얼굴 (보호 영역)
        upper_mask = np.where(pred_labels == 4, 255, 0).astype(np.uint8)
        avoid_mask = np.where((pred_labels == 2) | (pred_labels == 11), 255, 0).astype(np.uint8)
        
        if np.any(upper_mask):
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
            expanded_upper = cv2.dilate(upper_mask, kernel, iterations=2)
            # 보호 영역(턱선 등) 차감
            final_mask = cv2.bitwise_and(expanded_upper, cv2.bitwise_not(avoid_mask))
            final_mask = cv2.GaussianBlur(final_mask, (5, 5), 0)
        else:
            # 안전망: 상의를 못 찾았을 경우 가슴팍 부근에 기본 사각형 마스크 생성
            final_mask = np.zeros((self.target_size[1], self.target_size[0]), dtype=np.uint8)
            cv2.rectangle(final_mask, (200, 256), (568, 768), 255, -1)
            
        return Image.fromarray(final_mask)

    # -------------------------------------------------------------------------
    # 3. 후처리 및 합성 (Post-Processing)
    # -------------------------------------------------------------------------
    def _apply_alpha_blending(self, generated_pil: Image.Image, original_pil: Image.Image, mask_pil: Image.Image) -> Image.Image:
        """원본 이미지의 경계선과 생성된 이미지의 경계선을 부드럽게 가우시안 합성합니다."""
        final_np = cv2.cvtColor(np.array(generated_pil), cv2.COLOR_RGB2BGR)
        person_np = cv2.cvtColor(np.array(original_pil), cv2.COLOR_RGB2BGR)
        mask_np = np.array(mask_pil)
        
        # 마스크를 부드럽게 만들어 자연스러운 합성 유도
        blur_mask = cv2.GaussianBlur(mask_np, (15, 15), 0) / 255.0
        blur_mask = np.expand_dims(blur_mask, axis=2)
        
        blended_np = (final_np * blur_mask + person_np * (1.0 - blur_mask)).astype(np.uint8)
        return Image.fromarray(cv2.cvtColor(blended_np, cv2.COLOR_BGR2RGB))

    # -------------------------------------------------------------------------
    # 메인 오퍼레이션 (Orchestrator)
    # -------------------------------------------------------------------------
    def execute_tryon(self, garment_bytes: bytes, origin_cv_img: np.ndarray) -> str:
        """API에서 직접 호출받는 메인 추론 함수 (흐름 제어에 집중)"""
        try:
            # 1. 사람 이미지 준비
            raw_person_pil = Image.fromarray(cv2.cvtColor(origin_cv_img, cv2.COLOR_BGR2RGB))
            person_pil = self._preserve_aspect_ratio_and_pad(raw_person_pil)
            mask_pil = self._generate_vton_mask(person_pil)

            # 2. 옷(의류) 이미지 준비 및 투명도(Alpha) 처리
            garment_raw = Image.open(io.BytesIO(garment_bytes))
            if garment_raw.mode in ("RGBA", "LA") or (garment_raw.mode == "P" and "transparency" in garment_raw.info):
                alpha = garment_raw.convert("RGBA").split()[-1]
                bg = Image.new("RGBA", garment_raw.size, (255, 255, 255, 255))
                bg.paste(garment_raw, mask=alpha)
                garment_pil = bg.convert("RGB")
            else:
                garment_pil = garment_raw.convert("RGB")

            # 옷 크롭 및 배치
            cropped_garment_pil = self._smart_crop_garment(garment_pil)
            garment_resized = cropped_garment_pil.resize((settings.target_width, settings.target_width), Image.Resampling.LANCZOS)
            
            garment_padded = Image.new("RGB", self.target_size, (255, 255, 255))
            garment_padded.paste(garment_resized, (0, 128)) # Y축 상단 여백 부여

            # 3. 모델 추론 (settings의 하이퍼파라미터 사용)
            generator = torch.Generator(device=self.device).manual_seed(42)
            with torch.inference_mode():
                output = self.pipeline(
                    image=person_pil,
                    condition_image=garment_padded,
                    mask=mask_pil,
                    num_inference_steps=settings.inference_steps,
                    guidance_scale=settings.guidance_scale,
                    generator=generator
                )
            generated_pil = output[0] if isinstance(output, list) else getattr(output, "images", [output])[0]

            # 4. 알파 블렌딩 후처리
            final_tryon_pil = self._apply_alpha_blending(generated_pil, person_pil, mask_pil)

            # 5. Base64 반환
            buffered = io.BytesIO()
            final_tryon_pil.save(buffered, format="PNG")
            return base64.b64encode(buffered.getvalue()).decode("utf-8")

        finally:
            # 6. OOM(Out of Memory) 방지를 위한 강력한 가비지 컬렉션
            if self.device == "cuda":
                torch.cuda.empty_cache()
            gc.collect()
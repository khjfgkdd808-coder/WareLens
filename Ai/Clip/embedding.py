"""
embedding.py - CLIP 모델 로드 및 이미지 임베딩 생성
=====================================================
CLIP 모델을 불러오고, 이미지를 512차원 임베딩 벡터로 변환하는 기능을 담당합니다.

향후 다른 임베딩 모델로 교체하고 싶다면 이 파일만 수정하면 됩니다.
"""

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from transformers import CLIPModel, CLIPProcessor

# 사용할 CLIP 모델 (HuggingFace 모델 허브)
MODEL_NAME = "openai/clip-vit-base-patch32"

# GPU 사용 가능하면 GPU, 아니면 CPU 사용
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


def load_clip_model() -> tuple[CLIPModel, CLIPProcessor]:
    """
    HuggingFace에서 CLIP 모델과 프로세서를 불러옵니다.
    처음 실행 시 모델을 다운로드하며, 이후에는 캐시에서 로드합니다.

    Returns:
        tuple:
            - model     (CLIPModel)     : 이미지 임베딩 생성 모델
            - processor (CLIPProcessor) : 이미지 전처리 도구
    """
    print(f"  CLIP 모델 로딩 중... (장치: {DEVICE.upper()})")

    processor = CLIPProcessor.from_pretrained(MODEL_NAME)
    model     = CLIPModel.from_pretrained(MODEL_NAME).to(DEVICE)

    # 추론 모드 설정 (드롭아웃 등 비활성화 → 속도/메모리 절약)
    model.eval()

    print(f"  완료 - {MODEL_NAME}")
    return model, processor


def get_image_embedding(
    image    : Image.Image,
    model    : CLIPModel,
    processor: CLIPProcessor,
) -> np.ndarray:
    """
    PIL Image 1장을 512차원 L2 정규화된 임베딩 벡터로 변환합니다.

    처리 순서:
    1. CLIPProcessor로 전처리 (리사이즈, 정규화)
    2. vision_model로 768차원 특징 추출 (pooler_output)
    3. visual_projection으로 512차원으로 변환
    4. L2 정규화 (벡터 길이를 1로 통일)
    5. NumPy 배열로 변환 후 반환

    [참고] get_image_features() 대신 vision_model + visual_projection을
           직접 호출하는 이유: get_image_features()는 내부적으로 텍스트
           입력도 기대할 수 있어 간헐적으로 타입 오류가 발생하기 때문입니다.

    Args:
        image     (PIL.Image.Image) : RGB 이미지 객체
        model     (CLIPModel)       : 로드된 CLIP 모델
        processor (CLIPProcessor)   : 로드된 CLIP 프로세서

    Returns:
        np.ndarray: shape (1, 512), L2 정규화된 임베딩 벡터
    """
    # 이미지를 모델 입력 형태로 전처리 (리사이즈 224x224, 정규화 등)
    inputs = processor(images=image, return_tensors="pt").to(DEVICE)

    # gradient 계산 비활성화 (추론 시 메모리/속도 절약)
    with torch.no_grad():
        output         = model.vision_model(**inputs)
        image_features = output.pooler_output                     # (1, 768)
        image_features = model.visual_projection(image_features)  # (1, 512)

    # L2 정규화: 벡터 크기를 1로 통일 → 코사인 유사도 계산에 최적화
    image_features = F.normalize(image_features, p=2, dim=-1)

    return image_features.cpu().numpy()  # shape: (1, 512)


def get_average_embedding(
    images   : list[Image.Image],
    model    : CLIPModel,
    processor: CLIPProcessor,
) -> np.ndarray:
    """
    여러 장의 이미지 임베딩을 생성하고 평균 벡터를 반환합니다.
    평균 벡터도 L2 재정규화하여 단위 벡터로 만듭니다.

    1장이 입력되면 해당 이미지의 임베딩을 그대로 반환합니다.

    Args:
        images    (list[PIL.Image.Image]) : 이미지 리스트 (1장 이상)
        model     (CLIPModel)             : 로드된 CLIP 모델
        processor (CLIPProcessor)         : 로드된 CLIP 프로세서

    Returns:
        np.ndarray: shape (1, 512), L2 정규화된 평균 임베딩 벡터
    """
    embeddings = []

    for image in images:
        embedding = get_image_embedding(image, model, processor)  # (1, 512)
        embeddings.append(embedding)

    # (N, 512) → 평균 → (1, 512)
    avg = np.mean(np.vstack(embeddings), axis=0, keepdims=True)

    # 평균 벡터를 다시 L2 정규화
    avg_tensor = torch.tensor(avg)
    avg_normalized = F.normalize(avg_tensor, p=2, dim=-1).numpy()

    return avg_normalized  # shape: (1, 512)

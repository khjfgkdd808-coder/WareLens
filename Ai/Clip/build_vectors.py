"""
build_vectors.py - fashion_dataset 전체 임베딩 생성 및 캐시 저장
=================================================================
fashion_dataset 폴더의 모든 이미지를 CLIP으로 임베딩하고
cache/ 폴더에 저장합니다.

main.py 실행 전에 반드시 한 번 실행해야 합니다.
데이터셋이 변경(추가/삭제)되면 다시 실행하여 캐시를 갱신하세요.

실행 방법:
    python build_vectors.py
"""

import sys
import numpy as np
from pathlib import Path
from tqdm import tqdm

from utils         import get_image_paths, load_image, validate_folder
from embedding     import load_clip_model, get_image_embedding
from cache_manager import save_cache, get_cache_info
from detector      import load_yolo_model, crop_person_region

# 데이터셋 폴더 경로 (build_vectors.py 기준 상대경로)
DATASET_DIR = Path(__file__).parent / "fashion_dataset"


def build_vectors() -> None:
    """
    fashion_dataset 폴더의 모든 이미지를 임베딩하여 캐시로 저장합니다.

    처리 순서:
    1. 기존 캐시 상태 확인 및 안내
    2. CLIP 모델 + YOLO 모델 로드
    3. 이미지 목록 수집
    4. 각 이미지에서 사람 영역 crop (탐지 안 되면 원본 그대로) 후 임베딩 생성
    5. vectors.npy / filenames.npy 저장

    [YOLO crop 관련]
    착용샷(모델이 입고 있는 사진)에서는 사람 영역만 잘라내어 배경 노이즈를 줄입니다.
    이미 누끼 처리된 사진이나 옷만 펼쳐놓은 사진은 사람이 탐지되지 않으므로
    원본 그대로 임베딩됩니다.
    """
    print("=" * 55)
    print("  벡터 빌드 시작 (build_vectors.py)")
    print("=" * 55)

    # ----------------------------------------------------------
    # 1. 기존 캐시 상태 확인
    # ----------------------------------------------------------
    info = get_cache_info()
    if info["exists"]:
        print(f"\n[참고] 기존 캐시가 존재합니다.")
        print(f"       이미지 수 : {info['n_images']}장")
        print(f"       벡터 차원 : {info['vector_dim']}")
        print(f"       → 덮어쓰고 새로 생성합니다.\n")

    # ----------------------------------------------------------
    # 2. 데이터셋 폴더 확인 및 이미지 경로 수집
    # validate_folder()/get_image_paths()는 폴더가 없으면 FileNotFoundError를 던집니다.
    # ----------------------------------------------------------
    try:
        validate_folder(DATASET_DIR, "fashion_dataset")
        image_paths = get_image_paths(DATASET_DIR)
    except FileNotFoundError as e:
        print(f"[오류] {e}")
        sys.exit(1)

    if len(image_paths) == 0:
        print(f"[오류] fashion_dataset 폴더에 이미지가 없습니다.")
        print(f"       jpg, jpeg, png, webp 파일을 넣고 다시 실행하세요.")
        return

    print(f"\n[1/3] 이미지 목록 수집 완료: {len(image_paths)}장")

    # ----------------------------------------------------------
    # 3. CLIP 모델 + YOLO 모델 로드
    # ----------------------------------------------------------
    print("\n[2/3] 모델 로딩")
    model, processor = load_clip_model()
    yolo_model = load_yolo_model()

    # ----------------------------------------------------------
    # 4. 전체 이미지 임베딩 생성
    # ----------------------------------------------------------
    print(f"\n[3/3] 임베딩 생성 중...")

    valid_paths = []
    embeddings  = []
    n_cropped   = 0  # 사람 탐지되어 crop된 이미지 수 (통계용)

    for path in tqdm(image_paths, desc="  진행", unit="장"):
        try:
            img = load_image(path)

            # 사람 영역 탐지 후 crop (탐지 안 되면 원본 그대로 반환)
            cropped_img = crop_person_region(img, yolo_model)
            if cropped_img is not img:
                n_cropped += 1

            embedding = get_image_embedding(cropped_img, model, processor)  # (1, 512)
            valid_paths.append(path)
            embeddings.append(embedding)
        except Exception as e:
            print(f"\n  [건너뜀] {path}: {e}")

    # 리스트 → NumPy 행렬 변환: (N, 1, 512) → (N, 512)
    embeddings_matrix = np.vstack(embeddings)

    # ----------------------------------------------------------
    # 5. 캐시 저장
    # ----------------------------------------------------------
    print(f"\n캐시 저장 중...")
    save_cache(vectors=embeddings_matrix, filenames=valid_paths)

    print()
    print("=" * 55)
    print(f"  완료!")
    print(f"  처리 이미지     : {len(valid_paths)} / {len(image_paths)}장")
    print(f"  사람 탐지 crop  : {n_cropped}장")
    print(f"  원본 그대로 사용: {len(valid_paths) - n_cropped}장")
    print(f"  벡터 shape      : {embeddings_matrix.shape}")
    print(f"  저장 위치       : cache/vectors.npy, cache/filenames.npy")
    print()
    print("  이제 main.py를 실행하세요:")
    print("    python main.py")
    print("=" * 55)


if __name__ == "__main__":
    build_vectors()

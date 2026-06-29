"""
main.py - 전체 실행 흐름 관리
===============================
1. test_img 폴더의 이미지를 읽어 평균 쿼리 임베딩 생성
2. 캐시에서 데이터셋 임베딩 로드
3. 코사인 유사도 기반 Top-K 추천
4. 결과 텍스트 출력 + 시각화

실행 방법:
    python main.py
"""

import sys
import warnings
from pathlib import Path

from utils         import get_image_paths, load_image, validate_folder
from embedding     import load_clip_model, get_average_embedding
from cache_manager import load_cache
from recommend     import find_top_k, print_result_table, visualize_results, save_results_csv
from metadata      import load_metadata, attach_metadata

# 불필요한 경고 억제
warnings.filterwarnings('ignore', message='Glyph.*missing from font')

# ----------------------------------------------------------
# 설정값 - 필요에 따라 여기서만 수정하면 됩니다
# ----------------------------------------------------------

# 쿼리 이미지 폴더 (main.py 기준 상대경로)
TEST_IMG_DIR = Path(__file__).parent / "test_img"

# 추천 결과 CSV 저장 경로 (main.py 기준 상대경로)
RESULT_CSV_PATH = Path(__file__).parent / "result.csv"

# 추천 수
TOP_K = 10

# 시각화에서 보여줄 추천 수
# (TOP_K보다 크게 설정해도 자동으로 TOP_K 이하로 보정됩니다)
TOP_K_DISPLAY = 5
TOP_K_DISPLAY = min(TOP_K_DISPLAY, TOP_K)


def main() -> None:
    """
    전체 추천 파이프라인을 실행합니다.

    처리 순서:
    1. test_img 폴더 확인 및 이미지 경로 수집
    2. CLIP 모델 로드
    3. 쿼리 이미지 임베딩 생성 (평균 벡터)
    4. 캐시에서 데이터셋 임베딩 로드
    5. Top-K 추천 계산
    6. 메타데이터(category/color/pattern 등) 결합
    7. 결과 출력(콘솔 간단 출력 + CSV 저장) 및 시각화(전체 필드 표시)
    """
    print("=" * 55)
    print("  의류 이미지 유사도 추천 시스템")
    print("=" * 55)

    # ----------------------------------------------------------
    # 1. test_img 폴더 확인 및 이미지 경로 수집
    # validate_folder()/get_image_paths()는 폴더가 없으면 FileNotFoundError를 던집니다.
    # ----------------------------------------------------------
    try:
        validate_folder(TEST_IMG_DIR, "test_img")
        query_paths = get_image_paths(TEST_IMG_DIR)
    except FileNotFoundError as e:
        print(f"[오류] {e}")
        sys.exit(1)

    if len(query_paths) == 0:
        print("[오류] test_img 폴더에 이미지가 없습니다.")
        print("       jpg, jpeg, png, webp 파일을 넣고 다시 실행하세요.")
        return

    print(f"\n[1/4] 쿼리 이미지 {len(query_paths)}장 발견")
    for i, path in enumerate(query_paths, start=1):
        print(f"       쿼리 {i}: {path.name if hasattr(path, 'name') else path}")

    # ----------------------------------------------------------
    # 2. CLIP 모델 로드
    # ----------------------------------------------------------
    print("\n[2/4] CLIP 모델 로딩")
    model, processor = load_clip_model()

    # ----------------------------------------------------------
    # 3. 쿼리 이미지 임베딩 생성 (1장 이상 모두 평균)
    # ----------------------------------------------------------
    print(f"\n[3/4] 쿼리 임베딩 생성 중...")

    query_images = [load_image(p) for p in query_paths]
    query_embedding = get_average_embedding(query_images, model, processor)

    if len(query_paths) == 1:
        print(f"       단일 이미지 임베딩 사용")
    else:
        print(f"       {len(query_paths)}장 임베딩의 평균 벡터 사용")

    print(f"       임베딩 shape: {query_embedding.shape}")

    # ----------------------------------------------------------
    # 4. 캐시에서 데이터셋 임베딩 로드
    # cache_manager.load_cache()는 캐시가 없으면 FileNotFoundError를 던집니다.
    # (서버 코드에서는 이 예외를 그대로 잡아 적절한 에러로 변환하지만,
    #  CLI에서는 사용자가 바로 알 수 있게 안내 메시지를 띄우고 종료합니다)
    # ----------------------------------------------------------
    print("\n[4/4] 데이터셋 임베딩 캐시 로드")
    try:
        dataset_embeddings, dataset_paths = load_cache()
    except FileNotFoundError as e:
        print(f"[오류] {e}")
        sys.exit(1)

    # ----------------------------------------------------------
    # 5. Top-K 추천 계산
    # ----------------------------------------------------------
    recommendations = find_top_k(
        query_embedding    = query_embedding,
        dataset_paths      = dataset_paths,
        dataset_embeddings = dataset_embeddings,
        top_k              = TOP_K,
    )

    # ----------------------------------------------------------
    # 6. 메타데이터 결합 (category, color, pattern 등)
    # 메타데이터가 없는 이미지는 빈 값("-")으로 채워지고 계속 진행됩니다.
    # ----------------------------------------------------------
    print("\n메타데이터 결합 중...")
    metadata_dict   = load_metadata()
    recommendations = attach_metadata(recommendations, metadata_dict)

    # ----------------------------------------------------------
    # 7. 결과 출력
    # ----------------------------------------------------------
    # 콘솔에는 간단한 정보만 출력
    print_result_table(query_paths, recommendations)

    # 전체 메타데이터 필드가 포함된 결과는 CSV로 저장
    save_results_csv(recommendations, output_path=str(RESULT_CSV_PATH))

    # 이미지 시각화 (상위 TOP_K_DISPLAY장만 표시, 메타데이터 전체 필드 포함)
    print("결과 시각화 출력 중...")
    visualize_results(
        query_paths     = query_paths,
        recommendations = recommendations,
        top_k_display   = TOP_K_DISPLAY,
    )


if __name__ == "__main__":
    main()

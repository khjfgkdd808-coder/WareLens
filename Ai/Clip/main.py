"""
main.py - 전체 실행 흐름 관리
===============================
1. test_img 폴더의 이미지를 읽어 평균 쿼리 임베딩 생성
2. 캐시에서 데이터셋 임베딩 로드
3. CLIP 유사도 기반 후보군 추출 (top_k보다 넉넉하게)
4. 메타데이터 결합 + 색상 점수 보정 후 최종 Top-K 재정렬
5. 추천 이유 생성 (CLIP 텍스트 프로브)
6. 결과 텍스트 출력 + 시각화

실행 방법:
    python main.py
"""

import sys
import warnings
from pathlib import Path

from utils           import get_image_paths, load_image, validate_folder
from embedding       import load_clip_model, get_average_embedding
from cache_manager   import load_cache
from recommend       import find_top_k, apply_color_boost, print_result_table, visualize_results, save_results_csv
from metadata        import load_metadata, attach_metadata
from color_analysis  import extract_dominant_colors, merge_color_profiles
from explainer       import generate_reasons

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

# CLIP 1차 후보군을 TOP_K의 몇 배로 가져올지
CANDIDATE_POOL_MULTIPLIER = 3

# 시각화에서 보여줄 추천 수
TOP_K_DISPLAY = 5
TOP_K_DISPLAY = min(TOP_K_DISPLAY, TOP_K)

# 추천 이유(reason)를 생성할 상위 N개
# 이 값을 늘리면 더 많은 항목에 이유가 출력됩니다.
EXPLAIN_TOP_N = 5


def main() -> None:
    """
    전체 추천 파이프라인을 실행합니다.

    처리 순서:
    1. test_img 폴더 확인 및 이미지 경로 수집
    2. CLIP 모델 로드
    3. 쿼리 이미지 임베딩 생성 (평균 벡터)
    4. 캐시에서 데이터셋 임베딩 로드
    5. CLIP 유사도 기반 후보군 추출 (TOP_K * CANDIDATE_POOL_MULTIPLIER)
    6. 메타데이터(category/color/pattern 등) 결합
    7. 쿼리 이미지 주요 색상 추출 + 색상 점수 보정 후 최종 Top-K 재정렬
    8. 추천 이유 생성 (CLIP 텍스트 프로브, EXPLAIN_TOP_N개)
    9. 결과 출력(콘솔 출력 + CSV 저장) 및 시각화
    """
    print("=" * 55)
    print("  의류 이미지 유사도 추천 시스템")
    print("=" * 55)

    # ----------------------------------------------------------
    # 1. test_img 폴더 확인 및 이미지 경로 수집
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

    print(f"\n[1/5] 쿼리 이미지 {len(query_paths)}장 발견")
    for i, path in enumerate(query_paths, start=1):
        print(f"       쿼리 {i}: {path.name if hasattr(path, 'name') else path}")

    # ----------------------------------------------------------
    # 2. CLIP 모델 로드
    # ----------------------------------------------------------
    print("\n[2/5] CLIP 모델 로딩")
    model, processor = load_clip_model()
    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"

    # ----------------------------------------------------------
    # 3. 쿼리 이미지 임베딩 생성
    # ----------------------------------------------------------
    print(f"\n[3/5] 쿼리 임베딩 생성 중...")
    query_images    = [load_image(p) for p in query_paths]
    query_embedding = get_average_embedding(query_images, model, processor)

    if len(query_paths) == 1:
        print(f"       단일 이미지 임베딩 사용")
    else:
        print(f"       {len(query_paths)}장 임베딩의 평균 벡터 사용")
    print(f"       임베딩 shape: {query_embedding.shape}")

    # ----------------------------------------------------------
    # 4. 캐시에서 데이터셋 임베딩 로드
    # ----------------------------------------------------------
    print("\n[4/5] 데이터셋 임베딩 캐시 로드")
    try:
        dataset_embeddings, dataset_paths = load_cache()
    except FileNotFoundError as e:
        print(f"[오류] {e}")
        sys.exit(1)

    # ----------------------------------------------------------
    # 5. 추천 파이프라인
    #    후보군 추출 → 메타데이터 결합 → 색상 보정 → 이유 생성
    # ----------------------------------------------------------
    print("\n[5/5] 추천 파이프라인 실행 중...")

    # 5-1. 1차 후보군 추출
    candidate_pool_size = TOP_K * CANDIDATE_POOL_MULTIPLIER
    recommendations = find_top_k(
        query_embedding    = query_embedding,
        dataset_paths      = dataset_paths,
        dataset_embeddings = dataset_embeddings,
        top_k              = candidate_pool_size,
    )

    # 5-2. 메타데이터 결합
    metadata_dict   = load_metadata()
    recommendations = attach_metadata(recommendations, metadata_dict)

    # 5-3. 색상 점수 보정
    color_profiles = [extract_dominant_colors(img) for img in query_images]
    query_colors   = merge_color_profiles(color_profiles)
    print(f"       쿼리 주요 색상: {query_colors}")
    recommendations = apply_color_boost(recommendations, query_colors, top_k=TOP_K)

    # 5-4. 추천 이유 생성 (CLIP 텍스트 프로브 - 비교형)
    # 쿼리 이미지와 추천 결과를 비교해 일치 항목으로 이유 생성
    # 개별 임베딩 리스트를 전달 (평균 벡터가 아님 - 교집합 전략에 필요)
    print(f"       추천 이유 생성 중... (Top-{EXPLAIN_TOP_N})")
    from embedding import get_image_embedding
    query_embeddings_list = [get_image_embedding(img, model, processor) for img in query_images]
    recommendations = generate_reasons(
        recommendations    = recommendations,
        query_embeddings   = query_embeddings_list,
        dataset_embeddings = dataset_embeddings,
        dataset_paths      = dataset_paths,
        model              = model,
        processor          = processor,
        device             = device,
        top_n              = EXPLAIN_TOP_N,
        query_colors       = query_colors,  # K-means 색상 결과 전달
    )

    # ----------------------------------------------------------
    # 6. 결과 출력
    # ----------------------------------------------------------
    # 콘솔: 순위 + 파일명 + 유사도 + 추천 이유
    print()
    print("=" * 55)
    print("  [ 추천 결과 ]")
    print("-" * 55)
    for rec in recommendations:
        reason_text = f"  → {rec['reason']}" if rec.get('reason') else ""
        print(f"  {rec['rank']:>2}. {rec['filename']}")
        print(f"      score: {rec['score']:.4f}{reason_text}")
        print()
    print("=" * 55)

    # CSV 저장 (reason 컬럼 포함)
    save_results_csv(recommendations, output_path=str(RESULT_CSV_PATH))

    # 시각화
    print("결과 시각화 출력 중...")
    visualize_results(
        query_paths     = query_paths,
        recommendations = recommendations,
        top_k_display   = TOP_K_DISPLAY,
    )


if __name__ == "__main__":
    main()

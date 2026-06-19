"""
recommend.py - 코사인 유사도 기반 Top-K 추천 로직
===================================================
쿼리 임베딩과 데이터셋 임베딩 간의 유사도를 계산하고 Top-K 결과를 반환합니다.

[향후 확장 계획]
현재는 CLIP 유사도만 사용하지만, 아래 구조로 메타데이터 가중치를 추가할 수 있습니다.

    score = clip_score * 0.7 + category_score * 0.2 + color_score * 0.1

확장 시 compute_final_score() 함수를 추가하고,
find_top_k()에서 clip_score 대신 compute_final_score()를 사용하면 됩니다.
메타데이터는 metadata.csv (category, sub_category, color, pattern 컬럼)에서 읽을 예정입니다.
"""

import os
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

from sklearn.metrics.pairwise import cosine_similarity

from utils import load_image


def compute_clip_scores(
    query_embedding   : np.ndarray,
    dataset_embeddings: np.ndarray,
) -> np.ndarray:
    """
    쿼리 임베딩과 데이터셋 전체 임베딩 간의 코사인 유사도를 계산합니다.

    Args:
        query_embedding    (np.ndarray): shape (1, 512)
        dataset_embeddings (np.ndarray): shape (N, 512)

    Returns:
        np.ndarray: shape (N,), 각 데이터셋 이미지와의 유사도 점수 (0~1)
    """
    # cosine_similarity 반환값: (1, N) → [0]으로 (N,)으로 변환
    scores = cosine_similarity(query_embedding, dataset_embeddings)[0]
    return scores


def find_top_k(
    query_embedding   : np.ndarray,
    dataset_paths     : list[str],
    dataset_embeddings: np.ndarray,
    top_k             : int = 10,
) -> list[dict]:
    """
    쿼리 임베딩과 가장 유사한 이미지 Top-K를 찾아 반환합니다.

    [향후 확장 포인트]
    메타데이터 점수를 추가하려면 compute_clip_scores() 호출 후
    아래처럼 가중합 처리를 추가하면 됩니다.

        clip_scores     = compute_clip_scores(query_embedding, dataset_embeddings)
        category_scores = compute_category_scores(query_metadata, dataset_metadata)
        color_scores    = compute_color_scores(query_metadata, dataset_metadata)
        final_scores    = clip_scores * 0.7 + category_scores * 0.2 + color_scores * 0.1

    Args:
        query_embedding    (np.ndarray) : shape (1, 512)
        dataset_paths      (list[str])  : 데이터셋 이미지 경로 리스트
        dataset_embeddings (np.ndarray) : shape (N, 512)
        top_k              (int)        : 추천 수 (기본값: 10)

    Returns:
        list[dict]: 추천 결과 리스트, 각 항목은 아래 형태
            {
                "rank"      : int,   # 순위 (1부터 시작)
                "path"      : str,   # 이미지 파일 경로
                "filename"  : str,   # 파일명만 추출
                "clip_score": float, # CLIP 코사인 유사도 (0~1)
                "score"     : float, # 최종 점수 (현재는 clip_score와 동일)
            }
    """
    # CLIP 유사도 계산
    clip_scores = compute_clip_scores(query_embedding, dataset_embeddings)

    # 현재는 최종 점수 = CLIP 점수 (향후 가중합으로 교체 예정)
    final_scores = clip_scores

    # (경로, clip_score, final_score) 묶기
    results = [
        {
            "path"      : path,
            "filename"  : os.path.basename(path),
            "clip_score": float(clip_score),
            "score"     : float(final_score),
        }
        for path, clip_score, final_score in zip(dataset_paths, clip_scores, final_scores)
    ]

    # 최종 점수 기준 내림차순 정렬
    results = sorted(results, key=lambda x: x["score"], reverse=True)

    # Top-K 선택 및 순위 부여
    top_results = []
    for rank, result in enumerate(results[:top_k], start=1):
        result["rank"] = rank
        top_results.append(result)

    return top_results


def print_result_table(
    query_paths  : list[str],
    recommendations: list[dict],
) -> None:
    """
    쿼리 이미지 정보와 추천 결과를 텍스트 테이블로 출력합니다.

    Args:
        query_paths     (list[str])  : 쿼리 이미지 경로 리스트
        recommendations (list[dict]) : find_top_k() 반환값
    """
    print()
    print("=" * 55)
    print("  [ 쿼리 이미지 ]")
    print("-" * 55)
    for i, path in enumerate(query_paths, start=1):
        print(f"  쿼리 {i}: {os.path.basename(path)}")

    print("=" * 55)
    print(f"  Top {len(recommendations)} Recommendations")
    print("-" * 55)

    for rec in recommendations:
        print(f"  {rec['rank']:>2}. {rec['filename']}")
        print(f"      Similarity: {rec['score']:.4f}")
        print()

    print("=" * 55)


def visualize_results(
    query_paths    : list[str],
    recommendations: list[dict],
    top_k_display  : int = 5,
    figsize        : tuple = (20, 9),
) -> None:
    """
    쿼리 이미지(들)와 Top-K 추천 결과를 matplotlib으로 시각화합니다.

    레이아웃:
        1행: 쿼리 이미지 (가운데 정렬)
        2행: Top-K 추천 결과

    테두리 색상 기준:
        green     >= 0.90  매우 유사
        limegreen >= 0.70  유사
        orange    >= 0.50  보통
        red        < 0.50  유사도 낮음

    Args:
        query_paths     (list[str])  : 쿼리 이미지 경로 리스트
        recommendations (list[dict]) : find_top_k() 반환값
        top_k_display   (int)        : 시각화할 추천 수 (기본 5)
        figsize         (tuple)      : figure 크기 (가로, 세로 인치)
    """

    def get_border_color(score: float) -> str:
        """유사도 점수에 따라 테두리 색상 반환"""
        if score >= 0.90: return 'green'
        if score >= 0.70: return 'limegreen'
        if score >= 0.50: return 'orange'
        return 'red'

    display_recs = recommendations[:top_k_display]
    n_cols       = top_k_display
    n_query      = len(query_paths)
    rank_labels  = ['1st', '2nd', '3rd', '4th', '5th',
                    '6th', '7th', '8th', '9th', '10th']

    fig = plt.figure(figsize=figsize)
    fig.suptitle(
        "의류 이미지 유사도 추천 시스템 (CLIP + Cosine Similarity)",
        fontsize=15,
        fontweight='bold',
        y=1.01,
    )

    # ----------------------------------------------------------
    # 1행: 쿼리 이미지 (n_cols 칸 중 가운데 정렬)
    # ----------------------------------------------------------
    start_col = (n_cols - n_query) // 2

    for i, path in enumerate(query_paths):
        ax = fig.add_subplot(2, n_cols, start_col + i + 1)
        ax.imshow(load_image(path))
        ax.set_title(
            f"[쿼리 {i+1}]\n{os.path.basename(path)}",
            fontsize=9,
            fontweight='bold',
            color='navy',
            pad=6,
        )
        for spine in ax.spines.values():
            spine.set_edgecolor('navy')
            spine.set_linewidth(2.5)
        ax.axis('off')

    # 쿼리 행 좌측 레이블
    fig.text(
        0.01, 0.75,
        "[ 쿼리 이미지 ]",
        va='center', ha='left',
        fontsize=10, fontweight='bold', color='navy',
        rotation=90,
    )

    # ----------------------------------------------------------
    # 2행: 추천 결과
    # ----------------------------------------------------------
    for i, rec in enumerate(display_recs):
        ax = fig.add_subplot(2, n_cols, n_cols + i + 1)
        ax.imshow(load_image(rec["path"]))
        ax.set_title(
            f"[{rank_labels[i]}] Top-{rec['rank']}\n"
            f"{rec['filename']}\n"
            f"Similarity: {rec['score']:.4f}",
            fontsize=9,
            pad=6,
        )
        for spine in ax.spines.values():
            spine.set_edgecolor(get_border_color(rec["score"]))
            spine.set_linewidth(2.5)
        ax.axis('off')

    # 추천 행 좌측 레이블
    fig.text(
        0.01, 0.28,
        "[ Top-5 추천 ]",
        va='center', ha='left',
        fontsize=10, fontweight='bold', color='darkgreen',
        rotation=90,
    )

    # ----------------------------------------------------------
    # 범례
    # ----------------------------------------------------------
    legend_patches = [
        mpatches.Patch(color='green',     label='>= 0.90 : 매우 유사'),
        mpatches.Patch(color='limegreen', label='>= 0.70 : 유사'),
        mpatches.Patch(color='orange',    label='>= 0.50 : 보통'),
        mpatches.Patch(color='red',       label='<  0.50 : 유사도 낮음'),
    ]
    fig.legend(
        handles=legend_patches,
        loc='lower center',
        ncol=4,
        fontsize=9,
        title="Similarity Score 기준",
        title_fontsize=10,
        bbox_to_anchor=(0.5, -0.04),
    )

    plt.tight_layout()
    plt.show()

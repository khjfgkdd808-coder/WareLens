"""
recommend.py - 코사인 유사도 기반 Top-K 추천 로직
===================================================
쿼리 임베딩과 데이터셋 임베딩 간의 유사도를 계산하고 Top-K 결과를 반환합니다.

[색상 점수 반영]
CLIP은 모양/카테고리는 잘 잡지만 색상 구분이 상대적으로 약해서,
추천 결과에 색상이 크게 다른 의류가 섞이는 문제가 있었습니다.
이를 보완하기 위해 color_analysis.py로 쿼리 이미지의 주요 색상을
추출하고, 메타데이터의 color 필드와 비교해 보조 점수를 더합니다.

    최종 score = clip_score * 0.85 + color_score * 0.15

색상 점수는 메타데이터가 결합된 이후에만 계산 가능하므로
(추천 후보의 color 필드가 필요), find_top_k() → attach_metadata()
→ apply_color_boost() 순서로 파이프라인을 구성합니다.
(전체 흐름은 main.py, service.py에서 확인 가능)

[향후 확장 계획]
category 등 다른 메타데이터 가중치도 같은 방식(boost 함수 추가)으로
확장할 수 있습니다.
"""

import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

from sklearn.metrics.pairwise import cosine_similarity

from utils import load_image
from metadata import METADATA_FIELDS
from color_analysis import compute_color_score

# 색상 점수 가중치 (최종 score = clip_score * (1 - COLOR_WEIGHT) + color_score * COLOR_WEIGHT)
COLOR_WEIGHT = 0.15

# ----------------------------------------------------------
# 한글 폰트 설정 (Windows 기준)
# - 'Malgun Gothic'(맑은 고딕)은 Windows에 기본 내장된 폰트라
#   별도 설치 없이 폰트명만 지정하면 한글이 정상 표시됩니다.
# - macOS/Linux에서 실행한다면 'AppleGothic'(Mac) 또는
#   설치된 한글 폰트명(예: 'NanumGothic')으로 바꿔주세요.
# ----------------------------------------------------------
plt.rcParams['font.family'] = 'Malgun Gothic'
plt.rcParams['axes.unicode_minus'] = False  # 마이너스 기호 깨짐 방지


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
    이 단계에서는 CLIP 유사도만 사용합니다 (메타데이터 기반 색상 점수는
    이후 apply_color_boost()에서 메타데이터 결합 후에 적용됩니다).

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
                "score"     : float, # 최종 점수 (이 시점에는 clip_score와 동일,
                                      #  apply_color_boost() 호출 후 보정됨)
            }
    """
    # CLIP 유사도 계산
    clip_scores = compute_clip_scores(query_embedding, dataset_embeddings)

    # 이 단계의 최종 점수는 CLIP 점수와 동일 (색상 보정은 이후 단계에서 적용)
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


def apply_color_boost(
    recommendations: list[dict],
    query_colors   : list[tuple[str, float]],
    top_k          : int,
) -> list[dict]:
    """
    메타데이터(color 필드)가 결합된 추천 후보 목록에 색상 점수를 반영하여
    최종 점수를 재계산하고 다시 정렬합니다.

    [왜 find_top_k()에서 자르기 전에 더 많은 후보를 가져와야 하는가]
    색상이 다르다는 이유로 CLIP 순위에서는 11~20위권이었던 후보가
    색상 보정 후 Top-10 안으로 들어올 수 있습니다. find_top_k()가
    이미 Top-10만 잘라서 넘기면 이런 역전이 반영되지 않으므로,
    호출하는 쪽(main.py/service.py)에서 find_top_k()를 더 넉넉한
    개수(예: top_k * 3)로 호출한 뒤 이 함수에서 최종 top_k로 자릅니다.

    최종 점수 계산식:
        score = clip_score * (1 - COLOR_WEIGHT) + color_score * COLOR_WEIGHT

    Args:
        recommendations (list[dict])             : find_top_k() + attach_metadata() 결과.
                                                      각 항목에 "color" 필드가 있어야 함.
        query_colors     (list[tuple[str, float]]): color_analysis.extract_dominant_colors()
                                                      반환값. 쿼리 이미지의 주요 색상 목록.
        top_k            (int)                    : 최종적으로 남길 결과 수

    Returns:
        list[dict]: 색상 점수가 반영되어 재정렬된 Top-K 추천 결과.
            각 항목에 "color_score" 필드가 추가됩니다.
    """
    for rec in recommendations:
        color_score = compute_color_score(query_colors, rec.get("color", "-"))
        rec["color_score"] = color_score
        rec["score"] = (
            rec["clip_score"] * (1 - COLOR_WEIGHT) + color_score * COLOR_WEIGHT
        )

    # 보정된 점수 기준 재정렬
    recommendations = sorted(recommendations, key=lambda x: x["score"], reverse=True)

    # Top-K로 자르고 순위 재부여
    top_results = []
    for rank, rec in enumerate(recommendations[:top_k], start=1):
        rec["rank"] = rank
        top_results.append(rec)

    return top_results


def print_result_table(
    query_paths  : list[str],
    recommendations: list[dict],
) -> None:
    """
    쿼리 이미지 정보와 추천 결과를 텍스트 테이블로 출력합니다.
    콘솔에는 간단한 정보(순위/파일명/유사도)만 표시합니다.
    전체 메타데이터 필드는 save_results_csv()로 CSV 파일에 저장하여 확인합니다.

    Args:
        query_paths     (list[str])  : 쿼리 이미지 경로 리스트
        recommendations (list[dict]) : find_top_k() 반환값 (메타데이터 포함 가능)
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


def build_results_dataframe(recommendations: list[dict]) -> pd.DataFrame:
    """
    추천 결과(메타데이터 포함)를 pandas DataFrame으로 변환합니다.
    컬럼 순서: rank, filename, score, clip_score, (메타데이터 필드 전체)

    Args:
        recommendations (list[dict]) : find_top_k() + attach_metadata() 결과

    Returns:
        pd.DataFrame: 추천 결과 테이블
    """
    # 컬럼 순서를 명시적으로 지정 (path는 내부용이라 제외)
    base_columns = ["rank", "filename", "score", "clip_score", "color_score", "reason"]
    columns = base_columns + [f for f in METADATA_FIELDS if f in (recommendations[0] if recommendations else {})]

    df = pd.DataFrame(recommendations)
    # 존재하는 컬럼만 선택 (메타데이터가 없는 경우에도 안전하게 동작)
    columns = [c for c in columns if c in df.columns]
    df = df[columns]

    return df


def save_results_csv(
    recommendations: list[dict],
    output_path    : str = "result.csv",
) -> None:
    """
    추천 결과를 CSV 파일로 저장합니다.
    한글 메타데이터가 있을 경우를 대비해 utf-8-sig로 저장 (엑셀에서 깨짐 방지).

    Args:
        recommendations (list[dict]) : find_top_k() + attach_metadata() 결과
        output_path     (str)        : 저장할 CSV 파일 경로
    """
    df = build_results_dataframe(recommendations)
    df.to_csv(output_path, index=False, encoding="utf-8-sig")

    print(f"  결과 CSV 저장 완료: {output_path}  ({len(df)}행)")


def visualize_results(
    query_paths    : list[str],
    recommendations: list[dict],
    top_k_display  : int = 5,
    figsize        : tuple = (22, 10),
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

    # 순위 라벨을 동적으로 생성 (1st, 2nd, 3rd, 4th, 5th, 6th, ...)
    # → main.py의 TOP_K_DISPLAY 값을 몇으로 바꿔도 에러 없이 동작함
    def ordinal(n: int) -> str:
        if 11 <= n % 100 <= 13:
            suffix = 'th'
        else:
            suffix = {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')
        return f"{n}{suffix}"

    rank_labels = [ordinal(i) for i in range(1, len(display_recs) + 1)]

    fig = plt.figure(figsize=figsize)
    fig.suptitle(
        "의류 이미지 유사도 추천 시스템 (CLIP + Cosine Similarity)",
        fontsize=15,
        fontweight='bold',
        y=1.01,
    )

    # ----------------------------------------------------------
    # 1행: 쿼리 이미지 (n_cols 칸 중 가운데 정렬)
    # 쿼리 이미지 수가 n_cols보다 많으면 칸 수를 쿼리 수에 맞춰 확장
    # (예: TOP_K_DISPLAY=3인데 쿼리를 5장 넣은 경우)
    # ----------------------------------------------------------
    query_cols = max(n_cols, n_query)
    start_col  = (query_cols - n_query) // 2

    for i, path in enumerate(query_paths):
        ax = fig.add_subplot(2, query_cols, start_col + i + 1)
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
    # 2행: 추천 결과 (1행과 동일한 query_cols 그리드 사용, 가운데 정렬)
    # ----------------------------------------------------------
    rec_start_col = (query_cols - n_cols) // 2

    for i, rec in enumerate(display_recs):
        ax = fig.add_subplot(2, query_cols, query_cols + rec_start_col + i + 1)
        ax.imshow(load_image(rec["path"]))

        # 기본 정보(순위/파일명/유사도) + 메타데이터 전체 필드를 제목에 표시
        title_lines = [
            f"[{rank_labels[i]}] Top-{rec['rank']}",
            f"{rec['filename']}",
            f"Similarity: {rec['score']:.4f}",
        ]
        # METADATA_FIELDS에 있는 필드들을 "필드명: 값" 형태로 한 줄씩 추가
        for field in METADATA_FIELDS:
            value = rec.get(field, "-")
            title_lines.append(f"{field}: {value}")

        ax.set_title(
            "\n".join(title_lines),
            fontsize=7,
            pad=4,
            loc='left',
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
    plt.subplots_adjust(hspace=0.55)  # 메타데이터 필드가 많아 제목이 길어진 만큼 행 간격 확보
    plt.show()

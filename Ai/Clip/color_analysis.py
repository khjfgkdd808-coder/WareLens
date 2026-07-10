"""
color_analysis.py - 이미지 색상 추출 및 카테고리 매핑
========================================================
이미지에서 K-means로 주요 색상을 추출하고, metadata.csv의 14개 색상
카테고리(BLACK, WHITE, NAVY 등) 중 가장 가까운 것으로 매핑합니다.

[배경]
CLIP은 모양/패턴/카테고리는 잘 잡지만 색상 구분은 상대적으로 약합니다.
추천 결과에 색상이 크게 다른 의류가 섞여 나오는 문제를 줄이기 위해
색상 유사도를 보조 점수로 추가합니다.

[설계 의도 - 단색 가정을 피함]
체크무늬, 스트라이프 같은 의류는 평균 RGB를 내면 색이 섞여
실제와 다른 색(예: 탁한 회색)으로 나오기 쉽습니다.
대신 K-means로 상위 N개 주요 색상과 각각의 비율을 추출하여,
배색이 있는 의류도 비교적 정확하게 색상 점수를 매길 수 있게 합니다.

[처리 범위]
이미지 전체 픽셀을 대상으로 클러스터링합니다.
- 쿼리 이미지(사용자 업로드): "옷만 펼쳐놓은 사진" 정책이라 배경이
  거의 없어 전체 픽셀을 써도 무방합니다.
- 데이터셋 이미지: build_vectors.py에서 이미 YOLO로 사람 영역을
  crop한 상태이므로, crop된 이미지를 그대로 사용하면 추가 비용 없이
  배경(피부/머리카락 등) 영향을 줄일 수 있습니다.
"""

import numpy as np
from PIL import Image
from sklearn.cluster import KMeans

# ----------------------------------------------------------
# metadata.csv의 14개 색상 카테고리별 기준 RGB
# 일반적인 색상 기준으로 설정. 실제 추천 결과를 보면서
# 오분류가 보이면 이 표만 조정하면 됩니다.
# ----------------------------------------------------------
COLOR_REFERENCE_RGB = {
    "BLACK":  (20,  20,  20),
    "WHITE":  (245, 245, 245),
    "GRAY":   (130, 130, 130),
    "NAVY":   (30,  40,  70),
    "BLUE":   (40,  100, 200),
    "RED":    (200, 30,  30),
    "PINK":   (240, 150, 180),
    "ORANGE": (230, 120, 30),
    "YELLOW": (235, 210, 50),
    "GREEN":  (50,  140, 70),
    "PURPLE": (110, 60,  160),
    "BROWN":  (100, 65,  40),
    "BEIGE":  (220, 200, 170),
    "MULTI":  None,  # 단일 RGB로 정의할 수 없는 카테고리 (매핑 대상에서 제외)
}

# 클러스터링에서 추출할 주요 색상 개수
N_CLUSTERS = 3

# 무채색(BLACK/GRAY/WHITE) 판별 임계값
# RGB 채널 중 최댓값-최솟값이 이 값 미만이면 채도가 낮은 무채색으로 간주
# (예: (60,60,60)은 편차 0 -> 무채색, (35,70,130)은 편차 95 -> 유채색)
ACHROMATIC_THRESHOLD = 30

# 클러스터링 속도를 위해 픽셀을 미리 축소할 최대 한 변 길이
# (예: 1024x1024 이미지를 100x100 정도로 축소해도 색상 분포는 충분히 유지됨)
RESIZE_MAX_SIDE = 100


def _closest_color_name(rgb: tuple[float, float, float]) -> str:
    """
    주어진 RGB 값에 가장 가까운 metadata 색상 카테고리명을 반환합니다.

    1단계: 무채색(BLACK/GRAY/WHITE) 판별을 먼저 시도합니다.
           R, G, B 채널 간 차이가 작으면(채도가 낮으면) 색조가 아니라
           명도만으로 분류해야 정확합니다. 이 판별이 없으면 어두운 회색이
           NAVY/BROWN 등 엉뚱한 유채색으로 잘못 매핑되기 쉽습니다.
    2단계: 무채색이 아니면 유채색 기준 RGB와 유클리드 거리로 비교합니다.

    Args:
        rgb (tuple[float, float, float]): 0~255 범위의 RGB 값

    Returns:
        str: COLOR_REFERENCE_RGB의 키 중 하나 (MULTI 제외)
    """
    r, g, b = rgb
    max_c, min_c = max(r, g, b), min(r, g, b)
    saturation_gap = max_c - min_c  # 채널 간 편차가 작을수록 무채색에 가까움

    # 채도가 낮으면(편차가 작으면) 무채색으로 우선 판별
    if saturation_gap < ACHROMATIC_THRESHOLD:
        brightness = (r + g + b) / 3
        achromatic_candidates = {
            name: COLOR_REFERENCE_RGB[name] for name in ("BLACK", "GRAY", "WHITE")
        }
        best_name = min(
            achromatic_candidates,
            key=lambda name: abs(brightness - sum(achromatic_candidates[name]) / 3),
        )
        return best_name

    # 유채색: 기준 RGB와의 유클리드 거리로 최근접 카테고리 판별
    best_name = None
    best_dist = float("inf")

    for name, ref_rgb in COLOR_REFERENCE_RGB.items():
        if ref_rgb is None:  # MULTI는 거리 비교 대상에서 제외
            continue
        dist = sum((a - b) ** 2 for a, b in zip(rgb, ref_rgb))
        if dist < best_dist:
            best_dist = dist
            best_name = name

    return best_name


def extract_dominant_colors(
    image: Image.Image,
    n_clusters: int = N_CLUSTERS,
) -> list[tuple[str, float]]:
    """
    이미지에서 주요 색상 N개를 추출하고, 각 색상을 metadata 색상
    카테고리명으로 매핑한 뒤 비율과 함께 반환합니다.

    같은 카테고리로 매핑된 클러스터가 여러 개면 비율을 합산합니다.
    (예: 클러스터 2개가 모두 NAVY로 매핑되면 비율을 더해서 하나로 합침)

    [중앙 crop 전략]
    전체 픽셀을 쓰면 흰 배경처럼 넓은 단색 배경이 주요 색상으로 잘못
    추출됩니다. 중앙 50% 영역만 사용하면 의류가 중앙에 있는 경우
    (펼쳐놓은 사진, 착용샷 모두) 배경 영향을 자연스럽게 줄일 수 있습니다.
    추가 모델 없이 속도 영향도 거의 없습니다.

    Args:
        image      (PIL.Image.Image): RGB 이미지
        n_clusters (int)            : 추출할 클러스터(색상) 개수

    Returns:
        list[tuple[str, float]]: [(색상명, 비율), ...] 비율 내림차순 정렬
            예: [("NAVY", 0.62), ("WHITE", 0.25), ("GRAY", 0.13)]
    """
    # 중앙 50% 영역만 crop (가장자리 배경 제외)
    w, h = image.size
    img = image.crop((w * 0.25, h * 0.25, w * 0.75, h * 0.75))

    # 속도를 위해 이미지를 축소 (색상 분포 자체는 크게 달라지지 않음)
    img.thumbnail((RESIZE_MAX_SIDE, RESIZE_MAX_SIDE))

    pixels = np.array(img).reshape(-1, 3).astype(np.float64)

    # 클러스터 수가 (픽셀 수 또는 고유 색상 수)보다 많을 수 없으므로 안전하게 보정
    # 단색에 가까운 이미지에서 불필요한 ConvergenceWarning을 방지하기 위함
    n_unique = len(np.unique(pixels, axis=0))
    k = min(n_clusters, len(pixels), n_unique)

    kmeans = KMeans(n_clusters=k, n_init=4, random_state=42)
    labels = kmeans.fit_predict(pixels)
    centers = kmeans.cluster_centers_

    # 각 클러스터의 픽셀 비율 계산
    total = len(labels)
    ratios = [np.sum(labels == i) / total for i in range(k)]

    # 클러스터 중심 RGB를 색상 카테고리명으로 매핑
    color_ratios: dict[str, float] = {}
    for center, ratio in zip(centers, ratios):
        name = _closest_color_name(tuple(center))
        color_ratios[name] = color_ratios.get(name, 0.0) + ratio

    # 비율 내림차순 정렬
    sorted_colors = sorted(color_ratios.items(), key=lambda x: x[1], reverse=True)

    return sorted_colors


def merge_color_profiles(
    color_profiles: list[list[tuple[str, float]]],
) -> list[tuple[str, float]]:
    """
    여러 이미지에서 추출한 색상 분포를 하나로 병합합니다.
    각 이미지의 색상 비율을 합산한 뒤, 이미지 개수로 나누어 평균을 냅니다.

    [왜 평균을 내야 하는가]
    각 extract_dominant_colors() 결과는 비율 합이 1.0입니다.
    이미지 N장의 결과를 단순히 더하기만 하면 합이 N.0이 되어
    compute_color_score()가 0~1 범위를 벗어난 값을 반환하게 되고,
    apply_color_boost()의 가중합 점수 체계가 깨집니다.
    이미지 개수로 나누어 평균을 내면 항상 합이 1.0으로 유지됩니다.

    Args:
        color_profiles (list[list[tuple[str, float]]]):
            여러 이미지 각각의 extract_dominant_colors() 결과 리스트.
            예: [[("NAVY", 1.0)], [("WHITE", 1.0)]]  (이미지 2장)

    Returns:
        list[tuple[str, float]]: 병합되고 정규화된 색상 분포 (비율 합 = 1.0)
            예: [("NAVY", 0.5), ("WHITE", 0.5)]
    """
    if not color_profiles:
        return []

    merged: dict[str, float] = {}
    for profile in color_profiles:
        for name, ratio in profile:
            merged[name] = merged.get(name, 0.0) + ratio

    # 이미지 개수로 나누어 평균 (비율 합이 항상 1.0이 되도록 정규화)
    n_images = len(color_profiles)
    averaged = {name: ratio / n_images for name, ratio in merged.items()}

    return sorted(averaged.items(), key=lambda x: x[1], reverse=True)


def compute_color_score(
    query_colors      : list[tuple[str, float]],
    candidate_color    : str,
) -> float:
    """
    쿼리 이미지의 주요 색상 목록과 추천 후보의 color 메타데이터를 비교하여
    색상 점수를 계산합니다.

    후보의 color가 쿼리 주요 색상 목록에 있으면 해당 비율을 점수로 사용하고,
    없으면 0점입니다. (예: 쿼리가 NAVY 62%, WHITE 25%인데 후보가 NAVY면 0.62)

    Args:
        query_colors    (list[tuple[str, float]]): extract_dominant_colors() 또는
                                                      merge_color_profiles() 반환값
        candidate_color (str)                     : 후보 이미지의 metadata color 값
                                                       (매칭 안 된 경우 "-"일 수 있음)

    Returns:
        float: 0~1 사이의 색상 점수
    """
    if not candidate_color or candidate_color == "-":
        return 0.0

    for name, ratio in query_colors:
        if name == candidate_color:
            return ratio

    return 0.0

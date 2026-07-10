"""
explainer.py - CLIP 텍스트 프로브 기반 추천 이유 생성 (비교형)
================================================================
쿼리 이미지와 추천 결과를 비교하여
"업로드하신 이미지와 색상(네이비)·패턴(체크)이 유사한 셔츠입니다"
형태의 이유를 생성합니다.

[동작 원리]
1. 쿼리 이미지(들)의 특성을 CLIP 텍스트 프로브로 분석
   → 색상·패턴·핏·카테고리 각 축에서 가장 유사한 텍스트 추출
   → 쿼리가 여러 장이면 각 이미지의 특성 교집합(공통 특성)을 사용

2. 추천 결과의 특성 파악
   → metadata가 있으면 그대로 사용
   → metadata가 없으면 CLIP 텍스트 프로브로 추론

3. 두 특성을 비교해 일치 항목 기반으로 이유 문구 생성
   "색상(네이비)·패턴(체크)이 유사한 셔츠입니다"

[쿼리가 여러 장일 때 - 교집합 전략]
이미지 1: 네이비 · 체크 · 슬림핏 · 셔츠
이미지 2: 네이비 · 단색 · 레귤러핏 · 니트
공통:     네이비 (색상만 일치)
→ "색상(네이비)이 유사한 ..." 으로 공통된 특성만 이유로 사용
→ 공통 특성이 없으면 fallback: "업로드하신 이미지들의 전반적인 스타일과 유사합니다"
"""

import numpy as np
import torch
import torch.nn.functional as F
from transformers import CLIPProcessor, CLIPModel

# ----------------------------------------------------------
# 축별 텍스트 후보 목록
# ----------------------------------------------------------
COLOR_CANDIDATES = [
    "블랙", "화이트", "그레이", "네이비", "블루",
    "레드", "핑크", "오렌지", "옐로우", "그린",
    "퍼플", "브라운", "베이지", "멀티컬러",
]
PATTERN_CANDIDATES = [
    "단색 무지",
    "세로 스트라이프 줄무늬",
    "격자 체크 무늬",
    "그래픽 로고 프린트",
]
FIT_CANDIDATES     = ["슬림핏", "레귤러핏", "오버핏"]
CATEGORY_CANDIDATES = ["티셔츠", "셔츠", "후드티", "맨투맨 스웨트셔츠", "니트 스웨터"]

# metadata.csv 값 → 한국어 매핑
COLOR_MAP = {
    "BLACK": "블랙", "WHITE": "화이트", "GRAY": "그레이",
    "NAVY":  "네이비", "BLUE": "블루",   "RED": "레드",
    "PINK":  "핑크",  "ORANGE": "오렌지", "YELLOW": "옐로우",
    "GREEN": "그린",  "PURPLE": "퍼플",   "BROWN": "브라운",
    "BEIGE": "베이지","MULTI": "멀티컬러",
}
PATTERN_MAP  = {"SOLID": "단색", "STRIPE": "스트라이프", "CHECK": "체크", "PRINT": "프린트 패턴"}
FIT_MAP      = {"SLIM": "슬림핏", "REGULAR": "레귤러핏"}
CATEGORY_MAP = {
    "TSHIRT": "티셔츠", "SHIRT": "셔츠",
    "SWEATSHIRT": "맨투맨 스웨트셔츠", "KNIT": "니트 스웨터",
}

# CLIP 프로브 패턴 후보 → 이유 문구용 한국어 매핑
# 단색은 이유에서 생략하므로 None 처리
PATTERN_PROBE_MAP = {
    "단색 무지":            None,
    "세로 스트라이프 줄무늬": "스트라이프",
    "격자 체크 무늬":        "체크",
    "그래픽 로고 프린트":    "프린트 패턴",
}

# 축 레이블 (이유 문구 조합용)
AXIS_LABEL = {
    "color":    "색상",
    "pattern":  "패턴",
    "fit":      "핏",
    "category": "스타일",
}


# ----------------------------------------------------------
# 내부 유틸
# ----------------------------------------------------------

def _get_text_embeddings(
    texts    : list[str],
    model    : CLIPModel,
    processor: CLIPProcessor,
    device   : str,
) -> np.ndarray:
    """
    텍스트 리스트 → L2 정규화된 CLIP 텍스트 임베딩 (N, 512)

    get_text_features() 대신 text_model + text_projection을 직접 호출합니다.
    get_text_features()가 BaseModelOutputWithPooling을 반환하여
    .norm() 오류가 발생하는 케이스를 방지합니다.
    (이미지 임베딩의 vision_model + visual_projection 방식과 동일)
    """
    inputs = processor(
        text=texts, return_tensors="pt", padding=True, truncation=True
    ).to(device)
    with torch.no_grad():
        output = model.text_model(**inputs)
        feats  = output.pooler_output             # (N, 512)
        feats  = model.text_projection(feats)     # (N, 512)
    feats = F.normalize(feats, p=2, dim=-1)
    return feats.cpu().numpy()


def _probe_best_text(
    image_embedding: np.ndarray,
    candidates     : list[str],
    model          : CLIPModel,
    processor      : CLIPProcessor,
    device         : str,
) -> str:
    """
    이미지 임베딩과 가장 유사한 텍스트 후보를 반환합니다.

    Args:
        image_embedding: shape (512,) 또는 (1, 512) — 자동으로 1차원으로 변환
    """
    emb       = np.squeeze(image_embedding)  # (1,512) → (512,) 안전하게 처리
    text_embs = _get_text_embeddings(candidates, model, processor, device)
    sims      = text_embs @ emb  # 내적 = 코사인 유사도 (정규화됐으므로)
    return candidates[int(np.argmax(sims))]


def _extract_attrs(
    image_embedding: np.ndarray,
    metadata       : dict[str, str],
    model          : CLIPModel,
    processor      : CLIPProcessor,
    device         : str,
) -> dict[str, str]:
    """
    단일 이미지 임베딩 + 메타데이터 → 4축 특성 dict 반환.

    metadata가 있으면 우선 사용, 없으면 CLIP 프로브로 추론.
    반환 형태: {"color": "네이비", "pattern": "체크", "fit": "슬림핏", "category": "셔츠"}
    """
    attrs = {}

    # 색상
    c = COLOR_MAP.get(metadata.get("color", ""))
    attrs["color"] = c if c else _probe_best_text(
        image_embedding, COLOR_CANDIDATES, model, processor, device
    )

    # 패턴
    # metadata가 있으면 PATTERN_MAP으로 변환 (SOLID→None, STRIPE→스트라이프 등)
    # OTHER: 분류 불가 패턴 → None으로 처리 (억지 추론보다 생략이 나음)
    # metadata가 없으면 CLIP 프로브 후 PATTERN_PROBE_MAP으로 변환
    p_raw = metadata.get("pattern", "")
    if p_raw == "OTHER":
        p = None  # 분류 불가 → 패턴 이유 생략
    elif p_raw in PATTERN_MAP:
        p = PATTERN_MAP[p_raw]
    elif p_raw:
        # metadata에 없는 값 → CLIP 프로브
        probe = _probe_best_text(image_embedding, PATTERN_CANDIDATES, model, processor, device)
        p = PATTERN_PROBE_MAP.get(probe)
    else:
        # metadata 없음 (쿼리 이미지 등) → CLIP 프로브
        probe = _probe_best_text(image_embedding, PATTERN_CANDIDATES, model, processor, device)
        p = PATTERN_PROBE_MAP.get(probe)
    attrs["pattern"] = p if p and p != "단색" else None

    # 핏
    f = FIT_MAP.get(metadata.get("fit", ""))
    attrs["fit"] = f if f else _probe_best_text(
        image_embedding, FIT_CANDIDATES, model, processor, device
    )

    # 카테고리
    k = CATEGORY_MAP.get(metadata.get("sub_category", ""))
    attrs["category"] = k if k else _probe_best_text(
        image_embedding, CATEGORY_CANDIDATES, model, processor, device
    )

    return attrs


# ----------------------------------------------------------
# 공개 API
# ----------------------------------------------------------

def analyze_query_attrs(
    query_embeddings: list[np.ndarray],
    model           : CLIPModel,
    processor       : CLIPProcessor,
    device          : str,
    query_colors    : list[tuple[str, float]] | None = None,
) -> dict[str, str | None]:
    """
    쿼리 이미지들의 공통 특성을 추출합니다.

    쿼리가 1장이면 그 이미지의 특성을 그대로 반환합니다.
    쿼리가 여러 장이면 모든 이미지에서 공통으로 나타나는 특성만 반환하고
    (교집합 전략), 일치하지 않는 축은 None으로 표시합니다.

    [색상 처리]
    query_colors가 주어지면 K-means로 이미 뽑은 색상을 그대로 사용합니다.
    (CLIP 프로브보다 K-means가 실제 픽셀 기반이라 더 정확)
    query_colors가 없으면 CLIP 프로브로 추론합니다.
    여러 장일 때는 query_colors의 1위 색상만 사용합니다.

    Args:
        query_embeddings: 쿼리 이미지 임베딩 리스트 (각각 shape (1,512) or (512,))
        model, processor, device: CLIP 모델 관련
        query_colors: color_analysis.merge_color_profiles() 반환값 (선택)
                      예: [("BLACK", 0.96), ("WHITE", 0.03)]

    Returns:
        dict: {"color": "블랙", "pattern": "체크", "fit": None, "category": "셔츠"}
              일치하지 않는 축은 None
    """
    # 쿼리 이미지마다 특성 추출 (메타데이터 없으므로 전부 CLIP 프로브)
    # get_image_embedding()은 (1, 512)를 반환하므로 squeeze로 (512,)로 변환
    all_attrs = [
        _extract_attrs(np.squeeze(emb), {}, model, processor, device)
        for emb in query_embeddings
    ]

    # 색상은 K-means 결과가 있으면 그걸로 덮어씁니다 (더 정확)
    if query_colors:
        dominant_color_en = query_colors[0][0]  # 1위 색상 (영문 대문자, 예: "BLACK")
        dominant_color_kr = COLOR_MAP.get(dominant_color_en)  # 한국어 변환
        if dominant_color_kr:
            for attrs in all_attrs:
                attrs["color"] = dominant_color_kr

    if len(all_attrs) == 1:
        return all_attrs[0]

    # 교집합: 모든 이미지에서 같은 값이 나온 축만 유지
    # None(알 수 없음 또는 단색)이 하나라도 있으면 불확실하므로 None 처리
    common: dict[str, str | None] = {}
    for axis in ("color", "pattern", "fit", "category"):
        values = [attrs[axis] for attrs in all_attrs]
        # None이 하나라도 있거나, 값이 다르면 None
        if None in values or len(set(values)) != 1:
            common[axis] = None
        else:
            common[axis] = values[0]

    return common


def build_reason(
    query_attrs: dict[str, str | None],
    item_attrs : dict[str, str],
) -> str:
    """
    쿼리 특성과 추천 항목 특성을 비교해 이유 문구를 생성합니다.

    [비교 규칙]
    - color / fit: 쿼리와 추천 결과가 일치할 때만 이유에 포함
    - pattern: 아래 두 경우 모두 이유에 포함
        1) 쿼리와 추천 결과 패턴이 일치할 때 → "패턴(체크)이 유사한"
        2) 쿼리 패턴이 None(여러 장 불일치 등)이어도 추천 결과에 단색이 아닌
           패턴이 있으면 → "패턴(스트라이프)이 특징인"
           (이유: CLIP이 패턴을 잘 잡기 때문에, 패턴 정보를 이유에 보여주는 것이
            사용자에게 더 유용함. 쿼리 3장이 스트라이프/체크 혼재여도 결과가
            스트라이프면 "스트라이프가 특징인 셔츠"라고 알려주는 게 낫다)
    - category: 일치 여부와 무관하게 항상 맨 끝에 포함

    예시:
        쿼리 패턴=체크, 결과 패턴=체크
        → "색상(화이트)·패턴(체크)이 유사한 셔츠입니다"

        쿼리 패턴=None(여러 장 불일치), 결과 패턴=스트라이프
        → "색상(화이트)·패턴(스트라이프)이 특징인 셔츠입니다"

        쿼리 패턴=None, 결과 패턴=단색(None)
        → "색상(화이트)이 유사한 셔츠입니다"
    """
    matched_parts = []

    # ── 색상 ──
    q_color = query_attrs.get("color")
    i_color = item_attrs.get("color")
    if q_color and i_color and q_color == i_color:
        matched_parts.append(f"색상({q_color})")

    # ── 패턴 ──
    q_pattern = query_attrs.get("pattern")
    i_pattern = item_attrs.get("pattern")

    if q_pattern and i_pattern and q_pattern == i_pattern:
        # 쿼리와 결과 패턴이 정확히 일치할 때만 이유로 표시
        matched_parts.append(f"패턴({q_pattern})")

    # ── 핏 ──
    q_fit = query_attrs.get("fit")
    i_fit = item_attrs.get("fit")
    if q_fit and i_fit and q_fit == i_fit:
        matched_parts.append(f"핏({q_fit})")

    # ── 카테고리 (항상 포함) ──
    category = item_attrs.get("category") or query_attrs.get("category")

    if not matched_parts:
        if category:
            return f"전반적인 스타일이 유사한 {category}입니다"
        return "업로드하신 이미지들의 전반적인 스타일과 유사합니다"

    match_str = "·".join(matched_parts)
    if category:
        return f"{match_str}이 유사한 {category}입니다"
    return f"{match_str}이 유사한 스타일입니다"


def generate_reasons(
    recommendations    : list[dict],
    query_embeddings   : list[np.ndarray],
    dataset_embeddings : np.ndarray,
    dataset_paths      : list[str],
    model              : CLIPModel,
    processor          : CLIPProcessor,
    device             : str,
    top_n              : int = 5,
    query_colors       : list[tuple[str, float]] | None = None,
) -> list[dict]:
    """
    추천 결과 목록에 "reason" 필드(비교형 이유)를 추가합니다.

    Args:
        recommendations    : find_top_k() + attach_metadata() + apply_color_boost() 결과
        query_embeddings   : 쿼리 이미지 임베딩 리스트 (각 shape (1,512) or (512,))
        dataset_embeddings : shape (N, 512) 전체 데이터셋 임베딩
        dataset_paths      : 데이터셋 이미지 경로 리스트
        model, processor   : CLIP 모델 관련
        device             : "cuda" or "cpu"
        top_n              : 이유를 생성할 상위 N개
        query_colors       : color_analysis.merge_color_profiles() 반환값 (선택)
                             제공 시 CLIP 프로브 대신 K-means 색상 결과를 사용

    Returns:
        list[dict]: "reason" 필드가 추가된 추천 결과
    """
    # 1. 쿼리 공통 특성 추출 (1회만 실행)
    # query_colors를 넘겨서 색상은 K-means 결과로 덮어씁니다
    query_attrs = analyze_query_attrs(
        query_embeddings, model, processor, device,
        query_colors=query_colors,
    )

    # 경로 → 인덱스 맵
    # 파일명만으로 매핑 (Windows \ / Linux / 구분자 혼재 방지)
    def _basename(path: str) -> str:
        """슬래시(/ 와 백슬래시) 모두 처리해서 파일명만 추출"""
        return path.replace("\\", "/").split("/")[-1]

    filename_to_idx = {_basename(path): i for i, path in enumerate(dataset_paths)}

    for i, rec in enumerate(recommendations):
        if i >= top_n:
            rec["reason"] = None
            continue

        img_path = rec.get("path", "")
        filename = _basename(img_path) if img_path else rec.get("filename", "")
        idx      = filename_to_idx.get(filename)

        if idx is None:
            rec["reason"] = None
            continue

        item_embedding = dataset_embeddings[idx]  # shape: (512,)

        # 2. 추천 항목 특성 추출
        metadata = {
            field: rec.get(field, "")
            for field in ["color", "pattern", "fit", "sub_category"]
        }
        item_attrs = _extract_attrs(item_embedding, metadata, model, processor, device)

        # 3. 비교 → 이유 문구 생성
        rec["reason"] = build_reason(query_attrs, item_attrs)

    return recommendations

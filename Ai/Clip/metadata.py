"""
metadata.py - 의류 메타데이터 CSV 로드 및 조회
===================================================
fashion_dataset 이미지들의 속성 정보(category, color, pattern 등)가 담긴
metadata.csv를 읽어 image_name 기준으로 빠르게 조회할 수 있게 합니다.

metadata.csv 컬럼:
    image_name, category, sub_category, article_type,
    color, season, usage, gender, pattern, fit, fabric

[설계 의도]
- find_top_k()가 반환하는 추천 결과의 "filename"과 metadata의 "image_name"을
  매칭하여 메타데이터를 덧붙입니다.
- 매칭되지 않는 이미지(metadata.csv에 없는 경우)는 빈 값으로 채워서
  프로그램이 죽지 않고 계속 진행되도록 합니다. (향후 데이터셋 확장 시 대비)
- 향후 category/color 가중치 점수 계산 시에도 이 모듈의 조회 결과를 사용할 수 있습니다.
"""

import csv
from pathlib import Path

# metadata.csv 경로 (이 파일 기준 상대경로 - main.py 실행 위치와 무관하게 동작)
METADATA_PATH = Path(__file__).parent / "metadata.csv"

# metadata.csv에 메타데이터가 없을 때 채울 기본값
EMPTY_VALUE = "-"

# 메타데이터 필드 목록 (image_name 제외, 표시 순서 그대로)
METADATA_FIELDS = [
    "category", "sub_category", "article_type",
    "color", "season", "usage", "gender", "pattern", "fit", "fabric",
]


def load_metadata() -> dict[str, dict[str, str]]:
    """
    metadata.csv를 읽어 image_name을 key로 하는 딕셔너리를 만듭니다.
    metadata.csv가 없으면 빈 딕셔너리를 반환합니다 (메타데이터 없이도 동작 가능).

    Returns:
        dict: {
            "15970.jpg": {
                "category": "TOP", "sub_category": "SHIRT", ...
            },
            ...
        }
    """
    if not METADATA_PATH.exists():
        print(f"  [참고] metadata.csv를 찾을 수 없습니다: {METADATA_PATH}")
        print(f"         메타데이터 없이 진행합니다.")
        return {}

    # utf-8-sig: 엑셀에서 저장한 CSV의 BOM(﻿) 문자를 자동으로 제거
    with open(METADATA_PATH, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        metadata = {row["image_name"]: row for row in reader}

    print(f"  metadata.csv 로드 완료: {len(metadata)}개 항목")
    return metadata


def get_metadata_for_filename(
    filename: str,
    metadata_dict: dict[str, dict[str, str]],
) -> dict[str, str]:
    """
    파일 경로(전체 경로 또는 파일명)에 해당하는 메타데이터를 조회합니다.
    매칭되지 않으면 모든 필드를 EMPTY_VALUE로 채워 반환합니다.

    Args:
        filename      (str) : 이미지 파일 경로 또는 파일명 (예: ".../15970.jpg")
        metadata_dict (dict): load_metadata() 반환값

    Returns:
        dict[str, str]: METADATA_FIELDS 각각에 대한 값
            매칭 안 되면 전부 EMPTY_VALUE
    """
    # 전체 경로로 들어와도 파일명만 추출하여 매칭
    image_name = Path(filename).name

    if image_name in metadata_dict:
        row = metadata_dict[image_name]
        return {field: row.get(field, EMPTY_VALUE) or EMPTY_VALUE for field in METADATA_FIELDS}

    # 매칭되지 않으면 빈 값으로 채움 (프로그램 중단 없이 계속 진행)
    return {field: EMPTY_VALUE for field in METADATA_FIELDS}


def attach_metadata(
    recommendations: list[dict],
    metadata_dict: dict[str, dict[str, str]],
) -> list[dict]:
    """
    추천 결과 리스트 각 항목에 메타데이터 필드를 덧붙입니다.

    Args:
        recommendations (list[dict]) : find_top_k() 반환값
        metadata_dict    (dict)      : load_metadata() 반환값

    Returns:
        list[dict]: 각 항목에 METADATA_FIELDS가 추가된 추천 결과
    """
    for rec in recommendations:
        meta = get_metadata_for_filename(rec["filename"], metadata_dict)
        rec.update(meta)

    return recommendations

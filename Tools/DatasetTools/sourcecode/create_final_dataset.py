import json
import pandas as pd
import shutil
from pathlib import Path

# =========================
# 경로 설정
# =========================

BASE_DIR = Path(__file__).parent

IMAGES_DIR = BASE_DIR / "images"
STYLES_DIR = BASE_DIR / "styles"

KEEP_CSV = BASE_DIR / "review_keep.csv"
STYLES_CSV = BASE_DIR / "styles.csv"

FINAL_DIR = BASE_DIR / "final_dataset"
FINAL_IMAGES = FINAL_DIR / "images"
FINAL_STYLES = FINAL_DIR / "styles"

METADATA_PATH = FINAL_DIR / "metadata.csv"

# =========================
# 최종 데이터셋 초기화
# =========================

if FINAL_DIR.exists():
    shutil.rmtree(FINAL_DIR)

FINAL_IMAGES.mkdir(parents=True)
FINAL_STYLES.mkdir(parents=True)

# =========================
# WareLens 매핑
# =========================

SUBCATEGORY_MAP = {
    "Tshirts": "TSHIRT",
    "Shirts": "SHIRT",
    "Sweatshirts": "SWEATSHIRT",
    "Sweaters": "KNIT",
}

COLOR_MAP = {
    "Black": "BLACK",
    "White": "WHITE",
    "Off White": "WHITE",
    "Cream": "WHITE",

    "Grey": "GRAY",
    "Grey Melange": "GRAY",
    "Charcoal": "GRAY",

    "Navy Blue": "NAVY",

    "Blue": "BLUE",
    "Turquoise Blue": "BLUE",

    "Beige": "BEIGE",
    "Khaki": "BEIGE",
    "Tan": "BEIGE",
    "Nude": "BEIGE",

    "Brown": "BROWN",
    "Coffee Brown": "BROWN",
    "Mushroom Brown": "BROWN",

    "Green": "GREEN",
    "Olive": "GREEN",
    "Sea Green": "GREEN",
    "Lime Green": "GREEN",
    "Fluorescent Green": "GREEN",

    "Red": "RED",
    "Burgundy": "RED",
    "Maroon": "RED",
    "Rust": "RED",

    "Pink": "PINK",
    "Peach": "PINK",
    "Mauve": "PINK",

    "Yellow": "YELLOW",
    "Mustard": "YELLOW",

    "Purple": "PURPLE",
    "Lavender": "PURPLE",

    "Orange": "ORANGE",

    "Magenta": "MULTI",
    "Teal": "MULTI",
    "Gold": "MULTI",
    "Multi": "MULTI",
}

PATTERN_MAP = {
    "Solid": "SOLID",

    "Printed": "PRINT",
    "Graphic Print": "PRINT",
    "Placement Print": "PRINT",

    "Checked": "CHECK",

    "Striped": "STRIPE",

    "Colourblocked": "COLORBLOCK",
    "Colorblocked": "COLORBLOCK",

    "Self Design": "TEXTURE",
    "Textured": "TEXTURE",

    "Camouflage": "CAMO",
}

FIT_MAP = {
    "Regular Fit": "REGULAR",
    "Slim Fit": "SLIM",
    "Skinny Fit": "SKINNY",
    "Loose Fit": "LOOSE",
    "Oversized": "OVERSIZE",
}

FABRIC_MAP = {
    "Cotton": "COTTON",
    "Pure Cotton": "COTTON",

    "Polyester": "POLYESTER",

    "Cotton Blend": "BLEND",
    "Poly Cotton": "BLEND",

    "Wool": "WOOL",

    "Denim": "DENIM",
}

# =========================
# CSV 로드
# =========================

print("CSV 로드 중...")

keep_df = pd.read_csv(KEEP_CSV)
styles_df = pd.read_csv(STYLES_CSV, on_bad_lines="skip")

print(f"KEEP 이미지 수 : {len(keep_df)}")

# =========================
# KEEP id 추출
# =========================

keep_df["id"] = (
    keep_df["image_name"]
    .str.replace(".jpg", "", regex=False)
    .astype(int)
)

# styles.csv와 조인

final_df = styles_df.merge(
    keep_df[["id"]],
    on="id",
    how="inner"
)

print(f"매칭 성공 : {len(final_df)}")

# =========================
# 이미지 + json 복사
# =========================

copied_images = 0
copied_jsons = 0

metadata = []

for _, row in final_df.iterrows():

    image_id = row["id"]

    jpg_src = IMAGES_DIR / f"{image_id}.jpg"
    jpg_dst = FINAL_IMAGES / f"{image_id}.jpg"

    json_src = STYLES_DIR / f"{image_id}.json"
    json_dst = FINAL_STYLES / f"{image_id}.json"

    # 이미지 복사

    if jpg_src.exists():
        shutil.copy2(jpg_src, jpg_dst)
        copied_images += 1

    # 기본값

    fit = "OTHER"
    pattern = "OTHER"
    fabric = "OTHER"

    # JSON 복사 및 속성 추출

    if json_src.exists():

        shutil.copy2(json_src, json_dst)
        copied_jsons += 1

        try:

            with open(json_src, "r", encoding="utf-8") as f:
                style_json = json.load(f)

            attrs = (
                style_json
                .get("data", {})
                .get("articleAttributes", {})
            )

            raw_fit = str(
                attrs.get("Fit", "")
            ).strip()

            raw_pattern = str(
                attrs.get("Pattern", "")
            ).strip()

            raw_fabric = str(
                attrs.get("Fabric", "")
            ).strip()

            fit = FIT_MAP.get(
                raw_fit,
                raw_fit if raw_fit else "OTHER"
            )

            pattern = PATTERN_MAP.get(
                raw_pattern,
                raw_pattern if raw_pattern else "OTHER"
            )

            fabric = FABRIC_MAP.get(
                raw_fabric,
                raw_fabric if raw_fabric else "OTHER"
            )

        except Exception:
            pass

    # metadata 생성

    metadata.append({
        "image_name": f"{image_id}.jpg",

        "category": "TOP",

        "sub_category": SUBCATEGORY_MAP.get(
            row["articleType"],
            "OTHER"
        ),

        "article_type": str(
            row.get("articleType", "OTHER")
        ),

        "color": COLOR_MAP.get(
            str(row.get("baseColour", "")).strip(),
            "OTHER"
        ),

        "season": str(
            row.get("season", "UNKNOWN")
        ),

        "usage": str(
            row.get("usage", "UNKNOWN")
        ),

        "gender": str(
            row.get("gender", "UNKNOWN")
        ),

        "pattern": pattern,

        "fit": fit,

        "fabric": fabric
    })

# =========================
# metadata 저장
# =========================

metadata_df = pd.DataFrame(metadata)

metadata_df.to_csv(
    METADATA_PATH,
    index=False,
    encoding="utf-8-sig"
)

# =========================
# 결과 출력
# =========================

print("\n=== 완료 ===")

print(f"이미지 복사 : {copied_images}")
print(f"json 복사 : {copied_jsons}")

print(f"\nmetadata 생성:")
print(METADATA_PATH)

print("\n카테고리 분포")

print(
    metadata_df["sub_category"]
    .value_counts()
)

print("\n색상 분포 TOP10")

print(
    metadata_df["color"]
    .value_counts()
    .head(10)
)

print("\n패턴 분포 TOP10")

print(
    metadata_df["pattern"]
    .value_counts()
    .head(10)
)
import pandas as pd
import shutil
from pathlib import Path

# =========================
# 경로 설정
# =========================

BASE_DIR = Path(__file__).parent

CSV_PATH = BASE_DIR / "styles.csv"
IMAGE_DIR = BASE_DIR / "images"

OUTPUT_DIR = BASE_DIR / "warelens_dataset"
METADATA_PATH = OUTPUT_DIR / "metadata.csv"

# =========================
# 기존 결과 삭제
# =========================

if OUTPUT_DIR.exists():
    shutil.rmtree(OUTPUT_DIR)

OUTPUT_DIR.mkdir(exist_ok=True)

# =========================
# 추출 개수 설정
# =========================

TARGET_TYPES = {
    "Tshirts": 500,
    "Shirts": 500,
    "Sweatshirts": 500,
    "Sweaters": 500,
}

# =========================
# WareLens 메타데이터 매핑
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

# =========================
# CSV 로드
# =========================

print("CSV 로드 중...")

df = pd.read_csv(CSV_PATH, on_bad_lines="skip")

print(f"전체 데이터 수 : {len(df):,}")

# =========================
# 샘플링
# =========================

selected_rows = []

print("\n=== 카테고리별 추출 ===")

for article_type, target_count in TARGET_TYPES.items():

    subset = df[df["articleType"] == article_type]

    available_count = len(subset)
    sample_count = min(target_count, available_count)

    print(
        f"{article_type:<15} "
        f"보유:{available_count:<5} "
        f"추출:{sample_count}"
    )

    sample = subset.sample(
        n=sample_count,
        random_state=42
    )

    selected_rows.append(sample)

result = pd.concat(selected_rows)

print("\n=== 최종 추출 결과 ===")
print(result["articleType"].value_counts())
print(f"\n총 {len(result)}개")

# =========================
# 이미지 복사 + metadata 생성
# =========================

metadata = []

copied = 0
missing = 0

print("\n이미지 복사 중...")

for _, row in result.iterrows():

    image_id = row["id"]

    src = IMAGE_DIR / f"{image_id}.jpg"
    dst = OUTPUT_DIR / f"{image_id}.jpg"

    if not src.exists():
        missing += 1
        continue

    shutil.copy(src, dst)
    copied += 1

    article_type = row["articleType"]
    base_color = str(row["baseColour"]).strip()

    metadata.append({
        "image_name": f"{image_id}.jpg",
        "category": "TOP",
        "sub_category": SUBCATEGORY_MAP.get(
            article_type,
            "OTHER"
        ),
        "color": COLOR_MAP.get(
            base_color,
            "OTHER"
        ),
        "pattern": "OTHER"
    })

# =========================
# metadata.csv 생성
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
print(f"복사 성공 : {copied}")
print(f"누락 파일 : {missing}")
print(f"metadata 생성 : {METADATA_PATH}")

print("\n=== metadata 샘플 ===")
print(metadata_df.head())
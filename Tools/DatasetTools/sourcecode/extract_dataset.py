import pandas as pd
import shutil
from pathlib import Path

# =========================
# 경로 설정
# =========================

BASE_DIR = Path(__file__).parent

CSV_PATH = BASE_DIR / "styles.csv"
IMAGE_DIR = BASE_DIR / "images"

OUTPUT_DIR = BASE_DIR / "warelens_raw"

# =========================
# 기존 결과 삭제
# =========================

if OUTPUT_DIR.exists():
    shutil.rmtree(OUTPUT_DIR)

OUTPUT_DIR.mkdir()

# =========================
# 추출 개수
# =========================

TARGET_TYPES = {
    "Tshirts": 500,
    "Shirts": 500,
    "Sweatshirts": 500,
    "Sweaters": 500,
}

# =========================
# CSV 로드
# =========================

print("CSV 로드 중...")

df = pd.read_csv(CSV_PATH, on_bad_lines="skip")

print(f"전체 데이터 수 : {len(df):,}")

# =========================
# 카테고리별 샘플링
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
# 이미지 복사
# =========================

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

    shutil.copy2(src, dst)
    copied += 1

# =========================
# 결과 출력
# =========================

print("\n=== 완료 ===")
print(f"복사 성공 : {copied}")
print(f"누락 파일 : {missing}")
print(f"저장 위치 : {OUTPUT_DIR}")
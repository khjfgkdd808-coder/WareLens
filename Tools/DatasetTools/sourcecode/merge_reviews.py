import pandas as pd
from pathlib import Path

# review.csv 모아놓은 폴더
REVIEW_DIR = Path("review_results")

# 결과 파일
MERGED_FILE = "review_merged.csv"
KEEP_FILE = "review_keep.csv"

all_dfs = []

# csv 전부 읽기
for csv_file in REVIEW_DIR.glob("*.csv"):
    print(f"읽는 중: {csv_file.name}")

    df = pd.read_csv(csv_file)

    all_dfs.append(df)

# 합치기
merged = pd.concat(all_dfs, ignore_index=True)

# 중복 제거 (혹시 같은 파일이 들어있을 경우)
merged = merged.drop_duplicates(subset=["image_name"])

# 저장
merged.to_csv(MERGED_FILE, index=False, encoding="utf-8-sig")

# KEEP만 추출
keep_df = merged[merged["status"] == "KEEP"]

keep_df.to_csv(
    KEEP_FILE,
    index=False,
    encoding="utf-8-sig"
)

print()
print("=== 완료 ===")
print(f"전체 이미지 수 : {len(merged)}")
print(f"KEEP 수 : {len(keep_df)}")
print(f"병합 파일 : {MERGED_FILE}")
print(f"KEEP 파일 : {KEEP_FILE}")
"""
remove_items.py - 데이터셋에서 특정 이미지 제거
=================================================
exclude_list.txt에 제거할 이미지 파일명을 한 줄씩 작성하면
1. fashion_dataset/ → archive/ 폴더로 이동
2. metadata.csv에서 해당 행 삭제
3. build_vectors.py 자동 실행 (캐시 재생성)

사용 방법:
    1. exclude_list.txt에 제거할 파일명 추가 (한 줄에 하나)
       예)
           12345.jpg
           67890.jpg
    2. python remove_items.py 실행

주의:
    - archive/ 폴더로 이동하므로 실수 시 복구 가능
    - build_vectors.py 실행까지 완료되어야 변경사항이 반영됨
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

# ─── 경로 설정 ──────────────────────────────────────
BASE_DIR        = Path(__file__).parent
DATASET_DIR     = BASE_DIR / "fashion_dataset"
ARCHIVE_DIR     = BASE_DIR / "archive"
METADATA_CSV    = BASE_DIR / "metadata.csv"
EXCLUDE_LIST    = BASE_DIR / "exclude_list.txt"
BUILD_VECTORS   = BASE_DIR / "build_vectors.py"


def load_exclude_list() -> list[str]:
    """exclude_list.txt에서 제거할 파일명 목록을 로드합니다."""
    if not EXCLUDE_LIST.exists():
        print(f"[오류] exclude_list.txt 파일이 없습니다: {EXCLUDE_LIST}")
        print("       exclude_list.txt를 생성하고 제거할 파일명을 한 줄씩 입력해주세요.")
        sys.exit(1)

    with open(EXCLUDE_LIST, encoding="utf-8") as f:
        lines = [line.strip() for line in f.readlines()]

    # 빈 줄 및 주석(#) 제거
    targets = [l for l in lines if l and not l.startswith("#")]

    if not targets:
        print("[안내] exclude_list.txt에 제거할 파일명이 없습니다.")
        sys.exit(0)

    return targets


def move_to_archive(targets: list[str]) -> tuple[list[str], list[str]]:
    """
    fashion_dataset/에서 archive/로 이미지 이동.

    Returns:
        (성공 목록, 실패 목록)
    """
    ARCHIVE_DIR.mkdir(exist_ok=True)

    success, failed = [], []
    for filename in targets:
        src = DATASET_DIR / filename
        dst = ARCHIVE_DIR / filename

        if not src.exists():
            print(f"  [경고] 이미지 없음 (이미 제거됐거나 파일명 오타): {filename}")
            failed.append(filename)
            continue

        shutil.move(str(src), str(dst))
        print(f"  [이동] {filename}  →  archive/")
        success.append(filename)

    return success, failed


def remove_from_metadata(targets: list[str]) -> int:
    """
    metadata.csv에서 해당 파일명 행 삭제.

    Returns:
        삭제된 행 수
    """
    if not METADATA_CSV.exists():
        print(f"[경고] metadata.csv 없음: {METADATA_CSV}")
        return 0

    with open(METADATA_CSV, encoding="utf-8-sig") as f:
        lines = f.readlines()

    header    = lines[0]
    data_rows = lines[1:]

    target_set   = set(targets)
    removed_rows = []
    kept_rows    = []

    for row in data_rows:
        # image_name은 첫 번째 컬럼
        image_name = row.split(",")[0].strip()
        if image_name in target_set:
            removed_rows.append(image_name)
            print(f"  [삭제] metadata: {image_name}")
        else:
            kept_rows.append(row)

    with open(METADATA_CSV, "w", encoding="utf-8-sig") as f:
        f.write(header)
        f.writelines(kept_rows)

    return len(removed_rows)


def run_build_vectors():
    """build_vectors.py를 실행하여 캐시를 재생성합니다."""
    if not BUILD_VECTORS.exists():
        print(f"[오류] build_vectors.py 없음: {BUILD_VECTORS}")
        sys.exit(1)

    print("\n[4/4] build_vectors.py 실행 중...")
    print("      (모델 로드 및 임베딩 재생성, 시간이 걸릴 수 있습니다)")
    print("-" * 50)

    result = subprocess.run(
        [sys.executable, str(BUILD_VECTORS)],
        cwd=str(BASE_DIR)
    )

    if result.returncode != 0:
        print("\n[오류] build_vectors.py 실행 실패")
        print("       캐시가 갱신되지 않았습니다. 수동으로 실행해주세요:")
        print("       python build_vectors.py")
        sys.exit(1)


def main():
    print("=" * 50)
    print("  데이터셋 항목 제거 스크립트")
    print("=" * 50)

    # 1. 제거 목록 로드
    targets = load_exclude_list()
    print(f"\n[1/4] 제거 대상 {len(targets)}개 확인")
    for t in targets:
        print(f"       - {t}")

    # 2. 확인 프롬프트
    print(f"\n위 {len(targets)}개 항목을 제거합니다.")
    print("  - 이미지: fashion_dataset/ → archive/ 이동")
    print("  - metadata.csv: 해당 행 삭제")
    print("  - 캐시: build_vectors.py 재실행으로 갱신")
    confirm = input("\n계속하시겠습니까? (y/n): ").strip().lower()

    if confirm != "y":
        print("취소했습니다.")
        sys.exit(0)

    # 3. 이미지 이동
    print("\n[2/4] 이미지 archive/ 폴더로 이동")
    success, failed = move_to_archive(targets)
    print(f"      이동 완료: {len(success)}개 / 실패: {len(failed)}개")

    # 4. metadata.csv 삭제
    print("\n[3/4] metadata.csv 행 삭제")
    removed = remove_from_metadata(targets)
    print(f"      삭제 완료: {removed}개 행")

    if not success:
        print("\n[안내] 이동된 이미지가 없어 build_vectors.py를 실행하지 않습니다.")
        sys.exit(0)

    # 5. build_vectors.py 실행
    run_build_vectors()

    # 6. 완료 요약
    print("\n" + "=" * 50)
    print("  완료!")
    print(f"  - 이미지 이동: {len(success)}개 → archive/")
    print(f"  - metadata 삭제: {removed}개 행")
    print(f"  - 캐시 재생성 완료")
    if failed:
        print(f"  - 처리 실패: {len(failed)}개 (파일 없음)")
        for f in failed:
            print(f"    · {f}")
    print("=" * 50)


if __name__ == "__main__":
    main()

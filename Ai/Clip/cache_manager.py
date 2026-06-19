"""
cache_manager.py - 임베딩 벡터 캐시 저장 및 로드
===================================================
fashion_dataset 전체 이미지의 임베딩 벡터를 파일로 저장하고 불러오는 기능을 담당합니다.

캐시 파일 구조:
    cache/
    ├── vectors.npy    : 임베딩 행렬 (N, 512) - float32
    └── filenames.npy  : 이미지 파일명 배열 (N,) - str

향후 메타데이터 캐싱이 필요하면 이 파일에 함수를 추가하면 됩니다.
"""

import sys
import numpy as np
from pathlib import Path

# 캐시 폴더 및 파일 경로 설정
CACHE_DIR           = Path("cache")
VECTORS_PATH        = CACHE_DIR / "vectors.npy"
FILENAMES_PATH      = CACHE_DIR / "filenames.npy"


def cache_exists() -> bool:
    """
    캐시 파일(vectors.npy, filenames.npy)이 모두 존재하는지 확인합니다.

    Returns:
        bool: 두 파일이 모두 존재하면 True, 하나라도 없으면 False
    """
    return VECTORS_PATH.exists() and FILENAMES_PATH.exists()


def save_cache(vectors: np.ndarray, filenames: list[str]) -> None:
    """
    임베딩 벡터 행렬과 파일명 목록을 캐시 파일로 저장합니다.

    Args:
        vectors   (np.ndarray) : 임베딩 행렬, shape (N, 512)
        filenames (list[str])  : 이미지 파일 경로 리스트, 길이 N
    """
    # 캐시 폴더가 없으면 자동 생성
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    # 벡터 행렬 저장 (float32로 저장하여 파일 크기 절약)
    np.save(VECTORS_PATH, vectors.astype(np.float32))

    # 파일명 목록 저장 (문자열 배열)
    np.save(FILENAMES_PATH, np.array(filenames))

    print(f"  캐시 저장 완료")
    print(f"    - 벡터  : {VECTORS_PATH}  {vectors.shape}")
    print(f"    - 파일명: {FILENAMES_PATH}  ({len(filenames)}개)")


def load_cache() -> tuple[np.ndarray, list[str]]:
    """
    캐시 파일에서 임베딩 벡터 행렬과 파일명 목록을 불러옵니다.
    캐시 파일이 없으면 에러 메시지를 출력하고 프로그램을 종료합니다.

    Returns:
        tuple:
            - vectors   (np.ndarray) : 임베딩 행렬, shape (N, 512)
            - filenames (list[str])  : 이미지 파일 경로 리스트
    """
    if not cache_exists():
        print("[오류] 캐시 파일이 없습니다.")
        print("       먼저 아래 명령어로 벡터를 생성하세요:")
        print()
        print("         python build_vectors.py")
        print()
        sys.exit(1)

    # allow_pickle=False: 보안상 pickle 역직렬화 비활성화
    vectors   = np.load(VECTORS_PATH)
    filenames = np.load(FILENAMES_PATH, allow_pickle=True).tolist()

    print(f"  캐시 로드 완료")
    print(f"    - 벡터 shape : {vectors.shape}")
    print(f"    - 이미지 수  : {len(filenames)}장")

    return vectors, filenames


def get_cache_info() -> dict:
    """
    캐시 파일의 상태 정보를 딕셔너리로 반환합니다.
    캐시가 없으면 exists=False를 반환합니다.

    Returns:
        dict: {
            "exists"    : bool,
            "n_images"  : int  (캐시가 있을 때만),
            "vector_dim": int  (캐시가 있을 때만),
        }
    """
    if not cache_exists():
        return {"exists": False}

    vectors = np.load(VECTORS_PATH)

    return {
        "exists"    : True,
        "n_images"  : vectors.shape[0],
        "vector_dim": vectors.shape[1],
    }

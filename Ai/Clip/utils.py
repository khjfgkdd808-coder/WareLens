"""
utils.py - 공통 유틸리티 함수 모음
=====================================
이미지 로드, 경로 처리 등 여러 모듈에서 공통으로 사용하는 함수들을 모아둔 파일입니다.
"""

import sys
from pathlib import Path
from PIL import Image

# 지원하는 이미지 확장자 목록
SUPPORTED_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.webp')


def load_image(image_path: str) -> Image.Image:
    """
    이미지 파일을 PIL Image(RGB) 형태로 불러옵니다.
    투명도 채널(RGBA 등)이 있으면 RGB로 변환합니다.

    Args:
        image_path (str): 이미지 파일 경로

    Returns:
        PIL.Image.Image: RGB 이미지 객체
    """
    img = Image.open(image_path)

    # PNG, WEBP 등 투명도(Alpha 채널)가 있는 이미지를 RGB로 변환
    if img.mode != 'RGB':
        img = img.convert('RGB')

    return img


def get_image_paths(directory: str | Path) -> list[str]:
    """
    지정한 폴더에서 지원하는 확장자의 이미지 파일 경로를 모두 수집합니다.
    대소문자 확장자 모두 처리합니다. (.jpg / .JPG 등)

    Args:
        directory (str | Path): 탐색할 폴더 경로

    Returns:
        list[str]: 정렬된 이미지 파일 경로 리스트
    """
    directory = Path(directory)

    # 폴더 존재 여부 확인
    if not directory.exists():
        print(f"[오류] 폴더를 찾을 수 없습니다: {directory}")
        sys.exit(1)

    paths = []
    for ext in SUPPORTED_EXTENSIONS:
        paths.extend(directory.glob(f"*{ext}"))           # 소문자 확장자
        paths.extend(directory.glob(f"*{ext.upper()}"))   # 대문자 확장자

    # 중복 제거 후 정렬
    paths = sorted(list(set(paths)))

    return [str(p) for p in paths]


def validate_folder(directory: str | Path, folder_name: str) -> Path:
    """
    폴더 경로가 유효한지 확인합니다.
    존재하지 않으면 에러 메시지를 출력하고 프로그램을 종료합니다.

    Args:
        directory  (str | Path): 확인할 폴더 경로
        folder_name (str)      : 에러 메시지에 표시할 폴더 이름

    Returns:
        Path: 유효한 폴더 경로
    """
    directory = Path(directory)

    if not directory.exists():
        print(f"[오류] {folder_name} 폴더를 찾을 수 없습니다: {directory}")
        print(f"       폴더를 생성하고 이미지를 넣은 뒤 다시 실행하세요.")
        sys.exit(1)

    return directory

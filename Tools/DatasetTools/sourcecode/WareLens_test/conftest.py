import os
import sys

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")


sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pytest
from PyQt6.QtGui import QImage


@pytest.fixture
def img_dir(tmp_path):
    d = tmp_path / "img"
    d.mkdir()
    return d


def make_dummy_image(path, size=4, color=0xFF00FF00):
    image = QImage(size, size, QImage.Format.Format_RGB32)
    image.fill(color)
    ok = image.save(str(path), "PNG")
    assert ok, f"테스트용 이미지 생성 실패: {path}"


@pytest.fixture
def make_images(img_dir):
    def _make(filenames):
        for fname in filenames:
            make_dummy_image(img_dir / fname)
        return list(filenames)
    return _make


@pytest.fixture
def app_base(tmp_path, monkeypatch):
    import warelens_app
    monkeypatch.setattr(warelens_app, "get_base_path", lambda: str(tmp_path))
    return tmp_path

import csv
import os

import pytest
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QCloseEvent
from PyQt6.QtWidgets import QMessageBox

import warelens_app
from warelens_app import WareLensApp, get_image_list


# ----------------------------------------------------------------------
# 헬퍼
# ----------------------------------------------------------------------

def make_app(qtbot, image_list):
    win = WareLensApp(image_list)
    qtbot.addWidget(win)
    return win


def select_all_fields(win, category="TOP", sub="TSHIRT", color="BLACK", pattern="SOLID"):
    win.set_category_state(category, click_trigger=True)
    win.set_sub_category_state(sub, click_trigger=True)
    win.set_color_state(color, click_trigger=True)
    win.set_pattern_state(pattern, click_trigger=True)


def read_csv_rows(csv_path):
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        rows = {row[0]: row[1:] for row in reader}
    return header, rows


# ----------------------------------------------------------------------
# 1. get_image_list() - 폴더 스캔 / 확장자 필터링
# ----------------------------------------------------------------------

class TestGetImageList:

    def test_creates_missing_img_dir_and_returns_empty(self, app_base):
        img_dir = app_base / "img"
        assert not img_dir.exists()
        result = get_image_list()
        assert result == []
        assert img_dir.exists()

    def test_filters_unsupported_extensions_and_sorts(self, app_base):
        img_dir = app_base / "img"
        img_dir.mkdir()
        for name in ["b.png", "a.jpg", "c.txt", "d.PNG", "e.webp", "notes.md"]:
            (img_dir / name).write_bytes(b"dummy")

        result = get_image_list()

        # txt, md 는 제외되고 확장자 지원 파일만, 알파벳 순 정렬
        assert result == ["a.jpg", "b.png", "d.PNG", "e.webp"]


# ----------------------------------------------------------------------
# 2. CSV 로드 / 저장 로직
# ----------------------------------------------------------------------

class TestCsvHandling:

    def test_csv_created_with_header_when_missing(self, qtbot, app_base, make_images):
        files = make_images(["0001.png", "0002.png"])
        win = make_app(qtbot, files)

        csv_path = win.csv_path
        assert os.path.exists(csv_path)
        header, rows = read_csv_rows(csv_path)
        assert header == ["file_name", "category", "sub_category", "color", "pattern", "note"]
        assert rows == {}

    def test_existing_valid_row_is_loaded(self, qtbot, app_base, make_images):
        files = make_images(["0001.png", "0002.png"])
        csv_path = app_base / "labels.csv"
        with open(csv_path, "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f)
            w.writerow(["file_name", "category", "sub_category", "color", "pattern", "note"])
            w.writerow(["0001.png", "TOP", "TSHIRT", "BLACK", "SOLID", "메모"])

        win = make_app(qtbot, files)

        assert "0001.png" in win.labels_data
        assert win.labels_data["0001.png"] == ["TOP", "TSHIRT", "BLACK", "SOLID", "메모"]

    def test_malformed_row_is_skipped(self, qtbot, app_base, make_images):
        files = make_images(["0001.png"])
        csv_path = app_base / "labels.csv"
        with open(csv_path, "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f)
            w.writerow(["file_name", "category", "sub_category", "color", "pattern", "note"])
            # 데이터 컬럼이 부족한(len(row) < 5) 손상된 행
            w.writerow(["0001.png", "TOP", "TSHIRT"])

        win = make_app(qtbot, files)

        assert "0001.png" not in win.labels_data

    def test_row_without_note_column_still_loads(self, qtbot, app_base, make_images):
        files = make_images(["0001.png"])
        csv_path = app_base / "labels.csv"
        with open(csv_path, "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f)
            w.writerow(["file_name", "category", "sub_category", "color", "pattern", "note"])
            w.writerow(["0001.png", "TOP", "TSHIRT", "BLACK", "SOLID"])  # note 없음, 총 길이 5

        win = make_app(qtbot, files)

        assert win.labels_data["0001.png"] == ["TOP", "TSHIRT", "BLACK", "SOLID"]
        win.current_idx = 0
        win.load_image()
        assert win.note_input.text() == ""


# ----------------------------------------------------------------------
# 3. jump_to_first_incomplete
# ----------------------------------------------------------------------

class TestJumpToFirstIncomplete:

    def test_jumps_to_first_unlabeled_image(self, qtbot, app_base, make_images):
        files = make_images(["0001.png", "0002.png", "0003.png"])
        csv_path = app_base / "labels.csv"
        with open(csv_path, "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f)
            w.writerow(["file_name", "category", "sub_category", "color", "pattern", "note"])
            w.writerow(["0001.png", "TOP", "TSHIRT", "BLACK", "SOLID", ""])

        win = make_app(qtbot, files)

        assert win.current_idx == 1 

    def test_all_complete_resets_to_zero(self, qtbot, app_base, make_images):
        files = make_images(["0001.png", "0002.png"])
        csv_path = app_base / "labels.csv"
        with open(csv_path, "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f)
            w.writerow(["file_name", "category", "sub_category", "color", "pattern", "note"])
            w.writerow(["0001.png", "TOP", "TSHIRT", "BLACK", "SOLID", ""])
            w.writerow(["0002.png", "BOTTOM", "JEANS", "NAVY", "SOLID", ""])

        win = make_app(qtbot, files)

        assert win.current_idx == 0


# ----------------------------------------------------------------------
# 4. 라벨 선택 상태 머신
# ----------------------------------------------------------------------

class TestLabelStateMachine:

    def test_category_selection_advances_step_and_checks_button(self, qtbot, app_base, make_images):
        files = make_images(["0001.png"])
        win = make_app(qtbot, files)

        win.set_category_state("BOTTOM", click_trigger=True)

        assert win.chosen_category == "BOTTOM"
        assert win.chosen_sub_category is None  
        assert win.current_step == "sub_category"
        assert win.cate_btn_map["BOTTOM"].isChecked() is True
        assert win.cate_btn_map["TOP"].isChecked() is False

    def test_sub_category_options_match_selected_category(self, qtbot, app_base, make_images):
        files = make_images(["0001.png"])
        win = make_app(qtbot, files)

        win.set_category_state("OUTER", click_trigger=True)

        assert set(win.sub_cate_btn_map.keys()) == set(win.sub_categories_map["OUTER"])

    def test_full_flow_saves_and_advances_image(self, qtbot, app_base, make_images):
        files = make_images(["0001.png", "0002.png"])
        win = make_app(qtbot, files)

        assert win.current_idx == 0
        select_all_fields(win, "TOP", "TSHIRT", "BLACK", "SOLID")
        win.note_input.setText("테스트 메모")
        win.validate_and_save_data()

        assert win.labels_data["0001.png"] == ["TOP", "TSHIRT", "BLACK", "SOLID", "테스트 메모"]
        assert win.current_idx == 1 

        header, rows = read_csv_rows(win.csv_path)
        assert rows["0001.png"] == ["TOP", "TSHIRT", "BLACK", "SOLID", "테스트 메모"]

    def test_save_blocked_when_fields_missing(self, qtbot, app_base, make_images, monkeypatch):
        files = make_images(["0001.png", "0002.png"])
        win = make_app(qtbot, files)

        warned = {"called": False}
        monkeypatch.setattr(QMessageBox, "warning", lambda *a, **kw: warned.__setitem__("called", True))

        win.set_category_state("TOP", click_trigger=True)
        win.validate_and_save_data()

        assert warned["called"] is True
        assert "0001.png" not in win.labels_data
        assert win.current_idx == 0


# ----------------------------------------------------------------------
# 5. 이미지 이동 / 회전
# ----------------------------------------------------------------------

class TestImageNavigation:

    def test_next_image_wraps_around(self, qtbot, app_base, make_images):
        files = make_images(["0001.png", "0002.png", "0003.png"])
        win = make_app(qtbot, files)
        win.current_idx = 2

        win.next_image()

        assert win.current_idx == 0

    def test_prev_image_wraps_around(self, qtbot, app_base, make_images):
        files = make_images(["0001.png", "0002.png", "0003.png"])
        win = make_app(qtbot, files)
        win.current_idx = 0

        win.prev_image()

        assert win.current_idx == 2

    def test_rotation_resets_on_image_change(self, qtbot, app_base, make_images):
        files = make_images(["0001.png", "0002.png"])
        win = make_app(qtbot, files)
        win.rotation = 90

        win.next_image()

        assert win.rotation == 0

    def test_missing_image_file_shows_error_text(self, qtbot, app_base, make_images):
        files = make_images([])
        win = make_app(qtbot, ["ghost.png"])

        win.current_idx = 0
        win.load_image()

        assert "로드 실패" in win.image_label.text()

    def test_note_persists_across_navigation(self, qtbot, app_base, make_images):
        files = make_images(["0001.png", "0002.png"])
        win = make_app(qtbot, files)

        select_all_fields(win)
        win.note_input.setText("이전 이미지 메모")
        win.validate_and_save_data() 

        win.prev_image()  

        assert win.note_input.text() == "이전 이미지 메모"


# ----------------------------------------------------------------------
# 6. 키보드 단축키
# ----------------------------------------------------------------------

class TestKeyboardShortcuts:

    def test_digit_key_selects_category(self, qtbot, app_base, make_images):
        files = make_images(["0001.png"])
        win = make_app(qtbot, files)

        qtbot.keyClick(win, Qt.Key.Key_1)

        assert win.chosen_category == "TOP"
        assert win.current_step == "sub_category"

    def test_shortcut_beyond_list_length_is_ignored(self, qtbot, app_base, make_images):
        files = make_images(["0001.png"])
        win = make_app(qtbot, files)
        select_all_fields(win, "TOP", "TSHIRT", "BLACK", "SOLID")
        win.current_step = "pattern" 

        qtbot.keyClick(win, Qt.Key.Key_T) 

        assert win.chosen_pattern == "SOLID" 

    def test_backspace_moves_one_step_back(self, qtbot, app_base, make_images):
        files = make_images(["0001.png"])
        win = make_app(qtbot, files)
        win.current_step = "pattern"

        qtbot.keyClick(win, Qt.Key.Key_Backspace)
        assert win.current_step == "color"

        qtbot.keyClick(win, Qt.Key.Key_Backspace)
        assert win.current_step == "sub_category"

        qtbot.keyClick(win, Qt.Key.Key_Backspace)
        assert win.current_step == "category"

        qtbot.keyClick(win, Qt.Key.Key_Backspace)
        assert win.current_step == "category"

    def test_ctrl_z_clears_selection(self, qtbot, app_base, make_images):
        files = make_images(["0001.png"])
        win = make_app(qtbot, files)
        select_all_fields(win, "TOP", "TSHIRT", "BLACK", "SOLID")

        qtbot.keyClick(win, Qt.Key.Key_Z, Qt.KeyboardModifier.ControlModifier)

        assert win.chosen_category is None
        assert win.chosen_sub_category is None
        assert win.chosen_color is None
        assert win.chosen_pattern is None
        assert win.current_step == "category"
        assert all(not b.isChecked() for b in win.cate_btn_map.values())

    def test_arrow_keys_navigate_images(self, qtbot, app_base, make_images):
        files = make_images(["0001.png", "0002.png"])
        win = make_app(qtbot, files)

        qtbot.keyClick(win, Qt.Key.Key_Right)
        assert win.current_idx == 1

        qtbot.keyClick(win, Qt.Key.Key_Left)
        assert win.current_idx == 0

    def test_ctrl_r_and_shift_r_rotate(self, qtbot, app_base, make_images):
        files = make_images(["0001.png"])
        win = make_app(qtbot, files)

        qtbot.keyClick(win, Qt.Key.Key_R, Qt.KeyboardModifier.ControlModifier)
        assert win.rotation == 90

        qtbot.keyClick(win, Qt.Key.Key_R, Qt.KeyboardModifier.ShiftModifier)
        assert win.rotation == 0

    def test_space_saves_when_fields_complete(self, qtbot, app_base, make_images):
        files = make_images(["0001.png", "0002.png"])
        win = make_app(qtbot, files)
        select_all_fields(win, "TOP", "TSHIRT", "BLACK", "SOLID")

        qtbot.keyClick(win, Qt.Key.Key_Space)

        assert "0001.png" in win.labels_data
        assert win.current_idx == 1


# ----------------------------------------------------------------------
# 7. 사이드바 진행률 표시
# ----------------------------------------------------------------------

class TestSidebarProgress:

    def test_progress_updates_after_save(self, qtbot, app_base, make_images):
        files = make_images(["0001.png", "0002.png"])
        win = make_app(qtbot, files)

        select_all_fields(win)
        win.validate_and_save_data()

        assert win.prog_bar.value() == 50
        assert "1" in win.badge_done.text()
        assert "1" in win.badge_todo.text()
        assert "1 / 2" in win.prog_text.text()


# ----------------------------------------------------------------------
# 8. 종료 시 저장
# ----------------------------------------------------------------------

class TestCloseEvent:

    def test_close_event_persists_csv(self, qtbot, app_base, make_images):
        files = make_images(["0001.png"])
        win = make_app(qtbot, files)

        win.labels_data["0001.png"] = ["TOP", "TSHIRT", "BLACK", "SOLID", ""]
        win.closeEvent(QCloseEvent())

        header, rows = read_csv_rows(win.csv_path)
        assert rows["0001.png"] == ["TOP", "TSHIRT", "BLACK", "SOLID", ""]

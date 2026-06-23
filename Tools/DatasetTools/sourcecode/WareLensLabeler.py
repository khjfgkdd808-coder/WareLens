import sys
import os
import csv
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QHBoxLayout, 
                             QVBoxLayout, QLabel, QListWidget, QProgressBar, 
                             QMessageBox, QGridLayout, QPushButton, QFrame, QLineEdit)
from PyQt6.QtCore import Qt, QSize
from PyQt6.QtGui import QPixmap, QTransform, QKeyEvent, QFont, QImage

def get_base_path():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

class WareLensApp(QMainWindow):
    def __init__(self, image_list):
        super().__init__()
        self.image_list = image_list
        self.csv_path = os.path.join(get_base_path(), "labels.csv")
        self.current_idx = 0
        self.rotation = 0      
        self.labels_data = {}   
        self.current_step = "category" 
        self.chosen_category = None
        self.chosen_sub_category = None 
        self.chosen_color = None
        self.chosen_pattern = None

        self.categories_list = ["TOP", "BOTTOM", "DRESS", "OUTER", "SHOES", "BAG", "UNKNOWN"]
        self.sub_categories_map = {
            "TOP": ["TSHIRT", "SHIRT", "SWEATER", "HOODIE"],
            "BOTTOM": ["JEANS", "SLACKS", "SHORTS", "TRAINING"],
            "DRESS": ["MINI", "MIDI", "LONG"],
            "OUTER": ["PADDING", "COAT", "JACKET", "CARDIGAN"],
            "SHOES": ["SNEAKERS", "LOAFERS", "SANDALS", "HEELS"],
            "BAG": ["BACKPACK", "CROSS", "TOTE", "SHOULDER"],
            "UNKNOWN": ["UNKNOWN"]
        }
        self.colors_list = ["BLACK", "WHITE", "GRAY", "NAVY", "BLUE", "BEIGE", "BROWN", "GREEN", "RED", "PINK", "YELLOW", "PURPLE", "ORANGE", "MULTI", "OTHER"]
        self.patterns_list = ["SOLID", "STRIPE", "CHECK", "DOT", "UNKNOWN"]
        self.shortcut_keys = [Qt.Key.Key_1, Qt.Key.Key_2, Qt.Key.Key_3, Qt.Key.Key_4, Qt.Key.Key_5,
                              Qt.Key.Key_6, Qt.Key.Key_7, Qt.Key.Key_8, Qt.Key.Key_9,
                              Qt.Key.Key_Q, Qt.Key.Key_W, Qt.Key.Key_E, Qt.Key.Key_R, Qt.Key.Key_T, Qt.Key.Key_Y]
        
        self.init_ui()
        self.init_csv_data()
        self.jump_to_first_incomplete()

        self.setFocus()

    def init_csv_data(self):
        self.labels_data = {}  
        
        if os.path.exists(self.csv_path):
            with open(self.csv_path, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                header = next(reader, None)  
                
                for row in reader:
                    
                    if row and len(row) >= 5: 
                        fname = row[0] 
                        data = row[1:] 
                        self.labels_data[fname] = data 
                        print(f"DEBUG: {fname} 데이터를 저장했습니다.")
        else:
            self.save_to_csv()

    def save_to_csv(self):
        with open(self.csv_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(["file_name", "category", "sub_category", "color", "pattern", "note"])
            for fname, data in self.labels_data.items():
                writer.writerow([fname] + data)

    def jump_to_first_incomplete(self):
        for i, f in enumerate(self.image_list):
            if f not in self.labels_data:
                self.current_idx = i
                self.load_image()
                return
        if self.image_list:
            self.current_idx = 0
            self.load_image()

    def init_ui(self):
        self.setStyleSheet("""
            QMainWindow { background-color: #16161A; }
            QLabel { color: #E3E3E6; font-family: 'Malgun Gothic', Arial; }
            QListWidget { background-color: #1F1F24; border: 1px solid #2B2B33; border-radius: 6px; color: #A5A5AA; padding: 5px; }
            QListWidget::item { padding: 6px; border-radius: 4px; }
            QListWidget::item:selected { background-color: #5856D6; color: white; font-weight: bold; }
            QProgressBar { background-color: #26262B; border: none; height: 6px; border-radius: 3px; }
            QProgressBar::chunk { background-color: #5856D6; border-radius: 3px; }
            QPushButton { background-color: #26262B; color: #E3E3E6; border: 1px solid #32323B; border-radius: 5px; padding: 8px; font-weight: bold; text-align: left; padding-left: 10px;}
            QPushButton:hover { background-color: #32323B; }
            QPushButton:checked { background-color: #5856D6; border: 1px solid #7D7BFF; color: white; }
            QLineEdit { background-color: #1F1F24; border: 1px solid #32323B; color: white; border-radius: 5px; padding: 8px; }
        """)

        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        root_layout = QVBoxLayout(central_widget)
        main_layout = QHBoxLayout()

        
        left_layout = QVBoxLayout()
        prog_header = QHBoxLayout()
        prog_header.addWidget(QLabel("<b>진행률</b>"))
        prog_header.addStretch()
        self.prog_text = QLabel("0 / 0 (0%)")
        prog_header.addWidget(self.prog_text) 
        left_layout.addLayout(prog_header)
        
        self.prog_bar = QProgressBar()
        left_layout.addWidget(self.prog_bar)
        
        status_badge_layout = QHBoxLayout()
        self.badge_done = QLabel("✔ 완료 0")
        self.badge_done.setStyleSheet("color: #4CD964; background-color: #1A2E1F; padding: 4px 8px; border-radius: 4px; font-weight: bold;")
        self.badge_todo = QLabel("⚪ 미완료 0")
        self.badge_todo.setStyleSheet("color: #FF3B30; background-color: #2E1A1A; padding: 4px 8px; border-radius: 4px; font-weight: bold;")
        status_badge_layout.addWidget(self.badge_done)
        status_badge_layout.addWidget(self.badge_todo)
        status_badge_layout.addStretch()
        left_layout.addLayout(status_badge_layout)
        
        left_layout.addWidget(QLabel("<br><b>이미지 목록</b>"))
        self.file_list_widget = QListWidget()
        self.file_list_widget.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        self.file_list_widget.keyPressEvent = lambda event: self.keyPressEvent(event)
        self.file_list_widget.itemClicked.connect(self.on_list_item_clicked)
        left_layout.addWidget(self.file_list_widget)
        main_layout.addLayout(left_layout, stretch=1)
        def keyPressEvent(self, event: QKeyEvent):
            key = event.key()
            modfs = event.modifiers()

            if key == Qt.Key.Key_Left:
                self.prev_image()
                event.accept()
                return
            elif key == Qt.Key.Key_Right:
                self.next_image()
                event.accept()
                return

        center_layout = QVBoxLayout()
        img_header = QHBoxLayout()
        self.filename_label = QLabel("현재 이미지: Loading...")
        self.filename_label.setFont(QFont("Arial", 11, QFont.Weight.Bold))
        img_header.addWidget(self.filename_label)
        img_header.addStretch()
        center_layout.addLayout(img_header)
        
        self.image_label = QLabel("이미지 영역")
        self.image_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.image_label.setStyleSheet("background-color: #0B0B0D; border: 1px solid #222226; border-radius: 8px;")
        center_layout.addWidget(self.image_label)
        main_layout.addLayout(center_layout, stretch=3)

        
        right_layout = QVBoxLayout()
        right_layout.addWidget(QLabel("<b>라벨 입력 패널</b>"))
        
        self.lbl_title_cate = QLabel("카테고리")
        right_layout.addWidget(self.lbl_title_cate)
        self.cate_grid = QGridLayout()
        self.cate_btn_map = {}
        self.build_shortcut_grid(self.categories_list, self.cate_btn_map, self.cate_grid, self.set_category_state)
        right_layout.addLayout(self.cate_grid)

        self.lbl_title_sub_cate = QLabel("서브 카테고리")
        right_layout.addWidget(self.lbl_title_sub_cate)
        self.sub_cate_grid = QGridLayout()
        self.sub_cate_btn_map = {}
        right_layout.addLayout(self.sub_cate_grid)

        self.lbl_title_color = QLabel("색상")
        right_layout.addWidget(self.lbl_title_color)
        self.color_grid = QGridLayout()
        self.color_btn_map = {}
        self.build_shortcut_grid(self.colors_list, self.color_btn_map, self.color_grid, self.set_color_state)
        right_layout.addLayout(self.color_grid)

        self.lbl_title_pattern = QLabel("패턴")
        right_layout.addWidget(self.lbl_title_pattern)
        self.pattern_grid = QGridLayout()
        self.pattern_btn_map = {}
        self.build_shortcut_grid(self.patterns_list, self.pattern_btn_map, self.pattern_grid, self.set_pattern_state)
        right_layout.addLayout(self.pattern_grid)
        
        right_layout.addWidget(QLabel("<b>특이사항 (Note) 입력</b>"))
        self.note_input = QLineEdit()
        self.note_input.setPlaceholderText("검수 필요 사유 등 기록 (선택 사항)")
        self.note_input.focusInEvent = lambda e: self.note_input.setFocus()
        right_layout.addWidget(self.note_input)
        
        right_layout.addWidget(QLabel("<br><b>현재 라벨 상태 요약</b>"))
        summary_layout = QHBoxLayout()
        self.lbl_sum_cate = QLabel("미선택"); self.lbl_sum_cate.setStyleSheet("background-color: #5856D6; padding: 6px; border-radius: 4px; font-weight: bold; qproperty-alignment: 'AlignCenter';")
        self.lbl_sum_sub_cate = QLabel("미선택"); self.lbl_sum_sub_cate.setStyleSheet("background-color: #E67E22; padding: 6px; border-radius: 4px; font-weight: bold; qproperty-alignment: 'AlignCenter';")
        self.lbl_sum_color = QLabel("미선택"); self.lbl_sum_color.setStyleSheet("background-color: #B4B43B; color: black; padding: 6px; border-radius: 4px; font-weight: bold; qproperty-alignment: 'AlignCenter';")
        self.lbl_sum_pattern = QLabel("미선택"); self.lbl_sum_pattern.setStyleSheet("background-color: #2D6BB4; padding: 6px; border-radius: 4px; font-weight: bold; qproperty-alignment: 'AlignCenter';")
        summary_layout.addWidget(self.lbl_sum_cate)
        summary_layout.addWidget(self.lbl_sum_sub_cate)
        summary_layout.addWidget(self.lbl_sum_color)
        summary_layout.addWidget(self.lbl_sum_pattern)
        right_layout.addLayout(summary_layout)

        main_layout.addLayout(right_layout, stretch=1)
        root_layout.addLayout(main_layout, stretch=1)
        
        
        bottom_frame = QFrame()
        bottom_frame.setStyleSheet("background-color: #1B1B1F; border-radius: 5px;")
        bottom_guide_bar = QHBoxLayout(bottom_frame)
        bottom_guide_bar.setContentsMargins(10, 8, 10, 8)
        
        lbl_guide_title = QLabel("기능 단축키 안내")
        lbl_guide_title.setStyleSheet("font-weight: bold; color: #5856D6; margin-right: 10px;")
        lbl_guide_text = QLabel("<b>[1~9, Q,W,E,R,T,Y]</b>: 항목 선택  |  <b>← / →</b>: 이전/다음 이미지  |  <b>Backspace</b>: 이전 단계 이동  |  <b>Ctrl+Z</b>: 라벨 초기화  |  <b>Ctrl+R</b>: 우회전(90°)  |  <b>Shift+R</b>: 좌회전(90°)  |  <b>Space / Enter</b>: 저장 후 다음 이미지")
        lbl_guide_text.setStyleSheet("color: #8E8E93; font-size: 11px;")
        
        bottom_guide_bar.addWidget(lbl_guide_title)
        bottom_guide_bar.addWidget(lbl_guide_text)
        bottom_guide_bar.addStretch()
        root_layout.addWidget(bottom_frame)

        self.update_sidebar_list()
        self.refresh_sub_category_buttons()
        self.update_step_focus_ui()

    def build_shortcut_grid(self, data_list, btn_map, grid_layout, target_slot):
        shortcut_chars = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "Q", "W", "E", "R", "T", "Y"]
        for i, name in enumerate(data_list):
            char_tag = shortcut_chars[i] if i < len(shortcut_chars) else ""
            btn_text = f"[{char_tag}] {name}" if char_tag else name
            btn = QPushButton(btn_text)
            btn.setCheckable(True)
            btn.setFocusPolicy(Qt.FocusPolicy.NoFocus)
            btn.clicked.connect(lambda checked, b_name=name: target_slot(b_name, click_trigger=True))
            btn_map[name] = btn
            grid_layout.addWidget(btn, i // 3, i % 3)

    def update_sidebar_list(self):
        self.file_list_widget.clear()
        done_count = 0
        for f in self.image_list:
            is_done = f in self.labels_data
            if is_done: done_count += 1
            status_tag = "완료" if is_done else "미완료"
            self.file_list_widget.addItem(f"{f}\t\t{status_tag}")
            
        total = len(self.image_list)
        if total > 0:
            pct = (done_count / total) * 100
            self.prog_text.setText(f"{done_count} / {total} ({pct:.1f}%)")
            self.prog_bar.setValue(int(pct))
            self.badge_done.setText(f"✔ 완료 {done_count}")
            self.badge_todo.setText(f"⚪ 미완료 {total - done_count}")

    def update_step_focus_ui(self):
        self.lbl_title_cate.setText("<b>▶ 카테고리 (Category)</b>" if self.current_step == "category" else "카테고리 (Category)")
        self.lbl_title_cate.setStyleSheet("color: #5856D6; font-size: 13px;" if self.current_step == "category" else "color: #8E8E93;")
        self.lbl_title_sub_cate.setText("<b>▶ 서브 카테고리 (Sub Category)</b>" if self.current_step == "sub_category" else "서브 카테고리 (Sub Category)")
        self.lbl_title_sub_cate.setStyleSheet("color: #E67E22; font-size: 13px;" if self.current_step == "sub_category" else "color: #8E8E93;")
        self.lbl_title_color.setText("<b>▶ 색상 (Color)</b>" if self.current_step == "color" else "색상 (Color)")
        self.lbl_title_color.setStyleSheet("color: #B4B43B; font-size: 13px;" if self.current_step == "color" else "color: #8E8E93;")
        self.lbl_title_pattern.setText("<b>▶ 패턴 (Pattern)</b>" if self.current_step == "pattern" else "패턴 (Pattern)")
        self.lbl_title_pattern.setStyleSheet("color: #2D6BB4; font-size: 13px;" if self.current_step == "pattern" else "color: #8E8E93;")

    def refresh_sub_category_buttons(self):
        while self.sub_cate_grid.count():
            child = self.sub_cate_grid.takeAt(0)
            if child.widget(): child.widget().deleteLater()
        self.sub_cate_btn_map.clear()
        sub_list = self.sub_categories_map.get(self.chosen_category, ["UNKNOWN"])
        self.build_shortcut_grid(sub_list, self.sub_cate_btn_map, self.sub_cate_grid, self.set_sub_category_state)

    def load_image(self):
        if not self.image_list: return
        fname = self.image_list[self.current_idx]
        self.filename_label.setText(f"현재 작업 파일: {fname}")
        
        self.reset_all_button_selection()

        if fname in self.labels_data:
            data = self.labels_data[fname]
            self.set_category_state(data[0], click_trigger=False)
            self.set_sub_category_state(data[1], click_trigger=False)
            self.set_color_state(data[2], click_trigger=False)
            self.set_pattern_state(data[3], click_trigger=False)
            self.note_input.setText(data[4] if len(data) > 4 else "")
        else:
            self.clear_label_session()
            self.note_input.clear()

        self.refresh_sub_category_buttons()
        self.sync_summary_display()

        base_dir = os.path.dirname(os.path.abspath(__file__))
        img_path = os.path.join(base_dir, "img", fname)

        if not os.path.exists(img_path):
            self.image_label.setText(f"⚠ 이미지 파일 로드 실패\n(경로에 파일 없음: {fname})")
            return
            
        image = QImage(img_path)
        if image.isNull():
            self.image_label.setText("⚠ 이미지 로드 실패 (다음 이미지 이동 가능)")
            return
            
        pixmap = QPixmap.fromImage(image)
        if self.rotation != 0:
            pixmap = pixmap.transformed(QTransform().rotate(self.rotation), Qt.TransformationMode.SmoothTransformation)
            
        scaled = pixmap.scaled(self.image_label.size() - QSize(10,10), Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation)
        self.image_label.setPixmap(scaled)
        self.file_list_widget.setCurrentRow(self.current_idx)

    def reset_all_button_selection(self):
        for btn in self.cate_btn_map.values(): btn.setChecked(False)
        for btn in self.color_btn_map.values(): btn.setChecked(False)
        for btn in self.pattern_btn_map.values(): btn.setChecked(False)

    def clear_label_session(self):
        self.chosen_category = None
        self.chosen_sub_category = None
        self.chosen_color = None
        self.chosen_pattern = None
        self.current_step = "category"
        self.update_step_focus_ui()

    def set_category_state(self, name, click_trigger=False):
        self.chosen_category = name
        self.chosen_sub_category = None 
        for k, btn in self.cate_btn_map.items(): btn.setChecked(k == name)
        self.refresh_sub_category_buttons()
        if click_trigger:
            self.current_step = "sub_category" 
            self.update_step_focus_ui()
        self.sync_summary_display()

    def set_sub_category_state(self, name, click_trigger=False):
        self.chosen_sub_category = name
        for k, btn in self.sub_cate_btn_map.items(): btn.setChecked(k == name)
        if click_trigger:
            self.current_step = "color"
            self.update_step_focus_ui()
        self.sync_summary_display()

    def set_color_state(self, name, click_trigger=False):
        self.chosen_color = name
        for k, btn in self.color_btn_map.items(): btn.setChecked(k == name)
        if click_trigger:
            self.current_step = "pattern"
            self.update_step_focus_ui()
        self.sync_summary_display()

    def set_pattern_state(self, name, click_trigger=False):
        self.chosen_pattern = name
        for k, btn in self.pattern_btn_map.items(): btn.setChecked(k == name)
        self.sync_summary_display()

    def sync_summary_display(self):
        self.lbl_sum_cate.setText(self.chosen_category if self.chosen_category else "미선택")
        self.lbl_sum_sub_cate.setText(self.chosen_sub_category if self.chosen_sub_category else "미선택")
        self.lbl_sum_color.setText(self.chosen_color if self.chosen_color else "미선택")
        self.lbl_sum_pattern.setText(self.chosen_pattern if self.chosen_pattern else "미선택")

    def move_image(self, direction):
        self.current_idx = (self.current_idx + direction) % len(self.image_list)
        self.rotation = 0
        self.load_image()

    def next_image(self): self.move_image(1)
    def prev_image(self): self.move_image(-1)

    def on_list_item_clicked(self):
        self.current_idx = self.file_list_widget.currentRow()
        self.rotation = 0
        self.load_image()

   
    def keyPressEvent(self, event: QKeyEvent):
        key = event.key()
        mods = event.modifiers()

        if not self.hasFocus():
            self.setFocus()

        if self.note_input.hasFocus():
            if key == Qt.Key.Key_Escape:
                self.setFocus()
                event.accept()
            else:
                super().keyPressEvent(event)
            return

        
        if key == Qt.Key.Key_R and mods == Qt.KeyboardModifier.ShiftModifier:
            self.rotation = (self.rotation - 90) % 360
            self.load_image()
            event.accept()
            return

        
        elif key == Qt.Key.Key_R and mods == Qt.KeyboardModifier.ControlModifier:
            self.rotation = (self.rotation + 90) % 360
            self.load_image()
            event.accept()
            return

        
        elif key == Qt.Key.Key_Z and mods == Qt.KeyboardModifier.ControlModifier:
            self.reset_all_button_selection()
            self.clear_label_session()
            self.refresh_sub_category_buttons()
            self.sync_summary_display()
            event.accept()
            return

       
        elif key == Qt.Key.Key_Backspace:
            if self.current_step == "sub_category": self.current_step = "category"
            elif self.current_step == "color": self.current_step = "sub_category"
            elif self.current_step == "pattern": self.current_step = "color"
            self.update_step_focus_ui()
            event.accept()
            return

        
        elif key in [Qt.Key.Key_Space, Qt.Key.Key_Return]:
            self.validate_and_save_data()
            event.accept()
            return

        
        elif key == Qt.Key.Key_Left:
            self.prev_image()
            event.accept()
            return
        elif key == Qt.Key.Key_Right:
            self.next_image()
            event.accept()
            return

        
        if key in self.shortcut_keys and mods == Qt.KeyboardModifier.NoModifier:
            idx = self.shortcut_keys.index(key)
            valid_shortcut = False
            if self.current_step == "category" and idx < len(self.categories_list): valid_shortcut = True
            elif self.current_step == "sub_category":
                sub_list = self.sub_categories_map.get(self.chosen_category, ["UNKNOWN"])
                if idx < len(sub_list): valid_shortcut = True
            elif self.current_step == "color" and idx < len(self.colors_list): valid_shortcut = True
            elif self.current_step == "pattern" and idx < len(self.patterns_list): valid_shortcut = True
            
            if valid_shortcut:
                self.handle_matrix_shortcut(idx)
                event.accept()
                return

        super().keyPressEvent(event)

    def handle_matrix_shortcut(self, index):
        if self.current_step == "category":
            self.set_category_state(self.categories_list[index], click_trigger=True)
        elif self.current_step == "sub_category":
            sub_list = self.sub_categories_map.get(self.chosen_category, ["UNKNOWN"])
            self.set_sub_category_state(sub_list[index], click_trigger=True)
        elif self.current_step == "color":
            self.set_color_state(self.colors_list[index], click_trigger=True)
        elif self.current_step == "pattern":
            self.set_pattern_state(self.patterns_list[index], click_trigger=True)

    def validate_and_save_data(self):
        missing = []
        if not self.chosen_category: missing.append("카테고리")
        if not self.chosen_sub_category: missing.append("서브 카테고리")
        if not self.chosen_color: missing.append("색상")
        if not self.chosen_pattern: missing.append("패턴")

        if missing:
            QMessageBox.warning(self, "저장 불가", f"⚠ {', '.join(missing)} 항목을 선택해주세요.")
            return

        fname = self.image_list[self.current_idx]
        note_txt = self.note_input.text().strip()
        
        self.labels_data[fname] = [
            self.chosen_category, 
            self.chosen_sub_category, 
            self.chosen_color, 
            self.chosen_pattern, 
            note_txt
        ]
        
        self.save_to_csv()
        self.update_sidebar_list()
        self.next_image()

    def resizeEvent(self, event):
        super().resizeEvent(event)
        self.load_image()

    def closeEvent(self, event):
        self.save_to_csv()
        event.accept()

def get_image_list(path="img"):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    target_path = os.path.join(base_dir, path)
    
    if not os.path.exists(target_path):
        os.makedirs(target_path)
        return []
        
    files = os.listdir(target_path)
    supported_extensions = ('.jpg', '.jpeg', '.png', '.webp')
    
    valid_files = [f for f in files if f.lower().endswith(supported_extensions)]
    return sorted(valid_files)

if __name__ == "__main__":
    QApplication.setHighDpiScaleFactorRoundingPolicy(Qt.HighDpiScaleFactorRoundingPolicy.PassThrough)
    images = get_image_list()
    app = QApplication(sys.argv)
    
    print("1. 앱 시작 전") 
    window = WareLensApp(images)
    print("2. 창 객체 생성 완료")
    window.show()
    print("3. 창 띄우기 호출 완료")
    
    sys.exit(app.exec())


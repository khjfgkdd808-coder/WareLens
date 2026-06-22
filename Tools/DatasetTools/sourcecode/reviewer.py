"""
WareLens Dataset Reviewer
의류 데이터셋 이미지 검수 프로그램

단축키:
  A          : KEEP (저장 후 다음 이미지)
  D          : DELETE (저장 후 다음 이미지)
  Backspace  : 이전 이미지로 이동 (판정 수정 가능)
  ESC        : 종료
"""

import csv
import os
import sys
import tkinter as tk
from tkinter import messagebox

from PIL import Image, ImageTk

# ---------------------------------------------------------------------------
# 경로 설정
# ---------------------------------------------------------------------------


def get_base_dir() -> str:
    """exe로 패키징된 경우와 스크립트로 실행되는 경우 모두 처리.

    PyInstaller로 빌드된 exe는 sys.executable 기준 경로를 써야
    images 폴더, review.csv를 exe와 같은 위치에서 찾을 수 있다.
    """
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


BASE_DIR = get_base_dir()
IMAGES_DIR = os.path.join(BASE_DIR, "images")
CSV_PATH = os.path.join(BASE_DIR, "review.csv")

VALID_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif")

STATUS_KEEP = "KEEP"
STATUS_DELETE = "DELETE"
STATUS_UNREVIEWED = "미검수"


# ---------------------------------------------------------------------------
# 메인 애플리케이션
# ---------------------------------------------------------------------------


class ReviewerApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("WareLens Dataset Reviewer")
        self.root.geometry("1000x750")
        self.root.minsize(600, 500)
        self.root.configure(bg="#1e1e1e")

        # 데이터 -----------------------------------------------------------
        self.image_files: list[str] = []
        self.statuses: dict[str, str] = {}  # filename -> KEEP/DELETE
        self.current_index: int = 0
        self.current_photo = None  # PhotoImage 참조 유지(가비지컬렉션 방지)

        self._load_images()
        self._load_existing_csv()
        self._build_ui()
        self._bind_keys()

        if not self.image_files:
            messagebox.showwarning(
                "이미지 없음",
                f"images 폴더에서 이미지를 찾을 수 없습니다.\n\n경로: {IMAGES_DIR}",
            )
        else:
            # 이어서 작업: 마지막으로 검수되지 않은 첫 이미지부터 시작
            self.current_index = self._find_resume_index()
            self._render_current()

        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    # ------------------------------------------------------------------
    # 데이터 로드
    # ------------------------------------------------------------------

    def _load_images(self):
        if not os.path.isdir(IMAGES_DIR):
            self.image_files = []
            return
        files = [
            f
            for f in os.listdir(IMAGES_DIR)
            if f.lower().endswith(VALID_EXTENSIONS)
        ]
        files.sort()
        self.image_files = files

    def _load_existing_csv(self):
        """기존 review.csv가 있으면 판정 결과를 복원한다."""
        if not os.path.isfile(CSV_PATH):
            return
        try:
            with open(CSV_PATH, "r", encoding="utf-8-sig", newline="") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    name = row.get("image_name")
                    status = row.get("status")
                    if name and status in (STATUS_KEEP, STATUS_DELETE):
                        self.statuses[name] = status
        except Exception as e:
            messagebox.showerror(
                "CSV 읽기 오류",
                f"review.csv를 읽는 중 오류가 발생했습니다:\n{e}",
            )

    def _find_resume_index(self) -> int:
        """가장 먼저 미검수 상태인 이미지의 인덱스를 반환.
        전부 검수되었다면 마지막 이미지의 인덱스를 반환한다."""
        for i, fname in enumerate(self.image_files):
            if fname not in self.statuses:
                return i
        return max(0, len(self.image_files) - 1)

    # ------------------------------------------------------------------
    # CSV 저장
    # ------------------------------------------------------------------

    def _save_csv(self):
        """images 폴더의 파일 순서를 기준으로 review.csv 전체를 다시 쓴다."""
        tmp_path = CSV_PATH + ".tmp"
        try:
            with open(tmp_path, "w", encoding="utf-8", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["image_name", "status"])
                for fname in self.image_files:
                    status = self.statuses.get(fname)
                    if status:
                        writer.writerow([fname, status])
            # 원자적 교체: 중간에 강제 종료되어도 기존 파일이 깨지지 않도록
            os.replace(tmp_path, CSV_PATH)
        except Exception as e:
            messagebox.showerror(
                "저장 오류", f"review.csv 저장 중 오류가 발생했습니다:\n{e}"
            )

    # ------------------------------------------------------------------
    # UI 구성
    # ------------------------------------------------------------------

    def _build_ui(self):
        FG = "#e8e8e8"
        BG = "#1e1e1e"
        PANEL_BG = "#262626"
        ACCENT = "#4a9eff"

        # 상단 정보 패널
        info_frame = tk.Frame(self.root, bg=PANEL_BG, height=90)
        info_frame.pack(side=tk.TOP, fill=tk.X)

        self.filename_label = tk.Label(
            info_frame,
            text="-",
            font=("Segoe UI", 16, "bold"),
            fg=FG,
            bg=PANEL_BG,
            anchor="w",
        )
        self.filename_label.pack(side=tk.LEFT, padx=20, pady=10)

        right_info = tk.Frame(info_frame, bg=PANEL_BG)
        right_info.pack(side=tk.RIGHT, padx=20, pady=10)

        self.progress_label = tk.Label(
            right_info,
            text="0 / 0",
            font=("Segoe UI", 14),
            fg=FG,
            bg=PANEL_BG,
            anchor="e",
        )
        self.progress_label.pack(anchor="e")

        self.status_label = tk.Label(
            right_info,
            text=f"현재 상태 : {STATUS_UNREVIEWED}",
            font=("Segoe UI", 14, "bold"),
            fg=ACCENT,
            bg=PANEL_BG,
            anchor="e",
        )
        self.status_label.pack(anchor="e")

        # 이미지 표시 영역
        self.canvas = tk.Canvas(self.root, bg=BG, highlightthickness=0)
        self.canvas.pack(side=tk.TOP, fill=tk.BOTH, expand=True)
        self.canvas.bind("<Configure>", lambda e: self._render_current())

        # 하단 단축키 안내 패널
        help_frame = tk.Frame(self.root, bg=PANEL_BG, height=50)
        help_frame.pack(side=tk.BOTTOM, fill=tk.X)

        help_text = (
            "[A] KEEP      [D] DELETE      [Backspace] 이전 이미지      [ESC] 종료"
        )
        self.help_label = tk.Label(
            help_frame,
            text=help_text,
            font=("Segoe UI", 12),
            fg="#aaaaaa",
            bg=PANEL_BG,
        )
        self.help_label.pack(pady=12)

    def _bind_keys(self):
        self.root.bind("<KeyPress-a>", lambda e: self._judge(STATUS_KEEP))
        self.root.bind("<KeyPress-A>", lambda e: self._judge(STATUS_KEEP))
        self.root.bind("<KeyPress-d>", lambda e: self._judge(STATUS_DELETE))
        self.root.bind("<KeyPress-D>", lambda e: self._judge(STATUS_DELETE))
        self.root.bind("<BackSpace>", lambda e: self._go_previous())
        self.root.bind("<Escape>", lambda e: self._on_close())

    # ------------------------------------------------------------------
    # 렌더링
    # ------------------------------------------------------------------

    def _render_current(self):
        if not self.image_files:
            return

        fname = self.image_files[self.current_index]
        path = os.path.join(IMAGES_DIR, fname)

        # 정보 라벨 갱신
        self.filename_label.config(text=fname)
        self.progress_label.config(
            text=f"{self.current_index + 1} / {len(self.image_files)}"
        )
        status = self.statuses.get(fname, STATUS_UNREVIEWED)
        self._update_status_label(status)

        # 이미지 로드 및 리사이즈(비율 유지)
        self.canvas.delete("all")
        canvas_w = self.canvas.winfo_width()
        canvas_h = self.canvas.winfo_height()
        if canvas_w <= 1 or canvas_h <= 1:
            # 아직 캔버스 크기가 잡히지 않음 -> 잠시 후 재시도
            self.root.after(50, self._render_current)
            return

        try:
            img = Image.open(path)
            img = img.convert("RGB")
        except Exception as e:
            self.canvas.create_text(
                canvas_w // 2,
                canvas_h // 2,
                text=f"이미지를 불러올 수 없습니다:\n{fname}\n{e}",
                fill="#ff6666",
                font=("Segoe UI", 14),
                justify="center",
            )
            return

        margin = 20
        max_w = max(1, canvas_w - margin * 2)
        max_h = max(1, canvas_h - margin * 2)

        ratio = min(max_w / img.width, max_h / img.height)
        new_w = max(1, int(img.width * ratio))
        new_h = max(1, int(img.height * ratio))
        img = img.resize((new_w, new_h), Image.LANCZOS)

        self.current_photo = ImageTk.PhotoImage(img)
        self.canvas.create_image(
            canvas_w // 2, canvas_h // 2, image=self.current_photo, anchor="center"
        )

    def _update_status_label(self, status: str):
        colors = {
            STATUS_KEEP: "#5cd65c",
            STATUS_DELETE: "#ff5c5c",
            STATUS_UNREVIEWED: "#4a9eff",
        }
        self.status_label.config(
            text=f"현재 상태 : {status}", fg=colors.get(status, "#e8e8e8")
        )

    # ------------------------------------------------------------------
    # 동작 (판정 / 이동)
    # ------------------------------------------------------------------

    def _judge(self, status: str):
        if not self.image_files:
            return
        fname = self.image_files[self.current_index]
        self.statuses[fname] = status
        self._save_csv()

        if self.current_index < len(self.image_files) - 1:
            self.current_index += 1
            self._render_current()
        else:
            # 마지막 이미지: 화면은 갱신해서 최신 판정 상태를 보여줌
            self._render_current()
            messagebox.showinfo("완료", "모든 이미지를 검수했습니다.")

    def _go_previous(self):
        if not self.image_files:
            return
        if self.current_index > 0:
            self.current_index -= 1
            self._render_current()

    def _on_close(self):
        # 판정은 즉시 저장되므로 종료 시 추가 작업 불필요.
        # 혹시 모를 상황에 대비해 한 번 더 저장.
        self._save_csv()
        self.root.destroy()


def main():
    root = tk.Tk()
    app = ReviewerApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()

# WareLens Dataset Reviewer

의류 데이터셋 검수를 위한 이미지 검수 프로그램입니다.

## 폴더 구조

```
review_tool/
├─ reviewer.py        (소스코드)
├─ build_exe.bat       (Windows exe 빌드 스크립트)
├─ review.csv          (검수 결과 - 실행 시 자동 생성/갱신)
└─ images/             (검수할 이미지를 넣는 폴더 - 직접 생성)
    ├─ 0001.jpg
    ├─ 0002.jpg
    └─ ...
```

## 1. Python으로 바로 실행하기 (exe 빌드 전 테스트용)

```bash
pip install pillow
python reviewer.py
```

`images` 폴더를 `reviewer.py`와 같은 위치에 만들고 그 안에 이미지를 넣은 뒤 실행하세요.

## 2. Windows용 exe 빌드하기

Windows PC에서:

1. Python 3.9 이상 설치 (https://www.python.org/downloads/ , 설치 시 "Add to PATH" 체크)
2. `reviewer.py`와 `build_exe.bat`을 같은 폴더에 둠
3. `build_exe.bat`을 더블클릭 (또는 cmd에서 실행)
4. 빌드가 끝나면 같은 폴더에 `reviewer.exe`가 생성됩니다

빌드 스크립트는 내부적으로 다음 명령을 사용합니다 (직접 실행해도 동일합니다):

```
pip install pyinstaller pillow
pyinstaller --noconfirm --onefile --windowed --name reviewer reviewer.py
```

빌드 후 `dist` 폴더 안에도 `reviewer.exe`가 생성되며, 스크립트가 이를 현재 폴더로 복사해줍니다.

> exe는 더블클릭으로 단독 실행되며, **exe가 위치한 폴더를 기준으로** `images` 폴더와 `review.csv`를 찾습니다.
> 따라서 최종 배포 시에는 반드시 아래 구조를 지켜주세요:
>
> ```
> review_tool/
> ├─ reviewer.exe
> ├─ review.csv
> └─ images/
> ```

## 3. 사용 방법

| 키 | 동작 |
|---|---|
| `A` | KEEP으로 판정 → 저장 → 다음 이미지 |
| `D` | DELETE로 판정 → 저장 → 다음 이미지 |
| `Backspace` | 이전 이미지로 이동 (판정 다시 수정 가능) |
| `ESC` | 프로그램 종료 |

- 판정은 **즉시** `review.csv`에 저장됩니다 (임시 파일에 쓴 뒤 교체하는 방식이라 중간에 강제 종료해도 파일이 깨지지 않습니다).
- 프로그램을 다시 실행하면 기존 `review.csv`를 읽어 이미 검수한 이미지는 복원하고, **검수되지 않은 첫 이미지부터** 자동으로 이어서 시작합니다.

## 4. review.csv 형식

```csv
image_name,status
0001.jpg,KEEP
0002.jpg,DELETE
0003.jpg,KEEP
```

## 5. 지원 이미지 형식

`.jpg`, `.jpeg`, `.png`, `.webp`, `.bmp`, `.gif`

## 참고

- 창 크기를 조절하면 이미지가 비율을 유지하며 자동으로 다시 리사이즈됩니다.
- 마우스 없이 키보드(A/D/Backspace/ESC)만으로 전체 검수가 가능합니다.

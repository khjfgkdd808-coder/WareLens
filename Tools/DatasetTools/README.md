# WareLens DatasetTools

WareLens 데이터셋 구축 및 검수에 사용되는 유틸리티 모음입니다.

---

# 폴더 구조

```text
DatasetTools/
├─ README.md
├─ 이미지 검수 기준.txt
│
├─ executable/
│   └─ reviewer.exe
│
└─ sourcecode/
    ├─ reviewer.py
    ├─ build_exe.bat
    ├─ extract_images.py
    ├─ merge_reviews.py
    ├─ create_final_dataset.py
    └─ create_metadata.py
```

---

# 도구 설명

## reviewer.py

이미지 검수 프로그램

기능

* 이미지 표시
* KEEP / DELETE 판정
* review.csv 자동 저장
* 이전 이미지 이동 및 재판정
* 중단 후 이어서 검수 가능

사용 키

| 키         | 동작     |
| --------- | ------ |
| A         | KEEP   |
| D         | DELETE |
| Backspace | 이전 이미지 |
| ESC       | 종료     |

---

## build_exe.bat

reviewer.py를 Windows 실행 파일(exe)로 빌드합니다.

실행:

```bash
build_exe.bat
```

생성:

```text
reviewer.exe
```

---

## extract_images.py

원본 Fashion Product Images Dataset에서 WareLens용 이미지를 추출합니다.

기능

* articleType 기준 필터링
* 카테고리별 랜덤 샘플링
* 검수용 이미지셋 생성

출력:

```text
warelens_raw/
```

---

## merge_reviews.py

검수 결과를 병합합니다.

입력:

```text
reviewer1.csv
reviewer2.csv
reviewer3.csv
reviewer4.csv
```

출력:

```text
review_merged.csv
review_keep.csv
```

---

## create_final_dataset.py

최종 데이터셋을 생성합니다.

입력:

```text
review_keep.csv
styles.csv
images/
styles/
```

기능

* KEEP 이미지 복사
* KEEP json 복사
* 최종 데이터셋 구성

출력:

```text
final_dataset/
├─ images/
└─ styles/
```

---

## create_metadata.py

최종 metadata.csv 생성

기능

* articleType → WareLens sub_category 변환
* 색상 매핑
* metadata.csv 생성

출력:

```text
metadata.csv
```

---

# 데이터셋 구축 절차

## 1. 원본 데이터 추출

```text
extract_images.py
```

출력:

```text
warelens_raw/
```

---

## 2. 이미지 검수

```text
reviewer.py
또는
reviewer.exe
```

출력:

```text
review.csv
```

---

## 3. 검수 결과 병합

```text
merge_reviews.py
```

출력:

```text
review_keep.csv
```

---

## 4. 최종 데이터셋 생성

```text
create_final_dataset.py
```

출력:

```text
final_dataset/
```

---

## 5. 메타데이터 생성

```text
create_metadata.py
```

출력:

```text
metadata.csv
```

---

# 관련 문서

* dataset_review_guide.txt
* Docs/Misc/dataset_report.md

---

# Project

WareLens

Fashion Recommendation Service using CLIP + MediaPipe

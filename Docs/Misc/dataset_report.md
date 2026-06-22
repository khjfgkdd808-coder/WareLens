# WareLens Dataset Construction Report

## Overview

본 데이터셋은 WareLens 의류 추천 시스템의 CLIP 기반 유사 의류 검색 기능 검증을 위해 구축하였다.

데이터 출처는 Kaggle Fashion Product Images Dataset이며, 상의 카테고리만 선별하여 데이터셋을 구성하였다.

---

## Dataset Source

* Dataset: Kaggle Fashion Product Images Dataset
* Original Images: 약 44,000장
* Original Metadata: styles.csv
* Original JSON Metadata: 약 44,000개

---

## Dataset Construction Process

### 1. Raw Data Analysis

원본 데이터셋의 articleType 분석 결과 상의 관련 카테고리를 선별하였다.

선별 대상:

* Tshirts
* Shirts
* Sweatshirts
* Sweaters

---

### 2. Initial Sampling

카테고리별 데이터를 추출하였다.

| Category    | Extracted |
| ----------- | --------- |
| Tshirts     | 500       |
| Shirts      | 500       |
| Sweatshirts | 285       |
| Sweaters    | 277       |

총 추출 이미지 수:

1562장

---

### 3. Manual Review

검수 프로그램을 제작하여 팀원들이 직접 이미지를 검수하였다.

검수 기준:

유지(KEEP)

* 단일 의류가 명확하게 보이는 경우
* 의류 형태를 식별할 수 있는 경우
* 추천 서비스에 활용 가능한 경우

삭제(DELETE)

* 여러 의류가 동시에 등장
* 의류 식별이 어려움
* 접혀 있거나 형태가 확인되지 않음
* 아우터, 후드집업, 조끼 등 대상 외 카테고리
* 배경 노이즈가 과도함

---

### 4. Final Dataset Generation

검수 결과를 기반으로 최종 데이터셋을 생성하였다.

최종 이미지 수:

1034장

생존율:

약 66%

---

## Final Category Distribution

| Category   | Count |
| ---------- | ----- |
| TSHIRT     | 412   |
| SHIRT      | 370   |
| KNIT       | 154   |
| SWEATSHIRT | 98    |

총 이미지 수:

1034장

---

## Final Color Distribution

상위 색상 분포

| Color  | Count |
| ------ | ----- |
| BLUE   | 208   |
| BLACK  | 144   |
| WHITE  | 142   |
| GRAY   | 116   |
| RED    | 85    |
| GREEN  | 85    |
| PURPLE | 74    |
| NAVY   | 58    |
| YELLOW | 36    |
| PINK   | 33    |

---

## Metadata Schema

최종 메타데이터는 다음 구조를 사용한다.

| Field        | Description |
| ------------ | ----------- |
| image_name   | 이미지 파일명     |
| category     | 상위 카테고리     |
| sub_category | 의류 종류       |
| color        | 대표 색상       |
| pattern      | 패턴 정보       |

예시:

image_name: 12345.jpg

category: TOP

sub_category: TSHIRT

color: BLACK

pattern: OTHER

---

## Future Work

1. CLIP 임베딩 생성
2. 벡터 데이터베이스 구축
3. 유사 의류 검색 기능 구현
4. Top-N 추천 성능 검증
5. WareLens 추천 시스템 연동

---

## Dataset Version

Version: v1.0

Created: 2026-06-21

Project: WareLens

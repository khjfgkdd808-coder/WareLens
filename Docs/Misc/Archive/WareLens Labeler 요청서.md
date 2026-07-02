# WareLens Labeler 요청서

## 1. 프로그램 요구사항

* exe 파일 형태로 배포하며 별도의 추가 설치 없이 실행 가능해야 한다.
* 기본 창 크기는 1600 × 900으로 한다.
* 전체화면(최대화)을 지원해야 한다.
* 화면 구성은 제공된 UI 시안을 따른다.
* 이미지 회전은 화면에만 적용하며 원본 이미지는 수정하지 않는다.

---

## 2. 이미지 및 데이터 구조

프로그램 실행 경로 기준으로 아래 구조를 사용한다.

img/
├─ 0001.jpg
├─ 0002.jpg
├─ 0003.jpg
...

labels.csv

### 이미지 파일 규칙

* 기본 지원 확장자는 아래와 같다.

jpg
jpeg
png
webp

* 추가 확장자 지원이 필요한 경우 설정 수정 후 재배포 가능하도록 한다.
* 지원 확장자 외의 파일은 무시한다.
* 파일명 형식은 제한하지 않는다.
* 이미지 파일은 파일명 기준 오름차순으로 정렬하여 표시한다.

예시

img/

0001.jpg
0002.jpg
new.png
memo.txt
desktop.ini

↓

프로그램 표시 목록

0001.jpg
0002.jpg
new.png

### CSV 처리 규칙

* labels.csv에는 작업이 완료된 이미지 데이터만 저장한다.
* labels.csv에 존재하지 않는 이미지는 모두 미완료 상태로 간주한다.
* img 폴더에 새 이미지를 추가한 경우 자동으로 미완료 목록에 포함한다.
* labels.csv에 존재하지만 실제 이미지 파일이 없는 경우 경고 메시지를 표시하되 프로그램은 계속 동작해야 한다.

예시

labels.csv

0001.jpg,top,tshirt,black,solid,
0002.jpg,bottom,jeans,blue,solid,

img/

0001.jpg
0002.jpg
0003.jpg
new.png

↓

0001.jpg : 완료
0002.jpg : 완료
0003.jpg : 미완료
new.png : 미완료


---

## 3. 라벨링 규칙

* 라벨 목록은 최종 라벨링 가이드를 따른다.
* 모든 필수 항목(category, sub_category, color, pattern)을 선택해야 저장 가능하다.
* note는 선택 입력 항목으로 사용한다.
* 필수 항목이 누락된 경우 저장을 막고 안내 메시지를 표시한다.

예시

카테고리 : 선택
색상 : 선택
패턴 : 미선택

→ "패턴을 선택해주세요."

---

## 4. 단축키

### 항목 선택

* 현재 단계에 표시된 단축키를 통해 항목을 선택한다.
* 기본 단축키는 아래와 같다.

1 ~ 9
Q, W, E, R, T, Y

예시

색상 선택 단계

1 BLACK
2 WHITE
3 GRAY
4 NAVY
5 BLUE
6 BEIGE
7 BROWN
8 GREEN
9 RED

Q PINK
W YELLOW
E PURPLE
R ORANGE
T MULTI
Y OTHER

### 기능 단축키

Backspace

* 이전 단계로 이동

Ctrl + Z

* 현재 이미지 라벨 초기화

← / →

* 이전 이미지 / 다음 이미지 이동

R

* 우측 90도 회전

Shift + R

* 좌측 90도 회전

Enter 또는 Space

* 현재 이미지 저장
* 다음 이미지로 이동

---

## 5. 저장 방식

* 라벨링 데이터는 labels.csv 파일로 저장한다.
* Enter 또는 Space 입력 시 labels.csv를 즉시 갱신하여 저장한다.
* 프로그램 종료 시 현재 labels.csv를 한 번 더 저장 후 종료한다.
* labels.csv를 정본 데이터(Single Source of Truth)로 사용한다.

---

## 6. CSV 형식

CSV 헤더는 아래 형식을 사용한다.

file_name,category,sub_category,color,pattern,note

예시

0001.jpg,top,tshirt,black,solid,
0002.jpg,top,tshirt,black,solid,"추후 색상 논의"
0003.jpg,bottom,jeans,blue,solid,

### note 규칙

* 선택 입력 항목이다.
* 입력하지 않을 경우 빈 값으로 저장한다.
* 판단이 어려운 이미지, 검수 필요 항목, 특이사항 등을 기록하는 용도로 사용한다.

예시

0004.jpg,top,tshirt,black,solid,"상의/아우터 구분 애매"
0005.jpg,unknown,unknown,unknown,unknown,"이미지 해상도 낮음"
0006.jpg,dress,onepiece,beige,solid,"검수 필요"

---

## 7. 실행 순서

1. 프로그램 실행
2. img 폴더 내 이미지 파일 로드
3. labels.csv를 읽어 완료/미완료 여부 표시
4. 최초 실행 시 첫 번째 이미지 표시
5. 재실행 시 첫 번째 미완료 이미지 표시
6. 사용자가 라벨링 수행
7. Enter 또는 Space 입력 시 labels.csv 즉시 저장
8. 다음 이미지 표시
9. 프로그램 종료 시 현재 데이터 저장 후 종료

---

## 8. 추가 기능

* 현재 진행률(전체 이미지 수 / 완료 이미지 수 / 진행률 %)을 표시한다.
* 현재 작업 중인 이미지 파일명을 표시한다.
* 현재 선택된 라벨 정보를 표시한다.
* 완료 이미지와 미완료 이미지를 구분하여 표시한다.
* 현재 단계에서 선택 가능한 라벨 목록과 단축키를 화면에 표시한다.
* 이미지 로드 실패 시 오류 메시지를 표시하고 다음 이미지로 이동할 수 있어야 한다.

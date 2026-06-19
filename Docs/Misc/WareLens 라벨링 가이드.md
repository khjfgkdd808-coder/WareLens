# WareLens 의류 데이터 라벨링 가이드 (MVP)

## 목적

* CLIP 기반 의류 추천 시스템의 메타데이터 통일
* 팀원 간 라벨링 기준 일치
* 공모전 MVP 수준에 맞춘 단순하고 일관된 분류 체계 사용

---

# 1. 파일 관리 규칙

## 파일명 규칙

모든 이미지는 아래 형식을 따른다.

0001.jpg
0002.jpg
0003.jpg

확장자는 jpg, png, webp 모두 가능하다.

예시

0001.jpg
0002.png
0003.webp

※ 파일명에 의류 정보나 색상 정보를 넣지 않는다.

---

# 2. CSV 관리 규칙

## CSV 컬럼

image,category,sub_category,color,pattern,note

예시

0001.jpg,TOP,HOODIE,BLACK,SOLID,
0002.jpg,TOP,TSHIRT,WHITE,GRAPHIC,
0003.jpg,TOP,OTHER,BEIGE,GRAPHIC,"니트인지 판단 필요"

---

# 3. Note 사용 규칙

## 기본 원칙

* note는 기본적으로 비워둔다.
* 분류가 애매한 경우에만 작성한다.
* 팀원 검토가 필요한 경우에만 작성한다.

예시

"니트인지 폴로인지 판단 필요"

"카키인지 브라운인지 애매"

"후드집업이라 일단 OTHER 처리"

"체크인지 그래픽인지 확인 필요"

---

## 검토 방식

라벨링 완료 후 note가 작성된 데이터만 모아서 팀 회의를 통해 최종 분류를 결정한다.

---

# 4. Category (대분류)

TOP
BOTTOM
OUTER
DRESS

※ 현재 프로젝트의 주요 대상은 TOP

---

# 수정 사항 (v1.1)

## 5. TOP Sub Category (소분류)

```text
TSHIRT
SHIRT
HOODIE
SWEATSHIRT
KNIT
OTHER
```

---

## TOP 분류 우선순위

분류가 겹치는 경우 아래 우선순위를 따른다.

```text
1. 후드가 있으면 → HOODIE

2. 앞면 전체가 단추 여밈이면 → SHIRT

3. 니트 재질이면 → KNIT

4. 맨투맨 형태이면 → SWEATSHIRT

5. 나머지는 → TSHIRT

6. 판단이 어려우면 → OTHER + note 작성
```

---

## TSHIRT

* 일반 반팔 티셔츠
* 일반 긴팔 티셔츠
* 카라 티셔츠(폴로 포함)
* 기본 티셔츠

예)

무지 반팔

그래픽 반팔

긴팔 티셔츠

카라 티셔츠

---

## SHIRT

* 앞면 전체가 단추로 여며지는 셔츠
* 남방
* 옥스포드 셔츠
* 데님 셔츠

예)

체크 셔츠

화이트 셔츠

데님 셔츠

---

## HOODIE

* 후드가 달린 상의

예)

후드티

그래픽 후드

오버핏 후드

후드 니트

후드 맨투맨

※ 후드가 있으면 재질과 관계없이 HOODIE

---

## SWEATSHIRT

* 맨투맨
* 크루넥 스웨트셔츠

예)

무지 맨투맨

그래픽 맨투맨

---

## KNIT

* 니트
* 스웨터

예)

라운드 니트

브이넥 니트

케이블 니트

※ 후드가 없는 경우에만 KNIT

---

## OTHER

* 위 분류에 명확하게 해당하지 않는 경우
* 팀원 간 의견이 갈리는 경우

예)

조끼(베스트)

특수 디자인 의류

분류 기준이 애매한 상의

후드집업

기타 검토 필요 의류

---

### 처리 기준

민소매(나시)

→ TSHIRT 또는 OTHER

(팀 내 기준에 따라 결정)

카라 티셔츠

→ TSHIRT

폴로 셔츠

→ TSHIRT


---

# 6. Pattern (패턴)

SOLID
STRIPE
CHECK
GRAPHIC

---

## SOLID

무지

예)

무지 후드
무지 티셔츠
무지 니트

---

## STRIPE

줄무늬

예)

가로 줄무늬
세로 줄무늬

---

## CHECK

체크무늬
격자무늬

예)

체크 셔츠
플란넬 셔츠

---

## GRAPHIC

다음 항목을 모두 포함한다.

* 브랜드 로고
* 브랜드명
* 캐릭터
* 그림
* 일러스트
* 레터링
* 꽃무늬
* 프린트
* 기타 패턴

예)

Nike 로고
Adidas 로고
캐릭터 티셔츠
영문 레터링
꽃무늬 셔츠

※ SOLID / STRIPE / CHECK가 아니면 기본적으로 GRAPHIC 사용

---

# 7. Color (색상)

BLACK
WHITE
GRAY
NAVY
BLUE
BEIGE
BROWN
GREEN
RED
PINK
YELLOW
PURPLE
ORANGE
MULTI
OTHER

---

## 기본 규칙

### 1. 가장 넓은 면적의 색상을 선택한다.

예)

검정 후드 + 흰색 로고
→ BLACK

흰색 티셔츠 + 검정 그래픽
→ WHITE

---

### 2. 두 개 이상의 색상이 비슷한 비율이면 MULTI 사용

예)

검정 + 흰색 반반

컬러블록 디자인

→ MULTI

---

### 3. 분류가 어렵거나 특수 색상은 OTHER 사용

예)

형광색
네온그린
네온핑크
무지개색

→ OTHER

---

# 8. 색상 매핑 규칙

## BLACK

차콜
먹색
진회색

→ BLACK

---

## WHITE

오프화이트

→ WHITE

---

## GRAY

라이트그레이
멜란지그레이
애쉬그레이
실버그레이

→ GRAY

---

## NAVY

다크네이비
미드나잇블루

→ NAVY

---

## BLUE

하늘색
스카이블루
코발트블루
데님블루
인디고블루

→ BLUE

---

## BEIGE

아이보리
크림
오트밀
에크루
샌드

→ BEIGE

---

## BROWN

카멜
모카
초콜릿

→ BROWN

---

## GREEN

카키
올리브
올리브그린
밀리터리그린

→ GREEN

---

## RED

버건디
와인
마룬

→ RED

---

## PINK

베이비핑크
로즈핑크
살구색

→ PINK

---

## YELLOW

머스타드
골드
레몬

→ YELLOW

---

## PURPLE

라벤더
바이올렛

→ PURPLE

---

## ORANGE

코랄
살몬

→ ORANGE

---

# 9. 라벨링 최우선 원칙

1. 정확성보다 일관성을 우선한다.

2. 팀원 모두가 같은 기준으로 분류하는 것이 중요하다.

3. 애매하면 note를 작성하고 임시로 OTHER 분류 가능하다.

4. note가 있는 데이터는 추후 팀 회의를 통해 최종 결정한다.

5. 추후 데이터가 충분히 쌓이면 분류 체계를 확장한다.

현재 MVP에서는 단순하고 일관된 라벨링을 목표로 한다.

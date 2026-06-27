# 🇰🇷 대한민국 KS 표준 의류 규격 데이터셋 매핑 구조 (남성 K 0050 / 여성 K 0051)
KS_SIZE_CHART = {
    "MALE": {
        "S": {"height": (165, 175), "weight": (55, 65)},
        "M": {"height": (170, 180), "weight": (63, 73)},
        "L": {"height": (175, 185), "weight": (70, 82)},
        "XL": {"height": (180, 190), "weight": (80, 95)}
    },
    "FEMALE": {
        "XS": {"height": (155, 165), "weight": (43, 50)},
        "S": {"height": (160, 170), "weight": (48, 55)},
        "M": {"height": (165, 175), "weight": (53, 62)},
        "L": {"height": (170, 180), "weight": (60, 70)},
        "XL": {"height": (175, 185), "weight": (68, 80)}
    }
}

FIT_DESCRIPTIONS = {
    "슬림핏": "몸에 딱 맞는 슬림한 실루엣입니다. 타이트한 스타일을 선호할 때 적합합니다.",
    "레귤러핏": "표준적인 핏입니다. 너무 끼거나 크지 않아 편안하고 대중적인 착용감을 줍니다.",
    "세미오버핏": "어깨와 품이 살짝 여유로운 트렌디한 핏입니다. 자연스러운 실루엣을 연출합니다.",
    "오버핏": "전체적으로 박시하고 여유 공간이 넓은 스트릿 스타일의 핏입니다."
}

class SizeRecommender:
    """KS 표준 규격 및 성별 변수를 바인딩한 다차원 보정 추천 엔진"""
    def __init__(self, height: float, weight: float, ratios: dict, gender: str = "MALE"):
        self.height = height
        self.weight = weight
        self.ratios = ratios
        self.gender = gender if gender in ["MALE", "FEMALE"] else "MALE"
        
        # 성별에 맞는 데이터 차트 자동 바인딩 및 사이즈 배열 순서 동적 생성
        self.chart = KS_SIZE_CHART[self.gender]
        self.size_order = list(self.chart.keys()) # 남성: ["S","M","L","XL"] / 여성: ["XS","S","M","L","XL"]
        
        # BMI 계산
        self.bmi = weight / ((height / 100) ** 2)

    def _get_bmi_grade(self) -> str:
        if self.bmi < 18.5: return "저체중"
        elif self.bmi < 23: return "정상"
        elif self.bmi < 25: return "과체중"
        else: return "비만"

    def _calculate_base_size(self, reasons: list) -> str:
        """1단계: 선택된 성별 KS 표준 자산 기반 유연성 스코어링"""
        scores = dict.fromkeys(self.size_order, 0)
        
        for size, spec in self.chart.items():
            h_min, h_max = spec["height"]
            w_min, w_max = spec["weight"]
            
            # 완전 매칭 시 +2점, 인접 영역(오차범위 3cm/3kg) 진입 시 +1점
            if h_min <= self.height <= h_max: scores[size] += 2
            elif min(abs(self.height - h_min), abs(self.height - h_max)) <= 3: scores[size] += 1
                
            if w_min <= self.weight <= w_max: scores[size] += 2
            elif min(abs(self.weight - w_min), abs(self.weight - w_max)) <= 3: scores[size] += 1

        # 가장 점수가 높은 사이즈 선택 (동점일 경우 큰 사이즈 지향)
        best_size = max(scores, key=lambda k: (scores[k], self.size_order.index(k)))
        reasons.append(f"[{self.gender} 규격 지표] 키({self.height}cm) / 몸무게({self.weight}kg) 기준 기본 {best_size} 사이즈 후보 선정")
        return best_size

    def recommend(self) -> dict:
        """4단계 추천 알고리즘 파이프라인 일괄 실행"""
        reasons = []
        base_size = self._calculate_base_size(reasons)
        current_idx = self.size_order.index(base_size)
        
        # 2단계: BMI 다차원 보정
        bmi_grade = self._get_bmi_grade()
        if bmi_grade in ["과체중", "비만"]:
            current_idx += 1
            reasons.append(f"BMI 지수({self.bmi:.2f}, {bmi_grade}) 반영 -> 상위 사이즈 가중치 적용")
        elif bmi_grade == "저체중":
            current_idx -= 1
            reasons.append(f"BMI 지수({self.bmi:.2f}, {bmi_grade}) 반영 -> 하위 사이즈 가중치 적용")

        # 3단계: 어깨 비율 골격 보정
        shoulder_ratio = self.ratios.get("shoulder_ratio", 0.22)
        if shoulder_ratio >= 0.25:
            current_idx += 1
            reasons.append(f"어깨 골격 비율({shoulder_ratio:.3f}, 평균 이상) 반영 -> 상위 사이즈 보정")
        elif shoulder_ratio <= 0.20:
            current_idx -= 1
            reasons.append(f"어깨 골격 비율({shoulder_ratio:.3f}, 평균 이하) 반영 -> 하위 사이즈 보정")

        # 인덱스 바운더리 탈출 방어 처리
        current_idx = max(0, min(current_idx, len(self.size_order) - 1))
        final_size = self.size_order[current_idx]

        # 4단계: 상하체 및 실루엣 매칭 기반 핏(Fit) 판정
        upper_lower = self.ratios.get("upper_lower_ratio", 0.68)
        hip_shoulder = self.ratios.get("hip_shoulder_ratio", 0.78)

        if upper_lower > 0.75:
            fit_type = "세미오버핏"
        elif hip_shoulder < 0.72:
            fit_type = "오버핏"
        elif bmi_grade == "저체중" or upper_lower < 0.62:
            fit_type = "슬림핏"
        else:
            fit_type = "레귤러핏"
            
        reasons.append(f"신체 실루엣 지표 종합 분석 -> 최종 {fit_type} 스타일 가이드 확정")

        return {
            "bmi": round(self.bmi, 2),
            "bmi_grade": bmi_grade,
            "final_size": final_size,
            "fit_type": fit_type,
            "fit_desc": FIT_DESCRIPTIONS[fit_type],
            "reasons": reasons
        }
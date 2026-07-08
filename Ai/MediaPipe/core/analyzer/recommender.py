<<<<<<< HEAD
# core/recommender.py

# 🇰🇷 대한민국 KS 표준 의류 규격(KS K 0050 남성 / KS K 0051 여성) - 가슴둘레(cm), 키(cm) 기준
KS_SIZE_CHART = {
    "MALE": {
        "90 (S)": {"chest_girth": 90, "height": 165},
        "95 (M)": {"chest_girth": 95, "height": 170},
        "100 (L)": {"chest_girth": 100, "height": 175},
        "105 (XL)": {"chest_girth": 105, "height": 180},
        "110 (XXL)": {"chest_girth": 110, "height": 185}
    },
    "FEMALE": {
        "85 (S)": {"chest_girth": 85, "height": 155},
        "90 (M)": {"chest_girth": 90, "height": 160},
        "95 (L)": {"chest_girth": 95, "height": 165},
        "100 (XL)": {"chest_girth": 100, "height": 170}
    }
}

FIT_DESCRIPTIONS = {
    "슬림핏": "가슴과 허리 라인이 몸에 딱 맞는 실루엣입니다.",
    "레귤러핏": "표준적인 KS 규격에 딱 맞는 편안한 핏입니다.",
    "체형보완핏": "몸통 두께감(부피)을 커버하기 위해 반 사이즈 여유롭게 추천된 핏입니다."
}

class StandardSizeRecommender:
    """3D 측정값(가슴둘레, 깊이)과 KS 규격을 매칭하는 추천 엔진"""
    def __init__(self, height_cm: float, measurements_cm: dict, gender: str = "MALE"):
        self.height = height_cm
        self.measurements = measurements_cm
        self.gender = gender if gender in ["MALE", "FEMALE"] else "MALE"
        self.chart = KS_SIZE_CHART[self.gender]
        
        self.chest_girth = self.measurements.get("chest_girth_cm", 0)
        self.torso_depth = self.measurements.get("torso_depth_cm", 0)

    def recommend(self) -> dict:
        reasons = []
        
        # 1단계: 부피감(몸통 두께)에 따른 핏 타입 먼저 판별
        chest_width = self.measurements.get("chest_width_cm", 1)
        depth_ratio = self.torso_depth / chest_width if chest_width > 0 else 0.58

        if depth_ratio >= 0.68:
            fit_type = "체형보완핏"
            reasons.append(f"몸통의 입체적 부피감(두께 비례 {depth_ratio:.2f})이 감지되어, 실루엣 보완을 위해 여유로운 착용감을 권장합니다.")
        elif depth_ratio <= 0.52:
            fit_type = "슬림핏"
            reasons.append("몸통이 비교적 납작한 체형으로, 슬림하게 연출하는 것이 유리합니다.")
        else:
            fit_type = "레귤러핏"

        # 2단계: [개선] 핏 타입을 반영한 스마트 KS 사이즈 매칭
        best_size = None
        min_diff = float('inf')

        for size_name, specs in self.chart.items():
            chest_diff = abs(self.chest_girth - specs["chest_girth"])
            
            # 오차가 동일하거나 거의 비슷한 경계선(2cm 이내)에 있는 경우
            if abs(chest_diff - min_diff) < 2.0 and best_size is not None:
                # 체형보완핏(배가 나오거나 두꺼운 체형)이면 큰 사이즈 우선 선택
                if fit_type == "체형보완핏" and specs["chest_girth"] > self.chart[best_size]["chest_girth"]:
                    best_size = size_name
                    min_diff = chest_diff
                # 슬림핏이면 작은 사이즈 우선 선택
                elif fit_type == "슬림핏" and specs["chest_girth"] < self.chart[best_size]["chest_girth"]:
                    best_size = size_name
                    min_diff = chest_diff
            elif chest_diff < min_diff:
                min_diff = chest_diff
                best_size = size_name

        reasons.insert(0, f"분석된 3D 가슴둘레({self.chest_girth:.1f}cm)와 체형을 종합할 때, KS 표준 {best_size} 사이즈가 가장 적합합니다.")

        return {
            "measured_chest_girth_cm": self.chest_girth,
            "measured_torso_depth_cm": self.torso_depth,
            "final_size": best_size,
            "fit_type": fit_type,
            "fit_desc": FIT_DESCRIPTIONS[fit_type],
            "reasons": reasons
=======
# core/recommender.py

# 🇰🇷 대한민국 KS 표준 의류 규격(KS K 0050 남성 / KS K 0051 여성) - 가슴둘레(cm), 키(cm) 기준
KS_SIZE_CHART = {
    "MALE": {
        "90 (S)": {"chest_girth": 90, "height": 165},
        "95 (M)": {"chest_girth": 95, "height": 170},
        "100 (L)": {"chest_girth": 100, "height": 175},
        "105 (XL)": {"chest_girth": 105, "height": 180},
        "110 (XXL)": {"chest_girth": 110, "height": 185}
    },
    "FEMALE": {
        "85 (S)": {"chest_girth": 85, "height": 155},
        "90 (M)": {"chest_girth": 90, "height": 160},
        "95 (L)": {"chest_girth": 95, "height": 165},
        "100 (XL)": {"chest_girth": 100, "height": 170}
    }
}

FIT_DESCRIPTIONS = {
    "슬림핏": "가슴과 허리 라인이 몸에 딱 맞는 실루엣입니다.",
    "레귤러핏": "표준적인 KS 규격에 딱 맞는 편안한 핏입니다.",
    "체형보완핏": "몸통 두께감(부피)을 커버하기 위해 반 사이즈 여유롭게 추천된 핏입니다."
}

class StandardSizeRecommender:
    """3D 측정값(가슴둘레, 깊이)과 KS 규격을 매칭하는 추천 엔진"""
    def __init__(self, height_cm: float, measurements_cm: dict, gender: str = "MALE"):
        self.height = height_cm
        self.measurements = measurements_cm
        self.gender = gender if gender in ["MALE", "FEMALE"] else "MALE"
        self.chart = KS_SIZE_CHART[self.gender]
        
        self.chest_girth = self.measurements.get("chest_girth_cm", 0)
        self.torso_depth = self.measurements.get("torso_depth_cm", 0)

    def recommend(self) -> dict:
        reasons = []
        best_size = None
        min_diff = float('inf')

        # 1단계: 3D 가슴둘레 기반 KS 표준 호칭 매칭
        for size_name, specs in self.chart.items():
            chest_diff = abs(self.chest_girth - specs["chest_girth"])
            
            if chest_diff < min_diff:
                min_diff = chest_diff
                best_size = size_name
                
            # 가슴둘레 오차가 동일한 경계선(92.5cm)에 걸린 경우 처리
            elif chest_diff == min_diff and best_size is not None:
                # 현재 최적 크기의 표준 키 오차와 새로운 후보 크기의 표준 키 오차를 비교
                current_height_diff = abs(self.height - self.chart[best_size]["height"])
                new_height_diff = abs(self.height - specs["height"])
                
                # 사용자의 실제 키가 후보 사이즈의 표준 키에 더 가깝다면 사이즈를 변경합니다.
                if new_height_diff < current_height_diff:
                    best_size = size_name

        reasons.append(f"분석된 3D 가슴둘레({self.chest_girth:.1f}cm) 기준, KS 표준 {best_size} 사이즈가 가장 적합합니다.")

        # 2단계: '부피감(몸통 두께)'에 따른 핏 보정
        chest_width = self.measurements.get("chest_width_cm", 1)
        depth_ratio = self.torso_depth / chest_width if chest_width > 0 else 0.5

        if depth_ratio >= 0.7:
            fit_type = "체형보완핏"
            reasons.append(f"몸통의 입체적 부피감(두께 비례 {depth_ratio:.2f})이 감지되어, 실루엣 보완을 위해 여유로운 착용감을 권장합니다.")
        elif depth_ratio <= 0.5:
            fit_type = "슬림핏"
            reasons.append("몸통이 납작한 체형으로, 슬림하게 연출하는 것이 유리합니다.")
        else:
            fit_type = "레귤러핏"

        return {
            "measured_chest_girth_cm": self.chest_girth,
            "measured_torso_depth_cm": self.torso_depth,
            "final_size": best_size,
            "fit_type": fit_type,
            "fit_desc": FIT_DESCRIPTIONS[fit_type],
            "reasons": reasons
>>>>>>> c2a8d2c (feat: 피팅 캐싱 로직 및 테스트용  UI 적용)
        }
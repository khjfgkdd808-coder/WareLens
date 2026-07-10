# core/analyzer/recommender.py
import logging
from typing import Dict, Any, List, Tuple

logger = logging.getLogger("WareLensAI")

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
    """3D 측정값(가슴둘레, 깊이 비율)과 KS 규격을 안전하게 매칭하는 추천 엔진"""
    
    # --- 핵심 기획 임계값 상수화 (유지보수 극대화) ---
    FIT_THRESHOLD_SLIM = 0.52       # 이 비율 이하면 납작한 체형 (슬림핏)
    FIT_THRESHOLD_RELAXED = 0.68    # 이 비율 이상이면 두꺼운 체형 (보완핏)
    BOUNDARY_MARGIN_CM = 2.0        # 두 사이즈 사이에서 경합할 때의 최대 오차 한계

    def __init__(self, height_cm: float, measurements_cm: Dict[str, float], gender: str = "MALE", ratios: Dict[str, float] = None):
        self.height = height_cm
        self.measurements = measurements_cm
        # pipeline.py에서 계산해 준 비율 데이터를 받기 위한 인자 추가
        self.ratios = ratios or {}
        self.gender = gender.upper() if gender.upper() in ["MALE", "FEMALE"] else "MALE"
        self.chart = KS_SIZE_CHART[self.gender]
        
        self.chest_girth = self.measurements.get("chest_girth_cm", 0.0)
        self.torso_depth = self.measurements.get("torso_depth_cm", 0.0)

    def _determine_fit_type(self) -> Tuple[str, str]:
        """두께 비율을 바탕으로 사용자에게 적합한 핏 타입과 설명 문구를 반환합니다."""
        # 파이프라인에서 넘겨준 비율(depth_to_width_ratio) 최우선 사용
        depth_ratio = self.ratios.get("depth_to_width_ratio")
        
        # 만약 ratios가 비어있다면, 안전 장치로 직접 계산 (ZeroDivisionError 방어)
        if not depth_ratio:
            chest_width = self.measurements.get("chest_width_cm", 1.0)
            depth_ratio = self.torso_depth / chest_width if chest_width > 0 else 0.58

        if depth_ratio >= self.FIT_THRESHOLD_RELAXED:
            return "체형보완핏", f"몸통의 입체적 부피감(두께 비례 {depth_ratio:.2f})이 감지되어, 실루엣 보완을 위해 여유로운 착용감을 권장합니다."
        elif depth_ratio <= self.FIT_THRESHOLD_SLIM:
            return "슬림핏", "몸통이 비교적 납작한 체형으로, 슬림하게 연출하는 것이 유리합니다."
        
        return "레귤러핏", "표준적인 KS 규격에 맞춘 편안한 실루엣입니다."

    def recommend(self) -> Dict[str, Any]:
        """최종 KS 규격 사이즈와 핏 분석 결과를 도출합니다."""
        reasons: List[str] = []
        
        # 1. 핏 타입 판별 및 설명 추가
        fit_type, fit_reason = self._determine_fit_type()
        if fit_reason:
            reasons.append(fit_reason)

        # 2. 오차율 명시적 계산 및 정렬 (안전한 경계선 매칭 로직)
        size_differences = []
        for size_name, specs in self.chart.items():
            diff = abs(self.chest_girth - specs["chest_girth"])
            size_differences.append({
                "size_name": size_name,
                "diff": diff,
                "target_girth": specs["chest_girth"]
            })

        # 가슴둘레 오차가 가장 적은 순서대로 정렬
        size_differences.sort(key=lambda x: x["diff"])
        
        best_match = size_differences[0] # 1순위 후보
        runner_up = size_differences[1] if len(size_differences) > 1 else None # 2순위 후보

        final_size_name = best_match["size_name"]

        # 3. 경계선(Tie-breaker) 핏 보정 로직
        # 1순위와 2순위 후보의 오차 차이가 2.0cm(BOUNDARY_MARGIN_CM) 이하로 비슷할 때만 개입
        if runner_up and abs(best_match["diff"] - runner_up["diff"]) <= self.BOUNDARY_MARGIN_CM:
            if fit_type == "체형보완핏":
                # 둘 중 물리적 수치가 더 '큰' 사이즈를 승자로 선정
                final_size_name = (best_match["size_name"] if best_match["target_girth"] > runner_up["target_girth"] 
                                   else runner_up["size_name"])
            elif fit_type == "슬림핏":
                # 둘 중 물리적 수치가 더 '작은' 사이즈를 승자로 선정
                final_size_name = (best_match["size_name"] if best_match["target_girth"] < runner_up["target_girth"] 
                                   else runner_up["size_name"])

        reasons.insert(0, f"분석된 3D 가슴둘레({self.chest_girth:.1f}cm)와 체형을 종합할 때, KS 표준 {final_size_name} 사이즈가 가장 적합합니다.")

        return {
            "measured_chest_girth_cm": self.chest_girth,
            "measured_torso_depth_cm": self.torso_depth,
            "final_size": final_size_name,
            "fit_type": fit_type,
            "fit_desc": FIT_DESCRIPTIONS.get(fit_type, ""),
            "reasons": reasons
        }
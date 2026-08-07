"""Tactical Formations, Playing Styles, and Style Matchup Compatibility Engine."""

from __future__ import annotations

from typing import Dict, Optional


# المفاتيح مقاطع من slug معرف الفريق الفعلي بعد إزالة الشرطات
# (مثال: pl-man-city → plmancity يطابق المفتاح mancity)
TEAM_STYLE_MAP: Dict[str, Dict[str, str]] = {
    "realmadrid": {"formation": "4-3-3", "style": "الهجمات المرتدة والتحول السريع"},
    "mancity": {"formation": "3-2-4-1", "style": "الاستحواذ الكثيف والضغط العالي"},
    "liverpool": {"formation": "4-3-3", "style": "الضغط العالي واللعب المباشر"},
    "barcelona": {"formation": "4-3-3", "style": "الاستحواذ والبناء من الخلف"},
    "arsenal": {"formation": "4-3-3", "style": "الضغط المنظم والسيطرة"},
    "bayern": {"formation": "4-2-3-1", "style": "الهجوم الضاغط والأطراف السريعة"},
    "inter": {"formation": "3-5-2", "style": "التكتل المحكم والمرتدات الخاطفة"},
    "atletico": {"formation": "5-3-2", "style": "الدفاع المنخفض والتكتل المباشر"},
    "athmadrid": {"formation": "5-3-2", "style": "الدفاع المنخفض والتكتل المباشر"},
    # Portuguese Primeira Liga
    "benfica": {"formation": "4-2-3-1", "style": "الضغط العالي والاستحواذ الهجومي"},
    "porto": {"formation": "4-4-2", "style": "القوة البدنية والضغط المتواصل"},
    "splisbon": {"formation": "3-4-3", "style": "الاستحواذ على الأطراف والتحول السريع"},
    "braga": {"formation": "4-3-3", "style": "اللعب الهجومي المباشر"},
    # Dutch Eredivisie
    "ajax": {"formation": "4-3-3", "style": "الاستحواذ الكثيف والبناء من الخلف"},
    "psv": {"formation": "4-3-3", "style": "الضغط الهجومي العالي والأطراف الخاطفة"},
    "feyenoord": {"formation": "4-2-3-1", "style": "الضغط المكثف والتحول السريع"},
    "azalkmaar": {"formation": "4-3-3", "style": "السيطرة التكتيكية والشباب السريع"},
    # Turkish Süper Lig
    "galatasaray": {"formation": "4-2-3-1", "style": "الضغط العالي والسيطرة الهجومية"},
    "fenerbahce": {"formation": "4-3-3", "style": "الهجوم السريع والضغط المتواصل"},
    "besiktas": {"formation": "4-2-3-1", "style": "التوازن الهجومي والصلابة"},
    "trabzonspor": {"formation": "4-3-3", "style": "المرتدات السريعة والتكتل الإقليمي"},
}

# Proxy PPDA: apply λ only when both sides have enough history
MIN_PPDA_SAMPLES = 8
LAMBDA_MULT_LO = 0.97
LAMBDA_MULT_HI = 1.03


def get_team_tactics(
    team_key: str, ppda: Optional[float] = None
) -> Dict[str, str]:
    """Retrieve formation and primary tactical playing style for a team."""
    clean_key = team_key.lower().replace(" ", "").replace("-", "").replace("_", "")
    for k, info in TEAM_STYLE_MAP.items():
        if k in clean_key:
            style = info["style"]
            # Reinforce pressing label from proxy PPDA when map is thin on press wording
            if ppda is not None and ppda <= 9.5 and "ضغط" not in style:
                style = style + " والضغط العالي"
            return {"formation": info["formation"], "style": style}

    style = "أسلوب متوازن بين الاستحواذ والتراجع"
    if ppda is not None and ppda <= 9.5:
        style = "الضغط العالي والتحول السريع"
    elif ppda is not None and ppda >= 13.0:
        style = "التكتل الدفاعي والمرتدات"
    return {"formation": "4-3-3", "style": style}


def evaluate_tactical_matchup(
    home_team: str,
    away_team: str,
    ppda_home: float = 11.0,
    ppda_away: float = 11.0,
    ppda_home_n: int = 0,
    ppda_away_n: int = 0,
) -> Dict[str, float | str | bool]:
    """
    Evaluate tactical synergy / style clash.
    λ multipliers apply only when both teams have enough proxy-PPDA samples;
    otherwise commentary-only with mults = 1.0.
    """
    h_tac = get_team_tactics(home_team, ppda_home)
    a_tac = get_team_tactics(away_team, ppda_away)

    h_form, h_style = h_tac["formation"], h_tac["style"]
    a_form, a_style = a_tac["formation"], a_tac["style"]

    h_mult = 1.0
    a_mult = 1.0
    notes = []

    # 1. Possession vs Counter Attack Clash
    if "الاستحواذ" in h_style and "مرتدات" in a_style:
        h_mult *= 0.96
        a_mult *= 1.05
        notes.append(
            f"{home_team} يستحوذ كثيراً ويترك مساحات قد يستغلها {away_team} بالمرتدات السريعة"
        )
    elif "الاستحواذ" in a_style and "مرتدات" in h_style:
        a_mult *= 0.96
        h_mult *= 1.05
        notes.append(
            f"{away_team} سيمسك بالكرة لكنه يواجه خطورة مرتدات خاطفة من {home_team}"
        )

    # 2. High Pressing vs High Pressing (proxy PPDA ≤ 9)
    if ppda_home <= 9.0 and ppda_away <= 9.0:
        h_mult *= 0.98
        a_mult *= 0.98
        notes.append("معركة ضغط عالي متكافئة قد تصعب بناء اللعب النظيف للطرفين")

    # 3. 3-5-2 vs 4-3-3 Wing Back Overlap
    if h_form == "3-5-2" and a_form == "4-3-3":
        notes.append(
            f"التشكيل {h_form} يمنح تفوقاً في عمق الوسط لكن يُعرض الأطراف لاختراق 4-3-3"
        )
    elif a_form == "3-5-2" and h_form == "4-3-3":
        notes.append(f"تشكيل {a_form} سيزاحم كتل الوسط بينما يستغل الأطراف العريضة")

    commentary = " • ".join(notes) if notes else "صراع تكتيكي متوازن في خط الوسط والأطراف"

    apply_lambda = (
        ppda_home_n >= MIN_PPDA_SAMPLES and ppda_away_n >= MIN_PPDA_SAMPLES
    )
    if apply_lambda:
        h_out = float(min(max(h_mult, LAMBDA_MULT_LO), LAMBDA_MULT_HI))
        a_out = float(min(max(a_mult, LAMBDA_MULT_LO), LAMBDA_MULT_HI))
    else:
        h_out = 1.0
        a_out = 1.0

    return {
        "home_formation": h_form,
        "away_formation": a_form,
        "home_style": h_style,
        "away_style": a_style,
        "home_lambda_mult": h_out,
        "away_lambda_mult": a_out,
        "matchup_commentary": commentary,
        "lambda_applied": apply_lambda,
    }

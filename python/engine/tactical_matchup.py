"""Tactical Formations, Playing Styles, and Style Matchup Compatibility Engine."""

from __future__ import annotations

from typing import Dict, Tuple


# Known tactical styles per common European club profile
TEAM_STYLE_MAP: Dict[str, Dict[str, str]] = {
    "real_madrid": {"formation": "4-3-3", "style": "الهجمات المرتدة والتحول السريع"},
    "man_city": {"formation": "3-2-4-1", "style": "الاستحواذ الكثيف والضغط العالي"},
    "liverpool": {"formation": "4-3-3", "style": "الضغط العالي واللعب المباشر"},
    "barcelona": {"formation": "4-3-3", "style": "الاستحواذ والبناء من الخلف"},
    "arsenal": {"formation": "4-3-3", "style": "الضغط المنظم والسيطرة"},
    "bayern": {"formation": "4-2-3-1", "style": "الهجوم الضاغط والأطراف السريعة"},
    "inter": {"formation": "3-5-2", "style": "التكتل المحكم والمرتدات الخاطفة"},
    "atletico": {"formation": "5-3-2", "style": "الدفاع المنخفض والتكتل المباشر"},
    # Argentine Liga Profesional
    "river_plate": {"formation": "4-1-3-2", "style": "الضغط العالي والاستحواذ الهجومي"},
    "boca_juniors": {"formation": "4-4-2", "style": "الصلابة الدفاعية والهجمات المباشرة"},
    "velez": {"formation": "4-2-3-1", "style": "التكتل الدفاعي والتحول السريع"},
    "talleres": {"formation": "4-3-3", "style": "الضغط العالي والأطراف السريعة"},
    "independiente": {"formation": "4-2-3-1", "style": "الضغط المنظم والاستحواذ المتوسط"},
    # Norwegian Eliteserien
    "bodo": {"formation": "4-3-3", "style": "الضغط العالي الكثيف والاستحواذ الهجومي"},
    "brann": {"formation": "4-3-3", "style": "الهجوم السريع والضغط المتواصل"},
    "molde": {"formation": "3-5-2", "style": "الاستحواذ والمرتدات على الأطراف"},
    "viking": {"formation": "4-3-3", "style": "اللعب المباشر والقوة البدنية"},
    "rosenborg": {"formation": "4-3-3", "style": "البناء المتوازن والسيطرة"},
}


def get_team_tactics(team_key: str) -> Dict[str, str]:
    """Retrieve formation and primary tactical playing style for a team."""
    clean_key = team_key.lower().replace(" ", "").replace("-", "")
    for k, info in TEAM_STYLE_MAP.items():
        if k in clean_key or clean_key in k:
            return info
    
    # Generic default for unknown teams
    return {"formation": "4-3-3", "style": "أسلوب متوازن بين الاستحواذ والتراجع"}


def evaluate_tactical_matchup(
    home_team: str,
    away_team: str,
    ppda_home: float = 11.0,
    ppda_away: float = 11.0,
) -> Dict[str, float | str]:
    """
    Evaluate tactical synergy, style clash, and vulnerability:
    e.g. High possession team facing rapid counter-attacking opponent.
    Returns lambda multipliers and matchup commentary.
    """
    h_tac = get_team_tactics(home_team)
    a_tac = get_team_tactics(away_team)

    h_form, h_style = h_tac["formation"], h_tac["style"]
    a_form, a_style = a_tac["formation"], a_tac["style"]

    h_mult = 1.0
    a_mult = 1.0
    notes = []

    # 1. Possession vs Counter Attack Clash
    if "الاستحواذ" in h_style and "مرتدات" in a_style:
        h_mult *= 0.96  # Possession team vulnerable to counters
        a_mult *= 1.05  # Counter team thrives on turnovers
        notes.append(f"{home_team} يستحوذ كثيراً ويترك مساحات قد يستغلها {away_team} بالمرتدات السريعة")
    elif "الاستحواذ" in a_style and "مرتدات" in h_style:
        a_mult *= 0.96
        h_mult *= 1.05
        notes.append(f"{away_team} سيمسك بالكرة لكنه يواجه خطورة مرتدات خاطفة من {home_team}")

    # 2. High Pressing vs High Pressing (High Pace Neutralizer)
    if ppda_home <= 9.0 and ppda_away <= 9.0:
        h_mult *= 0.98
        a_mult *= 0.98
        notes.append("معركة ضغط عالي متكافئة قد تصعب بناء اللعب النظيف للطرفين")

    # 3. 3-5-2 vs 4-3-3 Wing Back Overlap
    if h_form == "3-5-2" and a_form == "4-3-3":
        notes.append(f"التشكيل {h_form} يمنح تفوقاً في عمق الوسط لكن يُعرض الأطراف لاختراق 4-3-3")
    elif a_form == "3-5-2" and h_form == "4-3-3":
        notes.append(f"تشكيل {a_form} سيزاحم كتل الوسط بينما يستغل الأطراف العريضة")

    commentary = " • ".join(notes) if notes else "صراع تكتيكي متوازن في خط الوسط والأطراف"

    return {
        "home_formation": h_form,
        "away_formation": a_form,
        "home_style": h_style,
        "away_style": a_style,
        "home_lambda_mult": round(h_mult, 3),
        "away_lambda_mult": round(a_mult, 3),
        "matchup_commentary": commentary,
    }

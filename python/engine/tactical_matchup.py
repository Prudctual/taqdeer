"""
Tactical Formations, Playing Styles, and Style Matchup Compatibility Engine (tactical_matchup.py)

Covers Factors 22, 24, 25 of Model 2:
- Factor 22: Opponent Playing Style (أسلوب لعب الخصم: استحواذ / مرتدات / تكتل دفاعي / ضغط عالي)
- Factor 24: Tactical Compatibility & Systemic Clash Edge (مدى التوافق التكتيكي بين أسلوب الفريقين)
- Factor 25: Performance vs Low Blocks & Stalemate Risk (أداء الفريق ضد الفرق التي تلعب بتكتل دفاعي)
"""

from __future__ import annotations

from typing import Any, Dict, Optional


TEAM_STYLE_MAP: Dict[str, Dict[str, str]] = {
    # -------------------------------------------------------------
    # 1. Premier League (pl)
    # -------------------------------------------------------------
    "mancity": {"formation": "3-2-4-1", "style": "الاستحواذ الكثيف والضغط العالي"},
    "arsenal": {"formation": "4-3-3", "style": "الضغط المنظم والسيطرة والكرات الثابتة"},
    "liverpool": {"formation": "4-3-3", "style": "الضغط العالي والتحول الهجومي المباشر"},
    "chelsea": {"formation": "4-2-3-1", "style": "الاستحواذ المتدرج والضغط من العمق"},
    "astonvilla": {"formation": "4-2-2-2", "style": "مصيدة التسلل العالية والمرتدات المنظمة"},
    "tottenham": {"formation": "4-3-3", "style": "الخط الدفاعي المتقدم والضغط الشرس"},
    "newcastle": {"formation": "4-3-3", "style": "القوة البدنية والضغط العكسي المكثف"},
    "manunited": {"formation": "3-4-2-1", "style": "البناء الثلاثي والتحول السريع عبر الأطراف"},
    "brighton": {"formation": "4-2-3-1", "style": "استدراج الضغط والبناء الرأسي السريع"},
    "brentford": {"formation": "3-5-2", "style": "التكتل الدفاعي والكرات الطويلة والثابتة"},
    "fulham": {"formation": "4-2-3-1", "style": "التوازن التكتيكي والأطراف السريعة"},
    "bournemouth": {"formation": "4-2-3-1", "style": "الضغط العالي المستمر واللعب المباشر"},
    "westham": {"formation": "4-2-3-1", "style": "التراجع الدفاعي والمرتدات السريعة"},
    "crystalpalace": {"formation": "3-4-2-1", "style": "التحول الهجومي السريع والصلابة الدفاعية"},
    "nottingham": {"formation": "4-2-3-1", "style": "الدفاع المنخفض والتكتل المباشر والسرعة الخاطفة"},
    "everton": {"formation": "4-4-1-1", "style": "التكتل الدفاعي الصارم والكرات الهوائية"},
    "wolves": {"formation": "3-4-2-1", "style": "المرتدات السريعة والتحولات الفردية"},
    "leicester": {"formation": "4-3-3", "style": "التراجع المنظم والاعتماد على الأطراف"},
    "ipswich": {"formation": "4-2-3-1", "style": "الضغط العالي الشجاع والتحولات المفتوحة"},
    "southampton": {"formation": "3-4-3", "style": "الاستحواذ العقيم والمخاطرة بالتمرير الخلفي"},

    # -------------------------------------------------------------
    # 2. La Liga (pd)
    # -------------------------------------------------------------
    "realmadrid": {"formation": "4-3-3", "style": "التحول الخاطف والسرعة الهجومية المدمرة"},
    "barcelona": {"formation": "4-3-3", "style": "الضغط العالي جداً ومصيدة التسلل الصارمة"},
    "atletico": {"formation": "5-3-2", "style": "الدفاع المنخفض والتكتل المباشر والصلابة التكتيكية"},
    "athmadrid": {"formation": "5-3-2", "style": "الدفاع المنخفض والتكتل المباشر والصلابة التكتيكية"},
    "athbilbao": {"formation": "4-2-3-1", "style": "الضغط البدني العالي والأطراف النارية"},
    "realsociedad": {"formation": "4-3-3", "style": "الاستحواذ المتقارب والضغط المنظم"},
    "villarreal": {"formation": "4-4-2", "style": "التحول السريع والفاعلية الهجومية المباشرة"},
    "realbetis": {"formation": "4-2-3-1", "style": "الاستحواذ المهاري واللعب بين الخطوط"},
    "girona": {"formation": "4-3-3", "style": "التمرير المتدرج والزيادة العددية الهجومية"},
    "sevilla": {"formation": "4-3-3", "style": "العرضيات المكثفة والضغط البدني"},
    "osasuna": {"formation": "4-3-3", "style": "القوة البدنية والتكتل المباشر والكرات الثابتة"},
    "celtavigo": {"formation": "3-4-3", "style": "الاستحواذ الهجومي والضغط في منتصف الملعب"},
    "mallorca": {"formation": "5-4-1", "style": "التكتل الدفاعي المحكم والمرتدات"},
    "rayovallecano": {"formation": "4-2-3-1", "style": "الضغط العالي الفوضوي والإيقاع السريع"},
    "getafe": {"formation": "5-3-2", "style": "التكتل الدفاعي الفولاذي والتدخلات الخشنة"},
    "alaves": {"formation": "4-2-3-1", "style": "الصلابة الدفاعية واللعب المباشر"},
    "espanol": {"formation": "4-4-2", "style": "التراجع الدفاعي ومحاولة خطف الكرات المرتدة"},
    "laspalmas": {"formation": "4-3-3", "style": "الاستحواذ السلبي والتمرير البطيء"},
    "valladolid": {"formation": "4-3-3", "style": "التراجع الدفاعي والهشاشة تحت الضغط"},
    "valencia": {"formation": "4-4-2", "style": "الضغط المتوسط والاعتماد على الهجمات المرتدة"},

    # -------------------------------------------------------------
    # 3. Serie A (sa)
    # -------------------------------------------------------------
    "inter": {"formation": "3-5-2", "style": "التحول التكتيكي المتكامل والمرتدات القاتلة"},
    "atalanta": {"formation": "3-4-1-2", "style": "الضغط الفردي رجل-لرجل والكثافة الهجومية"},
    "napoli": {"formation": "4-3-3", "style": "التوازن الدفاعي والفاعلية الهجومية الصارمة"},
    "juventus": {"formation": "4-2-3-1", "style": "الاستحواذ الهادئ والضغط العكسي المنظم"},
    "milan": {"formation": "4-2-3-1", "style": "السرعة الفردية على الأطراف والتحول الهجومي"},
    "lazio": {"formation": "4-2-3-1", "style": "الضغط المتقدم والتحولات السريعة"},
    "fiorentina": {"formation": "4-2-3-1", "style": "الاستحواذ والانتشار العريض على الأجنحة"},
    "bologna": {"formation": "4-2-3-1", "style": "الضغط التموضعي وتدوير الكرة في الوسط"},
    "roma": {"formation": "3-4-2-1", "style": "اللعب المباشر والكثافة في عمق الوسط"},
    "torino": {"formation": "3-5-2", "style": "الصلابة البدنية والضغط رجل-لرجل"},
    "como": {"formation": "4-2-3-1", "style": "البناء القصير والجرأة التكتيكية"},
    "udinese": {"formation": "3-5-2", "style": "القوة البدنية والتحولات المرتدة المباشرة"},
    "genoa": {"formation": "3-5-2", "style": "التكتل الدفاعي والقتالية على الكرات الثانية"},
    "cagliari": {"formation": "4-2-3-1", "style": "الدفاع المنخفض والاعتماد على الكرات الثابتة"},
    "empoli": {"formation": "3-4-2-1", "style": "التكتل الدفاعي والمرتدات الخاطفة"},
    "verona": {"formation": "3-4-2-1", "style": "الضغط العالي والالتحامات البدنية القوية"},
    "parma": {"formation": "4-2-3-1", "style": "المرتدات السريعة والتحولات الفائقة في السرعة"},
    "lecce": {"formation": "4-3-3", "style": "التكتل الدفاعي واللعب على أخطاء الخصم"},
    "monza": {"formation": "3-4-2-1", "style": "الاستحواذ الدفاعي والبطء في البناء"},
    "venezia": {"formation": "3-5-2", "style": "محاولة البناء الخلفي مع ضعف في التغطية"},

    # -------------------------------------------------------------
    # 4. Bundesliga (bl1)
    # -------------------------------------------------------------
    "bayern": {"formation": "4-2-3-1", "style": "الهجوم الضاغط الكاسح والضغط في الثلث الأخير"},
    "leverkusen": {"formation": "3-4-2-1", "style": "الاستحواذ المتقن وتناقل الكرة السلس والضغط العكسي"},
    "dortmund": {"formation": "4-2-3-1", "style": "الهجوم السريع واستغلال المساحات العريضة"},
    "leipzig": {"formation": "4-2-2-2", "style": "الضغط المندفع والتحولات الخاطفة"},
    "frankfurt": {"formation": "3-4-2-1", "style": "المرتدات الصاعقة والسرعات الفائقة في الهجوم"},
    "stuttgart": {"formation": "4-2-3-1", "style": "الاستحواذ الهجومي والضغط الذكي في الوسط"},
    "freiburg": {"formation": "4-2-3-1", "style": "الانضباط التكتيكي والكرات الثابتة القاتلة"},
    "mainz": {"formation": "3-4-2-1", "style": "الضغط العنيف والالتحامات البدنية في الوسط"},
    "monchengladbach": {"formation": "4-2-3-1", "style": "الاستحواذ المتدرج مع بطء في الارتداد"},
    "wolfsburg": {"formation": "4-2-3-1", "style": "اللعب المباشر والقوة على الأطراف"},
    "werderbremen": {"formation": "3-5-2", "style": "التحولات السريعة والمواجهات المفتوحة"},
    "unionberlin": {"formation": "3-5-2", "style": "التكتل الدفاعي الفولاذي والكرات الرأسية"},
    "augsburg": {"formation": "3-4-2-1", "style": "التدخلات الخشنة والتكتل المباشر"},
    "heidenheim": {"formation": "4-2-3-1", "style": "الكرات الثابتة والركض المكثف بلا كرة"},
    "stpauli": {"formation": "3-4-3", "style": "الانضباط التموضعي والضغط في الوسط"},
    "hoffenheim": {"formation": "3-4-1-2", "style": "الهجوم المفتوح مع فجوات دفاعية واضحة"},
    "bochum": {"formation": "4-3-3", "style": "القتالية البدنية واللعب العشوائي المباشر"},
    "kiel": {"formation": "3-5-2", "style": "اللعب الشجاع مع هشاشة دفاعية بالارتداد"},

    # -------------------------------------------------------------
    # 5. Ligue 1 (fl1)
    # -------------------------------------------------------------
    "psg": {"formation": "4-3-3", "style": "السيطرة والاستحواذ العالي وتطويق الخصم"},
    "monaco": {"formation": "4-2-3-1", "style": "الضغط العالي والتحول الهجومي الشبابي السريع"},
    "marseille": {"formation": "4-2-3-1", "style": "الاستحواذ والضغط العكسي المنظم"},
    "lille": {"formation": "4-2-3-1", "style": "التوازن التكتيكي والسرعة في نقل الهجمة"},
    "lyon": {"formation": "4-3-3", "style": "الاستحواذ الهجومي والمهارات الفردية المتقدمة"},
    "nice": {"formation": "3-4-3", "style": "الصلابة الدفاعية والتراجع المنظم"},
    "lens": {"formation": "3-4-1-2", "style": "الضغط البدني الخانق والتحولات السريعة"},
    "rennes": {"formation": "4-3-3", "style": "اللعب الهجومي والضغط على الأجنحة"},
    "brest": {"formation": "4-3-3", "style": "الروح القتالية والعرضيات المكثفة والصلابة"},
    "strasbourg": {"formation": "3-4-1-2", "style": "السرعة في المرتدات والشباب الحماسي"},
    "toulouse": {"formation": "3-4-3", "style": "الضغط المتوسط والاعتماد على الكرات الثابتة"},
    "reims": {"formation": "4-3-3", "style": "المرتدات السريعة والتحولات الفردية"},
    "auxerre": {"formation": "3-4-2-1", "style": "التكتل الدفاعي والمرتدات"},
    "nantes": {"formation": "4-2-3-1", "style": "الدفاع المنخفض والتراجع إلى الثلث الأخير"},
    "angers": {"formation": "4-2-3-1", "style": "التكتل الدفاعي الصارم ومحاولة خطف هدف"},
    "saintetienne": {"formation": "4-3-3", "style": "التراجع الدفاعي مع ضعف في الارتداد"},
    "lehavre": {"formation": "4-3-3", "style": "التكتل الدفاعي واللعب على التعادل"},
    "montpellier": {"formation": "4-2-3-1", "style": "الهشاشة الدفاعية والاندفاع غير المحسوب"},

    # -------------------------------------------------------------
    # 6. Portuguese Primeira Liga (ppd)
    # -------------------------------------------------------------
    "sporting": {"formation": "3-4-3", "style": "الاستحواذ الكاسح والضغط الهجومي الشامل"},
    "splisbon": {"formation": "3-4-3", "style": "الاستحواذ الكاسح والضغط الهجومي الشامل"},
    "benfica": {"formation": "4-2-3-1", "style": "الضغط العالي والسيطرة الهجومية في العمق"},
    "porto": {"formation": "4-3-3", "style": "القوة البدنية والضغط المتواصل والكرات الثابتة"},
    "braga": {"formation": "4-3-3", "style": "اللعب الهجومي المباشر والسرعة على الأطراف"},
    "vitoriaguimaraes": {"formation": "3-5-2", "style": "الصلابة الدفاعية والالتحامات القوية"},
    "santaclara": {"formation": "3-4-3", "style": "التكتل الدفاعي المنظم واستغلال الأرض"},
    "famalicao": {"formation": "4-2-3-1", "style": "الانضباط التكتيكي والتحولات المتوازنة"},
    "moreirense": {"formation": "4-3-3", "style": "التراجع الدفاعي والمرتدات"},
    "arouca": {"formation": "4-2-3-1", "style": "البناء التموضعي واللعب السريع"},
    "rioave": {"formation": "3-4-3", "style": "التحفظ الدفاعي وتدوير الكرة الحذر"},
    "gilvicente": {"formation": "4-3-3", "style": "السرعة على الأجنحة والهجوم المرتد"},
    "estoril": {"formation": "3-4-3", "style": "اللعب الهجومي المفتوح مع فجوات دفاعية"},
    "boavista": {"formation": "4-2-3-1", "style": "التكتل الدفاعي والخشونة والقتال على الكرات"},
    "casapia": {"formation": "3-4-3", "style": "التكتل الدفاعي المنخفض وشح الأهداف"},
    "farense": {"formation": "4-3-3", "style": "الدفاع المنخفض والكرات الطويلة"},
    "avs": {"formation": "4-2-3-1", "style": "التكتل الدفاعي المنظم"},

    # -------------------------------------------------------------
    # 7. Dutch Eredivisie (ded)
    # -------------------------------------------------------------
    "psv": {"formation": "4-3-3", "style": "الضغط الهجومي الكاسح والأطراف السريعة"},
    "ajax": {"formation": "4-3-3", "style": "الاستحواذ الكثيف والبناء من الخلف والتحكم"},
    "feyenoord": {"formation": "4-3-3", "style": "الضغط المكثف والتحول السريع والاندفاع البدني"},
    "utrecht": {"formation": "4-2-3-1", "style": "الصلابة والفاعلية والكرات المرتدة"},
    "twente": {"formation": "4-2-3-1", "style": "الضغط المنظم والسيطرة في منتصف الملعب"},
    "azalkmaar": {"formation": "4-3-3", "style": "السيطرة التكتيكية والشباب السريع"},
    "fortuna": {"formation": "4-2-3-1", "style": "الانضباط الدفاعي والمرتدات"},
    "goaheadeagles": {"formation": "4-2-3-1", "style": "الضغط الشجاع واللعب المباشر"},
    "heerenveen": {"formation": "4-3-3", "style": "الاستحواذ ومحاولة البناء مع هشاشة ارتداد"},
    "groningen": {"formation": "4-4-2", "style": "القتال البدني والصلابة على الأرض"},
    "spartarotterdam": {"formation": "4-2-3-1", "style": "الكرات الثابتة والتحفظ التكتيكي"},
    "necnijmegen": {"formation": "4-3-3", "style": "التحولات السريعة والهجوم المباشر"},
    "zwolle": {"formation": "4-2-3-1", "style": "محاولة التمرير مع ضعف بدني"},
    "heracles": {"formation": "4-2-3-1", "style": "التراجع الدفاعي والمرتدات السريعة"},
    "willemii": {"formation": "4-4-2", "style": "التكتل الدفاعي واللعب المباشر"},
    "rkcwaalwijk": {"formation": "4-2-3-1", "style": "الارتداد البطيء واستقبال الأهداف السهلة"},
    "almerecity": {"formation": "4-4-2", "style": "التكتل الدفاعي المنخفض وشح التسجيل"},
}

MIN_PPDA_SAMPLES = 8
LAMBDA_MULT_LO = 0.95
LAMBDA_MULT_HI = 1.05


def _clean_team_key(team_key: str) -> str:
    return team_key.lower().replace(" ", "").replace("-", "").replace("_", "")


def style_family(team_key: str) -> str:
    """عائلة أسلوب مختصرة لخصوم مشابهين: possession / press / low_block / counter / balanced."""
    style = get_team_tactics(team_key).get("style") or ""
    if any(w in style for w in ("تكتل", "دفاع منخفض", "تراجع")):
        return "low_block"
    if "مرتدات" in style or "تحول" in style:
        return "counter"
    if "ضغط" in style:
        return "press"
    if any(w in style for w in ("استحواذ", "سيطرة", "بناء")):
        return "possession"
    return "balanced"


def get_team_tactics(
    team_key: str,
    ppda: Optional[float] = None,
    formation_override: Optional[str] = None,
) -> Dict[str, str]:
    """
    Retrieve formation and primary tactical playing style for a team.
    Matches against comprehensive 9-league database, then falls back to dynamic deduction.
    """
    clean_key = _clean_team_key(team_key)
    for k, info in TEAM_STYLE_MAP.items():
        if k in clean_key:
            form = formation_override or info["formation"]
            style = info["style"]
            if ppda is not None and ppda <= 9.2 and "ضغط" not in style:
                style = style + " والضغط العالي"
            elif ppda is not None and ppda >= 13.5 and "تكتل" not in style:
                style = "التكتل الدفاعي والمرتدات"
            return {"formation": form, "style": style}

    # Dynamic deduction for teams outside map
    form = formation_override or "4-3-3"
    if form in ("5-4-1", "5-3-2", "5-2-3"):
        style = "الدفاع المنخفض والتكتل المباشر"
    elif form in ("3-4-2-1", "3-5-2", "3-4-3"):
        style = "السيطرة على الأطراف والتحول المنظم"
    else:
        if ppda is not None and ppda <= 9.5:
            style = "الضغط العالي والتحول السريع"
        elif ppda is not None and ppda >= 13.0:
            style = "التكتل الدفاعي والمرتدات"
        else:
            style = "أسلوب متوازن بين الاستحواذ والتراجع"

    return {"formation": form, "style": style}


def evaluate_tactical_matchup(
    home_team: str,
    away_team: str,
    ppda_home: float = 11.0,
    ppda_away: float = 11.0,
    ppda_home_n: int = 0,
    ppda_away_n: int = 0,
    home_formation: Optional[str] = None,
    away_formation: Optional[str] = None,
    home_low_block_aptitude: float = 0.82,
    away_low_block_aptitude: float = 0.82,
) -> Dict[str, Any]:
    """
    Evaluates tactical clash, system synergy, and Factor 25 (Low-Block Vulnerability).
    """
    h_tac = get_team_tactics(home_team, ppda_home, home_formation)
    a_tac = get_team_tactics(away_team, ppda_away, away_formation)

    h_form, h_style = h_tac["formation"], h_tac["style"]
    a_form, a_style = a_tac["formation"], a_tac["style"]

    h_mult = 1.0
    a_mult = 1.0
    notes = []
    clash_type = "BALANCED"
    advantage = "NEUTRAL"

    is_home_low_block = any(w in h_style for w in ("تكتل", "دفاع منخفض", "تراجع"))
    is_away_low_block = any(w in a_style for w in ("تكتل", "دفاع منخفض", "تراجع"))
    is_home_possession = any(w in h_style for w in ("استحواذ", "سيطرة", "بناء"))
    is_away_possession = any(w in a_style for w in ("استحواذ", "سيطرة", "بناء"))

    is_low_block_matchup = False
    low_block_trap_warning = False

    # 1. Possession vs Low Block Analysis (Factor 25 & Factor 22)
    if is_home_possession and is_away_low_block:
        is_low_block_matchup = True
        clash_type = "POSSESSION_VS_LOW_BLOCK"
        if home_low_block_aptitude < 0.80:
            low_block_trap_warning = True
            h_mult *= 0.95
            a_mult *= 1.03
            notes.append(
                f"⚠️ تحذير تكتل دفاعي: {away_team} يلعب بتكتل دفاعي منخفض، بينما يعاني {home_team} من بطء تدوير الكرة وصعوبة اختراق الدفاعات المغلقة (خطر فخ تعادل عقيم)"
            )
            advantage = "AWAY"
        else:
            h_mult *= 1.02
            notes.append(
                f"صراع اختراق: {home_team} يستحوذ ويملك حلولاً متنوعة لتفكيك تكتل {away_team} الدفاعي"
            )
            advantage = "HOME"

    elif is_away_possession and is_home_low_block:
        is_low_block_matchup = True
        clash_type = "POSSESSION_VS_LOW_BLOCK"
        if away_low_block_aptitude < 0.80:
            low_block_trap_warning = True
            a_mult *= 0.95
            h_mult *= 1.03
            notes.append(
                f"⚠️ فخ تكتل دفاعي للمضيف: {home_team} يتكتل في مناطقه، مما قد يُحبط استحواذ {away_team} ويدفعه للتعادل"
            )
            advantage = "HOME"
        else:
            a_mult *= 1.02
            notes.append(
                f"محاصرة تكتيكية: {away_team} يملك جودة فك التكتلات أمام خطوط {home_team} الخلفية"
            )
            advantage = "AWAY"

    # 2. Possession vs Direct Counter (Factor 24)
    elif is_home_possession and "مرتدات" in a_style:
        clash_type = "POSSESSION_VS_COUNTER"
        h_mult *= 0.96
        a_mult *= 1.05
        notes.append(
            f"{home_team} يستحوذ ويترك مساحات شاسعة خلف أظهرته، مما يمنح {away_team} خطورة قصوى بالمرتدات السريعة"
        )
        advantage = "AWAY"
    elif is_away_possession and "مرتدات" in h_style:
        clash_type = "POSSESSION_VS_COUNTER"
        a_mult *= 0.96
        h_mult *= 1.05
        notes.append(
            f"{away_team} سيمسك الكرة في ملعب الخصم، مما يجعله صيداً سهلاً لمرتدات {home_team} الخاطفة"
        )
        advantage = "HOME"

    # 3. High Press Battle
    elif ppda_home <= 9.0 and ppda_away <= 9.0:
        clash_type = "HIGH_PRESS_DUEL"
        h_mult *= 0.98
        a_mult *= 0.98
        notes.append("معركة ضغط عالي متكافئة وشرسة تعيق بناء اللعب النظيف للطرفين وتزيد الأخطاء في الوسط")

    # 4. Formation Overlaps
    if h_form in ("3-5-2", "5-3-2") and a_form in ("4-3-3", "4-2-3-1"):
        notes.append(f"تفوق عددي لـ {home_team} في عمق الوسط يقابله تفوق لـ {away_team} في عرض الملعب")
    elif a_form in ("3-5-2", "5-3-2") and h_form in ("4-3-3", "4-2-3-1"):
        notes.append(f"{away_team} يغلق العمق بالثلاثي الدفاعي، مما يجبر {home_team} على اللعب عبر الأطراف")

    commentary = " • ".join(notes) if notes else "صراع تكتيكي متوازن في خط الوسط والأطراف"

    apply_lambda = (
        ppda_home_n >= MIN_PPDA_SAMPLES and ppda_away_n >= MIN_PPDA_SAMPLES
    ) or is_low_block_matchup or clash_type == "POSSESSION_VS_COUNTER"

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
        "home_lambda_mult": round(h_out, 4),
        "away_lambda_mult": round(a_out, 4),
        "matchup_commentary": commentary,
        "lambda_applied": apply_lambda,
        "is_low_block_matchup": is_low_block_matchup,
        "low_block_trap_warning": low_block_trap_warning,
        "tactical_clash_type": clash_type,
        "style_advantage": advantage,
    }

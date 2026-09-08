"""
Manager Track Record & Tactical Leadership Engine (manager_engine.py)

Covers Factor 21 of Model 2:
1. Manager experience level & tactical pedigree (خبرة المدرب وسجله التكتيكي)
2. New Manager Bounce detection (انتعاشة تغيير المدرب الجديد خلال المباريات الـ4 الأولى)
3. Points-per-game vs squad ELO expectation (الأداء مقابل التوقع)
4. Tactical discipline & Low-Block penetration aptitude
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass
from typing import Any, Dict, Mapping, Optional, Sequence


# Known manager profiles for high-profile clubs across major leagues
KNOWN_MANAGERS: Dict[str, Dict[str, Any]] = {
    # Premier League
    "mancity": {"name": "بيب غوارديولا", "experience": "ELITE_TACTICIAN", "discipline": 0.95, "low_block": 0.94, "tenure": 350},
    "arsenal": {"name": "ميكيل أرتيتا", "experience": "ELITE_TACTICIAN", "discipline": 0.92, "low_block": 0.90, "tenure": 220},
    "liverpool": {"name": "أرني سلوت", "experience": "VETERAN", "discipline": 0.88, "low_block": 0.88, "tenure": 35},
    "chelsea": {"name": "إنزو ماريسكا", "experience": "ESTABLISHED", "discipline": 0.80, "low_block": 0.82, "tenure": 32},
    "astonvilla": {"name": "أوناي إيمري", "experience": "ELITE_TACTICIAN", "discipline": 0.91, "low_block": 0.84, "tenure": 90},
    "newcastle": {"name": "إيدي هاو", "experience": "VETERAN", "discipline": 0.84, "low_block": 0.78, "tenure": 130},
    "manunited": {"name": "روبن أموريم", "experience": "VETERAN", "discipline": 0.86, "low_block": 0.82, "tenure": 22},
    "tottenham": {"name": "أنجي بوستيكوغلو", "experience": "VETERAN", "discipline": 0.79, "low_block": 0.85, "tenure": 65},

    # La Liga
    "realmadrid": {"name": "كارلو أنشيلوتي", "experience": "ELITE_TACTICIAN", "discipline": 0.93, "low_block": 0.91, "tenure": 180},
    "barcelona": {"name": "هانز فليك", "experience": "ELITE_TACTICIAN", "discipline": 0.92, "low_block": 0.92, "tenure": 35},
    "atletico": {"name": "دييغو سيميوني", "experience": "ELITE_TACTICIAN", "discipline": 0.96, "low_block": 0.82, "tenure": 650},
    "athmadrid": {"name": "دييغو سيميوني", "experience": "ELITE_TACTICIAN", "discipline": 0.96, "low_block": 0.82, "tenure": 650},
    "athbilbao": {"name": "إرنستو فالفيردي", "experience": "ELITE_TACTICIAN", "discipline": 0.89, "low_block": 0.80, "tenure": 110},
    "realsociedad": {"name": "إيمانول ألغواسيل", "experience": "VETERAN", "discipline": 0.87, "low_block": 0.82, "tenure": 260},
    "villarreal": {"name": "مارسيلينو", "experience": "VETERAN", "discipline": 0.88, "low_block": 0.81, "tenure": 60},

    # Serie A
    "inter": {"name": "سيموني إنزاغي", "experience": "ELITE_TACTICIAN", "discipline": 0.94, "low_block": 0.91, "tenure": 170},
    "juventus": {"name": "تياغو موتا", "experience": "ESTABLISHED", "discipline": 0.88, "low_block": 0.80, "tenure": 32},
    "atalanta": {"name": "جان بييرو غاسبيريني", "experience": "ELITE_TACTICIAN", "discipline": 0.93, "low_block": 0.89, "tenure": 380},
    "napoli": {"name": "أنطونيو كونتي", "experience": "ELITE_TACTICIAN", "discipline": 0.95, "low_block": 0.88, "tenure": 30},
    "milan": {"name": "باولو فونسيكا", "experience": "VETERAN", "discipline": 0.82, "low_block": 0.81, "tenure": 30},

    # Bundesliga
    "bayern": {"name": "فينسينت كومباني", "experience": "ESTABLISHED", "discipline": 0.86, "low_block": 0.91, "tenure": 30},
    "leverkusen": {"name": "تشابي ألونسو", "experience": "ELITE_TACTICIAN", "discipline": 0.95, "low_block": 0.94, "tenure": 100},
    "dortmund": {"name": "نوري شاهين", "experience": "DEVELOPING", "discipline": 0.77, "low_block": 0.80, "tenure": 28},
    "leipzig": {"name": "ماركو روزه", "experience": "VETERAN", "discipline": 0.85, "low_block": 0.82, "tenure": 90},

    # Ligue 1
    "psg": {"name": "لويس إنريكي", "experience": "ELITE_TACTICIAN", "discipline": 0.91, "low_block": 0.93, "tenure": 70},
    "monaco": {"name": "أدي هوتر", "experience": "VETERAN", "discipline": 0.85, "low_block": 0.83, "tenure": 60},
    "marseille": {"name": "روبرتو دي زيربي", "experience": "ELITE_TACTICIAN", "discipline": 0.89, "low_block": 0.89, "tenure": 28},

    # Primeira Liga
    "sporting": {"name": "جواو بيريرا", "experience": "DEVELOPING", "discipline": 0.78, "low_block": 0.82, "tenure": 15},
    "benfica": {"name": "برونو لاجي", "experience": "VETERAN", "discipline": 0.86, "low_block": 0.88, "tenure": 24},
    "porto": {"name": "فيتور برونو", "experience": "ESTABLISHED", "discipline": 0.82, "low_block": 0.84, "tenure": 30},

    # Eredivisie
    "psv": {"name": "بيتر بوش", "experience": "VETERAN", "discipline": 0.89, "low_block": 0.92, "tenure": 65},
    "ajax": {"name": "فرانشيسكو فاريولي", "experience": "ESTABLISHED", "discipline": 0.86, "low_block": 0.85, "tenure": 30},
    "feyenoord": {"name": "برايان بريسكه", "experience": "ESTABLISHED", "discipline": 0.82, "low_block": 0.84, "tenure": 28},
}


@dataclass
class ManagerProfile:
    team_id: str
    manager_name: str
    tenure_matches: int
    is_new_manager_bounce: bool
    bounce_intensity_mult: float
    experience_level: str  # ELITE_TACTICIAN, VETERAN, ESTABLISHED, DEVELOPING, NEW_APPOINTMENT
    tactical_discipline_score: float
    low_block_aptitude: float
    pts_per_game_actual: float
    pts_per_game_expected: float
    overperformance_delta: float
    lambda_attack_mult: float
    summary_ar: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _clean_key(key: str) -> str:
    return key.lower().replace(" ", "").replace("-", "").replace("_", "")


def compute_manager_profile(
    team_id: str,
    matches: Sequence[Any],
    elo_rating: float = 1500.0,
    tenure_override: Optional[int] = None,
    manager_name_override: Optional[str] = None,
) -> ManagerProfile:
    """
    Computes managerial influence, tactical discipline, and new manager bounce.
    """
    clean_id = _clean_key(team_id)
    known = None
    for k, info in KNOWN_MANAGERS.items():
        if k in clean_id:
            known = info
            break

    # Calculate actual PPG from recent matches (last 15 matches)
    team_pts = 0
    matches_counted = 0
    for m in matches[-15:] if len(matches) > 15 else matches:
        hid = m.get("home_team_id") if isinstance(m, dict) else getattr(m, "home_team_id", None)
        aid = m.get("away_team_id") if isinstance(m, dict) else getattr(m, "away_team_id", None)
        if hid == team_id or aid == team_id:
            hg = m.get("home_goals") if isinstance(m, dict) else getattr(m, "home_goals", 0)
            ag = m.get("away_goals") if isinstance(m, dict) else getattr(m, "away_goals", 0)
            if hg is not None and ag is not None:
                matches_counted += 1
                if hid == team_id:
                    team_pts += 3 if hg > ag else (1 if hg == ag else 0)
                else:
                    team_pts += 3 if ag > hg else (1 if ag == hg else 0)

    ppg_actual = (team_pts / matches_counted) if matches_counted > 0 else 1.40

    # Expected PPG derived from Elo rating baseline
    # 1500 Elo -> ~1.38 PPG, 1700 Elo -> ~2.10 PPG, 1300 Elo -> ~0.80 PPG
    elo_norm = min(1.0, max(0.0, (elo_rating - 1250.0) / 600.0))
    ppg_expected = round(0.70 + 1.65 * elo_norm, 2)
    overperformance = round(ppg_actual - ppg_expected, 2)

    tenure = tenure_override if tenure_override is not None else (known["tenure"] if known else 40)
    manager_name = manager_name_override or (known["name"] if known else "الجهاز الفني للفريق")
    exp_level = known["experience"] if known else ("VETERAN" if tenure >= 70 else ("ESTABLISHED" if tenure >= 20 else "DEVELOPING"))
    discipline = known["discipline"] if known else 0.82
    low_block_apt = known["low_block"] if known else 0.80

    # New Manager Bounce: tenure <= 4 matches
    is_bounce = tenure <= 4
    bounce_mult = 1.045 if is_bounce else 1.0

    # Lambda attacking multiplier
    atk_mult = 1.0
    if exp_level == "ELITE_TACTICIAN":
        atk_mult *= 1.03
    elif exp_level == "DEVELOPING" and not is_bounce:
        atk_mult *= 0.98

    if overperformance >= 0.25:
        atk_mult *= 1.02
    elif overperformance <= -0.30:
        atk_mult *= 0.97

    atk_mult *= bounce_mult

    # Build Arabic summary
    summary_parts = []
    if is_bounce:
        summary_parts.append(
            f"⚡ انتعاشة مدرب جديد ({manager_name}): قيادة فنية جديدة تمنح دافعية وحماساً مضاعفاً في المباريات الأولى"
        )
    else:
        exp_labels = {
            "ELITE_TACTICIAN": "مرجعية تكتيكية عليا",
            "VETERAN": "مدرب خبير ومخضرم",
            "ESTABLISHED": "قيادة فنية مستقرة",
            "DEVELOPING": "جهاز فني شاب وقيد التطوير",
        }
        summary_parts.append(
            f"👔 {manager_name} ({exp_labels.get(exp_level, 'مستقر')} · {tenure} مباراة)"
        )

    if overperformance >= 0.20:
        summary_parts.append(f"تفوق في حصد النقاط فوق المتوقع (+{overperformance:.2f} نقطة/مباراة)")
    elif overperformance <= -0.25:
        summary_parts.append(f"تراجع عن المردود المتوقع للمدرب ({overperformance:.2f} نقطة/مباراة)")

    if low_block_apt >= 0.88:
        summary_parts.append("براعة مثبتة في فك شفرة التكتلات الدفاعية")

    summary_ar = " · ".join(summary_parts)

    return ManagerProfile(
        team_id=team_id,
        manager_name=manager_name,
        tenure_matches=tenure,
        is_new_manager_bounce=is_bounce,
        bounce_intensity_mult=bounce_mult,
        experience_level=exp_level,
        tactical_discipline_score=discipline,
        low_block_aptitude=low_block_apt,
        pts_per_game_actual=round(ppg_actual, 2),
        pts_per_game_expected=ppg_expected,
        overperformance_delta=overperformance,
        lambda_attack_mult=round(atk_mult, 4),
        summary_ar=summary_ar,
    )

"""مؤشر تسديدات موزون (بديل xG) وPPDA تقريبي — من إحصاءات التسديد الرسمية فقط.

هذا ليس xG تتبّعياً (لا بيانات مواقع تسديد): إنه وكيل خطي من التسديدات على
المرمى وخارجه، ويُعرض في الواجهة بمسمى «مؤشر التسديدات الموزون» بصدق.
"""

from __future__ import annotations

from typing import Dict, Optional, Tuple


def calculate_match_xg(
    shots: Optional[float], sot: Optional[float], goals: Optional[float]
) -> float:
    """
    وكيل تسديدات خطي: تسديدة على المرمى = 0.31، خارج المرمى = 0.045،
    مع تصحيح للأهداف الزائدة عن التسديدات المسجلة.
    """
    if shots is None or shots <= 0:
        return float(round(goals if goals is not None else 0.0, 2))

    effective_sot = sot if sot is not None else min(shots, goals if goals is not None else 0.0)
    off_target = max(0.0, shots - effective_sot)

    base_xg = 0.31 * effective_sot + 0.045 * off_target

    if goals is not None and goals > effective_sot:
        # Extra goals beyond reported shots on target
        base_xg += 0.70 * (goals - effective_sot)

    return float(round(max(0.05, base_xg), 2))


def calculate_match_xa(xg: float) -> float:
    """مشتق من مؤشر التسديدات (ليس xA تتبّعي)."""
    return float(round(max(0.04, 0.85 * xg), 2))


def calculate_match_ppda(
    fouls: Optional[float],
    corners: Optional[float],
    shots: Optional[float],
    opp_shots: Optional[float],
) -> float:
    """
    PPDA تقريبي من التسديدات/الأخطاء/الركنيات (ليس تمريرات Opta).
    أقل = ضغط أعلى؛ أعلى = تكتل أدنى.
    """
    # Approximate opponent pass volume — free proxy, not event data
    opp_pass_volume = 420.0 + 8.0 * (opp_shots if opp_shots is not None else 10.0)

    defensive_actions = 4.0  # Base tackles/interceptions
    if fouls is not None:
        defensive_actions += 1.2 * fouls
    if corners is not None:
        defensive_actions += 0.5 * corners
    if shots is not None:
        defensive_actions += 0.4 * shots

    defensive_actions = max(1.0, defensive_actions)
    ppda = opp_pass_volume / defensive_actions
    return float(round(min(max(ppda, 5.0), 25.0), 1))


def compute_advanced_metrics(
    home_goals: int,
    away_goals: int,
    shots_home: Optional[float],
    shots_away: Optional[float],
    sot_home: Optional[float],
    sot_away: Optional[float],
    fouls_home: Optional[float] = None,
    fouls_away: Optional[float] = None,
    corners_home: Optional[float] = None,
    corners_away: Optional[float] = None,
) -> Dict[str, float]:
    """Shot-proxy threat index, derived xa, and approximate PPDA for a match."""
    xg_h = calculate_match_xg(shots_home, sot_home, float(home_goals))
    xg_a = calculate_match_xg(shots_away, sot_away, float(away_goals))

    xa_h = calculate_match_xa(xg_h)
    xa_a = calculate_match_xa(xg_a)

    ppda_h = calculate_match_ppda(fouls_home, corners_home, shots_home, shots_away)
    ppda_a = calculate_match_ppda(fouls_away, corners_away, shots_away, shots_home)

    return {
        "xg_home": xg_h,
        "xg_away": xg_a,
        "xa_home": xa_h,
        "xa_away": xa_a,
        "ppda_home": ppda_h,
        "ppda_away": ppda_a,
    }

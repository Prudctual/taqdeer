"""مؤشر تسديدات موزون + تفضيل xG تتبّعي عند التوفر (Understat).

`xg_home/away` في الواجهة يبقى الـproxy؛ `xg_true_*` هو التتبّعي.
"""

from __future__ import annotations

from typing import Dict, Optional


def calculate_match_xg(
    shots: Optional[float],
    sot: Optional[float],
    goals: Optional[float],
    *,
    garbage_time_factor: float = 1.0,
) -> float:
    """
    وكيل تسديدات خطي: تسديدة على المرمى = 0.31، خارج المرمى = 0.045،
    مع تصحيح للأهداف الزائدة عن التسديدات المسجلة.
    garbage_time_factor < 1 يخصم تسديدات وقت الضياع/الفارق الكبير.
    """
    if shots is None or shots <= 0:
        return float(round(goals if goals is not None else 0.0, 2))

    effective_sot = sot if sot is not None else min(shots, goals if goals is not None else 0.0)
    off_target = max(0.0, shots - effective_sot)

    base_xg = 0.31 * effective_sot + 0.045 * off_target
    base_xg *= float(min(max(garbage_time_factor, 0.7), 1.0))

    if goals is not None and goals > effective_sot:
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
    opp_pass_volume = 420.0 + 8.0 * (opp_shots if opp_shots is not None else 10.0)

    defensive_actions = 4.0
    if fouls is not None:
        defensive_actions += 1.2 * fouls
    if corners is not None:
        defensive_actions += 0.5 * corners
    if shots is not None:
        defensive_actions += 0.4 * shots

    defensive_actions = max(1.0, defensive_actions)
    ppda = opp_pass_volume / defensive_actions
    return float(round(min(max(ppda, 5.0), 25.0), 1))


def prefer_true_xg(
    true_xg: Optional[float],
    proxy_xg: float,
) -> float:
    """يفضّل xG التتبّعي إن وُجد ورقمه معقول."""
    if true_xg is None:
        return proxy_xg
    try:
        v = float(true_xg)
    except (TypeError, ValueError):
        return proxy_xg
    if v < 0.01 or v > 8.0:
        return proxy_xg
    return float(round(v, 3))


def garbage_time_factor(home_goals: int, away_goals: int) -> float:
    """خصم خفيف عندما يكون الفارق ≥3 (تسديدات وقت ضائع أقل تمثيلاً)."""
    if abs(int(home_goals) - int(away_goals)) >= 3:
        return 0.88
    return 1.0


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
    xg_true_home: Optional[float] = None,
    xg_true_away: Optional[float] = None,
) -> Dict[str, float]:
    """Shot-proxy (+ true xG إن وُجد)، xa مشتق، وPPDA تقريبي."""
    gtf = garbage_time_factor(home_goals, away_goals)
    proxy_h = calculate_match_xg(shots_home, sot_home, float(home_goals), garbage_time_factor=gtf)
    proxy_a = calculate_match_xg(shots_away, sot_away, float(away_goals), garbage_time_factor=gtf)
    xg_h = prefer_true_xg(xg_true_home, proxy_h)
    xg_a = prefer_true_xg(xg_true_away, proxy_a)

    xa_h = calculate_match_xa(xg_h)
    xa_a = calculate_match_xa(xg_a)

    ppda_h = calculate_match_ppda(fouls_home, corners_home, shots_home, shots_away)
    ppda_a = calculate_match_ppda(fouls_away, corners_away, shots_away, shots_home)

    return {
        "xg_home": proxy_h,
        "xg_away": proxy_a,
        "xg_true_home": float(xg_true_home) if xg_true_home is not None else proxy_h,
        "xg_true_away": float(xg_true_away) if xg_true_away is not None else proxy_a,
        "xg_effective_home": xg_h,
        "xg_effective_away": xg_a,
        "xa_home": xa_h,
        "xa_away": xa_a,
        "ppda_home": ppda_h,
        "ppda_away": ppda_a,
        "used_true_xg": bool(
            xg_true_home is not None and xg_true_away is not None
        ),
    }

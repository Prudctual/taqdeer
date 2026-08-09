"""حراك السوق + closing/CLV — تفضيل الخط الحاد (Pinnacle/PS) بلا اختراع EV."""

from __future__ import annotations

import math
from typing import Any, Dict, Optional, Tuple

Odds3 = Tuple[float, float, float]


def _implied_fair(odds: Odds3) -> Tuple[float, float, float]:
    inv = [1.0 / o for o in odds]
    s = sum(inv) or 1.0
    return inv[0] / s, inv[1] / s, inv[2] / s


def detect_steam(
    open_odds: Optional[Odds3],
    current_odds: Optional[Odds3],
    *,
    min_move: float = 0.04,
) -> Dict[str, Any]:
    """
    يكتشف جهة الـsteam كنسبة تغيّر الاحتمال الضمني (1/odds) بعد إزالة هامش تقريبي.
    """
    empty = {
        "side": None,
        "magnitude": 0.0,
        "applied": False,
        "summary": None,
    }
    if not open_odds or not current_odds:
        return empty
    if any(x is None or x <= 1.01 for x in (*open_odds, *current_odds)):
        return empty

    o = _implied_fair(open_odds)
    c = _implied_fair(current_odds)
    deltas = {
        "home": c[0] - o[0],
        "draw": c[1] - o[1],
        "away": c[2] - o[2],
    }
    side = max(deltas, key=deltas.get)
    mag = float(deltas[side])
    if mag < min_move:
        return {**empty, "magnitude": mag, "summary": "لا حراك يُذكر"}

    labels = {"home": "المضيف", "draw": "التعادل", "away": "الضيف"}
    return {
        "side": side,
        "magnitude": mag,
        "applied": True,
        "summary": f"ضغط سوقي نحو {labels[side]} (+{mag * 100:.1f} نقطة احتمالية)",
        "deltas": deltas,
    }


def steam_confidence_bonus(
    steam: Dict[str, Any],
    model_side: Optional[str],
    *,
    bonus: float = 0.03,
) -> float:
    """مكافأة ثقة صغيرة فقط عند توافق أفضل مخرجات النموذج مع جهة الـsteam."""
    if not steam.get("applied") or not steam.get("side") or not model_side:
        return 0.0
    if steam["side"] == model_side:
        return float(bonus) * min(1.0, float(steam.get("magnitude") or 0) / 0.08)
    return 0.0


def pick_market_odds(
    *,
    sharp: Optional[Odds3] = None,
    current: Optional[Odds3] = None,
    soft_avg: Optional[Odds3] = None,
) -> Tuple[Optional[Odds3], str]:
    """يفضّل الخط الحاد ثم الحالي ثم المتوسط الناعم."""
    if sharp and all(o and o > 1.01 for o in sharp):
        return sharp, "sharp"
    if current and all(o and o > 1.01 for o in current):
        return current, "current"
    if soft_avg and all(o and o > 1.01 for o in soft_avg):
        return soft_avg, "avg"
    return None, "none"


def closing_line_value(
    fair_probs: Odds3,
    *,
    close_odds: Optional[Odds3],
    side: str,
) -> Dict[str, Any]:
    """
    CLV: فرق احتمال النموذج العادل عند الرهان مقابل احتمال الإغلاق العادل.
    موجب = النموذج كان أدق من خط الإغلاق على ذلك الجانب.
    """
    empty = {
        "applied": False,
        "side": side,
        "clv_points": 0.0,
        "close_fair": None,
        "summary": None,
    }
    if not close_odds or any(o is None or o <= 1.01 for o in close_odds):
        return empty
    close_fair = _implied_fair(close_odds)
    idx = {"home": 0, "draw": 1, "away": 2}.get(side)
    if idx is None:
        return empty
    clv = float(fair_probs[idx] - close_fair[idx])
    return {
        "applied": True,
        "side": side,
        "clv_points": clv,
        "close_fair": close_fair,
        "model_fair": fair_probs,
        "summary": f"CLV {side}: {clv * 100:+.1f} نقطة مقابل الإغلاق",
    }


def mean_clv(
    rows: list[Dict[str, Any]],
) -> Dict[str, float]:
    """متوسط CLV من صفوف فيها clv_points."""
    vals = [float(r["clv_points"]) for r in rows if r.get("applied")]
    if not vals:
        return {"n": 0.0, "mean_clv": 0.0}
    return {"n": float(len(vals)), "mean_clv": sum(vals) / len(vals)}


def log_loss_vs_closing(
    model_probs: list[Odds3],
    close_odds_list: list[Optional[Odds3]],
    outcomes: list[str],
) -> Dict[str, float]:
    """NLL النموذج مقابل NLL خط الإغلاق (إن وُجد)."""
    m_total = 0.0
    c_total = 0.0
    n = 0
    for mp, co, o in zip(model_probs, close_odds_list, outcomes):
        if not co or any(x is None or x <= 1.01 for x in co):
            continue
        yi = {"H": 0, "D": 1, "A": 2}[o]
        m_total -= math.log(max(float(mp[yi]), 1e-12))
        cf = _implied_fair(co)
        c_total -= math.log(max(float(cf[yi]), 1e-12))
        n += 1
    if n == 0:
        return {"n": 0.0, "model_nll": 0.0, "close_nll": 0.0, "nll_edge": 0.0}
    return {
        "n": float(n),
        "model_nll": m_total / n,
        "close_nll": c_total / n,
        "nll_edge": (c_total - m_total) / n,
    }

"""حراك السوق من أودز الافتتاح→الحالي — بلا اختراع EV."""

from __future__ import annotations

from typing import Any, Dict, Optional, Tuple


Odds3 = Tuple[float, float, float]


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

    def implied(odds: Odds3) -> Tuple[float, float, float]:
        inv = [1.0 / o for o in odds]
        s = sum(inv) or 1.0
        return inv[0] / s, inv[1] / s, inv[2] / s

    o = implied(open_odds)
    c = implied(current_odds)
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

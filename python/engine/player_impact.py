"""تأثير الغيابات على λ — خصم بالمركز (ليس RAPM لاعبين حقيقي)."""

from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional, Sequence


# أوزان غياب حسب المركز (هجوم / دفاع)
_POS_WEIGHT = {
    "G": (0.0, 0.055),
    "GK": (0.0, 0.055),
    "D": (0.01, 0.035),
    "DF": (0.01, 0.035),
    "M": (0.025, 0.02),
    "MF": (0.025, 0.02),
    "F": (0.045, 0.005),
    "FW": (0.045, 0.005),
    "ST": (0.05, 0.0),
}


def _norm_pos(raw: Optional[str]) -> str:
    if not raw:
        return "M"
    s = str(raw).strip().upper()
    if s in _POS_WEIGHT:
        return s
    if "G" in s and ("K" in s or s == "G"):
        return "GK"
    if s.startswith("D") or "BACK" in s or "DEF" in s:
        return "D"
    if s.startswith("F") or "WING" in s or "ST" in s or "ATT" in s:
        return "F"
    return "M"


def _status_scale(status: str) -> float:
    s = (status or "").lower()
    if s in ("injured", "suspended", "out"):
        return 1.0
    if s in ("doubtful", "questionable"):
        return 0.45
    return 0.0


def missing_impact(players: Sequence[Dict[str, Any]]) -> Dict[str, float]:
    """يحسب خصم هجوم/دفاع لفريق من قائمة غيابات."""
    atk_pen = 0.0
    def_pen = 0.0
    counted = 0
    for p in players:
        scale = _status_scale(str(p.get("status") or ""))
        if scale <= 0:
            continue
        pos = _norm_pos(p.get("position"))
        a, d = _POS_WEIGHT.get(pos, (0.025, 0.02))
        atk_pen += a * scale
        def_pen += d * scale
        counted += 1
    # سقف حتى لا تنهار λ عند قائمة إصابات طويلة
    return {
        "attack_penalty": min(0.18, atk_pen),
        "defense_penalty": min(0.16, def_pen),
        "n": float(counted),
    }


def apply_absence_penalties(
    lam: float,
    mu: float,
    home_missing: Optional[Iterable[Dict[str, Any]]] = None,
    away_missing: Optional[Iterable[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    hm = list(home_missing or [])
    am = list(away_missing or [])
    hi = missing_impact(hm)
    ai = missing_impact(am)

    # غياب هجوم المضيف يخفض λ؛ غياب دفاع الضيف يرفع λ؛ والعكس
    new_lam = lam * (1.0 - hi["attack_penalty"]) * (1.0 + ai["defense_penalty"] * 0.7)
    new_mu = mu * (1.0 - ai["attack_penalty"]) * (1.0 + hi["defense_penalty"] * 0.7)
    new_lam = max(0.15, new_lam)
    new_mu = max(0.15, new_mu)

    applied = bool(hi["n"] or ai["n"])
    return {
        "lambda_home": new_lam,
        "lambda_away": new_mu,
        "applied": applied,
        "home": hi,
        "away": ai,
        "home_missing": [
            {"name": p.get("player_name") or p.get("name"), "status": p.get("status"), "position": p.get("position")}
            for p in hm
        ],
        "away_missing": [
            {"name": p.get("player_name") or p.get("name"), "status": p.get("status"), "position": p.get("position")}
            for p in am
        ],
        "summary": (
            f"غيابات: مضيف {int(hi['n'])} · ضيف {int(ai['n'])}"
            if applied
            else None
        ),
    }


# Backward-compatible alias (old name oversold the method)
apply_rapm_to_xg = apply_absence_penalties

"""تأثير الغيابات والتشكيلة على λ — قوة لاعب × مركز × حالة، مع XI delta عند التأكيد."""

from __future__ import annotations

from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence


# أوزان غياب حسب المركز (هجوم / دفاع) — خط أساس قبل مضاعف القوة
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


def _player_key(p: Mapping[str, Any]) -> str:
    return str(p.get("player_name") or p.get("name") or "").strip().lower()


def _strength_of(
    p: Mapping[str, Any],
    strength_map: Optional[Mapping[str, float]],
) -> float:
    """
    قوة نسبية حول 1.0.
    من الخريطة أو من الحقل strength؛ الأساسيون عادة 0.85–1.35.
    """
    if p.get("strength") is not None:
        try:
            return float(min(max(float(p["strength"]), 0.55), 1.55))
        except (TypeError, ValueError):
            pass
    key = _player_key(p)
    if strength_map and key in strength_map:
        return float(min(max(float(strength_map[key]), 0.55), 1.55))
    # أساسي معروف بلا تقييم → أقوى قليلاً من بديل
    if p.get("is_starter") or str(p.get("role") or "").lower() == "starter":
        return 1.12
    return 1.0


def missing_impact(
    players: Sequence[Dict[str, Any]],
    *,
    strength_map: Optional[Mapping[str, float]] = None,
) -> Dict[str, Any]:
    """يحسب خصم هجوم/دفاع لفريق من قائمة غيابات موزونة بالقوة."""
    atk_pen = 0.0
    def_pen = 0.0
    counted = 0
    notables: List[Dict[str, Any]] = []
    for p in players:
        scale = _status_scale(str(p.get("status") or ""))
        if scale <= 0:
            continue
        pos = _norm_pos(p.get("position"))
        a, d = _POS_WEIGHT.get(pos, (0.025, 0.02))
        strength = _strength_of(p, strength_map)
        a_i = a * scale * strength
        d_i = d * scale * strength
        atk_pen += a_i
        def_pen += d_i
        counted += 1
        notables.append(
            {
                "name": p.get("player_name") or p.get("name"),
                "status": p.get("status"),
                "position": pos,
                "strength": round(strength, 3),
                "atk": round(a_i, 4),
                "defn": round(d_i, 4),
            }
        )
    notables.sort(key=lambda x: -(x["atk"] + x["defn"]))
    return {
        "attack_penalty": min(0.20, atk_pen),
        "defense_penalty": min(0.18, def_pen),
        "n": float(counted),
        "notables": notables[:5],
    }


def xi_delta_impact(
    *,
    confirmed_starters: Sequence[Dict[str, Any]],
    missing: Sequence[Dict[str, Any]],
    strength_map: Optional[Mapping[str, float]] = None,
    bench: Optional[Sequence[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    عند تأكيد التشكيلة: إن غاب أساسي متوقع، قارن قوته بمتوسط البدلاء في نفس المركز.
    يعيد Δatk/Δdef إضافية فوق قائمة الغيابات.
    """
    if not confirmed_starters and not missing:
        return {"attack_delta": 0.0, "defense_delta": 0.0, "applied": False, "notes": []}

    bench_by_pos: Dict[str, List[float]] = {}
    for b in bench or []:
        pos = _norm_pos(b.get("position"))
        bench_by_pos.setdefault(pos, []).append(_strength_of(b, strength_map))

    notes: List[str] = []
    atk_d = 0.0
    def_d = 0.0
    starter_keys = {_player_key(s) for s in confirmed_starters}

    for p in missing:
        scale = _status_scale(str(p.get("status") or ""))
        if scale <= 0:
            continue
        name = p.get("player_name") or p.get("name")
        key = _player_key(p)
        # غائب ليس في XI المؤكد → كان مرشحاً أساسياً إن وُجدت قوة عالية أو is_starter
        if key in starter_keys:
            continue  # موجود في التشكيلة — ليس غائباً فعلياً
        pos = _norm_pos(p.get("position"))
        miss_s = _strength_of(p, strength_map)
        repl_pool = bench_by_pos.get(pos) or [0.85]
        repl_s = sum(repl_pool) / len(repl_pool)
        gap = max(0.0, miss_s - repl_s)
        if gap < 0.05:
            continue
        a, d = _POS_WEIGHT.get(pos, (0.025, 0.02))
        # فجوة القوة تضاعف جزءاً من وزن المركز
        atk_d += a * gap * 0.85 * scale
        def_d += d * gap * 0.85 * scale
        notes.append(f"{name}: فجوة XI {gap:.2f} ({pos})")

    return {
        "attack_delta": min(0.08, atk_d),
        "defense_delta": min(0.07, def_d),
        "applied": bool(notes),
        "notes": notes[:4],
    }


def apply_absence_penalties(
    lam: float,
    mu: float,
    home_missing: Optional[Iterable[Dict[str, Any]]] = None,
    away_missing: Optional[Iterable[Dict[str, Any]]] = None,
    *,
    home_strength: Optional[Mapping[str, float]] = None,
    away_strength: Optional[Mapping[str, float]] = None,
    home_xi: Optional[Sequence[Dict[str, Any]]] = None,
    away_xi: Optional[Sequence[Dict[str, Any]]] = None,
    home_bench: Optional[Sequence[Dict[str, Any]]] = None,
    away_bench: Optional[Sequence[Dict[str, Any]]] = None,
    lineup_confirmed: bool = False,
) -> Dict[str, Any]:
    hm = list(home_missing or [])
    am = list(away_missing or [])
    hi = missing_impact(hm, strength_map=home_strength)
    ai = missing_impact(am, strength_map=away_strength)

    h_xi = {"attack_delta": 0.0, "defense_delta": 0.0, "applied": False, "notes": []}
    a_xi = {"attack_delta": 0.0, "defense_delta": 0.0, "applied": False, "notes": []}
    if lineup_confirmed:
        h_xi = xi_delta_impact(
            confirmed_starters=list(home_xi or []),
            missing=hm,
            strength_map=home_strength,
            bench=home_bench,
        )
        a_xi = xi_delta_impact(
            confirmed_starters=list(away_xi or []),
            missing=am,
            strength_map=away_strength,
            bench=away_bench,
        )

    h_atk = min(0.22, float(hi["attack_penalty"]) + float(h_xi["attack_delta"]))
    h_def = min(0.20, float(hi["defense_penalty"]) + float(h_xi["defense_delta"]))
    a_atk = min(0.22, float(ai["attack_penalty"]) + float(a_xi["attack_delta"]))
    a_def = min(0.20, float(ai["defense_penalty"]) + float(a_xi["defense_delta"]))

    new_lam = lam * (1.0 - h_atk) * (1.0 + a_def * 0.7)
    new_mu = mu * (1.0 - a_atk) * (1.0 + h_def * 0.7)
    new_lam = max(0.15, new_lam)
    new_mu = max(0.15, new_mu)

    applied = bool(hi["n"] or ai["n"] or h_xi["applied"] or a_xi["applied"])
    return {
        "lambda_home": new_lam,
        "lambda_away": new_mu,
        "delta_lambda_home": new_lam - lam,
        "delta_lambda_away": new_mu - mu,
        "applied": applied,
        "home": {**hi, "attack_penalty": h_atk, "defense_penalty": h_def, "xi": h_xi},
        "away": {**ai, "attack_penalty": a_atk, "defense_penalty": a_def, "xi": a_xi},
        "home_missing": [
            {
                "name": p.get("player_name") or p.get("name"),
                "status": p.get("status"),
                "position": p.get("position"),
            }
            for p in hm
        ],
        "away_missing": [
            {
                "name": p.get("player_name") or p.get("name"),
                "status": p.get("status"),
                "position": p.get("position"),
            }
            for p in am
        ],
        "summary": (
            f"غيابات: مضيف {int(hi['n'])} · ضيف {int(ai['n'])}"
            + (
                f" · XI Δλ {new_lam - lam:+.3f}/{new_mu - mu:+.3f}"
                if lineup_confirmed and (h_xi["applied"] or a_xi["applied"])
                else ""
            )
            if applied
            else None
        ),
    }


# Backward-compatible alias
apply_rapm_to_xg = apply_absence_penalties

"""أسواق مشتقة من مصفوفة النتائج: فوق/تحت، آسيوي، فرصة مزدوجة — ومعايرتها مقابل إغلاق بيناكل.

تُستعمل عندما يكون 1X2 صاخباً (مصيدة تعادل / 50–50): يُقيَّم البديل بالعتبة نفسها
وموافقة السوق، ويُعرض في تبويب «بديل» لا مع المحسوم.
"""

from __future__ import annotations

import math
from typing import Sequence, Tuple

import numpy as np

from .evaluate import apply_binary_temperature, fit_binary_temperature


def over_under(mat: np.ndarray, line: float = 2.5) -> Tuple[float, float]:
    """(p_over, p_under) لخط نصفي (2.5، 3.5…). للخطوط الصحيحة يُستثنى الـpush ويُعاد التطبيع."""
    n = mat.shape[0]
    over = under = push = 0.0
    for i in range(n):
        for j in range(n):
            tot = i + j
            if tot > line:
                over += mat[i, j]
            elif tot < line:
                under += mat[i, j]
            else:
                push += mat[i, j]
    s = over + under
    if s <= 0:
        return 0.5, 0.5
    return float(over / s), float(under / s)


def asian_handicap(mat: np.ndarray, line: float) -> dict:
    """احتمالات رهان المضيف على خط آسيوي (line = هانديكاب المضيف، مثل −0.5 أو +0.25).

    الخطوط الربعية تُقسم نصفين. يعيد p_win/p_lose/p_push وp_home_fair (بلا push).
    """
    quarter = abs(line * 4 - round(line * 4)) < 1e-9 and abs(line * 2 - round(line * 2)) > 1e-9
    if quarter:
        lo = math.floor(line * 2) / 2.0
        hi = lo + 0.5
        a = asian_handicap(mat, lo)
        b = asian_handicap(mat, hi)
        win = 0.5 * (a["p_win"] + b["p_win"])
        lose = 0.5 * (a["p_lose"] + b["p_lose"])
        push = 0.5 * (a["p_push"] + b["p_push"])
    else:
        n = mat.shape[0]
        win = lose = push = 0.0
        for i in range(n):
            for j in range(n):
                margin = (i - j) + line
                if margin > 1e-9:
                    win += mat[i, j]
                elif margin < -1e-9:
                    lose += mat[i, j]
                else:
                    push += mat[i, j]
    s = win + lose
    fair = float(win / s) if s > 0 else 0.5
    return {
        "line": float(line),
        "p_win": float(win),
        "p_lose": float(lose),
        "p_push": float(push),
        "p_home_fair": fair,
        "p_away_fair": 1.0 - fair,
    }


def double_chance(p: Sequence[float]) -> dict:
    h, d, a = (float(x) for x in p)
    return {"1X": h + d, "X2": d + a, "12": h + a}


def demargin_two_way(o1: float, o2: float) -> Tuple[float, float] | None:
    """نزع الهامش لسوق ثنائي بالتطبيع النسبي (الفارق مع power ضئيل في الأسواق الثنائية)."""
    if not o1 or not o2 or o1 <= 1.01 or o2 <= 1.01:
        return None
    i1, i2 = 1.0 / o1, 1.0 / o2
    s = i1 + i2
    return float(i1 / s), float(i2 / s)


def brier_binary(probs: Sequence[float], labels: Sequence[int]) -> float:
    p = np.asarray(probs, dtype=float)
    y = np.asarray(labels, dtype=float)
    if len(p) == 0:
        return float("nan")
    return float(np.mean((p - y) ** 2))


def log_loss_binary(probs: Sequence[float], labels: Sequence[int]) -> float:
    p = np.clip(np.asarray(probs, dtype=float), 1e-6, 1 - 1e-6)
    y = np.asarray(labels, dtype=float)
    if len(p) == 0:
        return float("nan")
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))


def calibrate_binary_market(
    model_probs: Sequence[float],
    labels: Sequence[int],
    market_probs: Sequence[float | None],
    *,
    fit_frac: float = 0.5,
) -> dict:
    """يقدّر حرارة ثنائية على الشطر الأول ويقيس على الثاني مقابل السوق (إن وُجد).

    يعيد {"temperature", "n_eval", "brier_model", "brier_market", "ll_model", "ll_market",
    "use_market_only": bool} — الحكم: Brier النموذج ≤ السوق + 0.005 وإلا السوق وحده.
    """
    n = len(model_probs)
    if n < 100:
        return {"temperature": 1.0, "n_eval": 0, "use_market_only": True}
    cut = int(n * fit_frac)
    temp = fit_binary_temperature(list(model_probs[:cut]), list(labels[:cut]))
    eval_p = [apply_binary_temperature(float(p), temp) for p in model_probs[cut:]]
    eval_y = list(labels[cut:])
    pairs = [(p, y, mk) for p, y, mk in zip(eval_p, eval_y, market_probs[cut:]) if mk is not None]
    out = {
        "temperature": float(temp),
        "n_eval": len(eval_p),
        "brier_model": brier_binary(eval_p, eval_y),
        "ll_model": log_loss_binary(eval_p, eval_y),
    }
    if pairs:
        mp = [p for p, _, _ in pairs]
        my = [y for _, y, _ in pairs]
        mk = [m for _, _, m in pairs]
        out["n_vs_market"] = len(pairs)
        out["brier_model_vs_market_slice"] = brier_binary(mp, my)
        out["brier_market"] = brier_binary(mk, my)
        out["ll_market"] = log_loss_binary(mk, my)
        out["use_market_only"] = bool(out["brier_model_vs_market_slice"] > out["brier_market"] + 0.005)
    else:
        out["use_market_only"] = False
    return out

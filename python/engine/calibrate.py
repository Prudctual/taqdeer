"""Probability calibration: temperature scaling on 1X2 logits."""

from __future__ import annotations

import math
from typing import List, Sequence, Tuple

import numpy as np
from scipy.optimize import brentq, minimize_scalar


Prob3 = Tuple[float, float, float]


def _to_logits(p: Prob3) -> np.ndarray:
    ph, pd, pa = p
    # shift so mean logit ~ 0
    eps = 1e-9
    logs = np.log(np.array([ph, pd, pa]) + eps)
    return logs - logs.mean()


def _softmax(logits: np.ndarray, temperature: float) -> np.ndarray:
    z = logits / max(temperature, 1e-3)
    z = z - z.max()
    e = np.exp(z)
    return e / e.sum()


def fit_temperature(
    probs: Sequence[Prob3],
    outcomes: Sequence[str],
    bounds=(0.5, 4.0),
    *,
    mults: Sequence[float] | None = None,
) -> float:
    """
    الحد الأعلى واسع بقصد: دوري بلا إشارة (الكوري) كان يُثبَّت عند 2.5 فيخرج
    بثقة لا يملكها. السماح بالتسطيح حتى 4.0 يجعل المخرج يقول "لا أعرف" صراحةً.

    `mults` (اختياري): مضاعف حرارة لكل صف (بداية الموسم/العشوائية) — يُقدَّر T
    الأساسي بحيث تكون حرارة الصف i هي T·mults[i]، كما يطبّقها `predict_match`.
    """
    if len(probs) < 30:
        return 1.0
    y_idx = [{"H": 0, "D": 1, "A": 2}[o] for o in outcomes]
    logits = [_to_logits(p) for p in probs]
    row_mults = [float(m) for m in mults] if mults is not None else [1.0] * len(logits)

    def nll(t: float) -> float:
        total = 0.0
        for logit, yi, mi in zip(logits, y_idx, row_mults):
            p = _softmax(logit, t * mi)
            total -= math.log(max(float(p[yi]), 1e-12))
        return total

    res = minimize_scalar(nll, bounds=bounds, method="bounded")
    return float(res.x) if res.success else 1.0


def apply_temperature(p: Prob3, temperature: float) -> Prob3:
    sm = _softmax(_to_logits(p), temperature)
    return float(sm[0]), float(sm[1]), float(sm[2])


DEMARGIN_METHODS = ("power", "shin", "basic")
DEFAULT_DEMARGIN = "power"


def _basic_probs(invs: np.ndarray) -> Prob3:
    s = float(invs.sum())
    return float(invs[0] / s), float(invs[1] / s), float(invs[2] / s)


def _power_probs(invs: np.ndarray) -> Prob3:
    """Power method: p_i = π_i^k مع k بحيث Σp=1 — يصحّح انحياز المفضّل/البعيد."""

    def diff(k: float) -> float:
        return float(np.sum(np.power(invs, k)) - 1.0)

    k_opt = float(brentq(diff, 0.4, 4.0))
    p = np.power(invs, k_opt)
    p = p / p.sum()
    return float(p[0]), float(p[1]), float(p[2])


def _shin_probs(invs: np.ndarray) -> Prob3:
    """Shin (1993): نسبة z من الرهانات "المطّلعة" تُفسّر الهامش؛ الحل بطريقة النقطة الثابتة.

        p_i = ( sqrt(z² + 4(1−z)·π_i²/Σπ) − z ) / (2(1−z))
    """
    s = float(invs.sum())
    if s <= 1.0:
        return _basic_probs(invs)
    n_out = float(len(invs))
    z = 0.0
    for _ in range(200):
        root = np.sqrt(z * z + 4.0 * (1.0 - z) * (invs * invs) / s)
        # Σp=1 ⇒ z = (Σroot − 2) / (n − 2)
        z_new = float((np.sum(root) - 2.0) / (n_out - 2.0))
        if abs(z_new - z) < 1e-12:
            z = z_new
            break
        z = max(0.0, min(z_new, 0.5))
    root = np.sqrt(z * z + 4.0 * (1.0 - z) * (invs * invs) / s)
    p = (root - z) / (2.0 * (1.0 - z))
    p = np.clip(p, 1e-9, None)
    p = p / p.sum()
    return float(p[0]), float(p[1]), float(p[2])


def odds_to_probs(
    oh: float, od: float, oa: float, method: str = DEFAULT_DEMARGIN
) -> Prob3 | None:
    """
    تحويل أودز عشرية إلى احتمالات منزوعة الهامش.
    method: "power" (افتراضي) | "shin" | "basic". يُختار لكل دوري عبر
    `choose_demargin_method` بأقل log-loss على التاريخ.
    """
    if oh is None or od is None or oa is None or min(oh, od, oa) <= 1.01:
        return None
    invs = np.array([1.0 / oh, 1.0 / od, 1.0 / oa], dtype=float)
    s = float(invs.sum())
    if s <= 0:
        return None
    if abs(s - 1.0) < 1e-4:
        return float(invs[0]), float(invs[1]), float(invs[2])
    try:
        if method == "shin":
            return _shin_probs(invs)
        if method == "basic":
            return _basic_probs(invs)
        return _power_probs(invs)
    except Exception:
        return _basic_probs(invs)


def choose_demargin_method(
    odds_list: Sequence[Tuple[float, float, float]],
    outcomes: Sequence[str],
    *,
    min_n: int = 100,
) -> dict:
    """يقارن الطرق الثلاث على أودز إغلاق حقيقية ويعيد الأقل log-loss.

    الفوارق عادةً صغيرة (10⁻³)؛ إن كان n أقل من min_n نُبقي الافتراضي.
    """
    y_idx = [{"H": 0, "D": 1, "A": 2}[o] for o in outcomes]
    result: dict = {"method": DEFAULT_DEMARGIN, "n": len(odds_list), "log_loss": {}}
    if len(odds_list) < min_n:
        return result
    best_method = DEFAULT_DEMARGIN
    best_ll = float("inf")
    for method in DEMARGIN_METHODS:
        total = 0.0
        n = 0
        for (oh, od, oa), yi in zip(odds_list, y_idx):
            p = odds_to_probs(oh, od, oa, method=method)
            if p is None:
                continue
            total -= math.log(max(float(p[yi]), 1e-12))
            n += 1
        if n == 0:
            continue
        ll = total / n
        result["log_loss"][method] = ll
        if ll < best_ll - 1e-12:
            best_ll = ll
            best_method = method
    result["method"] = best_method
    return result


"""Probability calibration: temperature scaling on 1X2 logits."""

from __future__ import annotations

import math
from typing import List, Sequence, Tuple

import numpy as np
from scipy.optimize import minimize_scalar


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
    probs: Sequence[Prob3], outcomes: Sequence[str], bounds=(0.5, 4.0)
) -> float:
    """
    الحد الأعلى واسع بقصد: دوري بلا إشارة (الكوري) كان يُثبَّت عند 2.5 فيخرج
    بثقة لا يملكها. السماح بالتسطيح حتى 4.0 يجعل المخرج يقول "لا أعرف" صراحةً.
    """
    if len(probs) < 30:
        return 1.0
    y_idx = [{"H": 0, "D": 1, "A": 2}[o] for o in outcomes]
    logits = [_to_logits(p) for p in probs]

    def nll(t: float) -> float:
        total = 0.0
        for logit, yi in zip(logits, y_idx):
            p = _softmax(logit, t)
            total -= math.log(max(float(p[yi]), 1e-12))
        return total

    res = minimize_scalar(nll, bounds=bounds, method="bounded")
    return float(res.x) if res.success else 1.0


def apply_temperature(p: Prob3, temperature: float) -> Prob3:
    sm = _softmax(_to_logits(p), temperature)
    return float(sm[0]), float(sm[1]), float(sm[2])


def odds_to_probs(oh: float, od: float, oa: float) -> Prob3 | None:
    """
    Convert decimal odds to un-biased implied probabilities using Power Method de-margining.
    Removes bookmaker overround while correcting Favorite-Longshot Bias.
    """
    if min(oh, od, oa) <= 1.01:
        return None
    invs = np.array([1.0 / oh, 1.0 / od, 1.0 / oa], dtype=float)
    s = float(invs.sum())
    if s <= 0:
        return None
    if abs(s - 1.0) < 1e-4:
        return float(invs[0]), float(invs[1]), float(invs[2])

    try:
        from scipy.optimize import brentq

        def diff(k: float) -> float:
            return float(np.sum(np.power(invs, k)) - 1.0)

        k_opt = float(brentq(diff, 0.4, 4.0))
        p = np.power(invs, k_opt)
        p = p / p.sum()
        return float(p[0]), float(p[1]), float(p[2])
    except Exception:
        # Fallback to standard normalization if numerical root solver fails
        return float(invs[0] / s), float(invs[1] / s), float(invs[2] / s)


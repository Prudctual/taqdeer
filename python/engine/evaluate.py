"""Walk-forward calibration metrics."""

from __future__ import annotations

import math
from typing import Dict, List, Optional, Tuple


def brier_score(probs: List[Tuple[float, float, float]], outcomes: List[str]) -> float:
    total = 0.0
    for (ph, pd, pa), o in zip(probs, outcomes):
        y = [1.0 if o == "H" else 0.0, 1.0 if o == "D" else 0.0, 1.0 if o == "A" else 0.0]
        total += (ph - y[0]) ** 2 + (pd - y[1]) ** 2 + (pa - y[2]) ** 2
    return total / max(len(probs), 1)


def log_loss(probs: List[Tuple[float, float, float]], outcomes: List[str]) -> float:
    total = 0.0
    for (ph, pd, pa), o in zip(probs, outcomes):
        p = {"H": ph, "D": pd, "A": pa}[o]
        total -= math.log(max(p, 1e-12))
    return total / max(len(probs), 1)


def rps(probs: List[Tuple[float, float, float]], outcomes: List[str]) -> float:
    """Ranked probability score على الترتيب H<D<A — يعاقب الخطأ البعيد أشد من القريب."""
    total = 0.0
    for (ph, pd, _pa), o in zip(probs, outcomes):
        y1 = 1.0 if o == "H" else 0.0
        y2 = y1 + (1.0 if o == "D" else 0.0)
        c1 = ph - y1
        c2 = ph + pd - y2
        total += (c1 * c1 + c2 * c2) / 2.0
    return total / max(len(probs), 1)


def accuracy(probs: List[Tuple[float, float, float]], outcomes: List[str]) -> float:
    correct = 0
    for (ph, pd, pa), o in zip(probs, outcomes):
        pred = max(("H", ph), ("D", pd), ("A", pa), key=lambda x: x[1])[0]
        if pred == o:
            correct += 1
    return correct / max(len(probs), 1)


def summarize(
    probs: List[Tuple[float, float, float]], outcomes: List[str]
) -> Dict[str, float]:
    return {
        "n": float(len(probs)),
        "accuracy": accuracy(probs, outcomes),
        "brier": brier_score(probs, outcomes),
        "log_loss": log_loss(probs, outcomes),
        "rps": rps(probs, outcomes),
    }


def summarize_with_closing(
    probs: List[Tuple[float, float, float]],
    outcomes: List[str],
    close_odds: List[Optional[Tuple[float, float, float]]],
) -> Dict[str, float]:
    """مقاييس walk-forward + مقارنة NLL بخط الإغلاق."""
    from .sharp_market import log_loss_vs_closing

    base = summarize(probs, outcomes)
    cl = log_loss_vs_closing(probs, close_odds, outcomes)
    base["close_n"] = cl["n"]
    base["close_nll"] = cl["close_nll"]
    base["model_nll_close"] = cl["model_nll"]
    base["nll_edge_vs_close"] = cl["nll_edge"]
    return base


def binary_log_loss(probs: List[float], labels: List[int]) -> float:
    total = 0.0
    for p, y in zip(probs, labels):
        pp = min(max(float(p), 1e-12), 1.0 - 1e-12)
        total -= y * math.log(pp) + (1 - y) * math.log(1.0 - pp)
    return total / max(len(probs), 1)


def fit_binary_temperature(
    probs: List[float], labels: List[int], bounds=(0.5, 4.0)
) -> float:
    """حرارة لوغاريتمية بسيطة لأسواق ثنائية (O2.5 / BTTS)."""
    if len(probs) < 40:
        return 1.0
    from scipy.optimize import minimize_scalar

    def nll(t: float) -> float:
        scaled = []
        for p in probs:
            # map p through temperature on logit
            pp = min(max(float(p), 1e-9), 1.0 - 1e-9)
            logit = math.log(pp / (1.0 - pp)) / max(t, 1e-3)
            scaled.append(1.0 / (1.0 + math.exp(-logit)))
        return binary_log_loss(scaled, labels)

    res = minimize_scalar(nll, bounds=bounds, method="bounded")
    return float(res.x) if res.success else 1.0


def apply_binary_temperature(p: float, temperature: float) -> float:
    pp = min(max(float(p), 1e-9), 1.0 - 1e-9)
    logit = math.log(pp / (1.0 - pp)) / max(float(temperature), 1e-3)
    return float(1.0 / (1.0 + math.exp(-logit)))

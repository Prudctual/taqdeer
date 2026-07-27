"""Walk-forward calibration metrics."""

from __future__ import annotations

import math
from typing import Dict, List, Tuple


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

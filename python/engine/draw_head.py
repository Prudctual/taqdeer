"""رأس تعادل ثنائي مستقل — logistic على |λh−λa|، λh+λa، ولوجيت تعادل اللبّ.

يُستعمل **للإقصاء** في غربال المحسوم (p_draw_head ≥ 0.30 → ليست محسومة)، لا لترشيح
التعادل ولا لتعديل احتمالات 1X2 المنشورة.
"""

from __future__ import annotations

import math
from typing import Sequence

import numpy as np
from scipy.optimize import minimize

FEATURE_NAMES = ("bias", "abs_lambda_gap", "total_lambda", "logit_core_draw")


def _logit(p: float) -> float:
    p = min(max(float(p), 1e-6), 1 - 1e-6)
    return math.log(p / (1 - p))


def draw_features(lam: float, mu: float, p_draw_core: float) -> list[float]:
    return [1.0, abs(float(lam) - float(mu)), float(lam) + float(mu), _logit(p_draw_core)]


def fit_draw_head(
    features: Sequence[Sequence[float]],
    is_draw: Sequence[int],
    *,
    l2: float = 0.5,
) -> list[float] | None:
    """انحدار لوجستي بعقوبة L2 خفيفة؛ يعيد المعاملات أو None إن قلّت العيّنة."""
    X = np.asarray(features, dtype=float)
    y = np.asarray(is_draw, dtype=float)
    if len(y) < 150 or y.sum() < 20:
        return None
    # تقييس الميزات (عدا الانحياز) لاستقرار التحسين — المعاملات تُعاد إلى المقياس الأصلي
    mean = X[:, 1:].mean(axis=0)
    std = X[:, 1:].std(axis=0)
    std[std < 1e-9] = 1.0
    Xs = X.copy()
    Xs[:, 1:] = (X[:, 1:] - mean) / std

    def nll(w: np.ndarray) -> float:
        z = Xs @ w
        # log(1+e^z) مستقر
        ll = y * z - np.logaddexp(0.0, z)
        return float(-ll.sum() + l2 * np.sum(w[1:] ** 2))

    def grad(w: np.ndarray) -> np.ndarray:
        z = Xs @ w
        p = 1.0 / (1.0 + np.exp(-z))
        g = Xs.T @ (p - y)
        g[1:] += 2.0 * l2 * w[1:]
        return g

    w0 = np.zeros(X.shape[1])
    w0[0] = _logit(float(y.mean()))
    res = minimize(nll, w0, jac=grad, method="L-BFGS-B", options={"maxiter": 500})
    w = res.x
    # إعادة المعاملات إلى مقياس الميزات الأصلي
    coefs = np.zeros_like(w)
    coefs[1:] = w[1:] / std
    coefs[0] = w[0] - float(np.sum(w[1:] * mean / std))
    return [float(c) for c in coefs]


def predict_draw_head(coefs: Sequence[float] | None, lam: float, mu: float, p_draw_core: float) -> float | None:
    if not coefs:
        return None
    z = float(np.dot(np.asarray(coefs, dtype=float), np.asarray(draw_features(lam, mu, p_draw_core))))
    z = max(min(z, 30.0), -30.0)
    return float(1.0 / (1.0 + math.exp(-z)))

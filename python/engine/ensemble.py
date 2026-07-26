"""Multi-signal ensemble for match outcomes."""

from __future__ import annotations

from typing import Dict, Optional, Tuple

import numpy as np

from .calibrate import apply_temperature, odds_to_probs
from .dixon_coles import (
    DixonColesResult,
    expected_goals as dc_xg,
    markets_from_matrix,
    score_matrix,
)
from .elo import elo_outcome_probs
from .form import TeamForm, form_lambda_adjust
from .pi_ratings import PiState, pi_expected_goals

Prob3 = Tuple[float, float, float]


def _norm(h: float, d: float, a: float) -> Prob3:
    s = h + d + a
    if s <= 0:
        return 1 / 3, 1 / 3, 1 / 3
    return h / s, d / s, a / s


def _blend_many(parts: list[tuple[Prob3, float]]) -> Prob3:
    tw = sum(w for _, w in parts) or 1.0
    h = sum(p[0] * w for p, w in parts) / tw
    d = sum(p[1] * w for p, w in parts) / tw
    a = sum(p[2] * w for p, w in parts) / tw
    return _norm(h, d, a)


def matrix_from_lambdas(lam: float, mu: float, rho: float):
    return score_matrix(lam, mu, rho)


def align_matrix_to_probs(mat: np.ndarray, target: Prob3) -> np.ndarray:
    """
    أعد وزن كتل المصفوفة (فوز/تعادل/خسارة) لتساوي الاحتمالات المعايرة،
    مع حفظ شكل التوزيع داخل كل كتلة.

    بدون هذا تعرض الصفحة رقمين متناقضين: شريط 1X2 معايَر وخريطة نتائج غير معايرة.
    """
    n = mat.shape[0]
    i = np.arange(n)[:, None]
    j = np.arange(n)[None, :]
    out = np.zeros_like(mat)
    for mask, t in zip((i > j, i == j, i < j), target):
        block = mat[mask].sum()
        if block > 0 and t > 0:
            out[mask] = mat[mask] * (t / block)
    total = out.sum()
    return out / total if total > 0 else mat


def predict_match(
    *,
    home: str,
    away: str,
    dc: DixonColesResult,
    elo_home: float,
    elo_away: float,
    pi: PiState,
    form_home: TeamForm,
    form_away: TeamForm,
    market_odds: Optional[tuple[float, float, float]] = None,
    temperature: float = 1.0,
    weights: Optional[Dict[str, float]] = None,
) -> Dict:
    w = weights or {
        "dc": 0.42,
        "pi": 0.18,
        "elo": 0.18,
        "form": 0.10,
        "market": 0.12,
    }

    # --- Dixon-Coles base λ ---
    lam_dc, mu_dc = dc_xg(dc, home, away)
    f_h, f_a = form_lambda_adjust(form_home, form_away)
    lam_f = lam_dc * f_h
    mu_f = mu_dc * f_a

    # Pi-ratings λ
    lam_pi, mu_pi = pi_expected_goals(pi, home, away)

    # Blend intensities (geometric mean keeps Poisson-ish)
    import math

    lam = math.exp(
        0.62 * math.log(lam_f) + 0.25 * math.log(lam_pi) + 0.13 * math.log(lam_dc)
    )
    mu = math.exp(
        0.62 * math.log(mu_f) + 0.25 * math.log(mu_pi) + 0.13 * math.log(mu_dc)
    )

    mat = matrix_from_lambdas(lam, mu, dc.rho)
    mk = markets_from_matrix(mat)
    dc_p = (mk["p_home"], mk["p_draw"], mk["p_away"])

    # Form-tilted DC (already in λ) — separate signal from pure DC
    mat_dc = matrix_from_lambdas(lam_dc, mu_dc, dc.rho)
    mk_dc = markets_from_matrix(mat_dc)
    pure_dc = (mk_dc["p_home"], mk_dc["p_draw"], mk_dc["p_away"])

    mat_pi = matrix_from_lambdas(lam_pi, mu_pi, dc.rho * 0.5)
    mk_pi = markets_from_matrix(mat_pi)
    pi_p = (mk_pi["p_home"], mk_pi["p_draw"], mk_pi["p_away"])

    elo_p = elo_outcome_probs(elo_home, elo_away)

    # Form as 1X2 via points differential
    pts_gap = form_home.pts - form_away.pts  # per-match avg points last 5
    # map pts_gap (-3..3) to home lean
    home_lean = 1 / (1 + math.exp(-1.1 * pts_gap))
    form_draw = 0.24 + 0.06 * (1 - abs(pts_gap) / 3)
    form_p = _norm(home_lean * (1 - form_draw), form_draw, (1 - home_lean) * (1 - form_draw))

    parts: list[tuple[Prob3, float]] = [
        (dc_p, w["dc"]),
        (pi_p, w["pi"]),
        (elo_p, w["elo"]),
        (form_p, w["form"]),
    ]

    market_p = None
    if market_odds:
        market_p = odds_to_probs(*market_odds)
        if market_p:
            parts.append((market_p, w["market"]))

    blended = _blend_many(parts)
    calibrated = apply_temperature(blended, temperature)

    # وفّق المصفوفة مع 1X2 المعايَر ثم اشتق كل الأسواق منها — مصدر واحد للحقيقة
    mat = align_matrix_to_probs(mat, calibrated)
    mk = markets_from_matrix(mat)

    edge = None
    if market_p:
        edge = {
            "home": calibrated[0] - market_p[0],
            "draw": calibrated[1] - market_p[1],
            "away": calibrated[2] - market_p[2],
        }

    # Expected points for home/away
    xpts_home = 3 * calibrated[0] + calibrated[1]
    xpts_away = 3 * calibrated[2] + calibrated[1]

    conf = max(calibrated)
    # sharper when signals agree
    agree = 1.0 - (
        abs(dc_p[0] - elo_p[0]) + abs(dc_p[0] - pi_p[0]) + abs(dc_p[0] - form_p[0])
    ) / 3
    confidence = float(min(0.95, max(0.18, 0.55 * conf + 0.35 * max(agree, 0))))

    return {
        "lambda_home": lam,
        "lambda_away": mu,
        "p_home": calibrated[0],
        "p_draw": calibrated[1],
        "p_away": calibrated[2],
        "p_btts_yes": mk["p_btts_yes"],
        "p_over25": mk["p_over25"],
        "matrix": mat,
        "confidence": confidence,
        "xpts_home": xpts_home,
        "xpts_away": xpts_away,
        "components": {
            "dixon_coles": {"p": pure_dc, "lambda": [lam_dc, mu_dc]},
            "pi_ratings": {"p": pi_p, "lambda": [lam_pi, mu_pi]},
            "elo": {"p": elo_p, "ratings": [elo_home, elo_away]},
            "form": {
                "p": form_p,
                "home_pts": form_home.pts,
                "away_pts": form_away.pts,
                "home_gd": form_home.gd,
                "away_gd": form_away.gd,
            },
            "market": {"p": market_p, "odds": market_odds},
            "blended_pre_cal": blended,
            "temperature": temperature,
        },
        "edge": edge,
        "weights": w,
    }

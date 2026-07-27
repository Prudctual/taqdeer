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
from .player_impact import apply_rapm_to_xg

Prob3 = Tuple[float, float, float]

WEIGHT_KEYS = ("dc", "pi", "elo", "form", "market")
DEFAULT_WEIGHTS: Dict[str, float] = {
    "dc": 0.42,
    "pi": 0.18,
    "elo": 0.18,
    "form": 0.10,
    "market": 0.12,
}


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


def blend_components(comp: Dict[str, Optional[Prob3]], weights: Dict[str, float]) -> Prob3:
    """نفس خلط predict_match لكن من احتمالات مكوّنات مخزنة — لإعادة المزج بأوزان جديدة."""
    parts = [(comp[k], weights[k]) for k in WEIGHT_KEYS if comp.get(k) is not None]
    return _blend_many(parts)


def fit_weights(
    comps: list[Dict[str, Optional[Prob3]]],
    outcomes: list[str],
    ridge: float = 1.0,
) -> Dict[str, float]:
    """
    تعلُّم أوزان الخلط بتقليل log-loss على نافذة walk-forward (stacking فعلي).

    softmax على θ يضمن أوزاناً موجبة مجموعها 1، والـridge نحو الافتراضيات يمنع
    الانهيار على إشارة واحدة عندما تكون النافذة قصيرة (~100 مباراة لخمسة أوزان).
    """
    import math

    if len(comps) < 40:
        return dict(DEFAULT_WEIGHTS)
    from scipy.optimize import minimize

    theta0 = np.log(np.array([DEFAULT_WEIGHTS[k] for k in WEIGHT_KEYS]))
    y_idx = [{"H": 0, "D": 1, "A": 2}[o] for o in outcomes]

    def nll(theta: np.ndarray) -> float:
        w = np.exp(theta - theta.max())
        w = w / w.sum()
        wd = dict(zip(WEIGHT_KEYS, w))
        total = ridge * float(np.sum((theta - theta0) ** 2))
        for c, yi in zip(comps, y_idx):
            p = blend_components(c, wd)
            total -= math.log(max(float(p[yi]), 1e-12))
        return total

    res = minimize(
        nll, theta0, method="Nelder-Mead", options={"maxiter": 800, "xatol": 1e-3, "fatol": 1e-3}
    )
    # res.x هو أفضل رأس في السمبلكس — لا يكون أسوأ من theta0 حتى بلا تقارب،
    # وفحص success كان يرمي الأوزان المتعلَّمة كلما نفدت ميزانية التكرارات
    theta = res.x
    w = np.exp(theta - theta.max())
    w = w / w.sum()
    return {k: float(v) for k, v in zip(WEIGHT_KEYS, w)}


def value_signal(
    calibrated: Prob3, market_odds: tuple[float, float, float]
) -> Optional[Dict]:
    """+EV مقابل أسعار السوق وحصة كيلي الربعية على الأفضل — بلا رهان دون عتبة 3%."""
    best = None
    for name, p, odds in zip(("home", "draw", "away"), calibrated, market_odds):
        b = odds - 1.0
        if b <= 0:
            continue
        ev = p * odds - 1.0
        kelly = max(0.0, (p * b - (1.0 - p)) / b)
        cand = {
            "side": name,
            "odds": float(odds),
            "p": float(p),
            "ev": float(ev),
            "kelly": float(kelly),
            "stake": float(round(0.25 * kelly, 4)),
        }
        # الترتيب بكيلي لا بـEV: كيلي = EV/(السعر−1)، فعند تساوي القيمة المتوقعة
        # يُفضَّل الرهان الأقل تذبذباً — الأمثل لنموّ المحفظة اللوغاريتمي
        if best is None or cand["kelly"] > best["kelly"]:
            best = cand
    if best is None:
        return None
    # نطاق موثوق 3–15%: تحت 3% ضجيج، وفوق 15% ضد سعر إغلاق يعني نقطة عمياء
    # في النموذج (جولات ميتة، تدوير تشكيلات) لا فرصة حقيقية
    best["bet"] = bool(0.03 <= best["ev"] <= 0.15 and best["kelly"] > 0)
    return best


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
    dc_shots: Optional[DixonColesResult] = None,
    home_missing: Optional[list] = None,
    away_missing: Optional[list] = None,
) -> Dict:
    w = weights or dict(DEFAULT_WEIGHTS)

    # --- Dixon-Coles base λ ---
    lam_dc, mu_dc = dc_xg(dc, home, away)
    f_h, f_a = form_lambda_adjust(form_home, form_away)
    lam_f = lam_dc * f_h
    mu_f = mu_dc * f_a

    # Pi-ratings λ
    lam_pi, mu_pi = pi_expected_goals(pi, home, away)

    # Blend intensities (geometric mean keeps Poisson-ish)
    import math

    lam_sh = mu_sh = None
    if dc_shots is not None:
        # DC مواز مدرَّب على أهداف زائفة من التسديدات — الأهداف ضجيج بواسوني
        # والتسديدات تحمل إشارة القوة الأثبت (بديل xG العملي بلا بيانات تتبّع)
        lam_sh, mu_sh = dc_xg(dc_shots, home, away)
        lam = math.exp(
            0.47 * math.log(lam_f)
            + 0.20 * math.log(lam_pi)
            + 0.08 * math.log(lam_dc)
            + 0.25 * math.log(lam_sh)
        )
        mu = math.exp(
            0.47 * math.log(mu_f)
            + 0.20 * math.log(mu_pi)
            + 0.08 * math.log(mu_dc)
            + 0.25 * math.log(mu_sh)
        )
    else:
        lam = math.exp(
            0.62 * math.log(lam_f) + 0.25 * math.log(lam_pi) + 0.13 * math.log(lam_dc)
        )
        mu = math.exp(
            0.62 * math.log(mu_f) + 0.25 * math.log(mu_pi) + 0.13 * math.log(mu_dc)
        )

    # RAPM Player Impact adjustment for key missing starters
    if home_missing or away_missing:
        lam, mu = apply_rapm_to_xg(lam, mu, home_missing, away_missing)

    # Tight contest detection: close Elo ratings & low goal disparity
    elo_diff = abs(elo_home - elo_away)
    is_tight = elo_diff < 55 or abs(lam - mu) < 0.25
    if is_tight:
        # Tactical caution adjustment: slightly compress expected goals for tight clashes
        lam *= 0.95
        mu *= 0.95

    mat = score_matrix(lam, mu, dc.rho)
    mk = markets_from_matrix(mat)
    dc_p = (mk["p_home"], mk["p_draw"], mk["p_away"])

    mat_pi = score_matrix(lam_pi, mu_pi, dc.rho * 0.5)
    mk_pi = markets_from_matrix(mat_pi)
    pi_p = (mk_pi["p_home"], mk_pi["p_draw"], mk_pi["p_away"])

    elo_p = elo_outcome_probs(elo_home, elo_away)

    # Form as 1X2 via points differential
    pts_gap = form_home.pts - form_away.pts  # per-match avg points last 5
    # map pts_gap (-3..3) to home lean
    home_lean = 1 / (1 + math.exp(-1.1 * pts_gap))
    form_draw = 0.24 + 0.06 * (1 - abs(pts_gap) / 3)
    if is_tight:
        form_draw += 0.03
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
    value = None
    if market_p:
        edge = {
            "home": calibrated[0] - market_p[0],
            "draw": calibrated[1] - market_p[1],
            "away": calibrated[2] - market_p[2],
        }
        value = value_signal(calibrated, market_odds)

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
            # ما يدخل الخلط فعلاً بوزن 0.42: احتمالات λ المُمالة بالفورم وPi —
            # لا DC الخام، حتى يصدق تتبّع الرقم على صفحة المباراة
            "dixon_coles": {"p": dc_p, "lambda": [lam, mu]},
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
            "shots_dc": {"lambda": [lam_sh, mu_sh]} if lam_sh is not None else None,
            "blended_pre_cal": blended,
            "temperature": temperature,
        },
        "edge": edge,
        "value": value,
        "weights": w,
    }

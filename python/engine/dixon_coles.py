"""Dixon-Coles bivariate Poisson with exponential time decay (vectorized MLE)."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Dict, List, Sequence, Tuple

import numpy as np
from scipy.optimize import minimize
from scipy.special import gammaln


@dataclass
class MatchObs:
    home: str
    away: str
    home_goals: int
    away_goals: int
    days_ago: float
    weight: float


@dataclass
class DixonColesResult:
    teams: List[str]
    attack: Dict[str, float]
    defense: Dict[str, float]
    home_advantage: float
    rho: float


def _poisson_logpmf(k: np.ndarray, lam: np.ndarray) -> np.ndarray:
    return k * np.log(lam) - lam - gammaln(k + 1)


def tau_vec(x: np.ndarray, y: np.ndarray, lam: np.ndarray, mu: np.ndarray, rho: float) -> np.ndarray:
    t = np.ones_like(lam, dtype=float)
    m00 = (x == 0) & (y == 0)
    m01 = (x == 0) & (y == 1)
    m10 = (x == 1) & (y == 0)
    m11 = (x == 1) & (y == 1)
    t[m00] = 1 - lam[m00] * mu[m00] * rho
    t[m01] = 1 + lam[m01] * rho
    t[m10] = 1 + mu[m10] * rho
    t[m11] = 1 - rho
    return np.clip(t, 1e-12, None)


def dc_probability(x: int, y: int, lam: float, mu: float, rho: float) -> float:
    xx = np.array([x], dtype=float)
    yy = np.array([y], dtype=float)
    ll = np.array([lam], dtype=float)
    mm = np.array([mu], dtype=float)
    t = tau_vec(xx, yy, ll, mm, rho)[0]
    logp = math.log(t) + _poisson_logpmf(xx, ll)[0] + _poisson_logpmf(yy, mm)[0]
    return float(math.exp(logp))


def make_weights(days_ago: Sequence[float], half_life_days: float = 150.0) -> np.ndarray:
    arr = np.asarray(days_ago, dtype=float)
    return np.power(0.5, arr / half_life_days)


def fit_dixon_coles(
    matches: List[MatchObs],
    half_life_days: float = 150.0,
) -> DixonColesResult:
    teams = sorted({m.home for m in matches} | {m.away for m in matches})
    n = len(teams)
    idx = {t: i for i, t in enumerate(teams)}

    home_i = np.array([idx[m.home] for m in matches], dtype=int)
    away_i = np.array([idx[m.away] for m in matches], dtype=int)
    xg = np.array([m.home_goals for m in matches], dtype=float)
    yg = np.array([m.away_goals for m in matches], dtype=float)
    weights = make_weights([m.days_ago for m in matches], half_life_days)

    def unpack(theta: np.ndarray) -> Tuple[np.ndarray, np.ndarray, float, float]:
        attack = theta[:n].copy()
        defense = theta[n : 2 * n].copy()
        home_adv = float(theta[2 * n])
        rho = float(np.clip(theta[2 * n + 1], -0.3, 0.3))
        attack = attack - attack.mean()
        return attack, defense, home_adv, rho

    def nll(theta: np.ndarray) -> float:
        attack, defense, home_adv, rho = unpack(theta)
        lam = np.exp(home_adv + attack[home_i] - defense[away_i])
        mu = np.exp(attack[away_i] - defense[home_i])
        lam = np.clip(lam, 1e-3, 8.0)
        mu = np.clip(mu, 1e-3, 8.0)
        t = tau_vec(xg, yg, lam, mu, rho)
        logp = np.log(t) + _poisson_logpmf(xg, lam) + _poisson_logpmf(yg, mu)
        total = -float(np.sum(weights * logp))
        total += 0.01 * float(np.sum(attack**2) + np.sum(defense**2))
        return total

    x0 = np.zeros(2 * n + 2)
    x0[2 * n] = 0.25
    x0[2 * n + 1] = -0.05

    res = minimize(
        nll,
        x0,
        method="L-BFGS-B",
        options={"maxiter": 400, "ftol": 1e-9},
    )
    if not res.success:
        # لا نُسقط النتيجة — لكن الصمت على عدم التقارب يخفي انحيازاً في التقديرات
        print(f"    ⚠ Dixon-Coles لم يتقارب: {res.message}")
    attack, defense, home_adv, rho = unpack(res.x)
    return DixonColesResult(
        teams=teams,
        attack={t: float(attack[idx[t]]) for t in teams},
        defense={t: float(defense[idx[t]]) for t in teams},
        home_advantage=float(home_adv),
        rho=float(rho),
    )


def expected_goals(
    model: DixonColesResult, home: str, away: str
) -> Tuple[float, float]:
    a_h = model.attack.get(home, 0.0)
    a_a = model.attack.get(away, 0.0)
    d_h = model.defense.get(home, 0.0)
    d_a = model.defense.get(away, 0.0)
    lam = math.exp(model.home_advantage + a_h - d_a)
    mu = math.exp(a_a - d_h)
    return float(min(max(lam, 0.2), 5.5)), float(min(max(mu, 0.2), 5.5))


def score_matrix(
    lam: float, mu: float, rho: float, max_goals: int = 6
) -> np.ndarray:
    mat = np.zeros((max_goals + 1, max_goals + 1))
    for i in range(max_goals + 1):
        for j in range(max_goals + 1):
            mat[i, j] = dc_probability(i, j, lam, mu, rho)
    s = mat.sum()
    if s > 0:
        mat /= s
    return mat


def markets_from_matrix(mat: np.ndarray) -> Dict[str, float]:
    max_g = mat.shape[0] - 1
    p_home = float(
        sum(mat[i, j] for i in range(max_g + 1) for j in range(max_g + 1) if i > j)
    )
    p_draw = float(sum(mat[i, i] for i in range(max_g + 1)))
    p_away = float(
        sum(mat[i, j] for i in range(max_g + 1) for j in range(max_g + 1) if i < j)
    )
    p_btts = float(
        sum(mat[i, j] for i in range(1, max_g + 1) for j in range(1, max_g + 1))
    )
    p_over25 = float(
        sum(
            mat[i, j]
            for i in range(max_g + 1)
            for j in range(max_g + 1)
            if i + j >= 3
        )
    )
    return {
        "p_home": p_home,
        "p_draw": p_draw,
        "p_away": p_away,
        "p_btts_yes": p_btts,
        "p_over25": p_over25,
    }


def top_scores(mat: np.ndarray, k: int = 6) -> List[Dict[str, float]]:
    items = []
    for i in range(mat.shape[0]):
        for j in range(mat.shape[1]):
            items.append({"hg": i, "ag": j, "p": float(mat[i, j])})
    items.sort(key=lambda x: x["p"], reverse=True)
    return items[:k]

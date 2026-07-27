"""Dynamic club Elo with goal-margin and home advantage."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple


@dataclass
class EloMatch:
    home: str
    away: str
    home_goals: int
    away_goals: int
    date: str


def expected_score(r_a: float, r_b: float) -> float:
    return 1.0 / (1.0 + 10 ** ((r_b - r_a) / 400.0))


def goal_multiplier(goal_diff: int) -> float:
    gd = abs(goal_diff)
    if gd <= 1:
        return 1.0
    if gd == 2:
        return 1.5
    return (11.0 + gd) / 8.0


def update_elo(
    matches: List[EloMatch],
    k: float = 20.0,
    home_adv: float = 80.0,
    initial: float = 1500.0,
    seeds: Dict[str, float] | None = None,
) -> Tuple[Dict[str, float], List[Tuple[str, str, float]]]:
    """`seeds` overrides `initial` per team at first appearance (promoted-team prior)."""
    seeds = seeds or {}
    ratings: Dict[str, float] = {}
    history: List[Tuple[str, str, float]] = []

    for m in matches:
        rh = ratings.get(m.home, seeds.get(m.home, initial))
        ra = ratings.get(m.away, seeds.get(m.away, initial))
        eh = expected_score(rh + home_adv, ra)
        ea = 1.0 - eh
        if m.home_goals > m.away_goals:
            sh, sa = 1.0, 0.0
        elif m.home_goals < m.away_goals:
            sh, sa = 0.0, 1.0
        else:
            sh = sa = 0.5
        g = goal_multiplier(m.home_goals - m.away_goals)
        ratings[m.home] = rh + k * g * (sh - eh)
        ratings[m.away] = ra + k * g * (sa - ea)
        history.append((m.home, m.date, ratings[m.home]))
        history.append((m.away, m.date, ratings[m.away]))

    return ratings, history


def elo_outcome_probs(
    elo_home: float, elo_away: float, home_adv: float = 80.0, draw_base: float = 0.26
) -> Tuple[float, float, float]:
    """Map Elo gap to 1X2 with a simple logistic + draw mass."""
    gap = (elo_home + home_adv) - elo_away
    # win probability ignoring draws
    p_home_nd = 1.0 / (1.0 + 10 ** (-gap / 400.0))
    p_away_nd = 1.0 - p_home_nd
    # shrink draw when gap large
    draw = draw_base * (1.0 - min(abs(gap) / 400.0, 0.7))
    remain = 1.0 - draw
    p_home = remain * p_home_nd
    p_away = remain * p_away_nd
    s = p_home + draw + p_away
    return p_home / s, draw / s, p_away / s

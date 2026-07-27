"""Game-State and Score-line Bias Adjustment Engine."""

from __future__ import annotations

from typing import Optional, Tuple


def adjust_stats_for_gamestate(
    home_goals: int,
    away_goals: int,
    shots_home: Optional[float],
    shots_away: Optional[float],
    sot_home: Optional[float],
    sot_away: Optional[float],
) -> Tuple[Optional[float], Optional[float], Optional[float], Optional[float]]:
    """
    Remove Game-State Bias from shot statistics.
    When a team leads by 2+ goals, trailing teams accumulate inflated desperate shots.
    This function normalizes shots and shots-on-target to neutral game-state equivalents.
    """
    if shots_home is None or shots_away is None:
        return shots_home, shots_away, sot_home, sot_away

    gd = home_goals - away_goals

    adj_sh = float(shots_home)
    adj_sa = float(shots_away)
    adj_soth = float(sot_home) if sot_home is not None else None
    adj_sota = float(sot_away) if sot_away is not None else None

    if gd >= 2:
        # Home team led comfortably: discount away junk shots, slightly credit home efficiency
        adj_sa *= 0.82
        if adj_sota is not None:
            adj_sota *= 0.85
        adj_sh *= 1.06
        if adj_soth is not None:
            adj_soth *= 1.05
    elif gd <= -2:
        # Away team led comfortably: discount home junk shots, slightly credit away efficiency
        adj_sh *= 0.82
        if adj_soth is not None:
            adj_soth *= 0.85
        adj_sa *= 1.06
        if adj_sota is not None:
            adj_sota *= 1.05

    return (
        float(round(adj_sh, 1)),
        float(round(adj_sa, 1)),
        float(round(adj_soth, 1)) if adj_soth is not None else None,
        float(round(adj_sota, 1)) if adj_sota is not None else None,
    )


def calculate_gamestate_neutrality(home_goals: int, away_goals: int) -> float:
    """
    Game-State neutrality score (1.0 = highly competitive close contest, 0.80 = one-sided blowout).
    """
    margin = abs(home_goals - away_goals)
    if margin <= 1:
        return 1.0
    if margin == 2:
        return 0.90
    return 0.80

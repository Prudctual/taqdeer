"""
Simplified pi-style ratings (inspired by Constantinou & Fenton): dynamic
offensive/defensive ratings updated after every match — linear updates,
no home/away rating split.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Tuple


@dataclass
class PiMatch:
    home: str
    away: str
    home_goals: int
    away_goals: int
    season: str = ""


@dataclass
class PiState:
    off: Dict[str, float]
    deff: Dict[str, float]  # "def" reserved
    # انكماش بداية الموسم: التقييم عند أول مباراة في الموسم وعدد مباريات الموسم
    season_start_off: Dict[str, float] = field(default_factory=dict)
    season_start_def: Dict[str, float] = field(default_factory=dict)
    season_games: Dict[str, int] = field(default_factory=dict)


SEASON_SHRINK_GAMES = 8


def update_pi(
    matches: List[PiMatch],
    learn_rate: float = 0.12,
    initial: float = 0.0,
    off_seeds: Dict[str, float] | None = None,
    def_seeds: Dict[str, float] | None = None,
) -> PiState:
    """Seeds override `initial` per team at first appearance (promoted-team prior)."""
    o_seed = off_seeds or {}
    d_seed = def_seeds or {}
    off: Dict[str, float] = {}
    deff: Dict[str, float] = {}
    start_off: Dict[str, float] = {}
    start_def: Dict[str, float] = {}
    games: Dict[str, int] = {}
    team_season: Dict[str, str] = {}

    def get(d: Dict[str, float], k: str) -> float:
        s = o_seed if d is off else d_seed
        return d.get(k, s.get(k, initial))

    def begin_season(team: str, season: str) -> None:
        team_season[team] = season
        start_off[team] = get(off, team)
        start_def[team] = get(deff, team)
        games[team] = 0

    for m in matches:
        for t in (m.home, m.away):
            if team_season.get(t) != m.season or t not in start_off:
                begin_season(t, m.season)
        eh = get(off, m.home) - get(deff, m.away)
        ea = get(off, m.away) - get(deff, m.home)
        err_h = (m.home_goals - m.away_goals) - eh
        err_a = (m.away_goals - m.home_goals) - ea
        off[m.home] = get(off, m.home) + learn_rate * err_h
        deff[m.away] = get(deff, m.away) - learn_rate * err_h * 0.7
        off[m.away] = get(off, m.away) + learn_rate * err_a
        deff[m.home] = get(deff, m.home) - learn_rate * err_a * 0.7
        games[m.home] = games.get(m.home, 0) + 1
        games[m.away] = games.get(m.away, 0) + 1

    return PiState(
        off=off, deff=deff,
        season_start_off=start_off, season_start_def=start_def, season_games=games,
    )


def shrunk_pi(state: PiState, *, k_games: int = SEASON_SHRINK_GAMES) -> PiState:
    """نسخة منكمشة نحو تقييم بداية الموسم للفرق ذات n_season < k_games."""
    off: Dict[str, float] = {}
    deff: Dict[str, float] = {}
    for t, v in state.off.items():
        n = state.season_games.get(t)
        s = state.season_start_off.get(t)
        w = max(0.0, 1.0 - n / k_games) if (n is not None and s is not None) else 0.0
        off[t] = w * (s if s is not None else v) + (1.0 - w) * v
    for t, v in state.deff.items():
        n = state.season_games.get(t)
        s = state.season_start_def.get(t)
        w = max(0.0, 1.0 - n / k_games) if (n is not None and s is not None) else 0.0
        deff[t] = w * (s if s is not None else v) + (1.0 - w) * v
    return PiState(
        off=off, deff=deff,
        season_start_off=dict(state.season_start_off),
        season_start_def=dict(state.season_start_def),
        season_games=dict(state.season_games),
    )


def pi_home_boost_from_profile(log_ha: float | None, fallback: float = 0.22) -> float:
    """يربط أفضلية الأرض في بروفايل الدوري بمضاعف λ للمضيف في Pi."""
    if log_ha is None:
        return fallback
    # log_ha≈0.22 → boost≈0.22
    return float(min(max(float(log_ha), 0.14), 0.34))


def pi_expected_goals(
    state: PiState,
    home: str,
    away: str,
    base: float = 1.25,
    home_boost: float = 0.22,
) -> Tuple[float, float]:
    """Map rating gap into Poisson intensities."""
    import math

    gap_h = state.off.get(home, 0.0) - state.deff.get(away, 0.0)
    gap_a = state.off.get(away, 0.0) - state.deff.get(home, 0.0)
    lam = base * math.exp(0.18 * gap_h) + home_boost
    mu = base * math.exp(0.18 * gap_a)
    return float(min(max(lam, 0.25), 4.8)), float(min(max(mu, 0.25), 4.2))

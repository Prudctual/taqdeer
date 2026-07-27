"""
Simplified pi-style ratings (inspired by Constantinou & Fenton): dynamic
offensive/defensive ratings updated after every match — linear updates,
no home/away rating split.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple


@dataclass
class PiMatch:
    home: str
    away: str
    home_goals: int
    away_goals: int


@dataclass
class PiState:
    off: Dict[str, float]
    deff: Dict[str, float]  # "def" reserved


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

    def get(d: Dict[str, float], k: str) -> float:
        s = o_seed if d is off else d_seed
        return d.get(k, s.get(k, initial))

    for m in matches:
        eh = get(off, m.home) - get(deff, m.away)
        ea = get(off, m.away) - get(deff, m.home)
        err_h = (m.home_goals - m.away_goals) - eh
        err_a = (m.away_goals - m.home_goals) - ea
        off[m.home] = get(off, m.home) + learn_rate * err_h
        deff[m.away] = get(deff, m.away) - learn_rate * err_h * 0.7
        off[m.away] = get(off, m.away) + learn_rate * err_a
        deff[m.home] = get(deff, m.home) - learn_rate * err_a * 0.7

    return PiState(off=off, deff=deff)


def pi_expected_goals(
    state: PiState, home: str, away: str, base: float = 1.25, home_boost: float = 0.22
) -> Tuple[float, float]:
    """Map rating gap into Poisson intensities."""
    import math

    gap_h = state.off.get(home, 0.0) - state.deff.get(away, 0.0)
    gap_a = state.off.get(away, 0.0) - state.deff.get(home, 0.0)
    lam = base * math.exp(0.18 * gap_h) + home_boost
    mu = base * math.exp(0.18 * gap_a)
    return float(min(max(lam, 0.25), 4.8)), float(min(max(mu, 0.25), 4.2))

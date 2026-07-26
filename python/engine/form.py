"""Rolling form features: points, GD, shots intensity (proxy for attacking threat)."""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Deque, Dict, List, Optional, Tuple


@dataclass
class FormMatch:
    home: str
    away: str
    home_goals: int
    away_goals: int
    shots_home: Optional[float] = None
    shots_away: Optional[float] = None
    sot_home: Optional[float] = None
    sot_away: Optional[float] = None


@dataclass
class TeamForm:
    pts: float
    gd: float
    gf: float
    ga: float
    sot_for: float
    sot_against: float
    n: int


def _empty() -> TeamForm:
    return TeamForm(0, 0, 0, 0, 0, 0, 0)


def rolling_form(
    matches: List[FormMatch], window: int = 5
) -> Dict[str, TeamForm]:
    """Return form *before* the last match for each team (current state)."""
    hist: Dict[str, Deque[Tuple[float, float, float, float, float, float]]] = defaultdict(
        lambda: deque(maxlen=window)
    )
    # each tuple: pts, gd, gf, ga, sot_for, sot_against

    for m in matches:
        # record current match into histories
        hp = 3.0 if m.home_goals > m.away_goals else 1.0 if m.home_goals == m.away_goals else 0.0
        ap = 3.0 if m.away_goals > m.home_goals else 1.0 if m.home_goals == m.away_goals else 0.0
        hsot = m.sot_home if m.sot_home is not None else float(m.home_goals)
        asot = m.sot_away if m.sot_away is not None else float(m.away_goals)
        hist[m.home].append(
            (hp, m.home_goals - m.away_goals, float(m.home_goals), float(m.away_goals), hsot, asot)
        )
        hist[m.away].append(
            (ap, m.away_goals - m.home_goals, float(m.away_goals), float(m.home_goals), asot, hsot)
        )

    out: Dict[str, TeamForm] = {}
    for tid, q in hist.items():
        if not q:
            out[tid] = _empty()
            continue
        n = len(q)
        out[tid] = TeamForm(
            pts=sum(x[0] for x in q) / n,
            gd=sum(x[1] for x in q) / n,
            gf=sum(x[2] for x in q) / n,
            ga=sum(x[3] for x in q) / n,
            sot_for=sum(x[4] for x in q) / n,
            sot_against=sum(x[5] for x in q) / n,
            n=n,
        )
    return out


def form_lambda_adjust(form_home: TeamForm, form_away: TeamForm) -> Tuple[float, float]:
    """
    Multiplicative adjustment to expected goals from recent form.
    Sot (shots on target) acts as a stability proxy when goals are noisy.
    """
    # Blend goal form with shot form
    home_att = 0.55 * form_home.gf + 0.45 * (form_home.sot_for / 3.5)
    away_att = 0.55 * form_away.gf + 0.45 * (form_away.sot_for / 3.5)
    home_def = 0.55 * form_home.ga + 0.45 * (form_home.sot_against / 3.5)
    away_def = 0.55 * form_away.ga + 0.45 * (form_away.sot_against / 3.5)

    # League-ish averages ~1.3 GF, ~3.5 SoT
    lam_mult = 1.0 + 0.08 * (home_att - 1.3) - 0.06 * (away_def - 1.3)
    mu_mult = 1.0 + 0.08 * (away_att - 1.3) - 0.06 * (home_def - 1.3)
    return float(min(max(lam_mult, 0.75), 1.35)), float(min(max(mu_mult, 0.75), 1.35))

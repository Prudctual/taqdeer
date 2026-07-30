"""Rolling form features: points, GD, shots intensity (proxy for attacking threat)."""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Deque, Dict, List, Optional, Tuple


from datetime import datetime
from .game_state import adjust_stats_for_gamestate


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
    date: Optional[str] = None


@dataclass
class TeamForm:
    pts: float
    gd: float
    gf: float
    ga: float
    sot_for: float
    sot_against: float
    n: int
    rest_days: Optional[float] = None


def _empty() -> TeamForm:
    return TeamForm(0, 0, 0, 0, 0, 0, 0, None)


def _parse_days(date_str: Optional[str]) -> Optional[float]:
    if not date_str:
        return None
    try:
        clean = date_str.replace("Z", "+00:00").replace(" ", "T")
        dt = datetime.fromisoformat(clean)
        return dt.timestamp() / 86400.0
    except Exception:
        return None


def rolling_form(
    matches: List[FormMatch], window: int = 5
) -> Dict[str, TeamForm]:
    """Return form *before* the last match for each team (current state)."""
    hist: Dict[str, Deque[Tuple[float, float, float, float, float, float]]] = defaultdict(
        lambda: deque(maxlen=window)
    )
    last_days: Dict[str, float] = {}
    rest_days_map: Dict[str, Optional[float]] = {}

    for m in matches:
        m_days = _parse_days(m.date)

        # Track rest days before current match
        if m_days is not None:
            if m.home in last_days:
                rest_days_map[m.home] = m_days - last_days[m.home]
            if m.away in last_days:
                rest_days_map[m.away] = m_days - last_days[m.away]
            last_days[m.home] = m_days
            last_days[m.away] = m_days

        # Apply Game-State Adjustment to remove garbage-time shot bias
        _, _, adj_hsot, adj_asot = adjust_stats_for_gamestate(
            m.home_goals, m.away_goals, m.shots_home, m.shots_away, m.sot_home, m.sot_away
        )

        # record current match into histories
        hp = 3.0 if m.home_goals > m.away_goals else 1.0 if m.home_goals == m.away_goals else 0.0
        ap = 3.0 if m.away_goals > m.home_goals else 1.0 if m.home_goals == m.away_goals else 0.0
        hsot = adj_hsot if adj_hsot is not None else float(m.home_goals)
        asot = adj_asot if adj_asot is not None else float(m.away_goals)
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
            rest_days=rest_days_map.get(tid),
        )
    return out


def multi_window_form(
    matches: List[FormMatch], windows: Tuple[int, ...] = (3, 5, 10)
) -> Dict[str, Dict[int, TeamForm]]:
    """Return rolling form across multiple match windows (e.g. 3, 5, 10 matches)."""
    result: Dict[str, Dict[int, TeamForm]] = defaultdict(dict)
    for w in windows:
        f_w = rolling_form(matches, window=w)
        for tid, tf in f_w.items():
            result[tid][w] = tf
    return result


def tiered_form(
    matches: List[FormMatch], elo_map: Dict[str, float]
) -> Dict[str, Dict[str, Dict[str, float]]]:
    """
    Calculate team performance split by opponent strength tier:
    - vs_strong: Opponent Elo >= 1650
    - vs_mid: Opponent Elo 1500 - 1649
    - vs_weak: Opponent Elo < 1500
    """
    stats: Dict[str, Dict[str, Dict[str, float]]] = defaultdict(
        lambda: {
            "vs_strong": {"played": 0, "pts": 0, "gf": 0, "ga": 0},
            "vs_mid": {"played": 0, "pts": 0, "gf": 0, "ga": 0},
            "vs_weak": {"played": 0, "pts": 0, "gf": 0, "ga": 0},
        }
    )

    for m in matches:
        home_elo = elo_map.get(m.home, 1500.0)
        away_elo = elo_map.get(m.away, 1500.0)

        # Home team vs Away team tier
        tier_for_home = "vs_strong" if away_elo >= 1650 else "vs_mid" if away_elo >= 1500 else "vs_weak"
        hp = 3 if m.home_goals > m.away_goals else 1 if m.home_goals == m.away_goals else 0
        stats[m.home][tier_for_home]["played"] += 1
        stats[m.home][tier_for_home]["pts"] += hp
        stats[m.home][tier_for_home]["gf"] += m.home_goals
        stats[m.home][tier_for_home]["ga"] += m.away_goals

        # Away team vs Home team tier
        tier_for_away = "vs_strong" if home_elo >= 1650 else "vs_mid" if home_elo >= 1500 else "vs_weak"
        ap = 3 if m.away_goals > m.home_goals else 1 if m.home_goals == m.away_goals else 0
        stats[m.away][tier_for_away]["played"] += 1
        stats[m.away][tier_for_away]["pts"] += ap
        stats[m.away][tier_for_away]["gf"] += m.away_goals
        stats[m.away][tier_for_away]["ga"] += m.home_goals

    # Compute averages per tier
    out: Dict[str, Dict[str, Dict[str, float]]] = {}
    for tid, tdict in stats.items():
        out[tid] = {}
        for tier_key, data in tdict.items():
            n = max(1, int(data["played"]))
            out[tid][tier_key] = {
                "played": data["played"],
                "ppm": round(data["pts"] / n, 2),
                "gf_avg": round(data["gf"] / n, 2),
                "ga_avg": round(data["ga"] / n, 2),
                "win_rate": round(data["pts"] / (3.0 * n), 2) if data["played"] > 0 else 0.0,
            }

    return out


def form_lambda_adjust(form_home: TeamForm, form_away: TeamForm) -> Tuple[float, float]:
    """
    Multiplicative adjustment to expected goals from recent form.
    Sot (shots on target) acts as a stability proxy when goals are noisy.
    """
    # Higher weight on SoT stability (0.50 gf / 0.50 sot)
    home_att = 0.50 * form_home.gf + 0.50 * (form_home.sot_for / 3.5)
    away_att = 0.50 * form_away.gf + 0.50 * (form_away.sot_for / 3.5)
    home_def = 0.50 * form_home.ga + 0.50 * (form_home.sot_against / 3.5)
    away_def = 0.50 * form_away.ga + 0.50 * (form_away.sot_against / 3.5)

    lam_mult = 1.0 + 0.08 * (home_att - 1.3) + 0.06 * (away_def - 1.3)
    mu_mult = 1.0 + 0.08 * (away_att - 1.3) + 0.06 * (home_def - 1.3)

    # Fatigue adjustment if rest < 3.5 days (84 hours turnaround)
    if form_home.rest_days is not None and 0.0 < form_home.rest_days < 3.5:
        lam_mult *= 0.95
    if form_away.rest_days is not None and 0.0 < form_away.rest_days < 3.5:
        mu_mult *= 0.95

    return float(min(max(lam_mult, 0.70), 1.35)), float(min(max(mu_mult, 0.70), 1.35))



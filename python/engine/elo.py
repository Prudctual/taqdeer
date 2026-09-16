"""Dynamic club Elo with goal-margin and home advantage."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass
class EloMatch:
    home: str
    away: str
    home_goals: int
    away_goals: int
    date: str
    season: str = ""


def expected_score(r_a: float, r_b: float) -> float:
    return 1.0 / (1.0 + 10 ** ((r_b - r_a) / 400.0))


def goal_multiplier(goal_diff: int) -> float:
    gd = abs(goal_diff)
    if gd <= 1:
        return 1.0
    if gd == 2:
        return 1.5
    return (11.0 + gd) / 8.0


def log_home_adv_to_elo(log_ha: float) -> float:
    """
    يحوّل أفضلية الأرض اللوغاريتمية (Dixon–Coles / بروفايل الدوري)
    إلى نقاط Elo تقريباً: λ_ratio ≈ exp(log_ha) → Elo gap عبر 400*log10.
    """
    import math

    ratio = math.exp(float(log_ha))
    # نسبة قوة هجومية منزلية → فرق Elo تقريبي
    return float(400.0 * math.log10(max(ratio, 1.01)))


SEASON_SHRINK_GAMES = 8


@dataclass
class SeasonState:
    """تقييم بداية الموسم وعدد مباريات الموسم لكل فريق — لانكماش أول الجولات."""

    start: Dict[str, float] = field(default_factory=dict)
    games: Dict[str, int] = field(default_factory=dict)
    season: Dict[str, str] = field(default_factory=dict)


def shrink_to_season_start(
    current: float,
    start: float | None,
    n_season: int | None,
    *,
    k_games: int = SEASON_SHRINK_GAMES,
) -> float:
    """r = w·start + (1−w)·current حيث w = max(0, 1 − n/k) — يكبح صدمة أول 6–8 جولات."""
    if start is None or n_season is None or k_games <= 0:
        return float(current)
    w = max(0.0, 1.0 - float(n_season) / float(k_games))
    return float(w * start + (1.0 - w) * current)


def shrunk_ratings(
    ratings: Dict[str, float], state: SeasonState, *, k_games: int = SEASON_SHRINK_GAMES
) -> Dict[str, float]:
    return {
        t: shrink_to_season_start(r, state.start.get(t), state.games.get(t), k_games=k_games)
        for t, r in ratings.items()
    }


def update_elo(
    matches: List[EloMatch],
    k: float = 20.0,
    home_adv: float = 80.0,
    initial: float = 1500.0,
    seeds: Dict[str, float] | None = None,
    *,
    early_season_boost: bool = False,
    mean_reversion: float = 0.33,
    season_state: SeasonState | None = None,
) -> Tuple[Dict[str, float], List[Tuple[str, str, float]]]:
    """`seeds` overrides `initial` per team at first appearance (promoted-team prior).

    `season_state` (اختياري) يُملأ بتقييم بداية كل موسم وعدد مباريات الموسم لكل فريق
    — يستهلكه `shrunk_ratings` لانكماش بداية الموسم (يحلّ محل early_season_boost).
    """
    seeds = seeds or {}
    ratings: Dict[str, float] = {}
    history: List[Tuple[str, str, float]] = []
    base_k = k * (1.35 if early_season_boost else 1.0)
    st = season_state

    team_seasons: Dict[str, str] = {}

    def get_k_factor(team_id: str) -> float:
        tid_lower = team_id.lower()
        if "sangmu" in tid_lower or "gimcheon" in tid_lower:
            return base_k * 2.5
        return base_k

    def begin_season(team: str, season: str) -> None:
        if st is None:
            return
        st.season[team] = season
        st.start[team] = ratings.get(team, seeds.get(team, initial))
        st.games[team] = 0

    for m in matches:
        if m.season:
            if m.home in ratings and m.home in team_seasons and team_seasons[m.home] != m.season:
                ratings[m.home] = initial + (ratings[m.home] - initial) * (1.0 - mean_reversion)
            if team_seasons.get(m.home) != m.season:
                team_seasons[m.home] = m.season
                begin_season(m.home, m.season)

            if m.away in ratings and m.away in team_seasons and team_seasons[m.away] != m.season:
                ratings[m.away] = initial + (ratings[m.away] - initial) * (1.0 - mean_reversion)
            if team_seasons.get(m.away) != m.season:
                team_seasons[m.away] = m.season
                begin_season(m.away, m.season)
        elif st is not None:
            for t in (m.home, m.away):
                if t not in st.start:
                    begin_season(t, "")

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
        kh = get_k_factor(m.home)
        ka = get_k_factor(m.away)
        ratings[m.home] = rh + kh * g * (sh - eh)
        ratings[m.away] = ra + ka * g * (sa - ea)
        if st is not None:
            st.games[m.home] = st.games.get(m.home, 0) + 1
            st.games[m.away] = st.games.get(m.away, 0) + 1
        history.append((m.home, m.date, ratings[m.home]))
        history.append((m.away, m.date, ratings[m.away]))

    return ratings, history


def elo_outcome_probs(
    elo_home: float,
    elo_away: float,
    home_adv: float = 80.0,
    draw_base: float = 0.26,
) -> Tuple[float, float, float]:
    """Map Elo gap to 1X2 with a simple logistic + draw mass."""
    gap = (elo_home + home_adv) - elo_away
    p_home_nd = 1.0 / (1.0 + 10 ** (-gap / 400.0))
    p_away_nd = 1.0 - p_home_nd
    draw = draw_base * (1.0 - min(abs(gap) / 400.0, 0.7))
    remain = 1.0 - draw
    p_home = remain * p_home_nd
    p_away = remain * p_away_nd
    s = p_home + draw + p_away
    return p_home / s, draw / s, p_away / s


def elo_home_adv_from_profile(log_ha: Optional[float], fallback: float = 80.0) -> float:
    if log_ha is None:
        return fallback
    return float(min(max(log_home_adv_to_elo(log_ha), 45.0), 120.0))

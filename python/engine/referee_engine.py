"""Referee Strictness and Card Expectation Analytics Engine."""

from __future__ import annotations

from typing import Dict, Optional


DEFAULT_LEAGUE_YELLOW_AVG = 4.10  # European Top 5 Leagues Cards/Game Average
DEFAULT_LEAGUE_FOULS_AVG = 23.50  # Total Fouls/Game Average


def calculate_strictness_index(
    yellow_pg: float,
    league_yellow_avg: float = DEFAULT_LEAGUE_YELLOW_AVG
) -> float:
    """
    Calculate relative referee strictness index.
    S > 1.15 => Stricter than league average.
    S < 0.85 => More lenient than league average.
    """
    if league_yellow_avg <= 0:
        return 1.0
    return round(yellow_pg / league_yellow_avg, 2)


def get_strictness_label(strictness_index: float) -> str:
    if strictness_index >= 1.20:
        return "صارم جداً (معدل إنذارات مرتفع)"
    elif strictness_index >= 1.05:
        return "فوق المتوسط (يميل للحزم)"
    elif strictness_index <= 0.85:
        return "تساهلي (يتغاضى عن الالتحامات)"
    else:
        return "متوازن (معدل متكافئ)"


def predict_referee_impact(
    referee_name: Optional[str],
    yellow_pg: Optional[float] = None,
    fouls_pg: Optional[float] = None,
    home_fouls_avg: float = 11.5,
    away_fouls_avg: float = 12.0,
) -> Dict[str, float | str | None]:
    """
    Predict expected yellow cards and fouls for a match based on referee strictness profile.
    """
    if not referee_name:
        return {
            "referee_name": None,
            "strictness_index": 1.0,
            "expected_cards": 4.10,
            "expected_fouls": round(home_fouls_avg + away_fouls_avg, 1),
            "strictness_label": "غير محدد",
        }

    yellow = yellow_pg if yellow_pg is not None and yellow_pg > 0 else DEFAULT_LEAGUE_YELLOW_AVG
    strictness = calculate_strictness_index(yellow)

    base_fouls = home_fouls_avg + away_fouls_avg
    expected_fouls = round(base_fouls * max(0.85, min(1.25, strictness)), 1)
    expected_cards = round(yellow, 2)

    return {
        "referee_name": str(referee_name),
        "strictness_index": float(strictness),
        "expected_cards": expected_cards,
        "expected_fouls": expected_fouls,
        "strictness_label": get_strictness_label(strictness),
    }

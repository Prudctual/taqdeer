"""Understat / FBref External xG & xGA Data Provider Engine."""

from __future__ import annotations

from typing import Dict, List, Optional


UNDERSTAT_LEAGUE_MAP = {
    "pl": "EPL",
    "pd": "La_liga",
    "bl1": "Bundesliga",
    "sa": "Serie_A",
    "fl1": "Ligue_1",
}


def fetch_understat_team_xg(
    league_id: str, season: int = 2024
) -> Optional[List[Dict[str, float | str]]]:
    """
    Fetch team-level xG (Expected Goals) and xGA (Expected Goals Against) from Understat.
    Returns list of dicts: [{'team': 'Arsenal', 'xg': 45.2, 'xga': 18.4, 'npxg': 41.0}]
    """
    understat_name = UNDERSTAT_LEAGUE_MAP.get(league_id)
    if not understat_name:
        return None

    try:
        from understatapi import UnderstatClient

        with UnderstatClient() as client:
            data = client.league(understat_name).get_team_data(season=str(season))
            results = []
            for t_id, t_info in data.items():
                name = t_info.get("title", "")
                history = t_info.get("history", [])
                tot_xg = sum(float(h.get("xG", 0.0)) for h in history)
                tot_xga = sum(float(h.get("xGA", 0.0)) for h in history)
                tot_npxg = sum(float(h.get("npxG", 0.0)) for h in history)
                results.append({
                    "team": name,
                    "xg": round(tot_xg, 2),
                    "xga": round(tot_xga, 2),
                    "npxg": round(tot_npxg, 2),
                    "matches": len(history),
                })
            return results
    except Exception:
        return None


def get_team_xg_ratio(
    understat_data: Optional[List[Dict]], team_name: str
) -> Tuple[float, float]:
    """
    Lookup team xG and xGA per match from Understat data set.
    Returns (xg_per_match, xga_per_match).
    """
    if not understat_data:
        return 1.35, 1.20

    norm_search = team_name.lower().replace(" ", "").replace("-", "")
    for row in understat_data:
        t_norm = str(row["team"]).lower().replace(" ", "").replace("-", "")
        if norm_search in t_norm or t_norm in norm_search:
            n = max(1, int(row.get("matches", 1)))
            return round(float(row["xg"]) / n, 2), round(float(row["xga"]) / n, 2)

    return 1.35, 1.20

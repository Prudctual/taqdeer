"""Head-to-Head (H2H) Historical Dominance and Derby Rivalry Engine."""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple


def evaluate_h2h_advantage(
    home_team: str,
    away_team: str,
    recent_h2h_matches: Optional[List[Dict[str, str | int]]] = None,
) -> Dict[str, float | str | int]:
    """
    Calculate Head-to-Head dominance ratio and lambda adjustment multipliers.
    If recent_h2h_matches is provided, evaluate win/draw/loss ratio of last 5 H2H encounters.
    """
    home_mult = 1.0
    away_mult = 1.0
    h2h_summary = "سجل المواجهات المباشرة متوازن بين الفريقين"

    if not recent_h2h_matches or len(recent_h2h_matches) == 0:
        return {
            "h2h_matches_count": 0,
            "home_h2h_wins": 0,
            "away_h2h_wins": 0,
            "h2h_draws": 0,
            "home_lambda_mult": 1.0,
            "away_lambda_mult": 1.0,
            "h2h_summary": "لا توجد مواجهات مباشرة سابقة قريبة لتعديل النسب",
        }

    h_wins = 0
    a_wins = 0
    draws = 0

    for m in recent_h2h_matches:
        h_score = int(m.get("home_goals", 0))
        a_score = int(m.get("away_goals", 0))
        h_name = str(m.get("home_team", ""))

        if h_name == home_team:
            if h_score > a_score:
                h_wins += 1
            elif a_score > h_score:
                a_wins += 1
            else:
                draws += 1
        else:
            if a_score > h_score:
                h_wins += 1
            elif h_score > a_score:
                a_wins += 1
            else:
                draws += 1

    total = len(recent_h2h_matches)
    if total >= 3:
        if h_wins >= total - 1:
            home_mult *= 1.06
            away_mult *= 0.94
            h2h_summary = f"تفوق تاريخي كاسح لـ {home_team} في المواجهات المباشرة ({h_wins} فوز من أصل {total})"
        elif a_wins >= total - 1:
            away_mult *= 1.06
            home_mult *= 0.94
            h2h_summary = f"تفوق تاريخي لـ {away_team} في أراضي {home_team} ({a_wins} فوز من أصل {total})"
        elif h_wins > a_wins + 1:
            home_mult *= 1.03
            away_mult *= 0.97
            h2h_summary = f"أفضلية تاريخية لصالح {home_team} بواقع {h_wins} انتصارات"
        elif a_wins > h_wins + 1:
            away_mult *= 1.03
            home_mult *= 0.97
            h2h_summary = f"أفضلية تاريخية لصالح {away_team} بواقع {a_wins} انتصارات"

    return {
        "h2h_matches_count": total,
        "home_h2h_wins": h_wins,
        "away_h2h_wins": a_wins,
        "h2h_draws": draws,
        "home_lambda_mult": round(home_mult, 3),
        "away_lambda_mult": round(away_mult, 3),
        "h2h_summary": h2h_summary,
    }

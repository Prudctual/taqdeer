#!/usr/bin/env python3
"""Automated $T-50$ Lineup Checker and Dynamic Re-Prediction Pipeline."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "python"))

from engine.dixon_coles import markets_from_matrix, score_matrix
from engine.lineup_automation import evaluate_lineup_impact, recalculate_xg_with_lineup
from engine.rapidapi_feeds import fetch_sportspage_feed


DB_PATH = ROOT / "data" / "taqdeer.db"


def run_lineup_scheduler() -> None:
    """Scan upcoming matches starting within 60 minutes and recalculate predictions if lineups drop."""
    if not DB_PATH.exists():
        print("Database not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    now_iso = datetime.now(timezone.utc).isoformat()

    # Select upcoming scheduled matches starting in the next 2 hours
    matches = conn.execute(
        """
        SELECT m.id, m.league_id, m.home_team_id, m.away_team_id,
               ht.name_en as home_name, at.name_en as away_name,
               p.lambda_home, p.lambda_away
        FROM matches m
        JOIN teams ht ON ht.id = m.home_team_id
        JOIN teams at ON at.id = m.away_team_id
        LEFT JOIN predictions p ON p.match_id = m.id
        WHERE m.status IN ('SCHEDULED', 'TIMED')
          AND m.utc_date >= ?
        ORDER BY m.utc_date ASC
        LIMIT 10
        """,
        (now_iso,),
    ).fetchall()

    print(f"Scanning {len(matches)} upcoming matches for $T-50$ confirmed lineups…")

    updated_count = 0
    for row in matches:
        m_id = row["id"]
        home_name = row["home_name"]
        away_name = row["away_name"]
        l_home = row["lambda_home"] or 1.45
        l_away = row["lambda_away"] or 1.15

        # Query RapidAPI / Sportspage Feeds for live match lineup data
        feed_data = fetch_sportspage_feed(f"/games?id={m_id}")
        home_lineup = None
        away_lineup = None

        if feed_data and "results" in feed_data and len(feed_data["results"]) > 0:
            game_info = feed_data["results"][0]
            home_lineup = game_info.get("homeLineup")
            away_lineup = game_info.get("awayLineup")

        # Evaluate RAPM impact against team key starters
        impact = evaluate_lineup_impact(
            home_lineup, away_lineup
        )

        if impact["lineup_status"] == "CONFIRMED":
            new_lh, new_la = recalculate_xg_with_lineup(
                l_home, l_away, impact["missing_home"], impact["missing_away"]
            )
            mat = score_matrix(new_lh, new_la, -0.05)
            mkts = markets_from_matrix(mat)
            pH, pD, pA = mkts["p_home"], mkts["p_draw"], mkts["p_away"]

            # Update prediction in database
            conn.execute(
                """
                UPDATE predictions
                SET p_home = ?, p_draw = ?, p_away = ?,
                    lambda_home = ?, lambda_away = ?
                WHERE match_id = ?
                """,
                (pH, pD, pA, new_lh, new_la, m_id),
            )

            conn.execute(
                """
                UPDATE matches
                SET lineup_status = ?,
                    missing_home_json = ?,
                    missing_away_json = ?
                WHERE id = ?
                """,
                (
                    impact["lineup_status"],
                    json.dumps(impact["missing_home"], ensure_ascii=False),
                    json.dumps(impact["missing_away"], ensure_ascii=False),
                    m_id,
                ),
            )
            updated_count += 1
            print(f"  ✓ Confirmed lineup updated for {home_name} vs {away_name} (LH={new_lh}, LA={new_la})")

    conn.commit()
    conn.close()
    print(f"Lineup scheduler run complete: {updated_count} matches updated.")


if __name__ == "__main__":
    run_lineup_scheduler()

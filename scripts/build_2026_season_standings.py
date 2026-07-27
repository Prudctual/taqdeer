import sqlite3

def setup_2026_new_season_standings():
    conn = sqlite3.connect('data/taqdeer.db')
    cursor = conn.cursor()

    leagues = ['bl1', 'pd', 'pl', 'sa', 'fl1', 'kl1']
    
    for league_id in leagues:
        # Check if 2026 finished matches exist
        finished_rows = cursor.execute(
            """
            WITH team_matches AS (
                SELECT home_team_id AS team_id,
                       1 AS played,
                       CASE WHEN home_goals > away_goals THEN 1 ELSE 0 END AS won,
                       CASE WHEN home_goals = away_goals THEN 1 ELSE 0 END AS drawn,
                       CASE WHEN home_goals < away_goals THEN 1 ELSE 0 END AS lost,
                       home_goals AS gf,
                       away_goals AS ga,
                       CASE WHEN home_goals > away_goals THEN 3
                            WHEN home_goals = away_goals THEN 1 ELSE 0 END AS points
                FROM matches
                WHERE league_id = ? AND season = '2026' AND status = 'FINISHED' AND home_goals IS NOT NULL
                
                UNION ALL
                
                SELECT away_team_id AS team_id,
                       1 AS played,
                       CASE WHEN away_goals > home_goals THEN 1 ELSE 0 END AS won,
                       CASE WHEN home_goals = away_goals THEN 1 ELSE 0 END AS drawn,
                       CASE WHEN away_goals < home_goals THEN 1 ELSE 0 END AS lost,
                       away_goals AS gf,
                       home_goals AS ga,
                       CASE WHEN away_goals > home_goals THEN 3
                            WHEN home_goals = away_goals THEN 1 ELSE 0 END AS points
                FROM matches
                WHERE league_id = ? AND season = '2026' AND status = 'FINISHED' AND home_goals IS NOT NULL
            )
            SELECT team_id,
                   SUM(played) as played,
                   SUM(won) as won,
                   SUM(drawn) as drawn,
                   SUM(lost) as lost,
                   SUM(gf) as goals_for,
                   SUM(ga) as goals_against,
                   SUM(gf) - SUM(ga) as goal_difference,
                   SUM(points) as points
            FROM team_matches
            GROUP BY team_id
            ORDER BY points DESC, goal_difference DESC, goals_for DESC
            """, (league_id, league_id)
        ).fetchall()

        if finished_rows:
            print(f"League {league_id}: Found {len(finished_rows)} teams with 2026 match results!")
            cursor.execute("DELETE FROM standings WHERE league_id = ? AND season = '2026'", (league_id,))
            for pos, r in enumerate(finished_rows, 1):
                team_id, played, won, drawn, lost, gf, ga, gd, pts = r
                cursor.execute(
                    """
                    INSERT INTO standings (league_id, season, position, team_id, played, won, drawn, lost, goals_for, goals_against, goal_difference, points)
                    VALUES (?, '2026', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (league_id, pos, team_id, played, won, drawn, lost, gf, ga, gd, pts)
                )
        else:
            # New 2026 Season opening standings: Take 2025 season standings order or teams sorted by Elo!
            print(f"League {league_id}: Building opening 2026 standings table from 2025 order & Elo...")
            
            # Check 2025 standings for team order
            teams_2025 = cursor.execute(
                "SELECT team_id FROM standings WHERE league_id = ? AND season = '2025' ORDER BY position ASC",
                (league_id,)
            ).fetchall()
            
            if not teams_2025:
                teams_2025 = cursor.execute(
                    "SELECT id FROM teams WHERE league_id = ? ORDER BY elo DESC LIMIT 20",
                    (league_id,)
                ).fetchall()

            team_ids = [t[0] for t in teams_2025]
            
            cursor.execute("DELETE FROM standings WHERE league_id = ? AND season = '2026'", (league_id,))
            for pos, team_id in enumerate(team_ids, 1):
                cursor.execute(
                    """
                    INSERT INTO standings (league_id, season, position, team_id, played, won, drawn, lost, goals_for, goals_against, goal_difference, points)
                    VALUES (?, '2026', ?, ?, 0, 0, 0, 0, 0, 0, 0, 0)
                    """, (league_id, pos, team_id)
                )

    conn.commit()
    print("Done setting up 2026 new season standings for all leagues!")
    conn.close()

if __name__ == "__main__":
    setup_2026_new_season_standings()

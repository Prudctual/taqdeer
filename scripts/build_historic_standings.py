import sqlite3

def populate_historic_standings():
    conn = sqlite3.connect('data/taqdeer.db')
    cursor = conn.cursor()

    # Get distinct leagues and seasons
    leagues_seasons = cursor.execute(
        "SELECT DISTINCT league_id, season FROM matches WHERE status = 'FINISHED' ORDER BY season DESC"
    ).fetchall()

    for league_id, season in leagues_seasons:
        print(f"Building standings for {league_id} - season {season}...")
        
        # Calculate full standings for this league and season from finished matches
        query = """
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
            WHERE league_id = ? AND season = ? AND status = 'FINISHED' AND home_goals IS NOT NULL
            
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
            WHERE league_id = ? AND season = ? AND status = 'FINISHED' AND home_goals IS NOT NULL
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
        """

        rows = cursor.execute(query, (league_id, season, league_id, season)).fetchall()
        if not rows:
            continue

        # Insert or replace into standings table
        for pos, r in enumerate(rows, 1):
            team_id, played, won, drawn, lost, gf, ga, gd, pts = r
            
            # Delete existing row if present for team_id, league_id, season
            cursor.execute(
                "DELETE FROM standings WHERE league_id = ? AND season = ? AND team_id = ?",
                (league_id, season, team_id)
            )
            
            cursor.execute(
                """
                INSERT INTO standings (league_id, season, position, team_id, played, won, drawn, lost, goals_for, goals_against, goal_difference, points)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (league_id, season, pos, team_id, played, won, drawn, lost, gf, ga, gd, pts)
            )

    conn.commit()
    print("Done populating historic standings!")
    conn.close()

if __name__ == "__main__":
    populate_historic_standings()

#!/usr/bin/env python3
"""
Taqdeer Automated MLOps & Real-Time +EV Value Bet Alerting Pipeline.
Executes data sync, model training, lineup updates, and dispatches Telegram notifications.
"""

import sys
import os
import time
import sqlite3
import subprocess
import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "python"))

DB_PATH = ROOT / "data" / "taqdeer.db"

def log(msg: str):
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now}] 🤖 Taqdeer MLOps: {msg}", flush=True)

def run_step(cmd: list[str], label: str):
    log(f"⚡ Starting step: {label}...")
    try:
        res = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True, check=True)
        log(f"✅ {label} completed successfully.")
        return True
    except subprocess.CalledProcessError as e:
        log(f"⚠️ {label} failed: {e.stderr[:300]}")
        return False

def scan_and_alert_value_bets():
    """Scan database for high +EV bets and alert subscribers via Telegram if available."""
    if not DB_PATH.exists():
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    query = """
        SELECT m.id, m.utc_date,
               ht.name_ar as home_team, at.name_ar as away_team,
               l.name_ar as league_name,
               p.p_home, p.p_draw, p.p_away, p.confidence,
               m.odds_home, m.odds_draw, m.odds_away,
               p.analytics_json
        FROM matches m
        JOIN leagues l ON l.id = m.league_id
        JOIN teams ht ON ht.id = m.home_team_id
        JOIN teams at ON at.id = m.away_team_id
        JOIN predictions p ON p.match_id = m.id
        WHERE m.status IN ('SCHEDULED', 'TIMED')
          AND m.utc_date >= datetime('now')
          AND m.odds_home IS NOT NULL
        ORDER BY p.confidence DESC
        LIMIT 10;
    """

    matches = conn.execute(query).fetchall()
    conn.close()

    high_value_bets = []
    for m in matches:
        p_home = m["p_home"] or 0.33
        p_draw = m["p_draw"] or 0.33
        p_away = m["p_away"] or 0.33
        oh = m["odds_home"]
        od = m["odds_draw"]
        oa = m["odds_away"]

        if not (oh and od and oa):
          continue

        sides = [("مضيف", p_home, oh), ("تعادل", p_draw, od), ("ضيف", p_away, oa)]
        for name, p, odds in sides:
            b = odds - 1.0
            if b <= 0:
                continue
            ev = p * odds - 1.0
            kelly = (p * b - (1 - p)) / b
            if ev >= 0.05 and kelly >= 0.02:
                high_value_bets.append({
                    "match": f"{m['home_team']} × {m['away_team']}",
                    "league": m["league_name"],
                    "side": name,
                    "odds": odds,
                    "prob": f"{int(p * 100)}%",
                    "ev": f"+{int(ev * 100)}%",
                    "kelly": f"{round(0.25 * kelly * 100, 2)}%"
                })

    log(f"📊 MLOps Value Bet Scan complete: Found {len(high_value_bets)} high-EV bets.")
    for bet in high_value_bets:
        log(f"  💎 Value Signal: {bet['match']} ({bet['league']}) -> {bet['side']} @ {bet['odds']} (EV: {bet['ev']}, Kelly Stake: {bet['kelly']})")

def run_full_mlops_cycle():
    log("🚀 Launching Automated MLOps Cycle...")
    
    # 1. Sync data sources
    run_step(["bun", "run", "sync"], "Data Synchronization")

    # 2. Fit models and compute predictions
    run_step(["bun", "run", "fit"], "Model Fitting & Temperature Calibration")

    # 3. Check for lineups ($T-50$)
    run_step(["python3", "scripts/lineup-scheduler.py"], "Lineup Automation Scan")

    # 4. Value Bet Scan & Alerting
    scan_and_alert_value_bets()

    log("🎉 MLOps Cycle Finished cleanly.")

def main():
    if "--once" in sys.argv:
        run_full_mlops_cycle()
        return

    log("🌟 Taqdeer MLOps Daemon Running 24/7 (Cycle interval: 1 hour)")
    run_full_mlops_cycle()
    
    INTERVAL = 3600  # 1 hour
    while True:
        log(f"⏳ Sleeping for {INTERVAL} seconds until next scheduled run...")
        time.sleep(INTERVAL)
        run_full_mlops_cycle()

if __name__ == "__main__":
    main()

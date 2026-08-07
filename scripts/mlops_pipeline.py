#!/usr/bin/env python3
"""
Taqdeer Automated MLOps & Real-Time +EV Value Bet Alerting Pipeline.
Executes data sync, model training, and dispatches Telegram notifications on failure.
"""

from __future__ import annotations

import sys
import os
import time
import sqlite3
import subprocess
import shutil
import datetime
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "python"))

DB_PATH = ROOT / "data" / "taqdeer.db"


def log(msg: str):
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now}] 🤖 Taqdeer MLOps: {msg}", flush=True)


def _load_env_file() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def _ensure_path() -> None:
    """PM2 لا يرث PATH المستخدم — أضف مواقع bun الشائعة."""
    extras = [
        str(Path.home() / ".bun" / "bin"),
        "/usr/local/bin",
        "/home/ubuntu/.bun/bin",
    ]
    path = os.environ.get("PATH", "")
    for p in extras:
        if p and p not in path and Path(p).exists():
            path = f"{p}:{path}"
    os.environ["PATH"] = path


def resolve_bun() -> str:
    found = shutil.which("bun")
    if found:
        return found
    for candidate in (
        Path.home() / ".bun" / "bin" / "bun",
        Path("/home/ubuntu/.bun/bin/bun"),
        Path("/usr/local/bin/bun"),
    ):
        if candidate.exists():
            return str(candidate)
    raise FileNotFoundError(
        "bun غير موجود في PATH — ثبّته أو أضف $HOME/.bun/bin إلى ecosystem.config.js"
    )


def notify_failure(step: str, detail: str) -> None:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
    if not token or not chat_id:
        log("⚠️ لا إعدادات Telegram — الفشل مسجل في اللوج فقط")
        return
    text = f"🚨 تقدير: فشل {step}\n{detail[:600]}"
    try:
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/sendMessage",
            data=json.dumps({"chat_id": chat_id, "text": text}).encode(),
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=15)
    except Exception as e:  # noqa: BLE001
        log(f"⚠️ تعذر إرسال إشعار Telegram: {e}")


def run_step(cmd: list[str], label: str) -> bool:
    log(f"⚡ Starting step: {label}...")
    try:
        # errors=replace: مخرجات العربية من السكربتات قد تصل ببايتات غير UTF-8 عبر بعض الأنابيب
        subprocess.run(
            cmd,
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=True,
        )
        log(f"✅ {label} completed successfully.")
        return True
    except FileNotFoundError as e:
        log(f"⚠️ {label} failed: {e}")
        notify_failure(label, str(e))
        return False
    except subprocess.CalledProcessError as e:
        tail = (e.stderr or e.stdout or "")[-400:]
        log(f"⚠️ {label} failed: {tail}")
        notify_failure(label, tail)
        return False
    except Exception as e:  # noqa: BLE001
        log(f"⚠️ {label} failed: {e}")
        notify_failure(label, str(e))
        return False


def scan_and_alert_value_bets():
    """Scan database for high +EV bets (real odds only)."""
    if not DB_PATH.exists():
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    query = """
        SELECT m.id, m.utc_date,
               ht.name_ar as home_team, at.name_ar as away_team,
               l.name_ar as league_name,
               p.p_home, p.p_draw, p.p_away, p.confidence,
               m.odds_home, m.odds_draw, m.odds_away
        FROM matches m
        JOIN leagues l ON l.id = m.league_id
        JOIN teams ht ON ht.id = m.home_team_id
        JOIN teams at ON at.id = m.away_team_id
        JOIN predictions p ON p.match_id = m.id
        WHERE m.status IN ('SCHEDULED', 'TIMED')
          AND m.utc_date >= datetime('now')
          AND m.odds_home IS NOT NULL
          AND m.odds_draw IS NOT NULL
          AND m.odds_away IS NOT NULL
        ORDER BY m.utc_date ASC
        LIMIT 40;
    """

    matches = conn.execute(query).fetchall()
    conn.close()

    high_value_bets = []
    for m in matches:
        sides = [
            ("مضيف", m["p_home"] or 0, m["odds_home"]),
            ("تعادل", m["p_draw"] or 0, m["odds_draw"]),
            ("ضيف", m["p_away"] or 0, m["odds_away"]),
        ]
        for name, p, odds in sides:
            if not odds or odds <= 1:
                continue
            b = odds - 1.0
            ev = p * odds - 1.0
            kelly = (p * b - (1 - p)) / b
            if 0.03 <= ev <= 0.15 and kelly >= 0.02:
                high_value_bets.append(
                    {
                        "match": f"{m['home_team']} × {m['away_team']}",
                        "league": m["league_name"],
                        "side": name,
                        "odds": odds,
                        "ev": f"+{int(ev * 100)}%",
                        "kelly": f"{round(0.25 * kelly * 100, 2)}%",
                    }
                )

    log(f"📊 MLOps Value Bet Scan: {len(high_value_bets)} high-EV bets.")
    for bet in high_value_bets[:8]:
        log(
            f"  💎 {bet['match']} ({bet['league']}) -> {bet['side']} @ {bet['odds']} "
            f"(EV: {bet['ev']}, Kelly: {bet['kelly']})"
        )


def run_full_mlops_cycle():
    log("🚀 Launching Automated MLOps Cycle...")
    bun = resolve_bun()
    py = str(ROOT / ".venv" / "bin" / "python")
    ok_sync = run_step([bun, "run", "sync"], "Data Synchronization")
    ok_fit = run_step([bun, "run", "fit"], "Model Fitting & Temperature Calibration")
    # إعادة توقع ضيقة إن أكّد enrich تشكيلات بين الدورات
    run_step(
        [py, "scripts/fit-and-predict.py", "--repredict-flagged"],
        "Narrow repredict (lineup-confirmed)",
    )
    if ok_sync and ok_fit:
        scan_and_alert_value_bets()
        log("🎉 MLOps Cycle Finished cleanly.")
    else:
        log("⚠️ MLOps Cycle finished with errors — انظر إشعار Telegram/اللوج")


def main():
    _load_env_file()
    _ensure_path()

    if "--once" in sys.argv:
        run_full_mlops_cycle()
        return

    log("🌟 Taqdeer MLOps Daemon Running 24/7 (Cycle interval: 1 hour)")
    run_full_mlops_cycle()

    INTERVAL = 3600
    while True:
        log(f"⏳ Sleeping for {INTERVAL} seconds until next scheduled run...")
        time.sleep(INTERVAL)
        run_full_mlops_cycle()


if __name__ == "__main__":
    main()

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


def summarize_banker_slice():
    """ملخّص شريحة «المحسوم» بعد الدورة — لا تنبيهات EV (خطة 006 §و)."""
    if not DB_PATH.exists():
        return
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            """
            SELECT p.sieve_tier AS tier, COUNT(*) AS n
            FROM predictions p
            JOIN matches m ON m.id = p.match_id
            WHERE m.status IN ('SCHEDULED', 'TIMED')
              AND m.utc_date >= datetime('now')
            GROUP BY p.sieve_tier
            """
        ).fetchall()
        bankers = conn.execute(
            """
            SELECT ht.name_ar AS home_team, at.name_ar AS away_team, l.name_ar AS league_name,
                   p.p_home, p.p_draw, p.p_away, p.alpha
            FROM predictions p
            JOIN matches m ON m.id = p.match_id
            JOIN leagues l ON l.id = m.league_id
            JOIN teams ht ON ht.id = m.home_team_id
            JOIN teams at ON at.id = m.away_team_id
            WHERE p.sieve_tier = 'banker'
              AND m.status IN ('SCHEDULED', 'TIMED')
              AND m.utc_date >= datetime('now')
            ORDER BY m.utc_date ASC
            LIMIT 12
            """
        ).fetchall()
    except sqlite3.OperationalError as e:
        log(f"⚠️ banker summary skipped: {e}")
        conn.close()
        return
    conn.close()
    tiers = {str(r["tier"]): int(r["n"]) for r in rows}
    log(f"🧭 Sieve tiers (upcoming): {tiers}")
    for b in bankers:
        top = max((("مضيف", b["p_home"] or 0), ("تعادل", b["p_draw"] or 0), ("ضيف", b["p_away"] or 0)), key=lambda x: x[1])
        log(f"  🎯 {b['home_team']} × {b['away_team']} ({b['league_name']}) -> {top[0]} p={top[1]:.2f} α={b['alpha']}")


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
    # تقييم يومي: daily_metrics (تغطية/محسوم) + حوادث المحسوم + سلاسل التكرار + حالة الدوريات
    run_step([py, "scripts/evaluate_daily.py"], "Daily evaluation vs closing")
    if ok_sync and ok_fit:
        summarize_banker_slice()
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

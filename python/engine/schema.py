"""مخطط جداول القياس والحسم — مصدر واحد يُستدعى من كل سكربت بايثون يلمس القاعدة.

الجداول هنا هي التي أضافتها خطة 006: خطوط الإغلاق، اللقطات الزمنية، المقاييس اليومية،
معايرة الدوريات، حوادث المحسوم، سلاسل الفوز. `db.ts` يحمل النسخة نفسها لـNext.
"""

from __future__ import annotations

import sqlite3

MODEL_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS closing_lines (
  match_id TEXT NOT NULL REFERENCES matches(id),
  source TEXT NOT NULL,
  is_authoritative INTEGER NOT NULL DEFAULT 0,
  oh REAL, od REAL, oa REAL,
  ou_line REAL, ou_over REAL, ou_under REAL,
  ah_line REAL, ah_home REAL, ah_away REAL,
  captured_at TEXT NOT NULL,
  PRIMARY KEY (match_id, source)
);
CREATE INDEX IF NOT EXISTS idx_closing_auth ON closing_lines(is_authoritative, match_id);

CREATE TABLE IF NOT EXISTS prediction_timeline (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id),
  snapshot_kind TEXT NOT NULL CHECK (snapshot_kind IN ('announce','lineup','close')),
  snapshot_at TEXT NOT NULL,
  pm_home REAL, pm_draw REAL, pm_away REAL,
  ps_home REAL, ps_draw REAL, ps_away REAL,
  odds_home REAL, odds_draw REAL, odds_away REAL, odds_source TEXT,
  pf_home REAL, pf_draw REAL, pf_away REAL, alpha REAL,
  pick TEXT, p_pick REAL, gap_pick REAL,
  is_banker INTEGER NOT NULL DEFAULT 0,
  banker_tier TEXT,
  sieve_json TEXT,
  model_version TEXT NOT NULL,
  UNIQUE(match_id, snapshot_kind)
);
CREATE INDEX IF NOT EXISTS idx_timeline_match ON prediction_timeline(match_id);
CREATE INDEX IF NOT EXISTS idx_timeline_kind ON prediction_timeline(snapshot_kind, snapshot_at);

CREATE TABLE IF NOT EXISTS daily_metrics (
  date TEXT NOT NULL,
  league_id TEXT NOT NULL DEFAULT 'all',
  scope TEXT NOT NULL CHECK (scope IN ('coverage','banker')),
  snapshot_kind TEXT NOT NULL,
  n INTEGER NOT NULL,
  brier REAL, log_loss REAL, rps REAL, accuracy REAL,
  close_brier REAL, close_log_loss REAL, close_rps REAL,
  skill_vs_close REAL,
  clv_mean REAL, clv_n INTEGER,
  hit_rate REAL, stated_mean REAL,
  draw_top_share REAL, draw_actual_share REAL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (date, league_id, scope, snapshot_kind)
);

CREATE TABLE IF NOT EXISTS league_calibration (
  league_id TEXT PRIMARY KEY,
  theta REAL NOT NULL DEFAULT 0.60,
  alpha_announce REAL, alpha_lineup REAL, alpha_close REAL,
  dc_half_life REAL, demargin_method TEXT,
  slice_n INTEGER, slice_hit REAL, slice_stated REAL,
  slice_brier REAL, slice_close_brier REAL,
  coverage_brier REAL, coverage_close_brier REAL,
  status TEXT NOT NULL CHECK (status IN ('active','watch','off')) DEFAULT 'watch',
  status_reason TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS banker_incidents (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  league_id TEXT NOT NULL,
  date TEXT NOT NULL,
  stated_p REAL NOT NULL,
  close_market_p REAL,
  pick TEXT NOT NULL,
  outcome TEXT NOT NULL,
  verdict TEXT CHECK (verdict IN ('variance','signal','news','unknown')),
  evidence_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(match_id)
);

CREATE TABLE IF NOT EXISTS team_streaks (
  team_id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL,
  streak_len INTEGER NOT NULL DEFAULT 0,
  last_win_at TEXT,
  last_break_at TEXT,
  break_reason TEXT,
  updated_at TEXT NOT NULL
);
"""

PREDICTION_COLUMNS = (
    ("pm_home", "REAL"),
    ("pm_draw", "REAL"),
    ("pm_away", "REAL"),
    ("alpha", "REAL"),
    ("p_draw_head", "REAL"),
    ("sieve_tier", "TEXT"),
    ("sieve_json", "TEXT"),
)


def ensure_model_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(MODEL_SCHEMA_SQL)
    pcols = {r[1] for r in conn.execute("PRAGMA table_info(predictions)")}
    for name, typ in PREDICTION_COLUMNS:
        if name not in pcols:
            conn.execute(f"ALTER TABLE predictions ADD COLUMN {name} {typ}")
    conn.commit()

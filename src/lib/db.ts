import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "pitchlab.db");

let _db: Database.Database | null = null;

export function getDb() {
  if (_db) return _db;
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  _db = new Database(dbPath);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS leagues (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      country_ar TEXT NOT NULL,
      fd_org_code TEXT,
      fd_uk_code TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      league_id TEXT NOT NULL REFERENCES leagues(id),
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      short_name TEXT,
      crest_url TEXT,
      elo REAL NOT NULL DEFAULT 1500,
      attack REAL,
      defense REAL
    );
    CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league_id);
    CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name_en);

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      league_id TEXT NOT NULL REFERENCES leagues(id),
      season TEXT NOT NULL,
      matchday INTEGER,
      utc_date TEXT NOT NULL,
      status TEXT NOT NULL,
      home_team_id TEXT NOT NULL REFERENCES teams(id),
      away_team_id TEXT NOT NULL REFERENCES teams(id),
      home_goals INTEGER,
      away_goals INTEGER,
      source TEXT NOT NULL,
      external_id TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_matches_league_date ON matches(league_id, utc_date);
    CREATE INDEX IF NOT EXISTS idx_matches_status_date ON matches(status, utc_date);

    CREATE TABLE IF NOT EXISTS standings (
      id TEXT PRIMARY KEY,
      league_id TEXT NOT NULL REFERENCES leagues(id),
      season TEXT NOT NULL,
      team_id TEXT NOT NULL REFERENCES teams(id),
      position INTEGER NOT NULL,
      played INTEGER NOT NULL,
      won INTEGER NOT NULL,
      drawn INTEGER NOT NULL,
      lost INTEGER NOT NULL,
      goals_for INTEGER NOT NULL,
      goals_against INTEGER NOT NULL,
      goal_difference INTEGER NOT NULL,
      points INTEGER NOT NULL,
      UNIQUE(league_id, season, team_id)
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id TEXT PRIMARY KEY,
      match_id TEXT UNIQUE NOT NULL REFERENCES matches(id),
      lambda_home REAL NOT NULL,
      lambda_away REAL NOT NULL,
      p_home REAL NOT NULL,
      p_draw REAL NOT NULL,
      p_away REAL NOT NULL,
      p_btts_yes REAL NOT NULL,
      p_over25 REAL NOT NULL,
      top_scores_json TEXT NOT NULL,
      score_matrix_json TEXT NOT NULL,
      elo_home REAL NOT NULL,
      elo_away REAL NOT NULL,
      confidence REAL NOT NULL,
      model_version TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS elo_snapshots (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id),
      date TEXT NOT NULL,
      elo REAL NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_elo_team_date ON elo_snapshots(team_id, date);

    CREATE TABLE IF NOT EXISTS model_metrics (
      id TEXT PRIMARY KEY,
      league_id TEXT,
      window_label TEXT NOT NULL,
      n_matches INTEGER NOT NULL,
      accuracy REAL NOT NULL,
      brier REAL NOT NULL,
      log_loss REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS team_strengths (
      id TEXT PRIMARY KEY,
      league_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      season TEXT NOT NULL,
      attack REAL NOT NULL,
      defense REAL NOT NULL,
      home_adv REAL NOT NULL,
      rho REAL NOT NULL,
      UNIQUE(league_id, team_id, season)
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  migrate(db);
}

function migrate(db: Database.Database) {
  const cols = new Set(
    (
      db.prepare(`PRAGMA table_info(matches)`).all() as { name: string }[]
    ).map((c) => c.name),
  );
  const addMatch: [string, string][] = [
    ["odds_home", "REAL"],
    ["odds_draw", "REAL"],
    ["odds_away", "REAL"],
    ["shots_home", "REAL"],
    ["shots_away", "REAL"],
    ["sot_home", "REAL"],
    ["sot_away", "REAL"],
  ];
  for (const [name, typ] of addMatch) {
    if (!cols.has(name)) {
      db.exec(`ALTER TABLE matches ADD COLUMN ${name} ${typ}`);
    }
  }

  const pcols = new Set(
    (
      db.prepare(`PRAGMA table_info(predictions)`).all() as { name: string }[]
    ).map((c) => c.name),
  );
  if (!pcols.has("analytics_json")) {
    db.exec(`ALTER TABLE predictions ADD COLUMN analytics_json TEXT`);
  }
  if (!pcols.has("xpts_home")) {
    db.exec(`ALTER TABLE predictions ADD COLUMN xpts_home REAL`);
  }
  if (!pcols.has("xpts_away")) {
    db.exec(`ALTER TABLE predictions ADD COLUMN xpts_away REAL`);
  }
  if (!pcols.has("market_home")) {
    db.exec(`ALTER TABLE predictions ADD COLUMN market_home REAL`);
  }
  if (!pcols.has("market_draw")) {
    db.exec(`ALTER TABLE predictions ADD COLUMN market_draw REAL`);
  }
  if (!pcols.has("market_away")) {
    db.exec(`ALTER TABLE predictions ADD COLUMN market_away REAL`);
  }
}

export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

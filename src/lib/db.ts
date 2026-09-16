import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "taqdeer.db");

/** HMR-safe: globalThis يعيش بين دورات HMR فلا تضيع الاتصالات */
const globalForDb = globalThis as unknown as { __taqdeerDb?: Database.Database };

export function getDb() {
  if (globalForDb.__taqdeerDb) return globalForDb.__taqdeerDb;
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 10000");
  db.pragma("synchronous = NORMAL");
  db.pragma("cache_size = -64000");
  db.pragma("temp_store = MEMORY");
  db.pragma("mmap_size = 268435456");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  globalForDb.__taqdeerDb = db;
  return db;
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
    CREATE INDEX IF NOT EXISTS idx_matches_home_away ON matches(home_team_id, away_team_id);

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
    CREATE INDEX IF NOT EXISTS idx_predictions_match ON predictions(match_id);

    CREATE TABLE IF NOT EXISTS prediction_snapshots (
      id TEXT PRIMARY KEY,
      match_id TEXT UNIQUE NOT NULL REFERENCES matches(id),
      league_id TEXT NOT NULL,
      utc_date TEXT NOT NULL,
      p_home REAL NOT NULL,
      p_draw REAL NOT NULL,
      p_away REAL NOT NULL,
      p_btts_yes REAL NOT NULL,
      p_over25 REAL NOT NULL,
      lambda_home REAL NOT NULL,
      lambda_away REAL NOT NULL,
      elo_home REAL NOT NULL,
      elo_away REAL NOT NULL,
      confidence REAL NOT NULL,
      model_version TEXT NOT NULL,
      snapshot_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_snapshots_match ON prediction_snapshots(match_id);
    CREATE INDEX IF NOT EXISTS idx_snapshots_league ON prediction_snapshots(league_id);

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
      created_at TEXT NOT NULL,
      model_version TEXT,
      rps REAL
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

    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      content_md TEXT NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT,
      author TEXT NOT NULL DEFAULT 'تـقـديـر',
      read_time_mins INTEGER NOT NULL DEFAULT 4,
      views_count INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      published_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
    CREATE TABLE IF NOT EXISTS news (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_url TEXT,
      category TEXT NOT NULL DEFAULT 'أخبار عامة',
      published_at TEXT NOT NULL,
      image_url TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_news_published ON news(published_at DESC);

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id),
      name_en TEXT NOT NULL,
      name_ar TEXT,
      position TEXT,
      shirt_number INTEGER,
      photo_url TEXT,
      sportsdb_id TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE(team_id, name_en)
    );
    CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
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
    ["fouls_home", "REAL"],
    ["fouls_away", "REAL"],
    ["corners_home", "REAL"],
    ["corners_away", "REAL"],
    ["xg_home", "REAL"],
    ["xg_away", "REAL"],
    ["xa_home", "REAL"],
    ["xa_away", "REAL"],
    ["ppda_home", "REAL"],
    ["ppda_away", "REAL"],
    ["odds_open_home", "REAL"],
    ["odds_open_draw", "REAL"],
    ["odds_open_away", "REAL"],
    ["odds_close_home", "REAL"],
    ["odds_close_draw", "REAL"],
    ["odds_close_away", "REAL"],
    ["odds_sharp_home", "REAL"],
    ["odds_sharp_draw", "REAL"],
    ["odds_sharp_away", "REAL"],
    ["xg_true_home", "REAL"],
    ["xg_true_away", "REAL"],
    ["matches_7d_home", "REAL"],
    ["matches_7d_away", "REAL"],
    ["matches_14d_home", "REAL"],
    ["matches_14d_away", "REAL"],
    ["matches_30d_home", "REAL"],
    ["matches_30d_away", "REAL"],
    ["referee_name", "TEXT"],
    ["yellow_home", "INTEGER"],
    ["yellow_away", "INTEGER"],
    ["red_home", "INTEGER"],
    ["red_away", "INTEGER"],
    ["ht_home_goals", "INTEGER"],
    ["ht_away_goals", "INTEGER"],
    ["minute", "INTEGER"],
    ["live_status_ar", "TEXT"],
    ["live_events_json", "TEXT"],
    ["live_stats_json", "TEXT"],
  ];
  for (const [name, typ] of addMatch) {
    if (!cols.has(name)) {
      db.exec(`ALTER TABLE matches ADD COLUMN ${name} ${typ};`);
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
  // خطة 006: لبّ النموذج بلا سوق (pm)، وزن المرساة α، رأس التعادل، حكم الغربال
  const predExtra: [string, string][] = [
    ["pm_home", "REAL"],
    ["pm_draw", "REAL"],
    ["pm_away", "REAL"],
    ["alpha", "REAL"],
    ["p_draw_head", "REAL"],
    ["sieve_tier", "TEXT"],
    ["sieve_json", "TEXT"],
  ];
  for (const [name, typ] of predExtra) {
    if (!pcols.has(name)) {
      db.exec(`ALTER TABLE predictions ADD COLUMN ${name} ${typ}`);
    }
  }

  const mcols = new Set(
    (
      db.prepare(`PRAGMA table_info(model_metrics)`).all() as { name: string }[]
    ).map((c) => c.name),
  );
  // يميّز صفوف النموذج عن صفوف خط أساس السوق ('market') في نفس الجدول
  if (!mcols.has("model_version")) {
    db.exec(`ALTER TABLE model_metrics ADD COLUMN model_version TEXT`);
  }
  if (!mcols.has("rps")) {
    db.exec(`ALTER TABLE model_metrics ADD COLUMN rps REAL`);
  }

  const tcols = new Set(
    (
      db.prepare(`PRAGMA table_info(teams)`).all() as { name: string }[]
    ).map((c) => c.name),
  );
  if (!tcols.has("sportsdb_id")) {
    db.exec(`ALTER TABLE teams ADD COLUMN sportsdb_id TEXT`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id),
      name_en TEXT NOT NULL,
      name_ar TEXT,
      position TEXT,
      shirt_number INTEGER,
      photo_url TEXT,
      sportsdb_id TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE(team_id, name_en)
    );
    CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);

    CREATE TABLE IF NOT EXISTS player_strength (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id),
      player_name TEXT NOT NULL,
      position TEXT,
      strength REAL NOT NULL DEFAULT 1.0,
      minutes REAL NOT NULL DEFAULT 0,
      appearances INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      UNIQUE(team_id, player_name)
    );

    CREATE TABLE IF NOT EXISTS match_enrichment (
      match_id TEXT PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
      weather_temp_c REAL,
      weather_precip_mm REAL,
      weather_wind_kmh REAL,
      weather_multiplier REAL,
      weather_summary TEXT,
      lineup_json TEXT,
      lineup_confirmed INTEGER NOT NULL DEFAULT 0,
      steam_side TEXT,
      steam_magnitude REAL,
      sofascore_event_id TEXT,
      source TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS player_availability (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id),
      match_id TEXT REFERENCES matches(id) ON DELETE CASCADE,
      player_name TEXT NOT NULL,
      position TEXT,
      status TEXT NOT NULL,
      reason TEXT,
      source TEXT NOT NULL DEFAULT 'sofascore',
      as_of TEXT NOT NULL,
      UNIQUE(team_id, match_id, player_name)
    );
    CREATE INDEX IF NOT EXISTS idx_player_avail_team ON player_availability(team_id);
    CREATE INDEX IF NOT EXISTS idx_player_avail_match ON player_availability(match_id);

    CREATE TABLE IF NOT EXISTS referee_profiles (
      name TEXT PRIMARY KEY,
      matches_n INTEGER NOT NULL DEFAULT 0,
      avg_yellows REAL NOT NULL DEFAULT 0,
      avg_reds REAL NOT NULL DEFAULT 0,
      strictness REAL NOT NULL DEFAULT 1.0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS external_id_map (
      source TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      local_id TEXT NOT NULL,
      external_id TEXT NOT NULL,
      label TEXT,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (source, entity_type, local_id)
    );
    CREATE INDEX IF NOT EXISTS idx_ext_map_ext ON external_id_map(source, entity_type, external_id);
  `);

  // خطة 006 — جداول القياس والحسم (النسخة المرجعية في python/engine/schema.py)
  db.exec(`
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
  `);
}

export function closeDb() {
  if (globalForDb.__taqdeerDb) {
    globalForDb.__taqdeerDb.close();
    globalForDb.__taqdeerDb = undefined;
  }
}

import { cache } from "react";
import { getDb } from "./db";

export type MatchCard = {
  id: string;
  leagueId: string;
  leagueNameAr: string;
  utcDate: string;
  status: string;
  homeNameAr: string;
  awayNameAr: string;
  homeNameEn: string;
  awayNameEn: string;
  homeCrestUrl: string | null;
  awayCrestUrl: string | null;
  homeId: string;
  awayId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  pHome: number | null;
  pDraw: number | null;
  pAway: number | null;
  pBttsYes: number | null;
  pOver25: number | null;
  confidence: number | null;
  lambdaHome: number | null;
  lambdaAway: number | null;
  topScoresJson: string | null;
  scoreMatrixJson: string | null;
  eloHome: number | null;
  eloAway: number | null;
  season: string;
  analyticsJson: string | null;
  xptsHome: number | null;
  xptsAway: number | null;
  marketHome: number | null;
  marketDraw: number | null;
  marketAway: number | null;
  modelVersion: string | null;
  oddsHome: number | null;
  oddsDraw: number | null;
  oddsAway: number | null;
};

/** @deprecated alias — prefer MatchCard */
export type MatchRow = MatchCard & {
  league_id: string;
  league_name_ar: string;
  utc_date: string;
  home_name_ar: string;
  away_name_ar: string;
  home_name_en: string;
  away_name_en: string;
  home_crest_url: string | null;
  away_crest_url: string | null;
  home_id: string;
  away_id: string;
  home_goals: number | null;
  away_goals: number | null;
  p_home: number | null;
  p_draw: number | null;
  p_away: number | null;
  p_btts_yes: number | null;
  p_over25: number | null;
  lambda_home: number | null;
  lambda_away: number | null;
  top_scores_json: string | null;
  score_matrix_json: string | null;
  elo_home: number | null;
  elo_away: number | null;
  matchday: number | null;
  analytics_json: string | null;
  xpts_home: number | null;
  xpts_away: number | null;
  market_home: number | null;
  market_draw: number | null;
  market_away: number | null;
  model_version: string | null;
  odds_home: number | null;
  odds_draw: number | null;
  odds_away: number | null;
};

/** أعمدة القائمة — بلا JSON الثقيل غير المستخدم في الصفوف */
const LIST_SELECT = `
  SELECT m.id,
         m.league_id as leagueId,
         l.name_ar as leagueNameAr,
         m.utc_date as utcDate,
         m.status,
         m.season,
         m.matchday,
         ht.name_ar as homeNameAr, at.name_ar as awayNameAr,
         ht.name_en as homeNameEn, at.name_en as awayNameEn,
         ht.crest_url as homeCrestUrl, at.crest_url as awayCrestUrl,
         ht.id as homeId, at.id as awayId,
         m.home_goals as homeGoals, m.away_goals as awayGoals,
         p.p_home as pHome, p.p_draw as pDraw, p.p_away as pAway,
         p.p_btts_yes as pBttsYes, p.p_over25 as pOver25,
         p.confidence, p.lambda_home as lambdaHome, p.lambda_away as lambdaAway,
         NULL as topScoresJson, NULL as scoreMatrixJson,
         p.elo_home as eloHome, p.elo_away as eloAway,
         NULL as analyticsJson,
         p.xpts_home as xptsHome, p.xpts_away as xptsAway,
         p.market_home as marketHome, p.market_draw as marketDraw, p.market_away as marketAway,
         p.model_version as modelVersion,
         m.odds_home as oddsHome, m.odds_draw as oddsDraw, m.odds_away as oddsAway
  FROM matches m
  JOIN leagues l ON l.id = m.league_id
  JOIN teams ht ON ht.id = m.home_team_id
  JOIN teams at ON at.id = m.away_team_id
  LEFT JOIN predictions p ON p.match_id = m.id
`;

/** تفاصيل المباراة — يشمل مصفوفات الأهداف والتحليل */
const DETAIL_SELECT = `
  SELECT m.id,
         m.league_id as leagueId,
         l.name_ar as leagueNameAr,
         m.utc_date as utcDate,
         m.status,
         m.season,
         m.matchday,
         ht.name_ar as homeNameAr, at.name_ar as awayNameAr,
         ht.name_en as homeNameEn, at.name_en as awayNameEn,
         ht.crest_url as homeCrestUrl, at.crest_url as awayCrestUrl,
         ht.id as homeId, at.id as awayId,
         m.home_goals as homeGoals, m.away_goals as awayGoals,
         p.p_home as pHome, p.p_draw as pDraw, p.p_away as pAway,
         p.p_btts_yes as pBttsYes, p.p_over25 as pOver25,
         p.confidence, p.lambda_home as lambdaHome, p.lambda_away as lambdaAway,
         p.top_scores_json as topScoresJson, p.score_matrix_json as scoreMatrixJson,
         p.elo_home as eloHome, p.elo_away as eloAway,
         p.analytics_json as analyticsJson,
         p.xpts_home as xptsHome, p.xpts_away as xptsAway,
         p.market_home as marketHome, p.market_draw as marketDraw, p.market_away as marketAway,
         p.model_version as modelVersion,
         m.odds_home as oddsHome, m.odds_draw as oddsDraw, m.odds_away as oddsAway
  FROM matches m
  JOIN leagues l ON l.id = m.league_id
  JOIN teams ht ON ht.id = m.home_team_id
  JOIN teams at ON at.id = m.away_team_id
  LEFT JOIN predictions p ON p.match_id = m.id
`;

function toLegacy(m: MatchCard & { matchday?: number | null }): MatchRow {
  return {
    ...m,
    matchday: m.matchday ?? null,
    league_id: m.leagueId,
    league_name_ar: m.leagueNameAr,
    utc_date: m.utcDate,
    home_name_ar: m.homeNameAr,
    away_name_ar: m.awayNameAr,
    home_name_en: m.homeNameEn,
    away_name_en: m.awayNameEn,
    home_crest_url: m.homeCrestUrl,
    away_crest_url: m.awayCrestUrl,
    home_id: m.homeId,
    away_id: m.awayId,
    home_goals: m.homeGoals,
    away_goals: m.awayGoals,
    p_home: m.pHome,
    p_draw: m.pDraw,
    p_away: m.pAway,
    p_btts_yes: m.pBttsYes,
    p_over25: m.pOver25,
    lambda_home: m.lambdaHome,
    lambda_away: m.lambdaAway,
    top_scores_json: m.topScoresJson,
    score_matrix_json: m.scoreMatrixJson,
    elo_home: m.eloHome,
    elo_away: m.eloAway,
    analytics_json: m.analyticsJson,
    xpts_home: m.xptsHome,
    xpts_away: m.xptsAway,
    market_home: m.marketHome,
    market_draw: m.marketDraw,
    market_away: m.marketAway,
    model_version: m.modelVersion,
    odds_home: m.oddsHome,
    odds_draw: m.oddsDraw,
    odds_away: m.oddsAway,
  };
}

/**
 * الجولة القادمة لكل دوري على حدة.
 * القائمة الزمنية الموحّدة تنحاز لدوري يلعب على مدار السنة (الكوري) فتُخفي
 * الخمس الكبرى تماماً خارج موسمها؛ الحصة لكل دوري تُبقي الستة ظاهرة.
 */
export function getUpcomingByLeague(perLeague = 6): {
  leagueId: string;
  leagueNameAr: string;
  matches: MatchCard[];
}[] {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `${LIST_SELECT}
     WHERE m.status IN ('SCHEDULED','TIMED','IN_PLAY','PAUSED')
       AND m.league_id = ?
       AND m.source NOT IN ('preview-holdout','synthetic','demo')
       AND m.utc_date >= ?
     ORDER BY m.utc_date ASC
     LIMIT ?`,
  );

  return getLeagues()
    .map((league) => ({
      leagueId: league.id,
      leagueNameAr: league.name_ar,
      matches: stmt.all(league.id, now, perLeague) as MatchCard[],
    }))
    .filter((g) => g.matches.length > 0)
    .sort((a, b) => a.matches[0]!.utcDate.localeCompare(b.matches[0]!.utcDate));
}

/** أحدث النتائج الحقيقية من الدوريات الخمس (حصة متساوية لكل دوري) */
export function getRecentFinished(limit = 20): MatchCard[] {
  const db = getDb();
  const leagues = getLeagues();
  if (leagues.length === 0) return [];

  const perLeague = Math.max(2, Math.ceil(limit / leagues.length));
  const stmt = db.prepare(
    `${LIST_SELECT}
     WHERE m.status = 'FINISHED'
       AND m.league_id = ?
       AND p.id IS NOT NULL
       AND m.source IN ('football-data.co.uk','uk-csv','football-data.org','wikipedia')
     ORDER BY m.utc_date DESC
     LIMIT ?`,
  );

  const rows: MatchCard[] = [];
  for (const league of leagues) {
    rows.push(...(stmt.all(league.id, perLeague) as MatchCard[]));
  }

  // أحدث أولاً، مع إبقاء تنوّع الدوريات ظاهراً في أعلى القائمة
  rows.sort((a, b) => b.utcDate.localeCompare(a.utcDate));
  return rows.slice(0, limit);
}

/** آخر نتائج كل دوري على حدة (للعرض المجمّع) */
export function getRecentFinishedByLeague(perLeague = 4): {
  leagueId: string;
  leagueNameAr: string;
  matches: MatchCard[];
}[] {
  const db = getDb();
  const leagues = getLeagues();
  const stmt = db.prepare(
    `${LIST_SELECT}
     WHERE m.status = 'FINISHED'
       AND m.league_id = ?
       AND p.id IS NOT NULL
       AND m.source IN ('football-data.co.uk','uk-csv','football-data.org','wikipedia')
     ORDER BY m.utc_date DESC
     LIMIT ?`,
  );

  return leagues
    .map((league) => {
      const matches = stmt.all(league.id, perLeague) as MatchCard[];
      return {
        leagueId: league.id,
        leagueNameAr: league.name_ar,
        matches,
      };
    })
    .filter((g) => g.matches.length > 0);
}

export function getMatchById(id: string): MatchRow | null {
  const db = getDb();
  const row = db.prepare(`${DETAIL_SELECT} WHERE m.id = ?`).get(id) as
    | (MatchCard & { matchday: number | null })
    | undefined;
  return row ? toLegacy(row) : null;
}

/**
 * مباريات الدوري للواجهة: كل القادمة أولاً، ثم أحدث النتائج.
 * كان LIMIT موحّداً يقطع الموسم (مثلاً 40 من أصل ~200+ مجدولة).
 */
export function getLeagueMatches(
  leagueId: string,
  upcomingLimit = 250,
  recentLimit = 48,
): MatchCard[] {
  const db = getDb();
  const upcoming = db
    .prepare(
      `${LIST_SELECT}
       WHERE m.league_id = ?
         AND m.status IN ('SCHEDULED','TIMED','IN_PLAY','PAUSED')
       ORDER BY m.utc_date ASC
       LIMIT ?`,
    )
    .all(leagueId, upcomingLimit) as MatchCard[];

  const recent = db
    .prepare(
      `${LIST_SELECT}
       WHERE m.league_id = ?
         AND m.status = 'FINISHED'
       ORDER BY m.utc_date DESC
       LIMIT ?`,
    )
    .all(leagueId, recentLimit) as MatchCard[];

  return [...upcoming, ...recent];
}

/** عدّ حقيقي لمباريات الدوري — لا طول القائمة المقطوعة بـ LIMIT */
export function getLeagueMatchCounts(leagueId: string): {
  scheduled: number;
  finished: number;
} {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
         SUM(status IN ('SCHEDULED','TIMED','IN_PLAY','PAUSED')) AS scheduled,
         SUM(status = 'FINISHED') AS finished
       FROM matches WHERE league_id = ?`,
    )
    .get(leagueId) as { scheduled: number | null; finished: number | null };
  return { scheduled: row.scheduled ?? 0, finished: row.finished ?? 0 };
}

/** Prefer canonical 4-digit season labels (2025) over legacy (2025-26). */
function latestStandingsSeason(leagueId: string): string | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT season FROM standings
       WHERE league_id = ?
       ORDER BY
         CASE WHEN season GLOB '[0-9][0-9][0-9][0-9]' THEN 0 ELSE 1 END,
         season DESC
       LIMIT 1`,
    )
    .get(leagueId) as { season: string } | undefined;
  return row?.season ?? null;
}

export function getStandings(leagueId: string) {
  const db = getDb();
  const season = latestStandingsSeason(leagueId);
  if (!season) return [];

  return db
    .prepare(
      `SELECT s.*, t.name_ar, t.name_en, t.elo, t.attack, t.defense, t.crest_url
       FROM standings s
       JOIN teams t ON t.id = s.team_id
       WHERE s.league_id = ? AND s.season = ?
       ORDER BY s.position ASC`,
    )
    .all(leagueId, season) as Array<{
    position: number;
    season: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goals_for: number;
    goals_against: number;
    goal_difference: number;
    points: number;
    name_ar: string;
    name_en: string;
    elo: number;
    attack: number | null;
    defense: number | null;
    crest_url: string | null;
    team_id: string;
  }>;
}

export function getStandingsSeason(leagueId: string): string | null {
  return latestStandingsSeason(leagueId);
}

export function getTeam(id: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT t.*, l.name_ar as league_name_ar, l.id as league_id
       FROM teams t JOIN leagues l ON l.id = t.league_id
       WHERE t.id = ?`,
    )
    .get(id) as
    | {
        id: string;
        name_ar: string;
        name_en: string;
        crest_url: string | null;
        elo: number;
        attack: number | null;
        defense: number | null;
        league_name_ar: string;
        league_id: string;
      }
    | undefined;
}

export function getTeamMatches(teamId: string, limit = 15): MatchCard[] {
  const db = getDb();
  return db
    .prepare(
      `${LIST_SELECT}
       WHERE (m.home_team_id = ? OR m.away_team_id = ?)
         AND m.status = 'FINISHED'
       ORDER BY m.utc_date DESC
       LIMIT ?`,
    )
    .all(teamId, teamId, limit) as MatchCard[];
}

export function getEloHistory(teamId: string, limit = 40) {
  const db = getDb();
  return db
    .prepare(
      `SELECT date, elo FROM elo_snapshots
       WHERE team_id = ?
       ORDER BY date DESC
       LIMIT ?`,
    )
    .all(teamId, limit) as Array<{ date: string; elo: number }>;
}

export function getModelMetrics() {
  const db = getDb();
  return db
    .prepare(
      `SELECT m.id, m.league_id, m.window_label, m.n_matches, m.accuracy,
              m.brier, m.log_loss, m.created_at,
              l.name_ar as league_name_ar,
              l.name_ar as leagueNameAr
       FROM model_metrics m
       LEFT JOIN leagues l ON l.id = m.league_id
       ORDER BY m.created_at DESC`,
    )
    .all() as Array<{
    id: string;
    league_id: string | null;
    league_name_ar: string | null;
    leagueNameAr: string | null;
    window_label: string;
    n_matches: number;
    accuracy: number;
    brier: number;
    log_loss: number;
  }>;
}

/** Alias used by accuracy page */
export const getMetrics = getModelMetrics;

export const getLeagues = cache(function getLeagues() {
  const db = getDb();
  return db
    .prepare(
      `SELECT l.*,
        (
          SELECT t.crest_url
          FROM teams t
          WHERE t.league_id = l.id AND t.crest_url IS NOT NULL
          ORDER BY t.elo DESC
          LIMIT 1
        ) AS crest_url
       FROM leagues l
       ORDER BY l.name_ar`,
    )
    .all() as Array<{
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
    country_ar: string;
    crest_url: string | null;
  }>;
});

/**
 * فرق بلا أي نتيجة في القاعدة (صاعدة جديدة): تقديرها من الأولويات وحدها،
 * لا من أدائها. تُقرأ مرة واحدة كمجموعة بدل استعلام فرعي على كل صف.
 */
export const getColdTeamIds = cache(function getColdTeamIds(): Set<string> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT t.id FROM teams t
       WHERE NOT EXISTS (
         SELECT 1 FROM matches m
         WHERE m.status = 'FINISHED' AND m.home_goals IS NOT NULL
           AND (m.home_team_id = t.id OR m.away_team_id = t.id)
       )`,
    )
    .all() as Array<{ id: string }>;
  return new Set(rows.map((r) => r.id));
});

export function getStrengthTable(leagueId: string) {
  const db = getDb();
  const season = latestStandingsSeason(leagueId);
  if (!season) {
    return db
      .prepare(
        `SELECT t.id, t.name_ar, t.name_en, t.crest_url, t.elo, t.attack, t.defense,
                s.home_adv, s.rho
         FROM teams t
         LEFT JOIN team_strengths s ON s.team_id = t.id
         WHERE t.league_id = ?
           AND EXISTS (
             SELECT 1 FROM matches m
             WHERE m.status = 'FINISHED'
               AND (m.home_team_id = t.id OR m.away_team_id = t.id)
           )
         ORDER BY t.elo DESC`,
      )
      .all(leagueId) as Array<{
      id: string;
      name_ar: string;
      name_en: string;
      crest_url: string | null;
      elo: number;
      attack: number | null;
      defense: number | null;
      home_adv: number | null;
      rho: number | null;
    }>;
  }

  return db
    .prepare(
      `SELECT t.id, t.name_ar, t.name_en, t.crest_url, t.elo, t.attack, t.defense,
              ts.home_adv, ts.rho
       FROM standings st
       JOIN teams t ON t.id = st.team_id
       LEFT JOIN team_strengths ts ON ts.team_id = t.id
       WHERE st.league_id = ? AND st.season = ?
       ORDER BY t.elo DESC`,
    )
    .all(leagueId, season) as Array<{
    id: string;
    name_ar: string;
    name_en: string;
    crest_url: string | null;
    elo: number;
    attack: number | null;
    defense: number | null;
    home_adv: number | null;
    rho: number | null;
  }>;
}

export function dbReady(): boolean {
  return matchCount() > 0;
}

export function matchCount(): number {
  try {
    const row = getDb().prepare(`SELECT COUNT(*) as c FROM matches`).get() as {
      c: number;
    };
    return row.c;
  } catch {
    return 0;
  }
}

export function getMeta(key: string): string | null {
  try {
    const row = getDb()
      .prepare(`SELECT value FROM app_meta WHERE key = ?`)
      .get(key) as { value: string } | undefined;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

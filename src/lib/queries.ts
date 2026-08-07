import { cache } from "react";
import { getDb } from "./db";
import { LEAGUES, latestSeasonStartYear } from "./leagues";

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
  shotsHome: number | null;
  shotsAway: number | null;
  sotHome: number | null;
  sotAway: number | null;
  xgHome?: number | null;
  xgAway?: number | null;
  xaHome?: number | null;
  xaAway?: number | null;
  ppdaHome?: number | null;
  ppdaAway?: number | null;
  oddsOpenHome?: number | null;
  oddsOpenDraw?: number | null;
  oddsOpenAway?: number | null;
  refereeName?: string | null;
  matchday?: number | null;
  minute?: number | null;
  liveStatusAr?: string | null;
  liveEventsJson?: string | null;
  liveStatsJson?: string | null;
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

/** أعمدة القائمة — بلا JSON الثقيل غير المستخدم في الصفوف (يقلّص حمولة RSC للعميل) */
const LIST_SELECT = `
  SELECT m.id,
         m.league_id as leagueId,
         l.name_ar as leagueNameAr,
         m.utc_date as utcDate,
         m.status,
         m.season,
         m.matchday,
         m.minute,
         m.live_status_ar as liveStatusAr,
         NULL as liveEventsJson,
         NULL as liveStatsJson,
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
         m.odds_home as oddsHome, m.odds_draw as oddsDraw, m.odds_away as oddsAway,
         NULL as shotsHome, NULL as shotsAway, NULL as sotHome, NULL as sotAway
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
         m.minute,
         m.live_status_ar as liveStatusAr,
         m.live_events_json as liveEventsJson,
         m.live_stats_json as liveStatsJson,
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
         m.odds_home as oddsHome, m.odds_draw as oddsDraw, m.odds_away as oddsAway,
         m.shots_home as shotsHome, m.shots_away as shotsAway,
         m.sot_home as sotHome, m.sot_away as sotAway,
         m.xg_home as xgHome, m.xg_away as xgAway,
         m.xa_home as xaHome, m.xa_away as xaAway,
         m.ppda_home as ppdaHome, m.ppda_away as ppdaAway,
         m.odds_open_home as oddsOpenHome, m.odds_open_draw as oddsOpenDraw, m.odds_open_away as oddsOpenAway,
         m.referee_name as refereeName
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
 * المباريات المباشرة والقادمة لكل دوري على حدة.
 * لا تختفي المباريات عند انطلاقها أو أثناء اللعب، بل تبقى ظاهرة حتى تنتهي رسمياً (FINISHED)،
 * وبعد انتهائها تصعد المباريات والجولات التي تليها تلقائياً.
 *
 * الجولات تُعاد كاملة دائماً: perLeague حدّ أدنى تقريبي، وتُضاف الجولات جولةً
 * جولةً حتى بلوغه — فلا تُقصّ جولة في منتصفها ولا تظهر مباراتان فقط من دوري.
 */
export function getUpcomingByLeague(perLeague = 9): {
  leagueId: string;
  leagueNameAr: string;
  matches: MatchCard[];
}[] {
  const db = getDb();

  // المباريات القادمة والمباشرة (SCHEDULED, TIMED, IN_PLAY, etc.) النشطة اليوم أو في المستقبل فقط
  const activeStmt = db.prepare(
    `${LIST_SELECT}
     WHERE m.status IN ('SCHEDULED','TIMED','IN_PLAY','PAUSED','LIVE','1H','2H','HT','ET','P','BREAK')
       AND (datetime(m.utc_date) >= datetime('now', '-1 day') OR m.status IN ('IN_PLAY','PAUSED','LIVE','1H','2H','HT','ET','P','BREAK'))
       AND m.league_id = ?
       AND m.source NOT IN ('preview-holdout','synthetic','demo')
     ORDER BY m.utc_date ASC
     LIMIT ?`,
  );

  // مفتاح التجميع: رقم الجولة إن وُجد، وإلا يوم المباراة
  const bucketOf = (m: MatchCard) =>
    m.matchday != null ? `md-${m.matchday}` : `day-${m.utcDate.slice(0, 10)}`;
  const fetchCap = Math.max(perLeague * 4, 40);

  return getLeagues()
    .map((league) => {
      const all = activeStmt.all(league.id, fetchCap) as MatchCard[];

      const order: string[] = [];
      const counts = new Map<string, number>();
      for (const m of all) {
        const b = bucketOf(m);
        if (!counts.has(b)) {
          order.push(b);
          counts.set(b, 0);
        }
        counts.set(b, counts.get(b)! + 1);
      }

      const allowed = new Set<string>();
      let total = 0;
      for (const b of order) {
        allowed.add(b);
        total += counts.get(b)!;
        if (total >= perLeague) break;
      }

      const matches = all.filter((m) => allowed.has(bucketOf(m)));
      return {
        leagueId: league.id,
        leagueNameAr: league.name_ar,
        matches,
      };
    })
    .filter((g) => g.matches.length > 0)
    .sort((a, b) => {
      const aDate = a.matches[0]?.utcDate ?? "";
      const bDate = b.matches[0]?.utcDate ?? "";
      return aDate.localeCompare(bDate);
    });
}

/**
 * المباريات الجارية حالياً (Live In-Play).
 * لا يُدرج هنا إلا ما عليه دليل من المصدر: حالة مباشرة غير عالقة،
 * أو دقيقة/وصف حيّ داخل زمن اللعب. مضيّ الموعد وحده لا يجعل المباراة جارية،
 * وإلا ظهرت مباريات منتهية لم تُحدَّث حالتها بوصفها مباشرة.
 */
/** كما LIST_SELECT لكن مع حمولة البث المباشر (الأحداث والإحصائيات) — للـAPI اللحظي فقط */
const LIVE_SELECT = LIST_SELECT.replace(
  "NULL as liveEventsJson",
  "m.live_events_json as liveEventsJson",
).replace("NULL as liveStatsJson", "m.live_stats_json as liveStatsJson");

export function getLiveMatches(): MatchCard[] {
  const db = getDb();
  return db
    .prepare(
      `${LIVE_SELECT}
       WHERE m.status NOT IN ('FINISHED','POSTPONED','CANCELLED')
         AND m.utc_date <= datetime('now')
         AND (
           (m.status IN ('IN_PLAY','PAUSED','LIVE','1H','2H','HT','ET','P','BREAK')
            AND m.utc_date >= datetime('now', '-4 hours'))
           OR ((m.minute IS NOT NULL OR m.live_status_ar IS NOT NULL)
               AND m.utc_date >= datetime('now', '-115 minutes'))
         )
         AND m.source NOT IN ('preview-holdout','synthetic','demo')
       ORDER BY m.utc_date ASC`,
    )
    .all() as MatchCard[];
}

/** أحدث النتائج الحقيقية — يحدّد آخر موسم متاح تلقائياً لكل دوري */
export function getRecentFinished(limit = 20, _season?: string): MatchCard[] {
  const db = getDb();
  const leagues = getLeagues();
  if (leagues.length === 0) return [];

  const perLeague = Math.max(2, Math.ceil(limit / leagues.length));

  const latestSeasonStmt = db.prepare(
    `SELECT season FROM matches
     WHERE league_id = ? AND status = 'FINISHED' AND home_goals IS NOT NULL
     ORDER BY season DESC LIMIT 1`,
  );

  const stmt = db.prepare(
    `${LIST_SELECT}
     WHERE m.status = 'FINISHED'
       AND m.league_id = ?
       AND m.season = ?
       AND m.home_goals IS NOT NULL
       AND m.away_goals IS NOT NULL
     ORDER BY m.utc_date DESC
     LIMIT ?`,
  );

  const rows: MatchCard[] = [];
  for (const league of leagues) {
    const season = _season ?? (latestSeasonStmt.get(league.id) as { season: string } | undefined)?.season ?? String(latestSeasonStartYear());
    rows.push(...(stmt.all(league.id, season, perLeague) as MatchCard[]));
  }

  // أحدث أولاً، مع إبقاء تنوّع الدوريات ظاهراً في أعلى القائمة
  rows.sort((a, b) => b.utcDate.localeCompare(a.utcDate));
  return rows.slice(0, limit);
}

/** آخر نتائج كل دوري — يحدّد آخر موسم متاح تلقائياً لكل دوري */
export function getRecentFinishedByLeague(perLeague = 4, _season?: string): {
  leagueId: string;
  leagueNameAr: string;
  matches: MatchCard[];
}[] {
  const db = getDb();
  const leagues = getLeagues();

  // استعلام يعثر على آخر موسم له نتائج فعلية لكل دوري
  const latestSeasonStmt = db.prepare(
    `SELECT season FROM matches
     WHERE league_id = ? AND status = 'FINISHED' AND home_goals IS NOT NULL
     ORDER BY season DESC LIMIT 1`,
  );

  const stmt = db.prepare(
    `${LIST_SELECT}
     WHERE m.status = 'FINISHED'
       AND m.league_id = ?
       AND m.season = ?
       AND m.home_goals IS NOT NULL
       AND m.away_goals IS NOT NULL
     ORDER BY m.utc_date DESC
     LIMIT ?`,
  );

  return leagues
    .map((league) => {
      const season = _season ?? (latestSeasonStmt.get(league.id) as { season: string } | undefined)?.season ?? String(latestSeasonStartYear());
      const matches = stmt.all(league.id, season, perLeague) as MatchCard[];
      return {
        leagueId: league.id,
        leagueNameAr: league.name_ar,
        matches,
      };
    })
    .filter((g) => g.matches.length > 0);
}

/** معرّفات النرويج كانت تتغيّر sch→r16→fin عند المزامنة — نحلّ البدائل */
const LEGACY_MATCH_ID_RE =
  /^([a-z0-9]+)-(\d+)-(sch|fin|r\d+)-([a-z0-9]+)-([a-z0-9]+)$/i;

export function getMatchById(id: string): MatchRow | null {
  const db = getDb();
  const byId = db.prepare(`${DETAIL_SELECT} WHERE m.id = ?`);
  const row = byId.get(id) as
    | (MatchCard & { matchday: number | null })
    | undefined;
  if (row) return toLegacy(row);

  const legacy = id.match(LEGACY_MATCH_ID_RE);
  if (!legacy) return null;

  const league = legacy[1]!.toLowerCase();
  const season = legacy[2]!;
  const homeCode = legacy[4]!.toLowerCase();
  const awayCode = legacy[5]!.toLowerCase();
  const homeId = `${league}-${homeCode}`;
  const awayId = `${league}-${awayCode}`;

  const alt = db
    .prepare(
      `${DETAIL_SELECT}
       WHERE m.league_id = ?
         AND m.season = ?
         AND m.home_team_id = ?
         AND m.away_team_id = ?
       ORDER BY m.utc_date DESC
       LIMIT 1`,
    )
    .get(league, season, homeId, awayId) as
    | (MatchCard & { matchday: number | null })
    | undefined;

  return alt ? toLegacy(alt) : null;
}

/**
 * مباريات الدوري للواجهة: كل القادمة أولاً، ثم أحدث النتائج.
 * الحد الافتراضي يستوعب موسماً كاملاً (380 مباراة) فلا يُقصّ الجدول.
 */
export function getLeagueMatches(
  leagueId: string,
  upcomingLimit = 400,
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

/** الحصول على المواسم المتاحة للدوري مرتبة تنازلياً */
export function getAvailableSeasons(leagueId: string): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT season FROM (
         SELECT season FROM standings WHERE league_id = ?
         UNION
         SELECT season FROM matches WHERE league_id = ?
       )
       WHERE season IS NOT NULL AND season != ''
       ORDER BY season DESC`,
    )
    .all(leagueId, leagueId) as Array<{ season: string }>;
  const list = rows.map((r) => r.season);
  const currentSeason = String(latestSeasonStartYear());
  if (!list.includes(currentSeason)) {
    list.unshift(currentSeason);
  }
  return list;
}

export function getStandings(leagueId: string, seasonParam?: string) {
  const db = getDb();
  const season = seasonParam || latestStandingsSeason(leagueId);
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

/** مواجهات سابقة بين الفريقين بالاتجاهين — المنتهية قبل موعد المباراة المعروضة فقط.
 * الحدّ الزمني يُبقي صفحة المباراة المنتهية صادقة: لا لقاء لُعب بعدها يظهر «سابقاً» */
export function getHeadToHead(
  homeId: string,
  awayId: string,
  beforeIso: string,
  limit = 6,
): MatchCard[] {
  const db = getDb();
  return db
    .prepare(
      `${LIST_SELECT}
       WHERE m.status = 'FINISHED'
         AND m.utc_date < ?
         AND m.source NOT IN ('preview-holdout','synthetic','demo')
         AND ((m.home_team_id = ? AND m.away_team_id = ?)
           OR (m.home_team_id = ? AND m.away_team_id = ?))
       ORDER BY m.utc_date DESC
       LIMIT ?`,
    )
    .all(beforeIso, homeId, awayId, awayId, homeId, limit) as MatchCard[];
}

/** الجدول كما كان لحظة انطلاق المباراة — يُبنى من نتائج ما قبل موعدها فقط.
 * ponytail: تعادل النقاط يُحسم بفارق الأهداف ثم المسجَّل — كفاية عرضية،
 * لا قواعد المواجهات المباشرة الخاصة ببعض الدوريات */
export function getStandingsAt(
  leagueId: string,
  season: string,
  beforeIso: string,
): Array<{ team_id: string; position: number; points: number }> {
  const rows = getDb()
    .prepare(
      `SELECT team_id, SUM(pts) as points, SUM(gf - ga) as gd, SUM(gf) as gf
       FROM (
         SELECT home_team_id as team_id,
                CASE WHEN home_goals > away_goals THEN 3
                     WHEN home_goals = away_goals THEN 1 ELSE 0 END as pts,
                home_goals as gf, away_goals as ga
         FROM matches
         WHERE league_id = ? AND season = ? AND status = 'FINISHED'
           AND utc_date < ? AND home_goals IS NOT NULL
         UNION ALL
         SELECT away_team_id,
                CASE WHEN away_goals > home_goals THEN 3
                     WHEN home_goals = away_goals THEN 1 ELSE 0 END,
                away_goals, home_goals
         FROM matches
         WHERE league_id = ? AND season = ? AND status = 'FINISHED'
           AND utc_date < ? AND home_goals IS NOT NULL
       )
       GROUP BY team_id
       ORDER BY points DESC, gd DESC, gf DESC`,
    )
    .all(leagueId, season, beforeIso, leagueId, season, beforeIso) as Array<{
    team_id: string;
    points: number;
  }>;
  return rows.map((r, i) => ({
    team_id: r.team_id,
    position: i + 1,
    points: r.points,
  }));
}

/** أيام الراحة منذ آخر مباراة منتهية قبل موعد هذه المباراة */
export function getRestDays(teamId: string, beforeIso: string): number | null {
  const row = getDb()
    .prepare(
      `SELECT utc_date FROM matches
       WHERE (home_team_id = ? OR away_team_id = ?)
         AND status = 'FINISHED' AND utc_date < ?
       ORDER BY utc_date DESC
       LIMIT 1`,
    )
    .get(teamId, teamId, beforeIso) as { utc_date: string } | undefined;
  if (!row) return null;
  const days = Math.floor(
    (Date.parse(beforeIso) - Date.parse(row.utc_date)) / 86_400_000,
  );
  // ponytail: فوق 30 يوماً = توقف موسم لا راحة — نصمت بدل رقم مضلل
  return days >= 1 && days <= 30 ? days : null;
}

export type VenueRecord = {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
};

/** سجل الفريق في ملعبه أو خارجه لموسم واحد حتى موعد المباراة المعروضة —
 * فوز/تعادل/خسارة وأهداف، بلا مباريات لُعبت بعدها */
export function getVenueRecord(
  teamId: string,
  leagueId: string,
  season: string,
  venue: "home" | "away",
  beforeIso: string,
): VenueRecord {
  const gf = venue === "home" ? "home_goals" : "away_goals";
  const ga = venue === "home" ? "away_goals" : "home_goals";
  return getDb()
    .prepare(
      `SELECT COUNT(*) as played,
              COALESCE(SUM(${gf} > ${ga}), 0) as won,
              COALESCE(SUM(${gf} = ${ga}), 0) as drawn,
              COALESCE(SUM(${gf} < ${ga}), 0) as lost,
              COALESCE(SUM(${gf}), 0) as gf,
              COALESCE(SUM(${ga}), 0) as ga
       FROM matches
       WHERE ${venue === "home" ? "home_team_id" : "away_team_id"} = ?
         AND league_id = ? AND season = ? AND status = 'FINISHED'
         AND utc_date < ?
         AND home_goals IS NOT NULL AND away_goals IS NOT NULL`,
    )
    .get(teamId, leagueId, season, beforeIso) as VenueRecord;
}

export function getModelMetrics() {
  const db = getDb();
  return db
    .prepare(
      `SELECT m.id, m.league_id, m.window_label, m.n_matches, m.accuracy,
              m.brier, m.log_loss, m.rps, m.created_at, m.model_version,
              l.name_ar as leagueNameAr
       FROM model_metrics m
       LEFT JOIN leagues l ON l.id = m.league_id
       ORDER BY m.created_at DESC`,
    )
    .all() as Array<{
    id: string;
    league_id: string | null;
    leagueNameAr: string | null;
    window_label: string;
    n_matches: number;
    accuracy: number;
    brier: number;
    log_loss: number;
    rps: number | null;
    model_version: string | null;
  }>;
}

export const getLeagues = cache(function getLeagues() {
  const db = getDb();
  const validIds = LEAGUES.map((l) => l.id);
  const placeholders = validIds.map(() => "?").join(",");
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
       WHERE l.id IN (${placeholders})
       ORDER BY l.name_ar`,
    )
    .all(...validIds) as Array<{
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

export const getValueMatches = cache(function getValueMatches(): Array<{
  id: string;
  league_id: string;
  league_name_ar: string;
  home_name_ar: string;
  away_name_ar: string;
  utc_date: string;
  p_home: number;
  p_draw: number;
  p_away: number;
  odds_home: number | null;
  odds_draw: number | null;
  odds_away: number | null;
  analytics_json: string | null;
}> {
  try {
    const db = getDb();
    // فرص القيمة تُحسب فقط من أودز سوق حقيقية — بلا أودز لا يوجد EV يمكن ادعاؤه.
    // النطاق: الأسابيع الثلاثة القادمة (الموسم كامل في القاعدة وعرضه كله بلا فائدة تحليلية)
    const rows = db.prepare(`
      SELECT m.id, m.league_id, l.name_ar as league_name_ar,
             ht.name_ar as home_name_ar, at.name_ar as away_name_ar,
             m.utc_date, p.p_home, p.p_draw, p.p_away,
             m.odds_home, m.odds_draw, m.odds_away, p.analytics_json
      FROM predictions p
      JOIN matches m ON m.id = p.match_id
      JOIN leagues l ON l.id = m.league_id
      JOIN teams ht ON ht.id = m.home_team_id
      JOIN teams at ON at.id = m.away_team_id
      WHERE m.utc_date >= datetime('now')
        AND m.utc_date <= datetime('now', '+21 days')
        AND m.status IN ('SCHEDULED', 'TIMED', 'IN_PLAY', 'PAUSED')
        AND m.odds_home IS NOT NULL
        AND m.odds_draw IS NOT NULL
        AND m.odds_away IS NOT NULL
      ORDER BY m.utc_date ASC
      LIMIT 150
    `).all() as Array<{
      id: string;
      league_id: string;
      league_name_ar: string;
      home_name_ar: string;
      away_name_ar: string;
      utc_date: string;
      p_home: number;
      p_draw: number;
      p_away: number;
      odds_home: number;
      odds_draw: number;
      odds_away: number;
      analytics_json: string | null;
    }>;

    const result: Array<{
      id: string;
      league_id: string;
      league_name_ar: string;
      home_name_ar: string;
      away_name_ar: string;
      utc_date: string;
      p_home: number;
      p_draw: number;
      p_away: number;
      odds_home: number | null;
      odds_draw: number | null;
      odds_away: number | null;
      analytics_json: string | null;
    }> = [];

    for (const r of rows) {
      let analytics: { value?: { ev?: number; side?: string; odds?: number; stake?: number } } | null = null;
      if (r.analytics_json) {
        try {
          analytics = JSON.parse(r.analytics_json);
        } catch {}
      }

      const ev_h = r.p_home * r.odds_home - 1;
      const ev_d = r.p_draw * r.odds_draw - 1;
      const ev_a = r.p_away * r.odds_away - 1;

      const maxEv = Math.max(ev_h, ev_d, ev_a);
      // نفس نطاق محرك التوقعات: أقل من 3% ضجيج، وأكثر من 15% غالباً خطأ نموذج أو أودز قديمة
      if (maxEv < 0.03 || maxEv > 0.15) continue;

      const side: "home" | "draw" | "away" =
        maxEv === ev_h ? "home" : maxEv === ev_d ? "draw" : "away";

      const odds = side === "home" ? r.odds_home : side === "draw" ? r.odds_draw : r.odds_away;
      const prob = side === "home" ? r.p_home : side === "draw" ? r.p_draw : r.p_away;

      const b = odds > 1 ? odds - 1 : 1;
      const q = 1 - prob;
      const kelly = Math.max(0, (b * prob - q) / b) * 0.25;

      const valueObj = {
        side,
        odds,
        ev: parseFloat(maxEv.toFixed(3)),
        stake: parseFloat(kelly.toFixed(3)),
        bet: true,
      };

      const updatedAnalytics = analytics
        ? { ...analytics, value: valueObj }
        : { value: valueObj };

      result.push({
        ...r,
        analytics_json: JSON.stringify(updatedAnalytics),
      });
    }

    return result;
  } catch {
    return [];
  }
});

export type BankerPick = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  leagueName: string;
  pickLabel: string;
  probability: number;
  confidence: number;
};

export const getBankerPicks = cache(function getBankerPicks(limit = 4, leagueId?: string): BankerPick[] {
  try {
    const db = getDb();
    const leagueFilter = leagueId ? "AND m.league_id = ?" : "";
    const params: unknown[] = leagueId ? [leagueId, limit] : [limit];

    let rows = db.prepare(`
      SELECT m.id as matchId, l.name_ar as leagueName,
             ht.name_ar as homeTeam, at.name_ar as awayTeam,
             p.p_home, p.p_draw, p.p_away, p.confidence, m.utc_date
      FROM matches m
      JOIN leagues l ON l.id = m.league_id
      JOIN teams ht ON ht.id = m.home_team_id
      JOIN teams at ON at.id = m.away_team_id
      JOIN predictions p ON p.match_id = m.id
      WHERE (m.status IN ('SCHEDULED', 'TIMED') OR m.utc_date >= date('now'))
        AND (p.p_home IS NOT NULL OR p.p_away IS NOT NULL)
      ${leagueFilter}
      ORDER BY m.utc_date ASC, MAX(COALESCE(p.p_home, 0), COALESCE(p.p_away, 0)) DESC
      LIMIT ?
    `).all(...params) as Array<{
      matchId: string;
      leagueName: string;
      homeTeam: string;
      awayTeam: string;
      p_home: number | null;
      p_draw: number | null;
      p_away: number | null;
      confidence: number | null;
      utc_date: string;
    }>;

    if (rows.length === 0) {
      rows = db.prepare(`
        SELECT m.id as matchId, l.name_ar as leagueName,
               ht.name_ar as homeTeam, at.name_ar as awayTeam,
               p.p_home, p.p_draw, p.p_away, p.confidence, m.utc_date
        FROM matches m
        JOIN leagues l ON l.id = m.league_id
        JOIN teams ht ON ht.id = m.home_team_id
        JOIN teams at ON at.id = m.away_team_id
        JOIN predictions p ON p.match_id = m.id
        WHERE (p.p_home IS NOT NULL OR p.p_away IS NOT NULL)
        ${leagueFilter}
        ORDER BY m.utc_date DESC
        LIMIT ?
      `).all(...params) as typeof rows;
    }

    return rows.map((r) => {
      const pH = r.p_home ?? 0.5;
      const pA = r.p_away ?? 0.3;
      const isHomePick = pH >= pA;
      const prob = isHomePick ? pH : pA;
      const pickLabel = isHomePick ? `فوز المضيف (1)` : `فوز الضيف (2)`;
      // بلا اختلاق: عند غياب ثقة النموذج (لا يحدث عملياً — العمود NOT NULL) نعرض الاحتمال نفسه
      const conf = r.confidence ?? prob;

      return {
        matchId: r.matchId,
        homeTeam: r.homeTeam,
        awayTeam: r.awayTeam,
        leagueName: r.leagueName,
        pickLabel,
        probability: Number(prob.toFixed(2)),
        confidence: Number(conf.toFixed(2)),
      };
    });
  } catch (e) {
    console.error("Error in getBankerPicks:", e);
    return [];
  }
});

export type Article = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  contentMd: string;
  category: string;
  imageUrl: string | null;
  author: string;
  readTimeMins: number;
  viewsCount: number;
  isFeatured: boolean;
  publishedAt: string;
  updatedAt: string;
};

export const getArticles = cache((limit = 12, category?: string): Article[] => {
  try {
    const db = getDb();
    let sql = `
      SELECT id, slug, title, summary, content_md as contentMd, category,
             image_url as imageUrl, author, read_time_mins as readTimeMins,
             views_count as viewsCount, is_featured as isFeatured,
             published_at as publishedAt, updated_at as updatedAt
      FROM articles
    `;
    const params: (string | number)[] = [];
    if (category && category !== "الكل") {
      sql += ` WHERE category = ?`;
      params.push(category);
    }
    sql += ` ORDER BY is_featured DESC, published_at DESC LIMIT ?`;
    params.push(limit);

    const rows = db.prepare(sql).all(...params) as Array<{
      id: string;
      slug: string;
      title: string;
      summary: string;
      contentMd: string;
      category: string;
      imageUrl: string | null;
      author: string;
      readTimeMins: number;
      viewsCount: number;
      isFeatured: number;
      publishedAt: string;
      updatedAt: string;
    }>;

    return rows.map((r) => ({
      ...r,
      isFeatured: Boolean(r.isFeatured),
    }));
  } catch (e) {
    console.error("Error in getArticles:", e);
    return [];
  }
});

export const getFeaturedArticle = cache((): Article | null => {
  const articles = getArticles(1);
  return articles[0] || null;
});

export const getArticleBySlug = cache((slug: string): Article | null => {
  try {
    const db = getDb();
    const row = db.prepare(`
      SELECT id, slug, title, summary, content_md as contentMd, category,
             image_url as imageUrl, author, read_time_mins as readTimeMins,
             views_count as viewsCount, is_featured as isFeatured,
             published_at as publishedAt, updated_at as updatedAt
      FROM articles
      WHERE slug = ?
    `).get(slug) as {
      id: string;
      slug: string;
      title: string;
      summary: string;
      contentMd: string;
      category: string;
      imageUrl: string | null;
      author: string;
      readTimeMins: number;
      viewsCount: number;
      isFeatured: number;
      publishedAt: string;
      updatedAt: string;
    } | undefined;

    if (!row) return null;

    // Increment view count asynchronously
    try {
      db.prepare(`UPDATE articles SET views_count = views_count + 1 WHERE slug = ?`).run(slug);
    } catch {
      // ignore
    }

    return {
      ...row,
      isFeatured: Boolean(row.isFeatured),
    };
  } catch (e) {
    console.error("Error in getArticleBySlug:", e);
    return null;
  }
});

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string | null;
  category: string;
  publishedAt: string;
  imageUrl: string | null;
};

export const getLatestNews = cache((limit = 20, category?: string): NewsItem[] => {
  try {
    const db = getDb();
    let sql = `
      SELECT id, title, summary, source_name as sourceName, source_url as sourceUrl,
             category, published_at as publishedAt, image_url as imageUrl
      FROM news
    `;
    const params: (string | number)[] = [];
    if (category && category !== "الكل") {
      sql += ` WHERE category = ?`;
      params.push(category);
    }
    sql += ` ORDER BY published_at DESC LIMIT ?`;
    params.push(limit);

    return db.prepare(sql).all(...params) as NewsItem[];
  } catch (e) {
    console.error("Error in getLatestNews:", e);
    return [];
  }
});

export type DbPlayer = {
  id: string;
  teamId: string;
  nameEn: string;
  nameAr: string | null;
  position: string | null;
  shirtNumber: number | null;
  photoUrl: string | null;
};

export function getTeamPlayers(teamId: string, limit = 24): DbPlayer[] {
  try {
    const db = getDb();
    return db
      .prepare(
        `SELECT p.id,
                p.team_id as teamId,
                p.name_en as nameEn,
                p.name_ar as nameAr,
                p.position,
                p.shirt_number as shirtNumber,
                p.photo_url as photoUrl
         FROM players p
         WHERE p.team_id IN (
           SELECT id FROM teams WHERE id = ?
           UNION
           SELECT t2.id
           FROM teams t1
           JOIN teams t2
             ON t2.league_id = t1.league_id
            AND lower(t2.name_en) = lower(t1.name_en)
           WHERE t1.id = ?
           UNION
           SELECT t2.id
           FROM teams t1
           JOIN teams t2
             ON t2.sportsdb_id IS NOT NULL
            AND t2.sportsdb_id = t1.sportsdb_id
           WHERE t1.id = ? AND t1.sportsdb_id IS NOT NULL
         )
         ORDER BY
           CASE
             WHEN p.position LIKE '%Forward%' OR p.position LIKE '%Winger%' OR p.position LIKE '%Striker%' THEN 0
             WHEN p.position LIKE '%Attacking Mid%' THEN 1
             WHEN p.position LIKE '%Midfield%' THEN 2
             WHEN p.position LIKE '%Back%' OR p.position LIKE '%Defender%' THEN 3
             WHEN p.position LIKE '%Goalkeeper%' THEN 4
             ELSE 5
           END,
           CASE WHEN p.photo_url IS NOT NULL AND p.photo_url != '' THEN 0 ELSE 1 END,
           CASE WHEN p.shirt_number IS NULL THEN 1 ELSE 0 END,
           p.shirt_number ASC,
           p.name_en ASC
         LIMIT ?`,
      )
      .all(teamId, teamId, teamId, limit) as DbPlayer[];
  } catch (e) {
    console.error("Error in getTeamPlayers:", e);
    return [];
  }
}

export type FinishedPredictionItem = MatchCard & {
  predictedOutcome: "H" | "D" | "A";
  actualOutcome: "H" | "D" | "A";
  isHit: boolean;
  topProb: number;
  doubleChanceRec: string;
  doubleChanceHit: boolean;
  brierScore: number;
  isSnapshotLocked?: boolean;
};

export const getFinishedPredictionsHistory = cache(
  (leagueId?: string, limit = 200): FinishedPredictionItem[] => {
    try {
      const db = getDb();
      let sql = `
        SELECT 
          m.id, m.league_id AS leagueId, l.name_ar AS leagueNameAr, m.season, m.matchday,
          m.utc_date AS utcDate, m.status, m.home_goals AS homeGoals, m.away_goals AS awayGoals,
          m.home_team_id AS homeId, m.away_team_id AS awayId,
          th.name_ar AS homeNameAr, th.name_en AS homeNameEn, th.crest_url AS homeCrestUrl,
          ta.name_ar AS awayNameAr, ta.name_en AS awayNameEn, ta.crest_url AS awayCrestUrl,
          COALESCE(ps.p_home, p.p_home) AS pHome,
          COALESCE(ps.p_draw, p.p_draw) AS pDraw,
          COALESCE(ps.p_away, p.p_away) AS pAway,
          COALESCE(ps.p_btts_yes, p.p_btts_yes) AS pBttsYes,
          COALESCE(ps.p_over25, p.p_over25) AS pOver25,
          COALESCE(ps.lambda_home, p.lambda_home) AS lambdaHome,
          COALESCE(ps.lambda_away, p.lambda_away) AS lambdaAway,
          COALESCE(ps.confidence, p.confidence) AS confidence,
          CASE WHEN ps.id IS NOT NULL THEN 1 ELSE 0 END AS isSnapshotLocked
        FROM matches m
        JOIN leagues l ON l.id = m.league_id
        JOIN teams th ON th.id = m.home_team_id
        JOIN teams ta ON ta.id = m.away_team_id
        LEFT JOIN predictions p
          ON p.match_id = m.id AND p.model_version != 'live-v1'
        LEFT JOIN prediction_snapshots ps
          ON ps.match_id = m.id AND ps.model_version != 'live-v1'
        WHERE m.status = 'FINISHED'
          AND m.utc_date >= ?
          AND (p.p_home IS NOT NULL OR ps.p_home IS NOT NULL)
      `;
      // بداية الموسم الجاري تُشتق من التاريخ — لا قيمة مكتوبة تتقادم مع المواسم
      const params: (string | number)[] = [`${latestSeasonStartYear()}-08-01`];

      if (leagueId && leagueId !== "all") {
        sql += ` AND m.league_id = ?`;
        params.push(leagueId);
      }

      sql += ` ORDER BY m.utc_date DESC LIMIT ?`;
      params.push(limit);

      const rows = db.prepare(sql).all(...params) as (MatchCard & { isSnapshotLocked: number })[];

      return rows.map((m) => {
        const pHome = m.pHome ?? 0;
        const pDraw = m.pDraw ?? 0;
        const pAway = m.pAway ?? 0;

        let predictedOutcome: "H" | "D" | "A" = "H";
        let topProb = pHome;
        if (pDraw > pHome && pDraw >= pAway) {
          predictedOutcome = "D";
          topProb = pDraw;
        } else if (pAway > pHome && pAway > pDraw) {
          predictedOutcome = "A";
          topProb = pAway;
        }

        const hg = m.homeGoals ?? 0;
        const ag = m.awayGoals ?? 0;
        let actualOutcome: "H" | "D" | "A" = "H";
        if (hg === ag) actualOutcome = "D";
        else if (hg < ag) actualOutcome = "A";

        const isHit = predictedOutcome === actualOutcome;

        // Double chance calculation (1X, X2, 12)
        const p1X = pHome + pDraw;
        const pX2 = pDraw + pAway;
        const p12 = pHome + pAway;
        let doubleChanceRec = "1X";
        let doubleChanceHit = actualOutcome === "H" || actualOutcome === "D";

        if (pX2 > p1X && pX2 >= p12) {
          doubleChanceRec = "X2";
          doubleChanceHit = actualOutcome === "A" || actualOutcome === "D";
        } else if (p12 > p1X && p12 > pX2) {
          doubleChanceRec = "12";
          doubleChanceHit = actualOutcome === "H" || actualOutcome === "A";
        }

        // Brier score calculation
        const oH = actualOutcome === "H" ? 1 : 0;
        const oD = actualOutcome === "D" ? 1 : 0;
        const oA = actualOutcome === "A" ? 1 : 0;
        const brierScore = (pHome - oH) ** 2 + (pDraw - oD) ** 2 + (pAway - oA) ** 2;

        return {
          ...m,
          predictedOutcome,
          actualOutcome,
          isHit,
          topProb,
          doubleChanceRec,
          doubleChanceHit,
          brierScore,
          isSnapshotLocked: Boolean(m.isSnapshotLocked),
        };
      });
    } catch (e) {
      console.error("Error in getFinishedPredictionsHistory:", e);
      return [];
    }
  }
);

/**
 * توقعات محفوظة (snapshots) للمباريات القادمة — جولة كاملة لكل دوري.
 * لا تُقصّ الجولة في منتصفها: perLeague حدّ أدنى، وتُضاف الجولات جولةً جولةً حتى بلوغه.
 */
export const getUpcomingSnapshotMatches = cache((perLeague = 20): MatchCard[] => {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT 
        m.id, m.league_id AS leagueId, l.name_ar AS leagueNameAr, m.season, m.matchday,
        m.utc_date AS utcDate, m.status, m.home_goals AS homeGoals, m.away_goals AS awayGoals,
        m.home_team_id AS homeId, m.away_team_id AS awayId,
        th.name_ar AS homeNameAr, th.name_en AS homeNameEn, th.crest_url AS homeCrestUrl,
        ta.name_ar AS awayNameAr, ta.name_en AS awayNameEn, ta.crest_url AS awayCrestUrl,
        COALESCE(ps.p_home, p.p_home) AS pHome,
        COALESCE(ps.p_draw, p.p_draw) AS pDraw,
        COALESCE(ps.p_away, p.p_away) AS pAway,
        COALESCE(ps.p_btts_yes, p.p_btts_yes) AS pBttsYes,
        COALESCE(ps.p_over25, p.p_over25) AS pOver25,
        COALESCE(ps.lambda_home, p.lambda_home) AS lambdaHome,
        COALESCE(ps.lambda_away, p.lambda_away) AS lambdaAway,
        COALESCE(ps.confidence, p.confidence) AS confidence
      FROM matches m
      JOIN leagues l ON l.id = m.league_id
      JOIN teams th ON th.id = m.home_team_id
      JOIN teams ta ON ta.id = m.away_team_id
      JOIN prediction_snapshots ps ON ps.match_id = m.id
      LEFT JOIN predictions p ON p.match_id = m.id
      WHERE m.status IN ('SCHEDULED', 'TIMED')
        AND date(m.utc_date) >= date('now')
        AND m.league_id = ?
      ORDER BY m.utc_date ASC
      LIMIT ?
    `);

    const bucketOf = (m: MatchCard) =>
      m.matchday != null ? `md-${m.matchday}` : `day-${m.utcDate.slice(0, 10)}`;
    const fetchCap = Math.max(perLeague * 4, 40);

    const out: MatchCard[] = [];
    for (const league of getLeagues()) {
      const all = stmt.all(league.id, fetchCap) as MatchCard[];
      if (all.length === 0) continue;

      const order: string[] = [];
      const counts = new Map<string, number>();
      for (const m of all) {
        const b = bucketOf(m);
        if (!counts.has(b)) {
          order.push(b);
          counts.set(b, 0);
        }
        counts.set(b, counts.get(b)! + 1);
      }

      const allowed = new Set<string>();
      let total = 0;
      for (const b of order) {
        allowed.add(b);
        total += counts.get(b)!;
        if (total >= perLeague) break;
      }

      out.push(...all.filter((m) => allowed.has(bucketOf(m))));
    }

    out.sort((a, b) => a.utcDate.localeCompare(b.utcDate));
    return out;
  } catch (e) {
    console.error("Error in getUpcomingSnapshotMatches:", e);
    return [];
  }
});

export type MatchEnrichment = {
  weatherTempC: number | null;
  weatherPrecipMm: number | null;
  weatherWindKmh: number | null;
  weatherMultiplier: number | null;
  weatherSummary: string | null;
  lineupConfirmed: boolean;
  lineupJson: string | null;
  steamSide: string | null;
  steamMagnitude: number | null;
  sofascoreEventId: string | null;
  updatedAt: string | null;
};

export type PlayerAvailabilityRow = {
  teamId: string;
  playerName: string;
  position: string | null;
  status: string;
  reason: string | null;
};

export function getMatchEnrichment(matchId: string): MatchEnrichment | null {
  try {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT weather_temp_c, weather_precip_mm, weather_wind_kmh, weather_multiplier,
                weather_summary, lineup_confirmed, lineup_json, steam_side, steam_magnitude,
                sofascore_event_id, updated_at
         FROM match_enrichment WHERE match_id = ?`,
      )
      .get(matchId) as
      | {
          weather_temp_c: number | null;
          weather_precip_mm: number | null;
          weather_wind_kmh: number | null;
          weather_multiplier: number | null;
          weather_summary: string | null;
          lineup_confirmed: number | null;
          lineup_json: string | null;
          steam_side: string | null;
          steam_magnitude: number | null;
          sofascore_event_id: string | null;
          updated_at: string | null;
        }
      | undefined;
    if (!row) return null;
    return {
      weatherTempC: row.weather_temp_c,
      weatherPrecipMm: row.weather_precip_mm,
      weatherWindKmh: row.weather_wind_kmh,
      weatherMultiplier: row.weather_multiplier,
      weatherSummary: row.weather_summary,
      lineupConfirmed: !!row.lineup_confirmed,
      lineupJson: row.lineup_json,
      steamSide: row.steam_side,
      steamMagnitude: row.steam_magnitude,
      sofascoreEventId: row.sofascore_event_id,
      updatedAt: row.updated_at,
    };
  } catch {
    return null;
  }
}

export function getMatchAvailability(matchId: string): PlayerAvailabilityRow[] {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT team_id, player_name, position, status, reason
         FROM player_availability WHERE match_id = ?
         ORDER BY status, player_name`,
      )
      .all(matchId) as Array<{
      team_id: string;
      player_name: string;
      position: string | null;
      status: string;
      reason: string | null;
    }>;
    return rows.map((r) => ({
      teamId: r.team_id,
      playerName: r.player_name,
      position: r.position,
      status: r.status,
      reason: r.reason,
    }));
  } catch {
    return [];
  }
}


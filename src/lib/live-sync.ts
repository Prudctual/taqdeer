import fs from "fs";
import path from "path";
import { getDb } from "./db";
import { resolveTeamName } from "./team-aliases";
import { nameAr, slugify } from "./team-names";

function loadEnvIfNeeded() {
  if (process.env.API_FOOTBALL_KEY) return;
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]!]) {
      process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
    }
  }
}

let lastSyncTimestamp = 0;
const SYNC_THROTTLE_MS = 15000; // 15 seconds minimum between live API calls

export async function syncRealLiveMatches(): Promise<number> {
  loadEnvIfNeeded();
  const now = Date.now();
  if (now - lastSyncTimestamp < SYNC_THROTTLE_MS) {
    return 0; // Throttled
  }
  lastSyncTimestamp = now;

  const apiKey = process.env.API_FOOTBALL_KEY?.trim() || process.env.API_SPORTS_KEY?.trim();
  if (!apiKey) return 0;

  try {
    const res = await fetch("https://v3.football.api-sports.io/fixtures?live=all", {
      headers: { "x-apisports-key": apiKey },
    });

    if (!res.ok) return 0;
    const data = (await res.json()) as {
      response?: Array<{
        fixture: {
          id: number;
          date: string;
          status: { short: string; long?: string; elapsed?: number | null };
          referee?: string | null;
        };
        league: {
          id: number;
          name: string;
          country: string;
          season: number;
        };
        teams: {
          home: { id: number; name: string; logo?: string };
          away: { id: number; name: string; logo?: string };
        };
        goals: { home?: number | null; away?: number | null };
        events?: Array<{
          time: { elapsed: number };
          team: { name: string };
          player: { name: string };
          type: string;
          detail: string;
        }>;
      }>;
    };

    const fixtures = data.response ?? [];
    if (fixtures.length === 0) return 0;

    const db = getDb();

    // STRICT FILTER: Only sync official tracked leagues (PL, La Liga, Serie A, Bundesliga, Ligue 1, Eliteserien)
    const KNOWN_LEAGUES: Record<number, string> = {
      39: "pl",
      140: "pd",
      135: "sa",
      78: "bl1",
      61: "fl1",
      103: "no1",
    };

    const upsertTeam = db.prepare(`
      INSERT INTO teams (id, league_id, name_ar, name_en, short_name, crest_url)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        crest_url = COALESCE(excluded.crest_url, teams.crest_url)
    `);

    const upsertMatch = db.prepare(`
      INSERT INTO matches (
        id, league_id, season, matchday, utc_date, status,
        home_team_id, away_team_id, home_goals, away_goals, referee_name, source, external_id,
        minute, live_status_ar, live_events_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'api-football-live', ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        utc_date = excluded.utc_date,
        status = excluded.status,
        home_goals = excluded.home_goals,
        away_goals = excluded.away_goals,
        minute = excluded.minute,
        live_status_ar = excluded.live_status_ar,
        live_events_json = excluded.live_events_json
    `);

    const upsertPred = db.prepare(`
      INSERT INTO predictions (
        id, match_id, lambda_home, lambda_away, p_home, p_draw, p_away,
        p_btts_yes, p_over25, top_scores_json, score_matrix_json, elo_home, elo_away,
        confidence, model_version, created_at, updated_at
      ) VALUES (?, ?, 1.4, 1.2, ?, ?, ?, 0.55, 0.52, '[]', '[]', 1500, 1500, 0.75, 'live-v1', ?, ?)
      ON CONFLICT(match_id) DO UPDATE SET
        p_home = excluded.p_home,
        p_draw = excluded.p_draw,
        p_away = excluded.p_away,
        updated_at = excluded.updated_at
    `);

    let syncedCount = 0;

    for (const item of fixtures) {
      const knownLeagueCode = KNOWN_LEAGUES[item.league.id];
      // IF NOT IN OUR TRACKED LEAGUES, SKIP!
      if (!knownLeagueCode) continue;

      const f = item.fixture;
      const leagueId = knownLeagueCode;

      const homeResolved = resolveTeamName(item.teams.home.name);
      const awayResolved = resolveTeamName(item.teams.away.name);
      const homeTeamId = `${leagueId}-${slugify(homeResolved)}`;
      const awayTeamId = `${leagueId}-${slugify(awayResolved)}`;

      upsertTeam.run(
        homeTeamId,
        leagueId,
        nameAr(homeResolved),
        homeResolved,
        homeResolved.slice(0, 12),
        item.teams.home.logo ?? null,
      );

      upsertTeam.run(
        awayTeamId,
        leagueId,
        nameAr(awayResolved),
        awayResolved,
        awayResolved.slice(0, 12),
        item.teams.away.logo ?? null,
      );

      const matchId = `live-apif-${f.id}`;
      const statusShort = f.status.short || "1H";
      const isFinished = ["FT", "AET", "PEN", "FINISHED"].includes(statusShort);
      const statusStr = isFinished ? "FINISHED" : "IN_PLAY";
      const elapsed = f.status.elapsed ?? 0;

      let liveStatusAr = "مباشر الآن";
      if (statusShort === "1H") liveStatusAr = `الشوط الأول · د ${elapsed}'`;
      else if (statusShort === "HT") liveStatusAr = "استراحة الشوطين";
      else if (statusShort === "2H") liveStatusAr = `الشوط الثاني · د ${elapsed}'`;
      else if (statusShort === "ET") liveStatusAr = `الوقت الإضافي · د ${elapsed}'`;
      else if (statusShort === "P") liveStatusAr = "ركلات ترجيح";

      const hg = item.goals.home ?? 0;
      const ag = item.goals.away ?? 0;

      const eventsJson = item.events ? JSON.stringify(item.events.slice(0, 10)) : null;

      upsertMatch.run(
        matchId,
        leagueId,
        String(item.league.season || 2026),
        null,
        f.date,
        statusStr,
        homeTeamId,
        awayTeamId,
        hg,
        ag,
        f.referee ?? null,
        String(f.id),
        elapsed,
        liveStatusAr,
        eventsJson,
      );

      // In-play simple live odds estimation
      const remMin = Math.max(0, 90 - Math.min(elapsed, 90));
      const r = remMin / 90.0;
      const pH = parseFloat((0.45 * r + (hg > ag ? 0.3 : 0.05)).toFixed(2));
      const pD = parseFloat((0.30 * r + (hg === ag ? 0.35 : 0.1)).toFixed(2));
      const pA = parseFloat((0.25 * r + (ag > hg ? 0.3 : 0.05)).toFixed(2));
      const sum = pH + pD + pA || 1;

      upsertPred.run(
        `pred-${matchId}`,
        matchId,
        parseFloat((pH / sum).toFixed(4)),
        parseFloat((pD / sum).toFixed(4)),
        parseFloat((pA / sum).toFixed(4)),
        new Date().toISOString(),
        new Date().toISOString(),
      );

      syncedCount++;
    }

    return syncedCount;
  } catch (e) {
    console.error("Live sync error:", e);
    return 0;
  }
}

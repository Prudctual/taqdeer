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

    const KNOWN_LEAGUES: Record<number, string> = {
      39: "pl",
      140: "pd",
      135: "sa",
      78: "bl1",
      61: "fl1",
      94: "ppd",
      88: "ded",
      203: "tur1",
    };

    const upsertTeam = db.prepare(`
      INSERT INTO teams (id, league_id, name_ar, name_en, short_name, crest_url)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        crest_url = COALESCE(excluded.crest_url, teams.crest_url)
    `);

    // المباراة الحقيقية موجودة مسبقاً في الجدول (من مزامنة الجداول) —
    // تُحدَّث في مكانها فيبقى توقعها الحقيقي ولقطته مرتبطين بها، بلا صفوف مكررة
    const findExisting = db.prepare(`
      SELECT id FROM matches
      WHERE league_id = ? AND home_team_id = ? AND away_team_id = ?
        AND date(utc_date) = date(?)
      LIMIT 1
    `);

    const updateLive = db.prepare(`
      UPDATE matches SET
        status = ?,
        home_goals = ?,
        away_goals = ?,
        minute = ?,
        live_status_ar = ?,
        live_events_json = ?,
        referee_name = COALESCE(referee_name, ?)
      WHERE id = ?
    `);

    // احتياط نادر: مباراة غير موجودة في جداولنا (تأجيل لم يصلنا مثلاً) — تُنشأ بلا توقع مختلق
    const insertMatch = db.prepare(`
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

      const existing = findExisting.get(leagueId, homeTeamId, awayTeamId, f.date) as
        | { id: string }
        | undefined;

      if (existing) {
        updateLive.run(
          statusStr,
          hg,
          ag,
          elapsed,
          liveStatusAr,
          eventsJson,
          f.referee ?? null,
          existing.id,
        );
      } else {
        insertMatch.run(
          `live-apif-${f.id}`,
          leagueId,
          String(item.league.season || new Date().getUTCFullYear()),
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
      }

      syncedCount++;
    }

    return syncedCount;
  } catch (e) {
    console.error("Live sync error:", e);
    return 0;
  }
}

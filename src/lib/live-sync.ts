import fs from "fs";
import path from "path";
import { getDb } from "./db";
import {
  estimateMinuteFromKickoff,
  liveStatusFromFotmob,
  parseLiveMinute,
} from "./live-clock";
import { resolveTeamName } from "./team-aliases";
import { nameAr, slugify } from "./team-names";

function loadEnvIfNeeded() {
  if (process.env.API_FOOTBALL_KEY || process.env.API_SPORTS_KEY) return;
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
const SYNC_THROTTLE_MS = 8_000;

const FOTMOB_LEAGUES: Record<number, string> = {
  47: "pl",
  87: "pd",
  54: "bl1",
  55: "sa",
  53: "fl1",
  61: "ppd",
  57: "ded",
};

const APIF_LEAGUES: Record<number, string> = {
  39: "pl",
  140: "pd",
  135: "sa",
  78: "bl1",
  61: "fl1",
  94: "ppd",
  88: "ded",
};

type LiveEvent = {
  time: { elapsed: number; extra?: number | null };
  team: { name: string; id?: string | null };
  player: { name: string };
  assist?: { name: string } | null;
  type: string;
  detail: string;
};

function normName(s: string): string {
  return resolveTeamName(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function namesMatch(a: string, b: string): boolean {
  const na = normName(a);
  const nb = normName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = new Set(na.split(" ").filter((w) => w.length > 2));
  const tb = new Set(nb.split(" ").filter((w) => w.length > 2));
  let overlap = 0;
  for (const w of ta) if (tb.has(w)) overlap++;
  return overlap > 0 && overlap >= Math.min(ta.size, tb.size);
}

function syncDateKeys(): string[] {
  const now = new Date();
  const keys = new Set<string>();
  // فحص الأيام السابقة (حتى 4 أيام للخلف) واليوم والغد لضمان جلب وتحديث النتائج الحقيقية المكتملة بدقة
  for (let offsetDays = -4; offsetDays <= 1; offsetDays++) {
    const t = now.getTime() + offsetDays * 86_400_000;
    const dUtc = new Date(t).toISOString().slice(0, 10);
    const dBag = new Date(t + 3 * 3600_000).toISOString().slice(0, 10);
    keys.add(dUtc);
    keys.add(dBag);
  }
  return Array.from(keys).sort();
}

function findMatchId(
  db: ReturnType<typeof getDb>,
  leagueId: string,
  homeName: string,
  awayName: string,
  utcDate: string,
  externalId?: string | null,
): string | null {
  if (externalId) {
    const byExt = db
      .prepare(`SELECT id FROM matches WHERE external_id = ? OR id = ? LIMIT 1`)
      .get(String(externalId), String(externalId)) as { id: string } | undefined;
    if (byExt?.id) return byExt.id;
    const byEnrich = db
      .prepare(
        `SELECT match_id AS id FROM match_enrichment WHERE sofascore_event_id = ? LIMIT 1`,
      )
      .get(String(externalId)) as { id: string } | undefined;
    if (byEnrich?.id) return byEnrich.id;
  }

  const day = utcDate.slice(0, 10);
  const candidates = db
    .prepare(
      `SELECT m.id, th.name_en AS homeEn, ta.name_en AS awayEn,
              th.name_ar AS homeAr, ta.name_ar AS awayAr
       FROM matches m
       JOIN teams th ON th.id = m.home_team_id
       JOIN teams ta ON ta.id = m.away_team_id
       WHERE m.league_id = ?
         AND date(m.utc_date) BETWEEN date(?, '-2 days') AND date(?, '+2 days')
         AND m.source NOT IN ('preview-holdout','synthetic','demo')`,
    )
    .all(leagueId, day, day) as Array<{
    id: string;
    homeEn: string;
    awayEn: string;
    homeAr: string;
    awayAr: string;
  }>;

  for (const c of candidates) {
    if (
      (namesMatch(homeName, c.homeEn) || namesMatch(homeName, c.homeAr)) &&
      (namesMatch(awayName, c.awayEn) || namesMatch(awayName, c.awayAr))
    ) {
      return c.id;
    }
  }
  return null;
}

function applyLiveUpdate(
  db: ReturnType<typeof getDb>,
  matchId: string,
  fields: {
    status: string;
    homeGoals: number | null;
    awayGoals: number | null;
    minute: number | null;
    liveStatusAr: string | null;
    eventsJson: string | null;
    statsJson?: string | null;
    externalId?: string | null;
    utcDate?: string | null;
  },
) {
  db.prepare(
    `UPDATE matches SET
       status = ?,
       home_goals = CASE WHEN ? IS NOT NULL THEN ? ELSE home_goals END,
       away_goals = CASE WHEN ? IS NOT NULL THEN ? ELSE away_goals END,
       minute = ?,
       live_status_ar = ?,
       live_events_json = COALESCE(?, live_events_json),
       live_stats_json = COALESCE(?, live_stats_json),
       external_id = COALESCE(external_id, ?),
       utc_date = COALESCE(?, utc_date)
     WHERE id = ?`,
  ).run(
    fields.status,
    fields.homeGoals,
    fields.homeGoals,
    fields.awayGoals,
    fields.awayGoals,
    fields.minute,
    fields.liveStatusAr,
    fields.eventsJson,
    fields.statsJson ?? null,
    fields.externalId ?? null,
    fields.utcDate ?? null,
    matchId,
  );
}

function mapFotmobEvents(
  events: unknown,
  homeName: string,
  awayName: string,
): LiveEvent[] {
  if (!Array.isArray(events)) return [];
  const out: LiveEvent[] = [];
  for (const raw of events) {
    const e = raw as Record<string, unknown>;
    const typeName = String(e.type || e.card || e.incidentType || "").toLowerCase();
    let type = "Var";
    let detail = String(e.typeStr || e.name || e.type || "حدث");
    if (typeName.includes("goal") || e.isGoal) {
      type = "Goal";
      detail = e.ownGoal ? "Own Goal" : "Normal Goal";
    } else if (typeName.includes("card") || e.card) {
      type = "Card";
      const card = String(e.card || detail).toLowerCase();
      detail = card.includes("red") || card.includes("أحمر") ? "Red Card" : "Yellow Card";
    } else if (typeName.includes("subst")) {
      type = "subst";
      detail = "Substitution";
    }

    const elapsed =
      parseLiveMinute(e.timeStr || e.time || e.minutesElapsed) ??
      (typeof e.time === "number" ? e.time : 0);
    const isHome = e.isHome != null ? !!e.isHome : String(e.teamId || "") === "home";
    const playerName =
      String(
        (e.player as { name?: string } | undefined)?.name ||
          e.nameStr ||
          e.playerName ||
          e.name ||
          "",
      ) || "—";

    out.push({
      time: { elapsed, extra: null },
      team: { name: isHome ? homeName : awayName },
      player: { name: playerName },
      type,
      detail,
    });
  }
  return out.slice(0, 40);
}

type FotmobDayPayload = {
  leagues?: Array<{
    primaryId?: number;
    name?: string;
    matches?: Array<{
      id?: number;
      status?: Record<string, unknown>;
      home?: { id?: number; name?: string; score?: number };
      away?: { id?: number; name?: string; score?: number };
    }>;
  }>;
};

async function syncFromFotmob(db: ReturnType<typeof getDb>): Promise<number> {
  let synced = 0;
  const dates = syncDateKeys().map((d) => d.replace(/-/g, ""));

  for (const yyyymmdd of dates) {
    let data: FotmobDayPayload | null = null;

    try {
      const res = await fetch(`https://www.fotmob.com/api/data/matches?date=${yyyymmdd}&timezone=UTC`, {
        headers: {
          Accept: "application/json",
          Referer: "https://www.fotmob.com/",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        cache: "no-store",
      });
      if (!res.ok) continue;
      data = (await res.json()) as FotmobDayPayload;
    } catch {
      continue;
    }

    for (const lg of data?.leagues || []) {
      const leagueId = lg.primaryId != null ? FOTMOB_LEAGUES[lg.primaryId] : undefined;
      if (!leagueId) continue;

      for (const m of lg.matches || []) {
        const st = (m.status || {}) as {
          started?: boolean;
          finished?: boolean;
          ongoing?: boolean;
          utcTime?: string;
          liveTime?: { short?: string; long?: string };
          halfs?: Record<string, string>;
        };
        const homeName = m.home?.name || "";
        const homeLong = (m.home as { longName?: string })?.longName || "";
        const awayName = m.away?.name || "";
        const awayLong = (m.away as { longName?: string })?.longName || "";
        if ((!homeName && !homeLong) || (!awayName && !awayLong) || !m.id) continue;

        const utcDate = st.utcTime || `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}T12:00:00Z`;
        let matchId = findMatchId(
          db,
          leagueId,
          homeName,
          awayName,
          utcDate,
          String(m.id),
        );
        if (!matchId && (homeLong || awayLong)) {
          matchId = findMatchId(
            db,
            leagueId,
            homeLong || homeName,
            awayLong || awayName,
            utcDate,
            String(m.id),
          );
        }
        if (!matchId) continue;

        const mapped = liveStatusFromFotmob(st);
        // تجاهل المباريات التي لم تبدأ بعد
        if (mapped.statusStr === "SCHEDULED" && !st.started && !st.ongoing) continue;

        let eventsJson: string | null = null;
        let statsJson: string | null = null;

        if (mapped.statusStr === "IN_PLAY" || mapped.statusStr === "FINISHED") {
          try {
            const detailRes = await fetch(
              `https://www.fotmob.com/api/data/matchDetails?matchId=${m.id}`,
              {
                headers: {
                  Accept: "application/json",
                  Referer: "https://www.fotmob.com/",
                  "User-Agent":
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                },
                cache: "no-store",
              },
            );
            if (detailRes.ok) {
              const detail = (await detailRes.json()) as {
                header?: {
                  status?: typeof st;
                  teams?: Array<{ name?: string; score?: number }>;
                };
                content?: {
                  matchFacts?: { events?: { events?: unknown[] } };
                  stats?: unknown;
                };
              };
              const dst = detail.header?.status;
              if (dst) {
                const remapped = liveStatusFromFotmob(dst);
                mapped.minute = remapped.minute;
                mapped.liveStatusAr = remapped.liveStatusAr;
                mapped.statusStr = remapped.statusStr;
              }
              const teams = detail.header?.teams || [];
              if (teams[0]?.score != null) m.home!.score = teams[0].score;
              if (teams[1]?.score != null) m.away!.score = teams[1].score;

              const events = mapFotmobEvents(
                detail.content?.matchFacts?.events?.events,
                homeName,
                awayName,
              );
              if (events.length) eventsJson = JSON.stringify(events);

              const periods = (detail.content?.stats as { Periods?: unknown })?.Periods;
              if (periods) statsJson = JSON.stringify(periods);
            }
          } catch {
            /* keep list-level fields */
          }
        }

        applyLiveUpdate(db, matchId, {
          status: mapped.statusStr,
          homeGoals: m.home?.score ?? (mapped.statusStr === "FINISHED" ? 0 : null),
          awayGoals: m.away?.score ?? (mapped.statusStr === "FINISHED" ? 0 : null),
          minute: mapped.minute,
          liveStatusAr: mapped.liveStatusAr || (mapped.statusStr === "FINISHED" ? "انتهت" : "مباشر الآن"),
          eventsJson,
          statsJson,
          externalId: String(m.id),
          utcDate: st.utcTime || utcDate,
        });

        // خزّن معرّف FotMob للمرات القادمة
        try {
          db.prepare(
            `INSERT INTO match_enrichment (match_id, sofascore_event_id, source, updated_at)
             VALUES (?, ?, 'fotmob-live', datetime('now'))
             ON CONFLICT(match_id) DO UPDATE SET
               sofascore_event_id = COALESCE(excluded.sofascore_event_id, match_enrichment.sofascore_event_id),
               source = COALESCE(match_enrichment.source, excluded.source),
               updated_at = excluded.updated_at`,
          ).run(matchId, String(m.id));
        } catch {
          /* enrichment table may be absent in tests */
        }

        synced++;
      }
    }
  }

  return synced;
}

async function syncFromApiFootball(db: ReturnType<typeof getDb>): Promise<number> {
  const apiKey =
    process.env.API_FOOTBALL_KEY?.trim() || process.env.API_SPORTS_KEY?.trim();
  if (!apiKey) return 0;

  try {
    const res = await fetch("https://v3.football.api-sports.io/fixtures?live=all", {
      headers: { "x-apisports-key": apiKey },
      cache: "no-store",
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as {
      errors?: unknown;
      response?: Array<{
        fixture: {
          id: number;
          date: string;
          status: { short: string; elapsed?: number | null };
          referee?: string | null;
        };
        league: { id: number; season: number };
        teams: {
          home: { name: string; logo?: string };
          away: { name: string; logo?: string };
        };
        goals: { home?: number | null; away?: number | null };
        events?: LiveEvent[];
      }>;
    };
    if (data.errors && Object.keys(data.errors as object).length) return 0;

    let synced = 0;
    for (const item of data.response ?? []) {
      const leagueId = APIF_LEAGUES[item.league.id];
      if (!leagueId) continue;

      const homeName = item.teams.home.name;
      const awayName = item.teams.away.name;
      const matchId = findMatchId(
        db,
        leagueId,
        homeName,
        awayName,
        item.fixture.date,
        String(item.fixture.id),
      );

      const short = item.fixture.status.short || "1H";
      const finished = ["FT", "AET", "PEN", "FINISHED"].includes(short);
      const elapsed = item.fixture.status.elapsed ?? 0;
      let liveStatusAr = "مباشر الآن";
      if (short === "1H") liveStatusAr = `الشوط الأول · د ${elapsed}'`;
      else if (short === "HT") liveStatusAr = "استراحة الشوطين";
      else if (short === "2H") liveStatusAr = `الشوط الثاني · د ${elapsed}'`;
      else if (short === "ET") liveStatusAr = `الوقت الإضافي · د ${elapsed}'`;
      else if (short === "P") liveStatusAr = "ركلات ترجيح";

      const eventsJson = item.events?.length
        ? JSON.stringify(item.events.slice(0, 40))
        : null;

      if (matchId) {
        applyLiveUpdate(db, matchId, {
          status: finished ? "FINISHED" : "IN_PLAY",
          homeGoals: item.goals.home ?? 0,
          awayGoals: item.goals.away ?? 0,
          minute: elapsed,
          liveStatusAr: finished ? "انتهت" : liveStatusAr,
          eventsJson,
          externalId: String(item.fixture.id),
        });
        synced++;
        continue;
      }

      // احتياط: إنشاء صف إن لم تُعرف المباراة
      const homeTeamId = `${leagueId}-${slugify(resolveTeamName(homeName))}`;
      const awayTeamId = `${leagueId}-${slugify(resolveTeamName(awayName))}`;
      db.prepare(
        `INSERT INTO teams (id, league_id, name_ar, name_en, short_name, crest_url)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET crest_url = COALESCE(excluded.crest_url, teams.crest_url)`,
      ).run(
        homeTeamId,
        leagueId,
        nameAr(resolveTeamName(homeName)),
        resolveTeamName(homeName),
        resolveTeamName(homeName).slice(0, 12),
        item.teams.home.logo ?? null,
      );
      db.prepare(
        `INSERT INTO teams (id, league_id, name_ar, name_en, short_name, crest_url)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET crest_url = COALESCE(excluded.crest_url, teams.crest_url)`,
      ).run(
        awayTeamId,
        leagueId,
        nameAr(resolveTeamName(awayName)),
        resolveTeamName(awayName),
        resolveTeamName(awayName).slice(0, 12),
        item.teams.away.logo ?? null,
      );
      db.prepare(
        `INSERT INTO matches (
           id, league_id, season, matchday, utc_date, status,
           home_team_id, away_team_id, home_goals, away_goals, source, external_id,
           minute, live_status_ar, live_events_json
         ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 'api-football-live', ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           status = excluded.status,
           home_goals = excluded.home_goals,
           away_goals = excluded.away_goals,
           minute = excluded.minute,
           live_status_ar = excluded.live_status_ar,
           live_events_json = COALESCE(excluded.live_events_json, matches.live_events_json)`,
      ).run(
        `live-apif-${item.fixture.id}`,
        leagueId,
        String(item.league.season || new Date().getUTCFullYear()),
        item.fixture.date,
        finished ? "FINISHED" : "IN_PLAY",
        homeTeamId,
        awayTeamId,
        item.goals.home ?? 0,
        item.goals.away ?? 0,
        String(item.fixture.id),
        elapsed,
        finished ? "انتهت" : liveStatusAr,
        eventsJson,
      );
      synced++;
    }
    return synced;
  } catch (e) {
    console.error("API-Football live sync error:", e);
    return 0;
  }
}

/** ترقية محلية: انطلاق الموعد داخل نافذة اللعب → جارية مع ساعة تقديرية */
function promoteKickoffLocal(db: ReturnType<typeof getDb>): number {
  const rows = db
    .prepare(
      `SELECT id, utc_date, status, minute, live_status_ar, home_goals, away_goals
       FROM matches
       WHERE status IN ('SCHEDULED','TIMED')
         AND datetime(utc_date) <= datetime('now')
         AND datetime(utc_date) >= datetime('now', '-125 minutes')
         AND source NOT IN ('preview-holdout','synthetic','demo')`,
    )
    .all() as Array<{
    id: string;
    utc_date: string;
    status: string;
    minute: number | null;
    live_status_ar: string | null;
    home_goals: number | null;
    away_goals: number | null;
  }>;

  let n = 0;
  const now = Date.now();
  for (const r of rows) {
    const est = estimateMinuteFromKickoff(r.utc_date, now);
    if (!est || est.period === "FT") continue;
    // لا نضع 0-0 وهمية إن لم تكن مسجلة فعلياً!
    applyLiveUpdate(db, r.id, {
      status: "IN_PLAY",
      homeGoals: r.home_goals,
      awayGoals: r.away_goals,
      minute: r.minute ?? est.minute,
      liveStatusAr: r.live_status_ar || est.liveStatusAr,
      eventsJson: null,
    });
    n++;
  }
  return n;
}

/** إنهاء مباريات خرجت من نافذة اللعب — فقط إذا كانت أهدافها مسجلة وموثقة وليست فارغة */
function finalizeStaleLive(db: ReturnType<typeof getDb>): number {
  // المباريات التي مرّ وقتها دون ورود أهداف من مزوّد حقيقي لا يجوز أبداً افتراض أنها 0-0!
  const result = db
    .prepare(
      `UPDATE matches SET
         status = 'FINISHED',
         live_status_ar = 'انتهت',
         minute = COALESCE(minute, 90)
       WHERE status IN ('IN_PLAY','PAUSED','LIVE','1H','2H','HT','ET','P','BREAK')
         AND home_goals IS NOT NULL
         AND away_goals IS NOT NULL
         AND datetime(utc_date) < datetime('now', '-115 minutes')`,
    )
    .run();
  return result.changes;
}

/** قفل لقطة التوقع عند الصافرة النهائية (للسجل) إن وُجد توقع حيّ */
function lockSnapshotsForFinished(db: ReturnType<typeof getDb>): void {
  try {
    db.prepare(
      `INSERT INTO prediction_snapshots (
         id, match_id, league_id, utc_date,
         p_home, p_draw, p_away, p_btts_yes, p_over25,
         lambda_home, lambda_away, elo_home, elo_away,
         confidence, model_version, snapshot_at
       )
       SELECT
         lower(hex(randomblob(16))),
         m.id, m.league_id, m.utc_date,
         p.p_home, p.p_draw, p.p_away,
         COALESCE(p.p_btts_yes, 0), COALESCE(p.p_over25, 0),
         COALESCE(p.lambda_home, 0), COALESCE(p.lambda_away, 0),
         p.elo_home, p.elo_away,
         COALESCE(p.confidence, 0),
         COALESCE(p.model_version, 'ensemble-v3'),
         datetime('now')
       FROM matches m
       JOIN predictions p ON p.match_id = m.id
       WHERE m.status = 'FINISHED'
         AND datetime(m.utc_date) >= datetime('now', '-8 hours')
         AND NOT EXISTS (
           SELECT 1 FROM prediction_snapshots ps WHERE ps.match_id = m.id
         )`,
    ).run();
  } catch (e) {
    console.error("lockSnapshotsForFinished:", e);
  }
}

export async function syncRealLiveMatches(): Promise<number> {
  loadEnvIfNeeded();
  const now = Date.now();
  if (now - lastSyncTimestamp < SYNC_THROTTLE_MS) return 0;
  lastSyncTimestamp = now;

  const db = getDb();
  let total = 0;

  // 1) FotMob — مجاني ويعمل حتى عند استنفاد API-Football
  try {
    total += await syncFromFotmob(db);
  } catch (e) {
    console.error("FotMob live sync error:", e);
  }

  // 2) API-Football إن بقي رصيد
  try {
    total += await syncFromApiFootball(db);
  } catch (e) {
    console.error("API-Football live sync error:", e);
  }

  // 3) ترقية محلية لأي مباراة انطلقت ولم تصلها تغذية بعد
  total += promoteKickoffLocal(db);
  // 4) إنهاء المنتهية → تظهر في سجل التوقعات
  total += finalizeStaleLive(db);
  lockSnapshotsForFinished(db);

  return total;
}

/**
 * مزامنة الدوري النرويجي (Eliteserien / no1).
 * المصدر: نتائج ويكيبيديا + مواعيد SportsDB + جدول الجولة القريبة المؤكّد.
 * الموسم النرويجي تقويمي (آذار–تشرين الثاني)، لا أغسطس كالدوريات الأوروبية.
 */
import { getDb } from "../src/lib/db";

const SEASON = "2026";
const SPORTSDB_LEAGUE_ID = "4358";

export const NORWAY_TEAMS: Record<
  string,
  { nameAr: string; nameEn: string; crestUrl: string }
> = {
  BOD: {
    nameAr: "بودو/غليمت",
    nameEn: "Bodø/Glimt",
    crestUrl: "https://crests.football-data.org/BOD.png",
  },
  VIK: {
    nameAr: "فايكنغ",
    nameEn: "Viking",
    crestUrl: "https://crests.football-data.org/VIK.png",
  },
  TRO: {
    nameAr: "ترومسو",
    nameEn: "Tromsø",
    crestUrl: "https://crests.football-data.org/TIL.png",
  },
  LIL: {
    nameAr: "ليلستروم",
    nameEn: "Lillestrøm",
    crestUrl: "https://crests.football-data.org/LSK.png",
  },
  MOL: {
    nameAr: "مولده",
    nameEn: "Molde",
    crestUrl: "https://crests.football-data.org/MOL.png",
  },
  SAR: {
    nameAr: "ساربسبورغ 08",
    nameEn: "Sarpsborg 08",
    crestUrl: "https://crests.football-data.org/S08.png",
  },
  HAM: {
    nameAr: "هامكام",
    nameEn: "HamKam",
    crestUrl: "https://crests.football-data.org/HAM.png",
  },
  VAL: {
    nameAr: "فوليرينغا",
    nameEn: "Vålerenga",
    crestUrl: "https://crests.football-data.org/VIF.png",
  },
  BRA: {
    nameAr: "بران",
    nameEn: "Brann",
    crestUrl: "https://crests.football-data.org/BRA.png",
  },
  ROS: {
    nameAr: "روزنبرغ",
    nameEn: "Rosenborg",
    crestUrl: "https://crests.football-data.org/RBK.png",
  },
  SAN: {
    nameAr: "ساندفيورد",
    nameEn: "Sandefjord",
    crestUrl: "https://crests.football-data.org/SAN.png",
  },
  FRE: {
    nameAr: "فريدريكستاد",
    nameEn: "Fredrikstad",
    crestUrl: "https://crests.football-data.org/FFK.png",
  },
  AAL: {
    nameAr: "أوليسوند",
    nameEn: "Aalesund",
    crestUrl: "https://crests.football-data.org/AAL.png",
  },
  KFU: {
    nameAr: "كي إف يو إم أوسلو",
    nameEn: "KFUM Oslo",
    crestUrl: "https://crests.football-data.org/KFU.png",
  },
  KRI: {
    nameAr: "كريستيانسوند",
    nameEn: "Kristiansund",
    crestUrl: "https://crests.football-data.org/KBK.png",
  },
  STA: {
    nameAr: "ستارتا",
    nameEn: "Start",
    crestUrl: "https://crests.football-data.org/STA.png",
  },
};

/** رموز ويكيبيديا القديمة → الرموز المستقرة عندنا */
export const CODE_ALIAS_MAP: Record<string, string> = {
  TIL: "TRO",
  S08: "SAR",
  VIF: "VAL",
  RBK: "ROS",
  LSK: "LIL",
  KBK: "KRI",
  FFK: "FRE",
};

const NAME_TO_CODE: Array<{ re: RegExp; code: string }> = [
  { re: /bod[oø]|glimt/i, code: "BOD" },
  { re: /viking/i, code: "VIK" },
  { re: /troms[oø]/i, code: "TRO" },
  { re: /lillestr/i, code: "LIL" },
  { re: /molde/i, code: "MOL" },
  { re: /sarpsborg/i, code: "SAR" },
  { re: /hamkam|hamar/i, code: "HAM" },
  { re: /v[aå]lerenga/i, code: "VAL" },
  { re: /\bbrann\b/i, code: "BRA" },
  { re: /rosenborg/i, code: "ROS" },
  { re: /sandefjord/i, code: "SAN" },
  { re: /fredrikstad/i, code: "FRE" },
  { re: /aalesund|ålesund/i, code: "AAL" },
  { re: /kfum/i, code: "KFU" },
  { re: /kristiansund/i, code: "KRI" },
  { re: /\bstart\b|ik start/i, code: "STA" },
];

export function normalizeCode(code: string): string {
  const upper = code.toUpperCase();
  return CODE_ALIAS_MAP[upper] || upper;
}

function codeFromTeamName(name: string): string | null {
  for (const { re, code } of NAME_TO_CODE) {
    if (re.test(name)) return code;
  }
  return null;
}

function teamId(code: string): string {
  return `no1-${code.toLowerCase()}`;
}

/** معرّف ثابت لكل مواجهة منزل/ضيف في الموسم — لا يتغيّر عند انتهاء المباراة */
function matchId(home: string, away: string): string {
  return `no1-${SEASON}-${home.toLowerCase()}-${away.toLowerCase()}`;
}

/** جولات قريبة مؤكّدة (UTC) — تُحدَّث يدوياً عند الحاجة حتى تتوفر تغذية كاملة */
const NEAR_FIXTURES: Array<{
  home: string;
  away: string;
  date: string;
  round: number;
  hg?: number;
  ag?: number;
}> = [
  // Round 16 (منتهية)
  { home: "VAL", away: "HAM", date: "2026-07-31T17:00:00.000Z", round: 16, hg: 2, ag: 3 },
  { home: "BOD", away: "LIL", date: "2026-07-31T17:00:00.000Z", round: 16, hg: 4, ag: 0 },
  { home: "FRE", away: "SAN", date: "2026-08-01T14:00:00.000Z", round: 16, hg: 1, ag: 0 },
  { home: "STA", away: "VIK", date: "2026-08-01T16:00:00.000Z", round: 16, hg: 0, ag: 3 },
  { home: "MOL", away: "SAR", date: "2026-08-02T15:00:00.000Z", round: 16, hg: 3, ag: 3 },
  { home: "KFU", away: "KRI", date: "2026-08-02T15:00:00.000Z", round: 16, hg: 2, ag: 1 },
  { home: "AAL", away: "TRO", date: "2026-08-02T15:00:00.000Z", round: 16, hg: 2, ag: 6 },
  { home: "BRA", away: "ROS", date: "2026-08-02T17:15:00.000Z", round: 16, hg: 3, ag: 2 },
  // Round 17
  { home: "SAN", away: "KFU", date: "2026-08-07T17:00:00.000Z", round: 17 },
  { home: "VAL", away: "BOD", date: "2026-08-08T14:00:00.000Z", round: 17 },
  { home: "VIK", away: "SAR", date: "2026-08-08T16:00:00.000Z", round: 17 },
  { home: "STA", away: "FRE", date: "2026-08-08T16:00:00.000Z", round: 17 },
  // Round 17 (NFF official) — Tromsø–Brann moved to 29 Apr
  { home: "LIL", away: "ROS", date: "2026-08-09T12:30:00.000Z", round: 17 }, // 14:30 CEST
  { home: "KRI", away: "MOL", date: "2026-08-09T17:15:00.000Z", round: 17 }, // 19:15 CEST
  { home: "HAM", away: "AAL", date: "2026-08-09T17:00:00.000Z", round: 17 }, // 19:00 CEST
];

/** مباريات خاطئة أُدخلت سابقاً لجولة 17 — تُحذف عند المزامنة */
const OBSOLETE_ROUND17_IDS = [
  "no1-2026-ros-lil", // كان معكوساً؛ الصحيح Lillestrøm–Rosenborg
  "no1-2026-tro-mol", // ليس في جولة 17 (مولده يلاقي كريستيانسوند)
  "no1-2026-kri-bra", // الصحيح Kristiansund–Molde
];

type WikiFinished = { home: string; away: string; hg: number; ag: number };

async function fetchWikipediaFinished(): Promise<WikiFinished[]> {
  const res = await fetch("https://en.wikipedia.org/wiki/2026_Eliteserien", {
    headers: { "User-Agent": "taqdeer/1.0 (eliteserien; educational)" },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  const html = await res.text();
  const matchRegex = /match_([A-Z0-9]+)_([A-Z0-9]+)\s*=\s*([^\\"\n]*)/g;
  const out: WikiFinished[] = [];
  let m: RegExpExecArray | null;
  while ((m = matchRegex.exec(html)) !== null) {
    const home = normalizeCode(m[1]!);
    const away = normalizeCode(m[2]!);
    if (!NORWAY_TEAMS[home] || !NORWAY_TEAMS[away] || home === away) continue;
    const val = (m[3] || "").trim();
    const score = val.match(/^(\d+)[–-](\d+)$/);
    if (!score) continue;
    out.push({
      home,
      away,
      hg: Number(score[1]),
      ag: Number(score[2]),
    });
  }
  return out;
}

type SportsDbEvent = {
  strHomeTeam: string;
  strAwayTeam: string;
  dateEvent: string;
  strTime?: string | null;
  strTimestamp?: string | null;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  strStatus?: string | null;
  intRound?: string | null;
};

async function fetchSportsDb(path: string): Promise<SportsDbEvent[]> {
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/${path}`,
      {
        headers: { "User-Agent": "taqdeer/1.0" },
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { events?: SportsDbEvent[] | null };
    return data.events ?? [];
  } catch {
    return [];
  }
}

function sportsDbIso(e: SportsDbEvent): string | null {
  if (e.strTimestamp) {
    const ms = Date.parse(e.strTimestamp.includes("T") ? e.strTimestamp : e.strTimestamp.replace(" ", "T") + "Z");
    if (Number.isFinite(ms)) return new Date(ms).toISOString();
  }
  if (e.dateEvent && e.strTime && e.strTime !== "00:00:00") {
    const ms = Date.parse(`${e.dateEvent}T${e.strTime}Z`);
    if (Number.isFinite(ms)) return new Date(ms).toISOString();
  }
  if (e.dateEvent) return `${e.dateEvent}T00:00:00.000Z`;
  return null;
}

function recomputeStandings(db: ReturnType<typeof getDb>) {
  type Row = {
    home_team_id: string;
    away_team_id: string;
    home_goals: number;
    away_goals: number;
  };
  const rows = db
    .prepare(
      `SELECT home_team_id, away_team_id, home_goals, away_goals
       FROM matches
       WHERE league_id='no1' AND season=? AND status='FINISHED'
         AND home_goals IS NOT NULL AND away_goals IS NOT NULL`,
    )
    .all(SEASON) as Row[];

  type Agg = {
    played: number;
    won: number;
    drawn: number;
    lost: number;
    gf: number;
    ga: number;
    pts: number;
  };
  const table = new Map<string, Agg>();
  const bump = (id: string) => {
    let a = table.get(id);
    if (!a) {
      a = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };
      table.set(id, a);
    }
    return a;
  };

  // كل أندية Eliteserien تظهر في الجدول حتى لو لم تُلعب بعض مبارياتها بعد
  for (const code of Object.keys(NORWAY_TEAMS)) bump(teamId(code));

  for (const r of rows) {
    const h = bump(r.home_team_id);
    const a = bump(r.away_team_id);
    h.played++;
    a.played++;
    h.gf += r.home_goals;
    h.ga += r.away_goals;
    a.gf += r.away_goals;
    a.ga += r.home_goals;
    if (r.home_goals > r.away_goals) {
      h.won++;
      h.pts += 3;
      a.lost++;
    } else if (r.home_goals < r.away_goals) {
      a.won++;
      a.pts += 3;
      h.lost++;
    } else {
      h.drawn++;
      a.drawn++;
      h.pts++;
      a.pts++;
    }
  }

  db.prepare(`DELETE FROM standings WHERE league_id='no1' AND season=?`).run(SEASON);
  const ins = db.prepare(`
    INSERT INTO standings (
      id, league_id, season, team_id, position, played, won, drawn, lost,
      goals_for, goals_against, goal_difference, points
    ) VALUES (?, 'no1', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const ranked = [...table.entries()].sort((x, y) => {
    const gdX = x[1].gf - x[1].ga;
    const gdY = y[1].gf - y[1].ga;
    if (y[1].pts !== x[1].pts) return y[1].pts - x[1].pts;
    if (gdY !== gdX) return gdY - gdX;
    return y[1].gf - x[1].gf;
  });

  ranked.forEach(([tid, s], i) => {
    const code = tid.replace(/^no1-/, "");
    ins.run(
      `no1-${SEASON}-${code}`,
      SEASON,
      tid,
      i + 1,
      s.played,
      s.won,
      s.drawn,
      s.lost,
      s.gf,
      s.ga,
      s.gf - s.ga,
      s.pts,
    );
  });
}

export async function syncNorwayEliteserien() {
  const db = getDb();

  db.prepare(`
    INSERT INTO leagues (id, code, name_ar, name_en, country_ar, fd_org_code, fd_uk_code)
    VALUES ('no1', 'NO1', 'الدوري النرويجي', 'Eliteserien', 'النرويج', 'NO1', '')
    ON CONFLICT(id) DO UPDATE SET
      name_ar=excluded.name_ar,
      name_en=excluded.name_en,
      country_ar=excluded.country_ar
  `).run();

  const teamStmt = db.prepare(`
    INSERT INTO teams (id, league_id, name_ar, name_en, short_name, crest_url)
    VALUES (?, 'no1', ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name_ar=excluded.name_ar,
      name_en=excluded.name_en,
      crest_url=COALESCE(excluded.crest_url, teams.crest_url)
  `);
  for (const [code, info] of Object.entries(NORWAY_TEAMS)) {
    teamStmt.run(teamId(code), info.nameAr, info.nameEn, code, info.crestUrl);
  }

  const upsert = db.prepare(`
    INSERT INTO matches (
      id, league_id, season, matchday, utc_date, status,
      home_team_id, away_team_id, home_goals, away_goals, source, external_id
    ) VALUES (?, 'no1', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      matchday = COALESCE(excluded.matchday, matches.matchday),
      utc_date = CASE
        WHEN excluded.source = 'manual-eliteserien'
          AND excluded.utc_date NOT LIKE '%T00:00:00%'
          THEN excluded.utc_date
        WHEN matches.utc_date LIKE '%T00:00:00%'
          AND excluded.utc_date NOT LIKE '%T00:00:00%'
          THEN excluded.utc_date
        WHEN excluded.source = 'sportsdb-eliteserien'
          AND excluded.utc_date NOT LIKE '%T00:00:00%'
          AND matches.source != 'manual-eliteserien'
          THEN excluded.utc_date
        ELSE matches.utc_date
      END,
      status = CASE
        WHEN excluded.status = 'SCHEDULED'
          AND substr(excluded.utc_date, 1, 19) > strftime('%Y-%m-%dT%H:%M:%S', 'now')
          THEN 'SCHEDULED'
        WHEN excluded.status = 'FINISHED' AND excluded.home_goals IS NOT NULL
          THEN 'FINISHED'
        WHEN matches.status = 'FINISHED' AND matches.home_goals IS NOT NULL
          THEN 'FINISHED'
        ELSE excluded.status
      END,
      home_goals = CASE
        WHEN excluded.status = 'SCHEDULED'
          AND substr(excluded.utc_date, 1, 19) > strftime('%Y-%m-%dT%H:%M:%S', 'now')
          THEN NULL
        ELSE COALESCE(excluded.home_goals, matches.home_goals)
      END,
      away_goals = CASE
        WHEN excluded.status = 'SCHEDULED'
          AND substr(excluded.utc_date, 1, 19) > strftime('%Y-%m-%dT%H:%M:%S', 'now')
          THEN NULL
        ELSE COALESCE(excluded.away_goals, matches.away_goals)
      END,
      source = CASE
        WHEN excluded.source = 'manual-eliteserien' THEN excluded.source
        WHEN matches.source = 'manual-eliteserien' THEN matches.source
        ELSE excluded.source
      END
  `);

  let wikiFinished = 0;
  try {
    const finished = await fetchWikipediaFinished();
    const basePast = Date.parse("2026-03-14T15:00:00.000Z");
    const dayMs = 86_400_000;
    finished.forEach((f, idx) => {
      const approx = new Date(basePast + Math.floor(idx / 4) * 3 * dayMs).toISOString();
      upsert.run(
        matchId(f.home, f.away),
        SEASON,
        null,
        approx,
        "FINISHED",
        teamId(f.home),
        teamId(f.away),
        f.hg,
        f.ag,
        "wiki-eliteserien",
        null,
      );
      wikiFinished++;
    });
  } catch (e) {
    console.warn("  ويكيبيديا Eliteserien:", e);
  }

  let sportsDbUpserts = 0;
  const events = [
    ...(await fetchSportsDb(`eventspastleague.php?id=${SPORTSDB_LEAGUE_ID}`)),
    ...(await fetchSportsDb(`eventsnextleague.php?id=${SPORTSDB_LEAGUE_ID}`)),
  ];
  for (const e of events) {
    const home = codeFromTeamName(e.strHomeTeam || "");
    const away = codeFromTeamName(e.strAwayTeam || "");
    if (!home || !away) continue;
    const iso = sportsDbIso(e);
    if (!iso) continue;
    const hg =
      e.intHomeScore != null && e.intHomeScore !== ""
        ? Number(e.intHomeScore)
        : null;
    const ag =
      e.intAwayScore != null && e.intAwayScore !== ""
        ? Number(e.intAwayScore)
        : null;
    const finished =
      (hg != null && ag != null && Number.isFinite(hg) && Number.isFinite(ag)) ||
      /FT|AET|PEN/i.test(e.strStatus || "");
    const round = e.intRound && /^\d+$/.test(e.intRound) ? Number(e.intRound) : null;
    upsert.run(
      matchId(home, away),
      SEASON,
      round,
      iso,
      finished ? "FINISHED" : "SCHEDULED",
      teamId(home),
      teamId(away),
      finished ? hg : null,
      finished ? ag : null,
      "sportsdb-eliteserien",
      null,
    );
    sportsDbUpserts++;
  }

  // الجدول اليدوي للجولات القريبة يُطبَّق أخيراً ليفوز بالمواعيد والحالة
  let nearUpserts = 0;
  for (const f of NEAR_FIXTURES) {
    const finished = f.hg != null && f.ag != null;
    upsert.run(
      matchId(f.home, f.away),
      SEASON,
      f.round,
      f.date,
      finished ? "FINISHED" : "SCHEDULED",
      teamId(f.home),
      teamId(f.away),
      finished ? f.hg! : null,
      finished ? f.ag! : null,
      "manual-eliteserien",
      String(f.round),
    );
    nearUpserts++;
  }

  // إزالة مباريات جولة 17 الخاطئة + توابعها (حتى لو وُسمت FINISHED بالخطأ)
  for (const id of OBSOLETE_ROUND17_IDS) {
    db.prepare(`DELETE FROM prediction_snapshots WHERE match_id=?`).run(id);
    db.prepare(`DELETE FROM predictions WHERE match_id=?`).run(id);
    try {
      db.prepare(`DELETE FROM match_enrichment WHERE match_id=?`).run(id);
    } catch {
      /* optional table */
    }
    db.prepare(`DELETE FROM matches WHERE id=?`).run(id);
  }

  recomputeStandings(db);

  const counts = db
    .prepare(
      `SELECT
         SUM(status='FINISHED') AS finished,
         SUM(status IN ('SCHEDULED','TIMED')) AS scheduled
       FROM matches WHERE league_id='no1' AND season=?`,
    )
    .get(SEASON) as { finished: number; scheduled: number };

  console.log(
    `  no1 Eliteserien ${SEASON}: ${counts.finished ?? 0} منتهية · ${counts.scheduled ?? 0} مجدولة` +
      ` (ويكي ${wikiFinished} · قريبة ${nearUpserts} · SportsDB ${sportsDbUpserts})`,
  );
}

if (require.main === module) {
  syncNorwayEliteserien().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

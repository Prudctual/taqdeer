/**
 * Sync historical results from football-data.co.uk + optional fixtures from football-data.org
 */
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { getDb, closeDb } from "../src/lib/db";
import { HISTORICAL_SEASONS, LEAGUES, ukSeasonPath } from "../src/lib/leagues";
import { resolveTeamName } from "../src/lib/team-aliases";
import { nameAr, slugify } from "../src/lib/team-names";

const ROOT = process.cwd();
const RAW_DIR = path.join(ROOT, "data", "raw");

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]!]) {
      process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
    }
  }
}

async function download(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "pitchlab/0.1 (analytics; educational)" },
    });
    if (!res.ok) {
      console.warn(`  skip ${url} → ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (e) {
    console.warn(`  fail ${url}`, e);
    return null;
  }
}

const londonOffset = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  timeZoneName: "longOffset",
});

/** إزاحة توقيت لندن بالدقائق عند لحظة معيّنة (يغطي GMT/BST) */
function londonOffsetMinutes(at: Date): number {
  const part = londonOffset
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = part?.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/**
 * DD/MM/YYYY (+ HH:MM اختياري) → ISO بتوقيت UTC.
 * أعمدة football-data.co.uk بتوقيت المملكة المتحدة، لا UTC.
 */
export function parseUkDate(d: string, time?: string): string | null {
  const parts = d.trim().split("/");
  if (parts.length !== 3) return null;
  const [dd, mm] = parts;
  let yy = parts[2];
  if (!dd || !mm || !yy) return null;
  if (yy.length === 2) yy = Number(yy) > 50 ? `19${yy}` : `20${yy}`;
  const iso = `${yy.padStart(4, "0")}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  if (Number.isNaN(Date.parse(iso))) return null;

  const hm = time?.trim().match(/^(\d{1,2}):(\d{2})/);
  // ponytail: بلا وقت في CSV القديم → 15:00 بتوقيت لندن، وهو التوقيت التقليدي للجولة
  const hh = hm ? Number(hm[1]) : 15;
  const min = hm ? Number(hm[2]) : 0;
  if (hh > 23 || min > 59) return null;

  const asUtc = Date.UTC(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10)),
    hh,
    min,
  );
  return new Date(asUtc - londonOffsetMinutes(new Date(asUtc)) * 60000).toISOString();
}

function teamId(leagueId: string, teamName: string): string {
  return `${leagueId}-${slugify(teamName)}`;
}

/**
 * دمج الفرق المكررة: مصادر مختلفة سمّت نفس النادي بأسماء مختلفة
 * (Bayern München من API مقابل Bayern Munich من CSV) فنشأت هويات موازية
 * تشطر تاريخ الفريق وتكرّر النتائج في الترتيب. يعاد كل فريق إلى هويته
 * القياسية (اسم CSV القصير) وتُنقل مراجعه ثم تُحذف النسخة المكررة.
 */
export function mergeAliasTeams(db: ReturnType<typeof getDb>) {
  const teams = db
    .prepare(`SELECT id, league_id, name_en FROM teams`)
    .all() as Array<{ id: string; league_id: string; name_en: string }>;

  let merged = 0;
  for (const t of teams) {
    const canonicalName = resolveTeamName(t.name_en);
    const canonicalId = teamId(t.league_id, canonicalName);
    if (canonicalId === t.id) continue;

    const tx = db.transaction(() => {
      // الهوية القانونية تُنشأ أولاً (foreign_keys=ON): المراجع لا تُنقل لهوية غير موجودة
      db.prepare(
        `INSERT OR IGNORE INTO teams (id, league_id, name_ar, name_en, short_name, crest_url, elo, attack, defense)
         SELECT ?, league_id, ?, ?, substr(?, 1, 12), crest_url, elo, attack, defense
         FROM teams WHERE id = ?`,
      ).run(canonicalId, nameAr(canonicalName), canonicalName, canonicalName, t.id);

      db.prepare(`UPDATE matches SET home_team_id = ? WHERE home_team_id = ?`).run(canonicalId, t.id);
      db.prepare(`UPDATE matches SET away_team_id = ? WHERE away_team_id = ?`).run(canonicalId, t.id);
      db.prepare(`UPDATE OR IGNORE players SET team_id = ? WHERE team_id = ?`).run(canonicalId, t.id);
      db.prepare(`UPDATE OR IGNORE elo_snapshots SET team_id = ? WHERE team_id = ?`).run(canonicalId, t.id);
      // بقايا لم تُنقل بسبب قيود التفرد + صفوف الترتيب/القوة تُعاد حسابياً لاحقاً
      db.prepare(`DELETE FROM players WHERE team_id = ?`).run(t.id);
      db.prepare(`DELETE FROM elo_snapshots WHERE team_id = ?`).run(t.id);
      db.prepare(`DELETE FROM standings WHERE team_id = ?`).run(t.id);
      db.prepare(`DELETE FROM team_strengths WHERE team_id = ?`).run(t.id);
      db.prepare(`DELETE FROM teams WHERE id = ?`).run(t.id);
    });
    tx();
    merged++;
    console.log(`  دمج فريق مكرر: ${t.id} → ${canonicalId}`);
  }
  if (merged) console.log(`  دُمج ${merged} فريقاً مكرراً بهويته القياسية`);
}

/** فرق يتيمة لا تمسّها أي مباراة (بقايا استيراد خاطئ أو دمج) — تُحذف بمراجعها */
export function cleanupOrphanTeams(db: ReturnType<typeof getDb>) {
  const orphans = db
    .prepare(
      `SELECT id FROM teams
       WHERE id NOT IN (SELECT home_team_id FROM matches)
         AND id NOT IN (SELECT away_team_id FROM matches)`,
    )
    .all() as Array<{ id: string }>;
  if (orphans.length === 0) return;

  const tx = db.transaction(() => {
    for (const o of orphans) {
      db.prepare(`DELETE FROM players WHERE team_id = ?`).run(o.id);
      db.prepare(`DELETE FROM elo_snapshots WHERE team_id = ?`).run(o.id);
      db.prepare(`DELETE FROM standings WHERE team_id = ?`).run(o.id);
      db.prepare(`DELETE FROM team_strengths WHERE team_id = ?`).run(o.id);
      db.prepare(`DELETE FROM teams WHERE id = ?`).run(o.id);
    }
  });
  tx();
  console.log(`  حُذف ${orphans.length} فريقاً يتيماً بلا مباريات`);
}

function seedLeagues(db: ReturnType<typeof getDb>) {
  const activeIds = LEAGUES.map((l) => `'${l.id}'`).join(",");
  db.prepare(`DELETE FROM players WHERE team_id IN (SELECT id FROM teams WHERE league_id NOT IN (${activeIds}))`).run();
  db.prepare(`DELETE FROM elo_snapshots WHERE team_id IN (SELECT id FROM teams WHERE league_id NOT IN (${activeIds}))`).run();
  db.prepare(`DELETE FROM predictions WHERE match_id IN (SELECT id FROM matches WHERE league_id NOT IN (${activeIds}))`).run();
  db.prepare(`DELETE FROM prediction_snapshots WHERE match_id IN (SELECT id FROM matches WHERE league_id NOT IN (${activeIds}))`).run();
  db.prepare(`DELETE FROM matches WHERE league_id NOT IN (${activeIds})`).run();
  db.prepare(`DELETE FROM standings WHERE league_id NOT IN (${activeIds})`).run();
  db.prepare(`DELETE FROM team_strengths WHERE league_id NOT IN (${activeIds})`).run();
  db.prepare(`DELETE FROM teams WHERE league_id NOT IN (${activeIds})`).run();
  db.prepare(`DELETE FROM model_metrics WHERE league_id NOT IN (${activeIds})`).run();
  db.prepare(`DELETE FROM leagues WHERE id NOT IN (${activeIds})`).run();

  const upsert = db.prepare(`
    INSERT INTO leagues (id, code, name_ar, name_en, country_ar, fd_org_code, fd_uk_code)
    VALUES (@id, @code, @name_ar, @name_en, @country_ar, @fd_org_code, @fd_uk_code)
    ON CONFLICT(id) DO UPDATE SET
      name_ar=excluded.name_ar,
      name_en=excluded.name_en
  `);
  for (const l of LEAGUES) {
    upsert.run({
      id: l.id,
      code: l.code,
      name_ar: l.nameAr,
      name_en: l.nameEn,
      country_ar: l.countryAr,
      fd_org_code: l.fdOrgCode ?? null,
      fd_uk_code: l.fdUkCode ?? "",
    });
  }
}

function upsertTeam(
  db: ReturnType<typeof getDb>,
  leagueId: string,
  english: string,
  crestUrl?: string | null,
) {
  const id = teamId(leagueId, english);
  db.prepare(
    `INSERT INTO teams (id, league_id, name_ar, name_en, short_name, crest_url)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name_en=excluded.name_en,
       name_ar=excluded.name_ar,
       short_name=excluded.short_name,
       crest_url=COALESCE(excluded.crest_url, teams.crest_url)`,
  ).run(
    id,
    leagueId,
    nameAr(english),
    english,
    english.slice(0, 12),
    crestUrl ?? null,
  );
  return id;
}

const CREST_DIR = path.join(ROOT, "public", "crests");

/** أسماء بحث أفضل لـ TheSportsDB (مفاتيح = name_en عندنا) */
const CREST_SEARCH: Record<string, string> = {
  "Man United": "Manchester United",
  "Man City": "Manchester City",
  "Nott'm Forest": "Nottingham Forest",
  "Ath Madrid": "Atletico Madrid",
  "Ath Bilbao": "Athletic Bilbao",
  "M'gladbach": "Borussia Monchengladbach",
  "Ein Frankfurt": "Eintracht Frankfurt",
  "FC Koln": "FC Cologne",
  "Paris SG": "Paris Saint Germain",
  "PSG": "Paris Saint Germain",
  Inter: "Inter Milan",
  Milan: "AC Milan",
  Alaves: "Deportivo Alaves",
  Reims: "Stade de Reims",
  Oviedo: "Real Oviedo",
  Valladolid: "Real Valladolid",
  "Seoul E-Land": "Seoul E-Land FC",
  Vallecano: "Rayo Vallecano",
  Espanol: "Espanyol",
  Sociedad: "Real Sociedad",
  Betis: "Real Betis",
  Celta: "Celta Vigo",
  "St Pauli": "FC St Pauli",
  "RB Leipzig": "RB Leipzig",
  Leverkusen: "Bayer Leverkusen",
  "Bayern Munich": "Bayern Munich",
  Dortmund: "Borussia Dortmund",
  "Union Berlin": "Union Berlin",
  Wolves: "Wolverhampton Wanderers",
  Brighton: "Brighton",
  Newcastle: "Newcastle United",
  Tottenham: "Tottenham",
  "West Ham": "West Ham",
  Spurs: "Tottenham",
};

const LEAGUE_BADGE_HINT: Record<string, string[]> = {
  pl: ["Premier League"],
  pd: ["La Liga"],
  bl1: ["Bundesliga"],
  sa: ["Serie A"],
  fl1: ["Ligue 1"],
};

async function fetchBuffer(
  url: string,
  ms = 6000,
): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(ms),
      headers: { "User-Agent": "pitchlab/0.1 (analytics; educational)" },
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function sportsDbBadge(
  searchName: string,
  leagueId: string,
): Promise<string | null> {
  const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(searchName)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      teams?: Array<{
        strTeam?: string;
        strSport?: string;
        strLeague?: string;
        strBadge?: string;
      }>;
    };
    const hints = LEAGUE_BADGE_HINT[leagueId] ?? [];
    const soccer = (data.teams ?? []).filter(
      (t) => t.strSport === "Soccer" && t.strBadge,
    );
    const byLeague = soccer.find((t) =>
      hints.some((h) => (t.strLeague ?? "").includes(h)),
    );
    if (byLeague?.strBadge) return byLeague.strBadge;
    const q = searchName.toLowerCase();
    const exact = soccer.find((t) => (t.strTeam ?? "").toLowerCase() === q);
    if (exact?.strBadge) return exact.strBadge;
    return soccer[0]?.strBadge ?? null;
  } catch {
    return null;
  }
}

function crestFileName(teamKey: string, ext: string): string {
  return `${teamKey.replace(/[^a-z0-9-_]/gi, "-")}.${ext}`;
}

/** شعار محفوظ مسبقاً على القرص — يوفّر طلب شبكة ويمنع فقدانه عند تقييد المصدر */
function cachedCrest(teamKey: string): string | null {
  for (const ext of ["png", "svg"]) {
    const file = crestFileName(teamKey, ext);
    const dest = path.join(CREST_DIR, file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 200) {
      return `/crests/${file}`;
    }
  }
  return null;
}

async function cacheCrestLocally(
  teamKey: string,
  remoteUrl: string,
): Promise<string | null> {
  if (!fs.existsSync(CREST_DIR)) fs.mkdirSync(CREST_DIR, { recursive: true });
  const cached = cachedCrest(teamKey);
  if (cached) return cached;
  const file = crestFileName(teamKey, remoteUrl.includes(".svg") ? "svg" : "png");
  const buf = await fetchBuffer(remoteUrl);
  if (!buf || buf.length < 200) return null;
  fs.writeFileSync(path.join(CREST_DIR, file), buf);
  return `/crests/${file}`;
}

async function syncCrestsForLeagueTeams(
  db: ReturnType<typeof getDb>,
  leagueId: string,
  leagueNameAr: string,
  teams: Array<{
    teamKey?: string;
    name: string;
    shortName?: string;
    crest?: string;
  }>,
) {
  let n = 0;
  for (const t of teams) {
    const english = resolveTeamName(t.name);
    const id =
      typeof t.teamKey === "string" && t.teamKey.length > 0
        ? t.teamKey
        : upsertTeam(db, leagueId, english, t.crest ?? null);

    // الملف المحفوظ يفوز دائماً: بلا شبكة، وبلا خطر استبداله برابط خارجي
    let finalUrl = cachedCrest(String(id));
    if (!finalUrl) {
      const search =
        CREST_SEARCH[english] ?? t.shortName ?? t.name.replace(/\s+FC$/i, "");
      const badge = await sportsDbBadge(search, leagueId);
      finalUrl =
        (badge ? await cacheCrestLocally(String(id), badge) : null) ??
        (await (t.crest ? cacheCrestLocally(String(id), t.crest) : null)) ??
        badge ??
        t.crest ??
        null;
      await new Promise((r) => setTimeout(r, 200));
    }

    if (finalUrl) {
      db.prepare(`UPDATE teams SET crest_url = ? WHERE id = ?`).run(
        finalUrl,
        id,
      );
      n++;
    }
  }
  console.log(`  شعارات ${leagueNameAr}: ${n} نادٍ`);
  return n;
}

/**
 * اربط كل فريق بشعاره المحفوظ على القرص — بلا شبكة.
 * الأندية الهابطة لا تعود في قوائم API، فبدون هذه الخطوة تبقى شعاراتها
 * موجودة كملفات لكن مفصولة عن القاعدة.
 */
function adoptCachedCrests(db: ReturnType<typeof getDb>) {
  const rows = db.prepare(`SELECT id, crest_url FROM teams`).all() as Array<{
    id: string;
    crest_url: string | null;
  }>;
  const upd = db.prepare(`UPDATE teams SET crest_url = ? WHERE id = ?`);
  let n = 0;
  for (const r of rows) {
    const local = cachedCrest(r.id);
    if (local && r.crest_url !== local) {
      upd.run(local, r.id);
      n++;
    }
  }
  console.log(`  شعارات محفوظة رُبطت بالقاعدة: ${n}`);
}

/**
 * الأندية الهابطة لا ترد في قوائم API الحالية، فتبقى بلا شعار مهما تكرّرت المزامنة.
 * هذه الجولة تسألها بالاسم عن TheSportsDB مرة واحدة، ثم تُحفظ محلياً للأبد.
 */
async function backfillMissingCrests(db: ReturnType<typeof getDb>) {
  const rows = db
    .prepare(
      `SELECT id, league_id, name_en FROM teams WHERE crest_url IS NULL
       ORDER BY league_id, name_en`,
    )
    .all() as Array<{ id: string; league_id: string; name_en: string }>;
  if (rows.length === 0) return 0;

  console.log(`  استكمال شعارات ${rows.length} نادياً تاريخياً…`);
  let n = 0;
  for (const t of rows) {
    const search = CREST_SEARCH[t.name_en] ?? t.name_en;
    const badge = await sportsDbBadge(search, t.league_id);
    const local = badge ? await cacheCrestLocally(t.id, badge) : null;
    const url = local ?? badge;
    if (url) {
      db.prepare(`UPDATE teams SET crest_url = ? WHERE id = ?`).run(url, t.id);
      n++;
    } else {
      console.warn(`    بلا شعار: ${t.name_en}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log(`  استُكمل ${n} من ${rows.length}`);
  return n;
}

/** تباعد طلبات football-data.org — الحد المجاني 10 طلبات/دقيقة */
let lastFdOrgCall = 0;
async function fdOrgFetch(url: string, key: string): Promise<Response> {
  const wait = lastFdOrgCall + 6500 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFdOrgCall = Date.now();
  let res = await fetch(url, { headers: { "X-Auth-Token": key } });
  if (res.status === 429) {
    console.warn("  football-data.org 429 — انتظار دقيقة ثم إعادة المحاولة");
    await new Promise((r) => setTimeout(r, 61_000));
    lastFdOrgCall = Date.now();
    res = await fetch(url, { headers: { "X-Auth-Token": key } });
  }
  return res;
}

/** شعارات حقيقية: تحميل محلي (CDN football-data أو TheSportsDB) */
async function syncTeamCrests(db: ReturnType<typeof getDb>) {
  const key = process.env.FOOTBALL_DATA_API_KEY?.trim();
  let updated = 0;

  adoptCachedCrests(db);

  for (const league of LEAGUES) {
    if (league.fdOrgCode && key) {
      const url = `https://api.football-data.org/v4/competitions/${league.fdOrgCode}/teams`;
      const res = await fdOrgFetch(url, key);
      if (!res.ok) {
        console.warn(`  crests ${league.code}: ${res.status}`);
        continue;
      }
      const data = (await res.json()) as {
        teams?: Array<{
          name: string;
          shortName?: string;
          crest?: string;
        }>;
      };
      updated += await syncCrestsForLeagueTeams(
        db,
        league.id,
        league.nameAr,
        data.teams ?? [],
      );
      continue;
    }

    // دوريات بلا football-data.org: شعارات الفرق الموجودة عبر TheSportsDB
    const rows = db
      .prepare(
        `SELECT id, name_en AS name, crest_url AS crest FROM teams WHERE league_id = ?`,
      )
      .all(league.id) as Array<{ id: string; name: string; crest?: string }>;
    if (rows.length === 0) continue;
    // تهدئة بعد طلبات الخمس الكبرى لتجنّب 429 من TheSportsDB
    await new Promise((r) => setTimeout(r, 2000));
    updated += await syncCrestsForLeagueTeams(
      db,
      league.id,
      league.nameAr,
      rows.map((r) => ({
        teamKey: r.id,
        name: r.name,
        crest: r.crest,
      })),
    );
  }

  if (!key) {
    console.log(
      "لا مفتاح API — شُعارات الخمس الكبرى من TheSportsDB فقط إن وُجدت فرق.",
    );
  }

  updated += await backfillMissingCrests(db);
  console.log(`  مجموع الشعارات المحدّثة: ${updated}`);
}

function ingestCsv(
  db: ReturnType<typeof getDb>,
  leagueId: string,
  season: string,
  csvText: string,
  expectedDiv?: string,
) {
  const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as Record<string, string>[];

  // football-data.co.uk يعيد توجيه ملفات الموسم غير المنشورة لملف دوري آخر
  // (مثال: 2627/SP1.csv → SC1.csv الاسكتلندي) — صفوف Div الغريبة تُرفض بالكامل
  if (expectedDiv) {
    const withDiv = rows.filter((r) => r.Div);
    if (withDiv.length > 0 && withDiv.every((r) => r.Div !== expectedDiv)) {
      return -1;
    }
  }

  const insert = db.prepare(`
    INSERT INTO matches (
      id, league_id, season, matchday, utc_date, status,
      home_team_id, away_team_id, home_goals, away_goals, source, external_id,
      odds_home, odds_draw, odds_away,
      odds_open_home, odds_open_draw, odds_open_away,
      shots_home, shots_away, sot_home, sot_away,
      fouls_home, fouls_away, corners_home, corners_away,
      referee_name, yellow_home, yellow_away, red_home, red_away
    ) VALUES (
      @id, @league_id, @season, @matchday, @utc_date, @status,
      @home_team_id, @away_team_id, @home_goals, @away_goals, @source, @external_id,
      @odds_home, @odds_draw, @odds_away,
      @odds_open_home, @odds_open_draw, @odds_open_away,
      @shots_home, @shots_away, @sot_home, @sot_away,
      @fouls_home, @fouls_away, @corners_home, @corners_away,
      @referee_name, @yellow_home, @yellow_away, @red_home, @red_away
    )
    ON CONFLICT(id) DO UPDATE SET
      home_goals=excluded.home_goals,
      away_goals=excluded.away_goals,
      status=excluded.status,
      odds_home=excluded.odds_home,
      odds_draw=excluded.odds_draw,
      odds_away=excluded.odds_away,
      odds_open_home=excluded.odds_open_home,
      odds_open_draw=excluded.odds_open_draw,
      odds_open_away=excluded.odds_open_away,
      shots_home=excluded.shots_home,
      shots_away=excluded.shots_away,
      sot_home=excluded.sot_home,
      sot_away=excluded.sot_away,
      fouls_home=excluded.fouls_home,
      fouls_away=excluded.fouls_away,
      corners_home=excluded.corners_home,
      corners_away=excluded.corners_away,
      referee_name=excluded.referee_name,
      yellow_home=excluded.yellow_home,
      yellow_away=excluded.yellow_away,
      red_home=excluded.red_home,
      red_away=excluded.red_away
  `);

  const num = (v: string | undefined) => {
    if (v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  let n = 0;
  const tx = db.transaction(() => {
    for (const r of rows) {
      if (expectedDiv && r.Div && r.Div !== expectedDiv) continue;
      const home = r.HomeTeam || r.Home || r["Home Team"];
      const away = r.AwayTeam || r.Away || r["Away Team"];
      const fthg = r.FTHG ?? r.HG;
      const ftag = r.FTAG ?? r.AG;
      const dateRaw = r.Date;
      if (!home || !away || fthg === undefined || ftag === undefined || !dateRaw)
        continue;
      const hg = Number(fthg);
      const ag = Number(ftag);
      if (Number.isNaN(hg) || Number.isNaN(ag)) continue;
      const utc = parseUkDate(dateRaw, r.Time);
      if (!utc) continue;
      const homeId = upsertTeam(db, leagueId, home);
      const awayId = upsertTeam(db, leagueId, away);
      const id = `${leagueId}-${season}-${slugify(home)}-${slugify(away)}-${utc.slice(0, 10)}`;
      insert.run({
        id,
        league_id: leagueId,
        season,
        matchday: null,
        utc_date: utc,
        status: "FINISHED",
        home_team_id: homeId,
        away_team_id: awayId,
        home_goals: hg,
        away_goals: ag,
        source: "football-data.co.uk",
        external_id: null,
        odds_home: num(r.AvgH) ?? num(r.B365H) ?? num(r.PSH),
        odds_draw: num(r.AvgD) ?? num(r.B365D) ?? num(r.PSD),
        odds_away: num(r.AvgA) ?? num(r.B365A) ?? num(r.PSA),
        odds_open_home: num(r.PSH) ?? num(r.B365H),
        odds_open_draw: num(r.PSD) ?? num(r.B365D),
        odds_open_away: num(r.PSA) ?? num(r.B365A),
        shots_home: num(r.HS),
        shots_away: num(r.AS),
        sot_home: num(r.HST),
        sot_away: num(r.AST),
        fouls_home: num(r.HF),
        fouls_away: num(r.AF),
        corners_home: num(r.HC),
        corners_away: num(r.AC),
        referee_name: r.Referee ? String(r.Referee).trim() : null,
        yellow_home: num(r.HY),
        yellow_away: num(r.AY),
        red_home: num(r.HR),
        red_away: num(r.AR),
      });
      n++;
    }
  });
  tx();
  return n;
}

/** معرّفات API-Football لدورياتنا — تُستخدم مع fixtures?date= (بلا موسم؛ الخطة المجانية تقفل seasons الحديثة) */
const API_FOOTBALL_LEAGUE_IDS: Record<number, string> = {
  39: "pl",
  140: "pd",
  78: "bl1",
  135: "sa",
  61: "fl1",
  94: "ppd",
  88: "ded",
  203: "tur1",
};

function avgMatchWinnerOdds(
  bookmakers: Array<{
    bets?: Array<{ id?: number; name?: string; values?: Array<{ value: string; odd: string }> }>;
  }>,
): { home: number; draw: number; away: number } | null {
  const homes: number[] = [];
  const draws: number[] = [];
  const aways: number[] = [];
  for (const bm of bookmakers) {
    for (const bet of bm.bets ?? []) {
      if (bet.id !== 1 && bet.name !== "Match Winner" && bet.name !== "1X2") continue;
      const vals: Record<string, number> = {};
      for (const v of bet.values ?? []) {
        const n = Number(v.odd);
        if (Number.isFinite(n) && n > 1) vals[v.value] = n;
      }
      if (vals.Home && vals.Draw && vals.Away) {
        homes.push(vals.Home);
        draws.push(vals.Draw);
        aways.push(vals.Away);
      }
      break;
    }
  }
  if (homes.length === 0) return null;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return {
    home: Math.round(mean(homes) * 1000) / 1000,
    draw: Math.round(mean(draws) * 1000) / 1000,
    away: Math.round(mean(aways) * 1000) / 1000,
  };
}

/**
 * أودز + حكّام للمباريات القادمة عبر API-Football باليوم (احتياطي فقط).
 * الإثراء الأساسي من fixtures.csv عبر taqdeer-enrich — هنا حد أدنى 24 ساعة للحفاظ على الحصة.
 */
async function syncUpcomingOddsFromApiFootball(
  db: ReturnType<typeof getDb>,
): Promise<number> {
  const apiKey =
    process.env.API_FOOTBALL_KEY?.trim() || process.env.API_SPORTS_KEY?.trim();
  if (!apiKey) {
    console.warn("  لا API_FOOTBALL_KEY — تخطّي أودز API-Football");
    return 0;
  }

  const last = db
    .prepare(`SELECT value FROM app_meta WHERE key = 'last_odds_api_sync'`)
    .get() as { value: string } | undefined;
  if (last?.value) {
    const ageH = (Date.now() - Date.parse(last.value)) / 3_600_000;
    if (Number.isFinite(ageH) && ageH < 24) {
      console.log(
        `  أودز API-Football: تخطّي (آخر مزامنة منذ ${ageH.toFixed(1)}س — الحد الأدنى 24س؛ الإثراء من CSV)`,
      );
      return 0;
    }
  }

  type FxHit = {
    fixtureId: number;
    leagueId: string;
    date: string;
    home: string;
    away: string;
    referee: string | null;
  };
  const hits: FxHit[] = [];
  const DAY_WINDOW = 5;
  const MAX_ODDS_CALLS = 25;
  let hit429 = false;

  for (let i = 0; i < DAY_WINDOW; i++) {
    const day = new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10);
    try {
      const res = await fetch(
        `https://v3.football.api-sports.io/fixtures?date=${day}`,
        { headers: { "x-apisports-key": apiKey }, signal: AbortSignal.timeout(25000) },
      );
      if (res.status === 429) {
        hit429 = true;
        console.warn(`  fixtures?date=${day}: 429 — إيقاف`);
        break;
      }
      if (!res.ok) {
        console.warn(`  fixtures?date=${day}: ${res.status}`);
        continue;
      }
      const data = (await res.json()) as {
        response?: Array<{
          fixture: { id: number; date: string; referee?: string | null };
          league: { id: number };
          teams: { home: { name: string }; away: { name: string } };
        }>;
      };
      for (const item of data.response ?? []) {
        const leagueId = API_FOOTBALL_LEAGUE_IDS[item.league.id];
        if (!leagueId) continue;
        hits.push({
          fixtureId: item.fixture.id,
          leagueId,
          date: item.fixture.date,
          home: resolveTeamName(item.teams.home.name),
          away: resolveTeamName(item.teams.away.name),
          referee: item.fixture.referee?.trim() || null,
        });
      }
      await new Promise((r) => setTimeout(r, 350));
    } catch (e) {
      console.warn(`  fixtures?date=${day} error:`, e);
    }
  }

  if (hits.length === 0) {
    console.log("  أودز API-Football: لا مباريات لدورياتنا في الأيام القادمة");
    return 0;
  }

  const findMatch = db.prepare(`
    SELECT id, odds_home FROM matches
    WHERE league_id = ? AND home_team_id = ? AND away_team_id = ?
      AND status IN ('SCHEDULED', 'TIMED', 'IN_PLAY', 'PAUSED')
      AND abs(julianday(utc_date) - julianday(?)) <= 1.5
    ORDER BY abs(julianday(utc_date) - julianday(?))
    LIMIT 1
  `);
  const updOdds = db.prepare(`
    UPDATE matches SET
      odds_home = @oh, odds_draw = @od, odds_away = @oa,
      odds_open_home = COALESCE(odds_open_home, @oh),
      odds_open_draw = COALESCE(odds_open_draw, @od),
      odds_open_away = COALESCE(odds_open_away, @oa),
      referee_name = COALESCE(@ref, referee_name)
    WHERE id = @id
  `);
  const updRefOnly = db.prepare(`
    UPDATE matches SET referee_name = COALESCE(?, referee_name) WHERE id = ?
  `);

  let oddsUpdated = 0;
  let refsUpdated = 0;
  let oddsCalls = 0;

  for (const h of hits) {
    const homeId = teamId(h.leagueId, h.home);
    const awayId = teamId(h.leagueId, h.away);
    // تأكد من وجود الفريقين بأسمائهم القانونية قبل المطابقة
    upsertTeam(db, h.leagueId, h.home);
    upsertTeam(db, h.leagueId, h.away);
    const row = findMatch.get(h.leagueId, homeId, awayId, h.date, h.date) as
      | { id: string; odds_home: number | null }
      | undefined;
    if (!row) continue;

    if (h.referee) {
      const r = updRefOnly.run(h.referee, row.id);
      refsUpdated += r.changes;
    }

    // لا تهدر الحصة على مباراة لها أودز حديثة إن تجاوزنا السقف
    if (oddsCalls >= MAX_ODDS_CALLS) continue;

    try {
      const res = await fetch(
        `https://v3.football.api-sports.io/odds?fixture=${h.fixtureId}`,
        { headers: { "x-apisports-key": apiKey }, signal: AbortSignal.timeout(25000) },
      );
      oddsCalls++;
      if (res.status === 429) {
        hit429 = true;
        console.warn("  odds API 429 — إيقاف الجلب حتى الدورة التالية");
        break;
      }
      if (!res.ok) continue;
      const data = (await res.json()) as {
        response?: Array<{
          bookmakers?: Array<{
            bets?: Array<{
              id?: number;
              name?: string;
              values?: Array<{ value: string; odd: string }>;
            }>;
          }>;
        }>;
      };
      const books = data.response?.[0]?.bookmakers ?? [];
      const avg = avgMatchWinnerOdds(books);
      if (!avg) continue;
      const r = updOdds.run({
        oh: avg.home,
        od: avg.draw,
        oa: avg.away,
        ref: h.referee,
        id: row.id,
      });
      oddsUpdated += r.changes;
      await new Promise((r) => setTimeout(r, 350));
    } catch (e) {
      console.warn(`  odds?fixture=${h.fixtureId} error:`, e);
    }
  }

  // لا نختم عند 429 حتى تُعاد المحاولة في الدورة الساعية التالية
  if (!hit429) {
    db.prepare(
      `INSERT INTO app_meta (key, value) VALUES ('last_odds_api_sync', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ).run(new Date().toISOString());
  }

  console.log(
    `  أودز API-Football: ${oddsUpdated} مباراة · حكّام ${refsUpdated} · طلبات ~${oddsCalls + DAY_WINDOW}${hit429 ? " (429)" : ""}`,
  );
  return oddsUpdated;
}

/**
 * أودز سوق حقيقية للمباريات القادمة:
 * 1) fixtures.csv من football-data.co.uk (بلا مفتاح، حين تتوفر دورياتنا)
 * 2) API-Football باليوم + odds?fixture= كبديل يعمل على الخطة المجانية
 */
export async function syncUpcomingOdds(db: ReturnType<typeof getDb>) {
  loadEnv();
  const text = await download("https://www.football-data.co.uk/fixtures.csv");
  let fromCsv = 0;
  if (!text || !text.includes("HomeTeam")) {
    console.warn("  fixtures.csv غير متاح");
  } else {
    const rows = parse(text, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    }) as Record<string, string>[];

    const byCode = new Map(
      LEAGUES.filter((l) => l.fdUkCode).map((l) => [l.fdUkCode!, l.id]),
    );

    const num = (v: string | undefined) => {
      if (v === undefined || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const upd = db.prepare(`
      UPDATE matches SET
        odds_home = @oh, odds_draw = @od, odds_away = @oa,
        odds_open_home = COALESCE(odds_open_home, @oh),
        odds_open_draw = COALESCE(odds_open_draw, @od),
        odds_open_away = COALESCE(odds_open_away, @oa)
      WHERE id = (
        SELECT id FROM matches
        WHERE league_id = @league AND home_team_id = @home AND away_team_id = @away
          AND status IN ('SCHEDULED', 'TIMED')
          AND abs(julianday(utc_date) - julianday(@date)) <= 2
        ORDER BY abs(julianday(utc_date) - julianday(@date))
        LIMIT 1
      )
    `);

    const tx = db.transaction(() => {
      for (const r of rows) {
        const leagueId = byCode.get(r.Div ?? "");
        if (!leagueId) continue;
        const home = r.HomeTeam || r.Home || r["Home Team"];
        const away = r.AwayTeam || r.Away || r["Away Team"];
        if (!home || !away || !r.Date) continue;
        const utc = parseUkDate(r.Date, r.Time);
        if (!utc) continue;
        const oh = num(r.AvgH) ?? num(r.B365H) ?? num(r.PSH);
        const od = num(r.AvgD) ?? num(r.B365D) ?? num(r.PSD);
        const oa = num(r.AvgA) ?? num(r.B365A) ?? num(r.PSA);
        if (!oh || !od || !oa) continue;
        const res = upd.run({
          oh,
          od,
          oa,
          league: leagueId,
          home: teamId(leagueId, home),
          away: teamId(leagueId, away),
          date: utc,
        });
        fromCsv += res.changes;
      }
    });
    tx();
    console.log(`  أودز حقيقية لـ${fromCsv} مباراة قادمة من fixtures.csv`);
  }

  // بديل دائم: حتى مع fixtures.csv الاسكتلندي فقط نحصل على أودز دورياتنا من API-Football
  const fromApi = await syncUpcomingOddsFromApiFootball(db);
  if (fromCsv === 0 && fromApi === 0) {
    console.warn("  لا أودز سوق للمباريات القادمة بعد — صفحة القيمة ستبقى فارغة بصدق");
  }
}

/** أحدث موسم له نتائج فعلية — لا نعتمد على تقويم ثابت قد يسبق صدور البيانات */
function latestSeasonWithResults(
  db: ReturnType<typeof getDb>,
  leagueId: string,
): string | null {
  const row = db
    .prepare(
      `SELECT season FROM matches
       WHERE league_id=? AND status='FINISHED' AND home_goals IS NOT NULL
       ORDER BY season DESC LIMIT 1`,
    )
    .get(leagueId) as { season: string } | undefined;
  return row?.season ?? null;
}

/**
 * حذف مباريات CSV المستوردة خطأً من ملف معاد توجيهه لدوري آخر.
 * إن وُجدت نسخة موازية لنفس المواجهة من مصدر آخر تُنقل إليها التوقعات واللقطات أولاً.
 */
function purgeRedirectedCsvImports(
  db: ReturnType<typeof getDb>,
  leagueId: string,
  season: string,
) {
  const bad = db
    .prepare(
      `SELECT id, home_team_id, away_team_id, date(utc_date) AS day
       FROM matches
       WHERE league_id = ? AND season = ? AND source = 'football-data.co.uk'`,
    )
    .all(leagueId, season) as Array<{
    id: string;
    home_team_id: string;
    away_team_id: string;
    day: string;
  }>;
  if (bad.length === 0) return;

  const twin = db.prepare(
    `SELECT id FROM matches
     WHERE league_id = ? AND home_team_id = ? AND away_team_id = ?
       AND date(utc_date) = ? AND source != 'football-data.co.uk'
     LIMIT 1`,
  );
  const tx = db.transaction(() => {
    for (const b of bad) {
      const t = twin.get(leagueId, b.home_team_id, b.away_team_id, b.day) as
        | { id: string }
        | undefined;
      if (t) {
        db.prepare(
          `UPDATE predictions SET match_id = ? WHERE match_id = ?
           AND NOT EXISTS (SELECT 1 FROM predictions WHERE match_id = ?)`,
        ).run(t.id, b.id, t.id);
        db.prepare(
          `UPDATE prediction_snapshots SET match_id = ? WHERE match_id = ?
           AND NOT EXISTS (SELECT 1 FROM prediction_snapshots WHERE match_id = ?)`,
        ).run(t.id, b.id, t.id);
      }
      db.prepare(`DELETE FROM predictions WHERE match_id = ?`).run(b.id);
      db.prepare(`DELETE FROM prediction_snapshots WHERE match_id = ?`).run(b.id);
      db.prepare(`DELETE FROM matches WHERE id = ?`).run(b.id);
    }
  });
  tx();
  recomputeStandings(db, leagueId, season);
  console.warn(`  حُذفت ${bad.length} مباراة مستوردة خطأً من ملف معاد توجيهه`);
}

export function recomputeStandings(db: ReturnType<typeof getDb>, leagueId: string, season: string) {
  const matches = db
    .prepare(
      `SELECT home_team_id, away_team_id, home_goals, away_goals
       FROM matches WHERE league_id=? AND season=? AND status='FINISHED'
       AND home_goals IS NOT NULL`,
    )
    .all(leagueId, season) as {
    home_team_id: string;
    away_team_id: string;
    home_goals: number;
    away_goals: number;
  }[];

  type Row = {
    played: number;
    won: number;
    drawn: number;
    lost: number;
    gf: number;
    ga: number;
    pts: number;
  };
  const table = new Map<string, Row>();
  const ensure = (id: string) => {
    if (!table.has(id))
      table.set(id, { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 });
    return table.get(id)!;
  };

  for (const m of matches) {
    const h = ensure(m.home_team_id);
    const a = ensure(m.away_team_id);
    h.played++;
    a.played++;
    h.gf += m.home_goals;
    h.ga += m.away_goals;
    a.gf += m.away_goals;
    a.ga += m.home_goals;
    if (m.home_goals > m.away_goals) {
      h.won++;
      h.pts += 3;
      a.lost++;
    } else if (m.home_goals < m.away_goals) {
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

  const sorted = [...table.entries()].sort((x, y) => {
    if (y[1].pts !== x[1].pts) return y[1].pts - x[1].pts;
    const gdx = x[1].gf - x[1].ga;
    const gdy = y[1].gf - y[1].ga;
    if (gdy !== gdx) return gdy - gdx;
    return y[1].gf - x[1].gf;
  });

  // Wipe standings for this specific league and season
  db.prepare(`DELETE FROM standings WHERE league_id=? AND season=?`).run(leagueId, season);
  const ins = db.prepare(`
    INSERT INTO standings (
      id, league_id, season, team_id, position, played, won, drawn, lost,
      goals_for, goals_against, goal_difference, points
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  sorted.forEach(([teamId, r], i) => {
    ins.run(
      `${leagueId}-${season}-${teamId}`,
      leagueId,
      season,
      teamId,
      i + 1,
      r.played,
      r.won,
      r.drawn,
      r.lost,
      r.gf,
      r.ga,
      r.gf - r.ga,
      r.pts,
    );
  });
}

/** Remove demo/synthetic scheduled rows so UI only shows real fixtures or real results. */
function clearNonRealScheduled(db: ReturnType<typeof getDb>) {
  db.prepare(
    `DELETE FROM predictions WHERE match_id IN (
       SELECT id FROM matches
       WHERE status = 'SCHEDULED'
         AND source IN ('preview-holdout', 'synthetic', 'demo')
     )`,
  ).run();
  const purged = db
    .prepare(
      `DELETE FROM matches
       WHERE status = 'SCHEDULED'
         AND source IN ('preview-holdout', 'synthetic', 'demo')`,
    )
    .run();
  if (purged.changes) {
    console.log(`  حُذفت ${purged.changes} مباراة غير حقيقية (synthetic/preview)`);
  }
}

async function syncFixturesFromApiFootball(db: ReturnType<typeof getDb>) {
  const apiFootballKey = process.env.API_FOOTBALL_KEY?.trim() || process.env.API_SPORTS_KEY?.trim();
  if (!apiFootballKey) return;

  // الخطة المجانية 100 طلب/يوم — لا نُفرّغ الحصة كل ساعة بموسم كامل
  const last = db
    .prepare(`SELECT value FROM app_meta WHERE key = 'last_apif_fixtures_sync'`)
    .get() as { value: string } | undefined;
  if (last?.value) {
    const ageH = (Date.now() - Date.parse(last.value)) / 3_600_000;
    if (Number.isFinite(ageH) && ageH < 20) {
      console.log(
        `مزامنة API-Football للنتائج/الحكّام: تخطّي (آخر مزامنة منذ ${ageH.toFixed(1)}س)`,
      );
      return;
    }
  }

  console.log("مزامنة المباريات والحكام الحقيقيين من API-Football (api-sports.io)...");
  const API_FOOTBALL_LEAGUES: Record<string, number> = {
    pl: 39,
    pd: 140,
    sa: 135,
    bl1: 78,
    fl1: 61,
  };

  const updateRef = db.prepare(`
    UPDATE matches SET referee_name = ?
    WHERE (league_id = ? AND date(utc_date) = date(?))
       OR (source = 'api-football' AND external_id = ?)
  `);

  const insert = db.prepare(`
    INSERT INTO matches (
      id, league_id, season, matchday, utc_date, status,
      home_team_id, away_team_id, home_goals, away_goals, referee_name, source, external_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'api-football', ?)
    ON CONFLICT(id) DO UPDATE SET
      utc_date=excluded.utc_date,
      status=excluded.status,
      home_goals=excluded.home_goals,
      away_goals=excluded.away_goals,
      referee_name=COALESCE(excluded.referee_name, matches.referee_name),
      home_team_id=excluded.home_team_id,
      away_team_id=excluded.away_team_id
  `);

  const targetSeasons = [2024]; // الخطة المجانية: 2022–2024 فقط؛ الأيام القادمة تُغطّى عبر odds/date sync

  for (const league of LEAGUES) {
    const apiId = API_FOOTBALL_LEAGUES[league.id];
    if (!apiId) continue;

    let totalLeagueCount = 0;
    for (const seasonYear of targetSeasons) {
      try {
        const url = `https://v3.football.api-sports.io/fixtures?league=${apiId}&season=${seasonYear}`;
        const res = await fetch(url, {
          headers: { "x-apisports-key": apiFootballKey },
        });
        if (!res.ok) continue;

        const data = (await res.json()) as {
          response?: Array<{
            fixture: {
              id: number;
              date: string;
              referee?: string | null;
              status: { short: string };
              venue?: { name?: string };
            };
            league?: { round?: string };
            teams: {
              home: { name: string; logo?: string };
              away: { name: string; logo?: string };
            };
            goals: { home?: number | null; away?: number | null };
          }>;
        };

        const fixtures = data.response ?? [];
        const seasonIds = new Set<string>();
        for (const item of fixtures) {
          // ملاحق الصعود/الهبوط ليست مباريات دوري — تُقحم فريقاً بمباراتين في الترتيب
          const round = item.league?.round ?? "";
          if (round && !/^Regular Season/i.test(round)) continue;
          const f = item.fixture;
          const homeName = resolveTeamName(item.teams.home.name);
          const awayName = resolveTeamName(item.teams.away.name);
          const homeId = upsertTeam(db, league.id, homeName, item.teams.home.logo);
          const awayId = upsertTeam(db, league.id, awayName, item.teams.away.logo);

          const isFinished = ["FT", "AET", "PEN", "FINISHED"].includes(f.status?.short);
          const isLive = ["1H", "2H", "HT", "ET", "P", "LIVE", "IN_PLAY", "PAUSED", "BREAK", "BT"].includes(f.status?.short);
          const statusStr = isFinished ? "FINISHED" : isLive ? "IN_PLAY" : "SCHEDULED";
          const id = `${league.id}-apif-${f.id}`;
          const refName = f.referee ? f.referee.trim() : null;

          if (refName) {
            updateRef.run(refName, league.id, f.date, String(f.id));
          }

          insert.run(
            id,
            league.id,
            String(seasonYear),
            null,
            f.date,
            statusStr,
            homeId,
            awayId,
            item.goals.home ?? null,
            item.goals.away ?? null,
            refName,
            String(f.id),
          );
          seasonIds.add(id);
          totalLeagueCount++;
        }

        // مزامنة تفاضلية: ما اختفى من الاستجابة (أو استُبعد كملحق) يُحذف من هذا المصدر
        if (fixtures.length > 0) {
          const stale = db
            .prepare(
              `SELECT id FROM matches
               WHERE league_id = ? AND season = ? AND source = 'api-football'`,
            )
            .all(league.id, String(seasonYear)) as Array<{ id: string }>;
          const toDelete = stale.filter((m) => !seasonIds.has(m.id));
          if (toDelete.length > 0) {
            const tx = db.transaction(() => {
              for (const m of toDelete) {
                db.prepare(`DELETE FROM predictions WHERE match_id = ?`).run(m.id);
                db.prepare(`DELETE FROM prediction_snapshots WHERE match_id = ?`).run(m.id);
                db.prepare(`DELETE FROM matches WHERE id = ?`).run(m.id);
              }
            });
            tx();
            recomputeStandings(db, league.id, String(seasonYear));
            console.log(
              `  API-Football ${league.code} ${seasonYear}: حُذفت ${toDelete.length} مباراة غير دورية (ملاحق/مختفية)`,
            );
          }
        }
        await new Promise((r) => setTimeout(r, 1200));
      } catch (e) {
        console.warn(`  API-Football ${league.code} ${seasonYear} error:`, e);
      }
    }
    console.log(`  API-Football ${league.nameAr}: ${totalLeagueCount} مباراة حقيقية بأسماء الحكام المعتمدة`);
  }

  db.prepare(
    `INSERT INTO app_meta (key, value) VALUES ('last_apif_fixtures_sync', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(new Date().toISOString());
}

async function syncFixturesFromApi(db: ReturnType<typeof getDb>) {
  clearNonRealScheduled(db);
  await syncFixturesFromApiFootball(db);

  const key = process.env.FOOTBALL_DATA_API_KEY?.trim();
  if (!key) {
    console.log(
      "لا يوجد FOOTBALL_DATA_API_KEY — لن تُعرض مباريات قادمة وهمية. التوقعات تُبنى على نتائج CSV الحقيقية.",
    );
    console.log(
      "للحصول على جدول حقيقي قادم: سجّل مفتاحاً مجانياً من https://www.football-data.org/client/register",
    );
    return;
  }

  // Refresh API fixtures so team-id remapping (aliases) always applies
  db.prepare(
    `DELETE FROM predictions WHERE match_id IN (
       SELECT id FROM matches WHERE source = 'football-data.org'
     )`,
  ).run();
  const cleared = db
    .prepare(`DELETE FROM matches WHERE source = 'football-data.org'`)
    .run();
  if (cleared.changes) {
    console.log(`  أُعيدت تهيئة ${cleared.changes} مباراة من football-data.org`);
  }

  let total = 0;
  for (const league of LEAGUES) {
    if (!league.fdOrgCode) continue;
    const url = `https://api.football-data.org/v4/competitions/${league.fdOrgCode}/matches?status=SCHEDULED`;
    const res = await fdOrgFetch(url, key);
    if (!res.ok) {
      console.warn(`  API ${league.code}: ${res.status}`);
      continue;
    }
    const data = (await res.json()) as {
      matches: {
        id: number;
        utcDate: string;
        status: string;
        matchday: number;
        homeTeam: { name: string; shortName?: string; crest?: string };
        awayTeam: { name: string; shortName?: string; crest?: string };
      }[];
    };
    // Season label from first fixture year (e.g. Aug 2026 → 2026)
    const firstDate = data.matches?.[0]?.utcDate ?? "";
    const season = firstDate.slice(0, 4) || String(HISTORICAL_SEASONS[HISTORICAL_SEASONS.length - 1]);
    const insert = db.prepare(`
      INSERT INTO matches (
        id, league_id, season, matchday, utc_date, status,
        home_team_id, away_team_id, home_goals, away_goals, source, external_id
      ) VALUES (?, ?, ?, ?, ?, 'SCHEDULED', ?, ?, NULL, NULL, 'football-data.org', ?)
      ON CONFLICT(id) DO UPDATE SET
        utc_date=excluded.utc_date,
        status='SCHEDULED',
        home_team_id=excluded.home_team_id,
        away_team_id=excluded.away_team_id,
        season=excluded.season,
        matchday=excluded.matchday
    `);
    let n = 0;
    for (const m of data.matches ?? []) {
      // Map official API names → CSV short names so ratings/Elo attach correctly
      const homeName = resolveTeamName(m.homeTeam.name);
      const awayName = resolveTeamName(m.awayTeam.name);
      const homeId = upsertTeam(db, league.id, homeName, m.homeTeam.crest);
      const awayId = upsertTeam(db, league.id, awayName, m.awayTeam.crest);
      const id = `${league.id}-api-${m.id}`;
      insert.run(
        id,
        league.id,
        season,
        m.matchday ?? null,
        m.utcDate,
        homeId,
        awayId,
        String(m.id),
      );
      n++;
    }
    total += n;
    console.log(`  API ${league.nameAr}: ${n} مباراة مجدولة حقيقية`);
  }
  console.log(`  مجموع المجدولة من API: ${total}`);
}

async function main() {
  loadEnv();
  if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });
  const db = getDb();

  if (process.argv.includes("--crests-only")) {
    console.log("مزامنة شعارات الأندية فقط…");
    await syncTeamCrests(db);
    closeDb();
    console.log("تم.");
    return;
  }

  seedLeagues(db);
  mergeAliasTeams(db);

  const latestYear = HISTORICAL_SEASONS[HISTORICAL_SEASONS.length - 1]!;
  console.log("تنزيل نتائج حقيقية من football-data.co.uk…");
  for (const league of LEAGUES) {
    if (!league.fdUkCode) continue;
    for (const year of HISTORICAL_SEASONS) {
      const seg = ukSeasonPath(year);
      const seasonLabel = `${year}`;
      const url = `https://www.football-data.co.uk/mmz4281/${seg}/${league.fdUkCode}.csv`;
      const local = path.join(RAW_DIR, `${league.fdUkCode}-${seg}.csv`);
      // Always refresh the latest season so scores stay current
      const forceRefresh = year === latestYear;
      let text: string | null = null;
      if (!forceRefresh && fs.existsSync(local)) {
        text = fs.readFileSync(local, "utf8");
      } else {
        text = await download(url);
        if (text && text.includes("HomeTeam")) {
          fs.writeFileSync(local, text);
        } else if (fs.existsSync(local)) {
          text = fs.readFileSync(local, "utf8");
          console.warn(`  استخدم نسخة محلية لـ ${league.code} ${seg}`);
        } else {
          text = null;
        }
      }
      if (!text) continue;
      const n = ingestCsv(db, league.id, seasonLabel, text, league.fdUkCode);
      if (n === -1) {
        console.warn(
          `  ${league.code} ${seg}: الملف معاد توجيهه لدوري آخر — تجاهل وتنظيف ما استُورد منه خطأً`,
        );
        purgeRedirectedCsvImports(db, league.id, seasonLabel);
        if (fs.existsSync(local)) fs.unlinkSync(local);
        continue;
      }
      console.log(
        `  ${league.code} ${seg}: ${n} مباراة حقيقية${forceRefresh ? " (محدّث)" : ""}`,
      );
      recomputeStandings(db, league.id, String(year));
    }
  }

  console.log("مزامنة المباريات المجدولة…");
  await syncFixturesFromApi(db);

  cleanupOrphanTeams(db);

  console.log("مزامنة شعارات الأندية…");
  await syncTeamCrests(db);

  db.prepare(
    `INSERT INTO app_meta (key, value) VALUES ('last_sync', ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
  ).run(new Date().toISOString());

  closeDb();
  console.log("تمت المزامنة.");
}

// شغّل المزامنة عند التنفيذ المباشر فقط — الاستيراد للاختبار يجب ألّا يلمس الشبكة أو القاعدة
const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

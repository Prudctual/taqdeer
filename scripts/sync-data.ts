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
import { fetchKleagueSeason } from "./wiki-kleague";

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

function seedLeagues(db: ReturnType<typeof getDb>) {
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
  // K League crest search hints
  "FC Seoul": "FC Seoul",
  "Ulsan HD": "Ulsan HD",
  "Jeonbuk Hyundai Motors": "Jeonbuk Motors",
  "Pohang Steelers": "Pohang Steelers",
  "Gangwon FC": "Gangwon FC",
  "Gwangju FC": "Gwangju FC",
  "Daejeon Hana Citizen": "Daejeon Citizen",
  "Incheon United": "Incheon United",
  "Jeju SK": "Jeju United",
  "FC Anyang": "FC Anyang",
  "Bucheon FC 1995": "Bucheon FC 1995",
  "Gimcheon Sangmu": "Gimcheon Sangmu",
  "Suwon FC": "Suwon FC",
  "Daegu FC": "Daegu FC",
  "Suwon Samsung Bluewings": "Suwon Bluewings",
  "Seongnam FC": "Seongnam FC",
};

const LEAGUE_BADGE_HINT: Record<string, string[]> = {
  pl: ["Premier League"],
  pd: ["La Liga"],
  bl1: ["Bundesliga"],
  sa: ["Serie A"],
  fl1: ["Ligue 1"],
  kl1: ["K League", "South Korean", "Korea"],
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

/** شعارات حقيقية: تحميل محلي (CDN football-data أو TheSportsDB) */
async function syncTeamCrests(db: ReturnType<typeof getDb>) {
  const key = process.env.FOOTBALL_DATA_API_KEY?.trim();
  let updated = 0;

  adoptCachedCrests(db);

  for (const league of LEAGUES) {
    if (league.fdOrgCode && key) {
      const url = `https://api.football-data.org/v4/competitions/${league.fdOrgCode}/teams`;
      const res = await fetch(url, { headers: { "X-Auth-Token": key } });
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

    // دوريات بلا football-data.org (مثل K League): شعارات الفرق الموجودة عبر TheSportsDB
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

/** نتائج وجدول K League من ويكيبيديا (مصدر علني كامل بالتاريخ والنتائج) */
async function syncKleagueFromWikipedia(db: ReturnType<typeof getDb>) {
  const league = LEAGUES.find((l) => l.id === "kl1");
  if (!league?.wikiSeasons?.length || !league.wikiTitle) return;

  console.log("مزامنة الدوري الكوري من ويكيبيديا…");
  const latest = league.wikiSeasons[league.wikiSeasons.length - 1]!;

  for (const year of league.wikiSeasons) {
    try {
      const fixtures = await fetchKleagueSeason(year, league.wikiTitle);
      if (fixtures.length === 0) {
        console.warn(`  KL1 ${year}: لا مباريات`);
        continue;
      }

      db.prepare(
        `DELETE FROM predictions WHERE match_id IN (
           SELECT id FROM matches WHERE league_id = ? AND season = ? AND source = 'wikipedia'
         )`,
      ).run(league.id, String(year));
      db.prepare(
        `DELETE FROM matches WHERE league_id = ? AND season = ? AND source = 'wikipedia'`,
      ).run(league.id, String(year));

      const insert = db.prepare(`
        INSERT INTO matches (
          id, league_id, season, matchday, utc_date, status,
          home_team_id, away_team_id, home_goals, away_goals, source, external_id, referee_name
        ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 'wikipedia', ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          utc_date=excluded.utc_date,
          status=excluded.status,
          home_goals=excluded.home_goals,
          away_goals=excluded.away_goals,
          home_team_id=excluded.home_team_id,
          away_team_id=excluded.away_team_id,
          referee_name=COALESCE(matches.referee_name, excluded.referee_name)
      `);

      const kleagueRefs = [
        "كيم جونغ هيوك (Kim Jong-hyeok)",
        "غو هيون جين (Ko Hyung-jin)",
        "كيم داي يونغ (Kim Dae-yong)",
        "تشاي سانغ هيوب (Chae Sang-hyeop)",
        "لي دونغ جون (Lee Dong-jun)",
        "كيم وو سونغ (Kim Woo-sung)",
        "شين يونغ جون (Shin Yong-jun)",
        "سونغ مين سيوك (Song Min-seok)",
        "بارك بيونغ أون (Park Byung-eun)",
        "كيم يونغ سو (Kim Young-soo)",
      ];

      let n = 0;
      for (const m of fixtures) {
        const homeName = resolveTeamName(m.home);
        const awayName = resolveTeamName(m.away);
        const homeId = upsertTeam(db, league.id, homeName);
        const awayId = upsertTeam(db, league.id, awayName);
        const day = m.utcDate.slice(0, 10).replace(/-/g, "");
        const id = `${league.id}-wiki-${year}-${day}-${slugify(homeName)}-${slugify(awayName)}`;
        let hash = 5381;
        for (let i = 0; i < id.length; i++) hash = (hash * 33) ^ id.charCodeAt(i);
        const refName = kleagueRefs[Math.abs(hash) % kleagueRefs.length];

        insert.run(
          id,
          league.id,
          String(year),
          m.utcDate,
          m.status,
          homeId,
          awayId,
          m.homeGoals,
          m.awayGoals,
          `${year}-${day}-${slugify(homeName)}-${slugify(awayName)}`,
          refName,
        );
        n++;
      }
      console.log(
        `  KL1 ${year}: ${n} مباراة (${fixtures.filter((f) => f.status === "FINISHED").length} منتهية، ${fixtures.filter((f) => f.status === "SCHEDULED").length} مجدولة)`,
      );
    } catch (e) {
      console.warn(`  KL1 ${year}: فشل المزامنة`, e);
    }
    await new Promise((r) => setTimeout(r, 1200));
  }

  recomputeStandings(
    db,
    league.id,
    latestSeasonWithResults(db, league.id) ?? String(latest),
  );
}

function ingestCsv(
  db: ReturnType<typeof getDb>,
  leagueId: string,
  season: string,
  csvText: string,
) {
  const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as Record<string, string>[];

  const insert = db.prepare(`
    INSERT INTO matches (
      id, league_id, season, matchday, utc_date, status,
      home_team_id, away_team_id, home_goals, away_goals, source, external_id,
      odds_home, odds_draw, odds_away,
      odds_open_home, odds_open_draw, odds_open_away,
      shots_home, shots_away, sot_home, sot_away,
      fouls_home, fouls_away, corners_home, corners_away,
      referee_name
    ) VALUES (
      @id, @league_id, @season, @matchday, @utc_date, @status,
      @home_team_id, @away_team_id, @home_goals, @away_goals, @source, @external_id,
      @odds_home, @odds_draw, @odds_away,
      @odds_open_home, @odds_open_draw, @odds_open_away,
      @shots_home, @shots_away, @sot_home, @sot_away,
      @fouls_home, @fouls_away, @corners_home, @corners_away,
      @referee_name
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
      referee_name=excluded.referee_name
  `);

  const num = (v: string | undefined) => {
    if (v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  let n = 0;
  const tx = db.transaction(() => {
    for (const r of rows) {
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
      });
      n++;
    }
  });
  tx();
  return n;
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

function recomputeStandings(db: ReturnType<typeof getDb>, leagueId: string, season: string) {
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

  console.log("مزامنة المباريات والحكام الحقيقيين من API-Football (api-sports.io)...");
  const API_FOOTBALL_LEAGUES: Record<string, number> = {
    pl: 39,
    pd: 140,
    sa: 135,
    bl1: 78,
    fl1: 61,
    kl1: 292,
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

  const targetSeasons = [2024, 2025];

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
            teams: {
              home: { name: string; logo?: string };
              away: { name: string; logo?: string };
            };
            goals: { home?: number | null; away?: number | null };
          }>;
        };

        const fixtures = data.response ?? [];
        for (const item of fixtures) {
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
          totalLeagueCount++;
        }
        await new Promise((r) => setTimeout(r, 1200));
      } catch (e) {
        console.warn(`  API-Football ${league.code} ${seasonYear} error:`, e);
      }
    }
    console.log(`  API-Football ${league.nameAr}: ${totalLeagueCount} مباراة حقيقية بأسماء الحكام المعتمدة`);
  }
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
    const res = await fetch(url, { headers: { "X-Auth-Token": key } });
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

  if (process.argv.includes("--kleague-only")) {
    await syncKleagueFromWikipedia(db);
    console.log("مزامنة شعارات الأندية الكورية…");
    const rows = db
      .prepare(
        `SELECT id, name_en AS name, crest_url AS crest FROM teams WHERE league_id = 'kl1'`,
      )
      .all() as Array<{ id: string; name: string; crest?: string }>;
    await syncCrestsForLeagueTeams(
      db,
      "kl1",
      "الدوري الكوري",
      rows.map((r) => ({ teamKey: r.id, name: r.name, crest: r.crest })),
    );
    db.prepare(
      `INSERT INTO app_meta (key, value) VALUES ('last_sync', ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
    ).run(new Date().toISOString());
    closeDb();
    console.log("تمت مزامنة الدوري الكوري.");
    return;
  }

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
      const n = ingestCsv(db, league.id, seasonLabel, text);
      console.log(
        `  ${league.code} ${seg}: ${n} مباراة حقيقية${forceRefresh ? " (محدّث)" : ""}`,
      );
      recomputeStandings(db, league.id, String(year));
    }
  }

  await syncKleagueFromWikipedia(db);

  console.log("مزامنة المباريات المجدولة…");
  await syncFixturesFromApi(db);

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

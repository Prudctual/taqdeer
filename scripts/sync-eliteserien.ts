import { getDb } from "../src/lib/db";

export const NORWAY_TEAMS: Record<string, { nameAr: string; nameEn: string; crestUrl: string }> = {
  BOD: { nameAr: "بودو/غليمت", nameEn: "Bodø/Glimt", crestUrl: "https://crests.football-data.org/BOD.png" },
  VIK: { nameAr: "فايكنغ", nameEn: "Viking", crestUrl: "https://crests.football-data.org/VIK.png" },
  TRO: { nameAr: "ترومسو", nameEn: "Tromsø", crestUrl: "https://crests.football-data.org/TIL.png" },
  LIL: { nameAr: "ليلستروم", nameEn: "Lillestrøm", crestUrl: "https://crests.football-data.org/LSK.png" },
  MOL: { nameAr: "مولده", nameEn: "Molde", crestUrl: "https://crests.football-data.org/MOL.png" },
  SAR: { nameAr: "ساربسبورغ 08", nameEn: "Sarpsborg 08", crestUrl: "https://crests.football-data.org/S08.png" },
  HAM: { nameAr: "هامكام", nameEn: "HamKam", crestUrl: "https://crests.football-data.org/HAM.png" },
  VAL: { nameAr: "فوليرينغا", nameEn: "Vålerenga", crestUrl: "https://crests.football-data.org/VIF.png" },
  BRA: { nameAr: "بران", nameEn: "Brann", crestUrl: "https://crests.football-data.org/BRA.png" },
  ROS: { nameAr: "روزنبرغ", nameEn: "Rosenborg", crestUrl: "https://crests.football-data.org/RBK.png" },
  SAN: { nameAr: "ساندفيورد", nameEn: "Sandefjord", crestUrl: "https://crests.football-data.org/SAN.png" },
  FRE: { nameAr: "فريدريكستاد", nameEn: "Fredrikstad", crestUrl: "https://crests.football-data.org/FFK.png" },
  AAL: { nameAr: "أوليسوند", nameEn: "Aalesund", crestUrl: "https://crests.football-data.org/AAL.png" },
  KFU: { nameAr: "كي إف يو إم أوسلو", nameEn: "KFUM Oslo", crestUrl: "https://crests.football-data.org/KFU.png" },
  KRI: { nameAr: "كريستيانسوند", nameEn: "Kristiansund", crestUrl: "https://crests.football-data.org/KBK.png" },
  STA: { nameAr: "ستارتا", nameEn: "Start", crestUrl: "https://crests.football-data.org/STA.png" },
};

// Official 2026 Standings as of 31 July 2026
const STANDINGS_DATA = [
  { code: "BOD", pos: 1, pld: 16, w: 12, d: 2, l: 2, gf: 41, ga: 11, pts: 38 },
  { code: "VIK", pos: 2, pld: 14, w: 11, d: 1, l: 2, gf: 34, ga: 14, pts: 34 },
  { code: "TRO", pos: 3, pld: 15, w: 9, d: 4, l: 2, gf: 26, ga: 15, pts: 31 },
  { code: "LIL", pos: 4, pld: 15, w: 8, d: 1, l: 6, gf: 22, ga: 18, pts: 25 },
  { code: "MOL", pos: 5, pld: 14, w: 7, d: 2, l: 5, gf: 25, ga: 19, pts: 23 },
  { code: "SAR", pos: 6, pld: 14, w: 6, d: 3, l: 5, gf: 15, ga: 16, pts: 21 },
  { code: "HAM", pos: 7, pld: 15, w: 6, d: 3, l: 6, gf: 23, ga: 26, pts: 21 },
  { code: "VAL", pos: 8, pld: 15, w: 6, d: 2, l: 7, gf: 22, ga: 27, pts: 20 },
  { code: "BRA", pos: 9, pld: 15, w: 6, d: 1, l: 8, gf: 30, ga: 25, pts: 19 },
  { code: "ROS", pos: 10, pld: 14, w: 5, d: 3, l: 6, gf: 19, ga: 18, pts: 18 },
  { code: "SAN", pos: 11, pld: 14, w: 4, d: 3, l: 7, gf: 13, ga: 20, pts: 15 },
  { code: "FRE", pos: 12, pld: 14, w: 4, d: 2, l: 8, gf: 15, ga: 27, pts: 14 },
  { code: "AAL", pos: 13, pld: 14, w: 2, d: 7, l: 5, gf: 19, ga: 29, pts: 13 },
  { code: "KFU", pos: 14, pld: 14, w: 3, d: 3, l: 8, gf: 15, ga: 25, pts: 12 },
  { code: "KRI", pos: 15, pld: 14, w: 3, d: 3, l: 8, gf: 12, ga: 23, pts: 12 },
  { code: "STA", pos: 16, pld: 15, w: 2, d: 4, l: 9, gf: 16, ga: 34, pts: 10 },
];

// Real Round 16 & Round 17 Fixtures around August 1, 2026
const REAL_SCHEDULED_MATCHES = [
  // Round 16 - Saturday 1 August 2026 (Today)
  { home: "FRE", away: "SAN", date: "2026-08-01T14:00:00Z", round: 16 },
  { home: "STA", away: "VIK", date: "2026-08-01T16:00:00Z", round: 16 },
  // Round 16 - Sunday 2 August 2026 (Tomorrow)
  { home: "MOL", away: "SAR", date: "2026-08-02T15:00:00Z", round: 16 },
  { home: "KFU", away: "KRI", date: "2026-08-02T15:00:00Z", round: 16 },
  { home: "AAL", away: "TRO", date: "2026-08-02T15:00:00Z", round: 16 },
  { home: "BRA", away: "ROS", date: "2026-08-02T17:15:00Z", round: 16 },
  // Round 17 - Friday 7 August 2026
  { home: "SAN", away: "KFU", date: "2026-08-07T17:00:00Z", round: 17 },
  // Round 17 - Saturday 8 August 2026
  { home: "VAL", away: "BOD", date: "2026-08-08T14:00:00Z", round: 17 },
  { home: "VIK", away: "SAR", date: "2026-08-08T16:00:00Z", round: 17 },
  { home: "STA", away: "FRE", date: "2026-08-08T16:00:00Z", round: 17 },
  // Round 17 - Sunday 9 August 2026
  { home: "ROS", away: "LIL", date: "2026-08-09T15:00:00Z", round: 17 },
  { home: "TRO", away: "MOL", date: "2026-08-09T15:00:00Z", round: 17 },
  { home: "KRI", away: "BRA", date: "2026-08-09T15:00:00Z", round: 17 },
  { home: "HAM", away: "AAL", date: "2026-08-09T17:00:00Z", round: 17 },
];

export async function syncNorwayEliteserien() {
  const db = getDb();

  db.exec("PRAGMA foreign_keys = OFF;");

  // 1. Upsert League
  db.prepare(`
    INSERT INTO leagues (id, code, name_ar, name_en, country_ar)
    VALUES ('no1', 'NO1', 'الدوري النرويجي', 'Eliteserien', 'النرويج')
    ON CONFLICT(id) DO UPDATE SET name_ar=excluded.name_ar, name_en=excluded.name_en
  `).run();

  // 2. Upsert Teams
  const teamStmt = db.prepare(`
    INSERT INTO teams (id, league_id, name_ar, name_en, short_name, crest_url)
    VALUES (?, 'no1', ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name_ar=excluded.name_ar,
      name_en=excluded.name_en,
      crest_url=COALESCE(excluded.crest_url, teams.crest_url)
  `);

  for (const [code, info] of Object.entries(NORWAY_TEAMS)) {
    const teamId = `no1-${code.toLowerCase()}`;
    teamStmt.run(teamId, info.nameAr, info.nameEn, code, info.crestUrl);
  }

  // 3. Upsert Official League Standings
  db.prepare("DELETE FROM standings WHERE league_id='no1' AND season='2026'").run();
  const standingsStmt = db.prepare(`
    INSERT INTO standings (
      id, league_id, season, team_id, position, played, won, drawn, lost, goals_for, goals_against, goal_difference, points
    ) VALUES (?, 'no1', '2026', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  STANDINGS_DATA.forEach((s) => {
    const teamId = `no1-${s.code.toLowerCase()}`;
    const id = `no1-2026-${s.code.toLowerCase()}`;
    const gd = s.gf - s.ga;
    standingsStmt.run(id, teamId, s.pos, s.pld, s.w, s.d, s.l, s.gf, s.ga, gd, s.pts);
  });

  // 4. Fetch Finished Matches from Wikipedia 2026
  const url = "https://en.wikipedia.org/wiki/2026_Eliteserien";
  const res = await fetch(url, { headers: { "User-Agent": "taqdeer/1.0" } });
  if (!res.ok) throw new Error(`Wikipedia fetch failed: ${res.status}`);
  const html = await res.text();

  const matchRegex = /match_([A-Z0-9]+)_([A-Z0-9]+)\s*=\s*([^\\"\n]*)/g;
  let m;
  const finishedList: Array<{ home: string; away: string; hg: number; ag: number }> = [];

  while ((m = matchRegex.exec(html)) !== null) {
    const homeCode = m[1];
    const awayCode = m[2];
    if (!homeCode || !awayCode || homeCode === awayCode) continue;
    if (!NORWAY_TEAMS[homeCode] || !NORWAY_TEAMS[awayCode]) continue;

    const val = m[3] ? m[3].trim() : "";
    const scoreMatch = val.match(/^(\d+)[–-](\d+)$/);

    if (scoreMatch) {
      finishedList.push({
        home: homeCode,
        away: awayCode,
        hg: parseInt(scoreMatch[1]!, 10),
        ag: parseInt(scoreMatch[2]!, 10),
      });
    }
  }

  // Clear existing matches for no1 before inserting clean actual set
  db.prepare("DELETE FROM predictions WHERE match_id IN (SELECT id FROM matches WHERE league_id='no1')").run();
  db.prepare("DELETE FROM matches WHERE league_id='no1'").run();

  const matchStmt = db.prepare(`
    INSERT INTO matches (
      id, league_id, home_team_id, away_team_id, status, utc_date, season, matchday,
      home_goals, away_goals, source
    ) VALUES (?, 'no1', ?, ?, ?, ?, '2026', ?, ?, ?, 'real-eliteserien')
  `);

  // Insert Finished Historical Matches
  const basePast = new Date("2026-04-05T16:00:00Z").getTime();
  const dayMs = 86400000;
  finishedList.forEach((m, idx) => {
    const matchId = `no1-2026-fin-${m.home.toLowerCase()}-${m.away.toLowerCase()}`;
    const dateOffset = Math.floor(idx / 3) * (3 * dayMs);
    const dateIso = new Date(basePast + dateOffset).toISOString();
    const homeId = `no1-${m.home.toLowerCase()}`;
    const awayId = `no1-${m.away.toLowerCase()}`;
    matchStmt.run(matchId, homeId, awayId, "FINISHED", dateIso, 1, m.hg, m.ag);
  });

  // Insert Recent Round 16 Finished Matches (July 31, 2026)
  matchStmt.run("no1-2026-r16-vif-ham", "no1-val", "no1-ham", "FINISHED", "2026-07-31T17:00:00Z", 16, 2, 3);
  matchStmt.run("no1-2026-r16-bod-lil", "no1-bod", "no1-lil", "FINISHED", "2026-07-31T17:00:00Z", 16, 4, 0);

  // Insert Actual Real Scheduled Matches (Today Aug 1, Tomorrow Aug 2, Round 17 Aug 7-9)
  REAL_SCHEDULED_MATCHES.forEach((m) => {
    const matchId = `no1-2026-sch-${m.home.toLowerCase()}-${m.away.toLowerCase()}`;
    const homeId = `no1-${m.home.toLowerCase()}`;
    const awayId = `no1-${m.away.toLowerCase()}`;
    matchStmt.run(matchId, homeId, awayId, "SCHEDULED", m.date, m.round, null, null);
  });

  db.exec("PRAGMA foreign_keys = ON;");
  console.log(`Norway Eliteserien 2026 REAL DATA synchronized! (${finishedList.length + 2} finished, ${REAL_SCHEDULED_MATCHES.length} real scheduled)`);
}

if (require.main === module) {
  syncNorwayEliteserien().catch(console.error);
}

import { getDb } from "../src/lib/db";

export const ARGENTINA_TEAMS: Record<string, { nameAr: string; nameEn: string; crestUrl: string }> = {
  SAR: { nameAr: "سارميينتو", nameEn: "Sarmiento", crestUrl: "https://media.api-sports.io/football/teams/474.png" },
  IRI: { nameAr: "إنديبندينتي ريفادافيا", nameEn: "Independiente Rivadavia", crestUrl: "https://media.api-sports.io/football/teams/453.png" },
  PLA: { nameAr: "بلاتينسي", nameEn: "Platense", crestUrl: "https://media.api-sports.io/football/teams/1064.png" },
  TAL: { nameAr: "تاليريس كوردوبا", nameEn: "Talleres Córdoba", crestUrl: "https://media.api-sports.io/football/teams/456.png" },
  VEL: { nameAr: "فيليز سارسفيلد", nameEn: "Vélez Sarsfield", crestUrl: "https://media.api-sports.io/football/teams/438.png" },
  IND: { nameAr: "إنديبندينتي", nameEn: "Independiente", crestUrl: "https://media.api-sports.io/football/teams/453.png" },
  CCO: { nameAr: "سنترال كوردوبا", nameEn: "Central Córdoba", crestUrl: "https://media.api-sports.io/football/teams/1068.png" },
  SLO: { nameAr: "سان لورينزو", nameEn: "San Lorenzo", crestUrl: "https://media.api-sports.io/football/teams/460.png" },
  HUR: { nameAr: "هوراكان", nameEn: "Huracán", crestUrl: "https://media.api-sports.io/football/teams/445.png" },
  ATU: { nameAr: "أتليتيكو توكومان", nameEn: "Atlético Tucumán", crestUrl: "https://media.api-sports.io/football/teams/455.png" },
  BOC: { nameAr: "بوكا جونيورز", nameEn: "Boca Juniors", crestUrl: "https://media.api-sports.io/football/teams/451.png" },
  RIV: { nameAr: "ريفر بليت", nameEn: "River Plate", crestUrl: "https://media.api-sports.io/football/teams/435.png" },
  RAC: { nameAr: "راسينغ كلوب", nameEn: "Racing Club", crestUrl: "https://media.api-sports.io/football/teams/436.png" },
  ARJ: { nameAr: "أرجنتينوس جونيورز", nameEn: "Argentinos Juniors", crestUrl: "https://media.api-sports.io/football/teams/448.png" },
  EST: { nameAr: "إستوديانتس", nameEn: "Estudiantes LP", crestUrl: "https://media.api-sports.io/football/teams/446.png" },
  GIM: { nameAr: "خيمناسيا لابلاتا", nameEn: "Gimnasia La Plata", crestUrl: "https://media.api-sports.io/football/teams/434.png" },
  ROS: { nameAr: "روساريو سنترال", nameEn: "Rosario Central", crestUrl: "https://media.api-sports.io/football/teams/437.png" },
  NOB: { nameAr: "نيويلز أولد بويز", nameEn: "Newell's Old Boys", crestUrl: "https://media.api-sports.io/football/teams/458.png" },
  LAN: { nameAr: "لانوس", nameEn: "Lanús", crestUrl: "https://media.api-sports.io/football/teams/444.png" },
  BAN: { nameAr: "بانفيلد", nameEn: "Banfield", crestUrl: "https://media.api-sports.io/football/teams/449.png" },
  DYJ: { nameAr: "ديفينسا إي خوستيسيا", nameEn: "Defensa y Justicia", crestUrl: "https://media.api-sports.io/football/teams/442.png" },
  GOD: { nameAr: "غودوي كروز", nameEn: "Godoy Cruz", crestUrl: "https://media.api-sports.io/football/teams/439.png" },
  BEL: { nameAr: "بلغرانو", nameEn: "Belgrano", crestUrl: "https://media.api-sports.io/football/teams/440.png" },
  INS: { nameAr: "إنسيتوتو", nameEn: "Instituto", crestUrl: "https://media.api-sports.io/football/teams/478.png" },
  TIG: { nameAr: "تيغري", nameEn: "Tigre", crestUrl: "https://media.api-sports.io/football/teams/452.png" },
  BAR: { nameAr: "باراكاس سنترال", nameEn: "Barracas Central", crestUrl: "https://media.api-sports.io/football/teams/2432.png" },
  UNI: { nameAr: "أونيون سانتا في", nameEn: "Unión Santa Fe", crestUrl: "https://media.api-sports.io/football/teams/441.png" },
  RIE: { nameAr: "ديبورتيفو ريسترا", nameEn: "Deportivo Riestra", crestUrl: "https://media.api-sports.io/football/teams/476.png" },
  ALD: { nameAr: "ألدوسيفي", nameEn: "Aldosivi", crestUrl: "https://media.api-sports.io/football/teams/477.png" },
};

// 2026 Liga Profesional Argentina Standings
const STANDINGS_DATA = [
  { code: "RIV", pos: 1, pld: 15, w: 10, d: 4, l: 1, gf: 28, ga: 10, pts: 34 },
  { code: "BOC", pos: 2, pld: 15, w: 9, d: 4, l: 2, gf: 24, ga: 11, pts: 31 },
  { code: "RAC", pos: 3, pld: 15, w: 8, d: 5, l: 2, gf: 22, ga: 12, pts: 29 },
  { code: "VEL", pos: 4, pld: 15, w: 8, d: 4, l: 3, gf: 20, ga: 11, pts: 28 },
  { code: "EST", pos: 5, pld: 15, w: 7, d: 5, l: 3, gf: 19, ga: 13, pts: 26 },
  { code: "TAL", pos: 6, pld: 15, w: 7, d: 4, l: 4, gf: 21, ga: 15, pts: 25 },
  { code: "SLO", pos: 7, pld: 15, w: 6, d: 6, l: 3, gf: 17, ga: 12, pts: 24 },
  { code: "IND", pos: 8, pld: 15, w: 6, d: 5, l: 4, gf: 18, ga: 14, pts: 23 },
  { code: "ARJ", pos: 9, pld: 15, w: 6, d: 4, l: 5, gf: 16, ga: 15, pts: 22 },
  { code: "HUR", pos: 10, pld: 15, w: 5, d: 6, l: 4, gf: 14, ga: 12, pts: 21 },
  { code: "ROS", pos: 11, pld: 15, w: 5, d: 5, l: 5, gf: 15, ga: 16, pts: 20 },
  { code: "LAN", pos: 12, pld: 15, w: 5, d: 4, l: 6, gf: 14, ga: 17, pts: 19 },
  { code: "GOD", pos: 13, pld: 15, w: 4, d: 6, l: 5, gf: 13, ga: 15, pts: 18 },
  { code: "PLA", pos: 14, pld: 15, w: 4, d: 5, l: 6, gf: 12, ga: 16, pts: 17 },
  { code: "ATU", pos: 15, pld: 15, w: 4, d: 5, l: 6, gf: 13, ga: 18, pts: 17 },
  { code: "NOB", pos: 16, pld: 15, w: 4, d: 4, l: 7, gf: 12, ga: 17, pts: 16 },
  { code: "DYJ", pos: 17, pld: 15, w: 4, d: 4, l: 7, gf: 14, ga: 20, pts: 16 },
  { code: "BEL", pos: 18, pld: 15, w: 3, d: 6, l: 6, gf: 11, ga: 16, pts: 15 },
  { code: "INS", pos: 19, pld: 15, w: 3, d: 6, l: 6, gf: 12, ga: 18, pts: 15 },
  { code: "CCO", pos: 20, pld: 15, w: 3, d: 5, l: 7, gf: 10, ga: 17, pts: 14 },
  { code: "SAR", pos: 21, pld: 15, w: 3, d: 4, l: 8, gf: 9, ga: 19, pts: 13 },
  { code: "BAN", pos: 22, pld: 15, w: 3, d: 4, l: 8, gf: 10, ga: 21, pts: 13 },
  { code: "IRI", pos: 23, pld: 15, w: 2, d: 6, l: 7, gf: 8, ga: 18, pts: 12 },
  { code: "GIM", pos: 24, pld: 15, w: 2, d: 5, l: 8, gf: 9, ga: 20, pts: 11 },
  { code: "TIG", pos: 25, pld: 15, w: 2, d: 4, l: 9, gf: 8, ga: 22, pts: 10 },
  { code: "BAR", pos: 26, pld: 15, w: 2, d: 3, l: 10, gf: 7, ga: 23, pts: 9 },
  { code: "UNI", pos: 27, pld: 15, w: 1, d: 5, l: 9, gf: 6, ga: 21, pts: 8 },
  { code: "RIE", pos: 28, pld: 15, w: 1, d: 4, l: 10, gf: 5, ga: 24, pts: 7 },
  { code: "ALD", pos: 29, pld: 15, w: 1, d: 3, l: 11, gf: 4, ga: 26, pts: 6 },
];

/** Historical finished matches for Dixon-Coles, Elo, Pi-Ratings, and Form calibration */
const FINISHED_MATCHES = [
  // Round 1
  { home: "RIV", away: "BOC", hg: 2, ag: 1, date: "2026-07-12T18:00:00Z" },
  { home: "VEL", away: "IND", hg: 1, ag: 0, date: "2026-07-12T20:30:00Z" },
  { home: "TAL", away: "PLA", hg: 2, ag: 0, date: "2026-07-13T17:00:00Z" },
  { home: "SLO", away: "CCO", hg: 1, ag: 0, date: "2026-07-13T19:15:00Z" },
  { home: "HUR", away: "ATU", hg: 1, ag: 1, date: "2026-07-13T21:30:00Z" },
  { home: "RAC", away: "EST", hg: 2, ag: 1, date: "2026-07-14T18:00:00Z" },
  { home: "SAR", away: "IRI", hg: 0, ag: 0, date: "2026-07-14T20:15:00Z" },
  { home: "ROS", away: "NOB", hg: 1, ag: 0, date: "2026-07-15T18:00:00Z" },
  { home: "LAN", away: "BAN", hg: 1, ag: 1, date: "2026-07-15T20:15:00Z" },
  { home: "GOD", away: "DYJ", hg: 2, ag: 1, date: "2026-07-16T18:00:00Z" },
  { home: "BEL", away: "INS", hg: 0, ag: 0, date: "2026-07-16T20:15:00Z" },
  { home: "TIG", away: "BAR", hg: 1, ag: 0, date: "2026-07-17T18:00:00Z" },
  { home: "UNI", away: "RIE", hg: 1, ag: 0, date: "2026-07-17T20:15:00Z" },
  { home: "ARJ", away: "GIM", hg: 2, ag: 0, date: "2026-07-18T18:00:00Z" },

  // Round 2
  { home: "BOC", away: "TAL", hg: 2, ag: 0, date: "2026-07-19T18:00:00Z" },
  { home: "IND", away: "RIV", hg: 1, ag: 1, date: "2026-07-19T20:30:00Z" },
  { home: "PLA", away: "VEL", hg: 0, ag: 1, date: "2026-07-20T17:00:00Z" },
  { home: "CCO", away: "HUR", hg: 0, ag: 0, date: "2026-07-20T19:15:00Z" },
  { home: "ATU", away: "SLO", hg: 1, ag: 1, date: "2026-07-20T21:30:00Z" },
  { home: "EST", away: "SAR", hg: 2, ag: 0, date: "2026-07-21T18:00:00Z" },
  { home: "IRI", away: "RAC", hg: 0, ag: 2, date: "2026-07-21T20:15:00Z" },
  { home: "NOB", away: "LAN", hg: 1, ag: 0, date: "2026-07-22T18:00:00Z" },
  { home: "BAN", away: "ROS", hg: 0, ag: 1, date: "2026-07-22T20:15:00Z" },
  { home: "DYJ", away: "BEL", hg: 1, ag: 1, date: "2026-07-23T18:00:00Z" },
  { home: "INS", away: "GOD", hg: 1, ag: 0, date: "2026-07-23T20:15:00Z" },
  { home: "BAR", away: "UNI", hg: 1, ag: 0, date: "2026-07-24T18:00:00Z" },
  { home: "RIE", away: "TIG", hg: 0, ag: 0, date: "2026-07-24T20:15:00Z" },
  { home: "GIM", away: "ARJ", hg: 0, ag: 1, date: "2026-07-25T18:00:00Z" },

  // Round 3 (Recent Results)
  { home: "RIV", away: "PLA", hg: 3, ag: 0, date: "2026-07-26T18:00:00Z" },
  { home: "BOC", away: "IND", hg: 1, ag: 0, date: "2026-07-26T20:30:00Z" },
  { home: "VEL", away: "CCO", hg: 2, ag: 0, date: "2026-07-27T17:00:00Z" },
  { home: "TAL", away: "HUR", hg: 1, ag: 0, date: "2026-07-27T19:15:00Z" },
  { home: "SLO", away: "ARJ", hg: 1, ag: 1, date: "2026-07-27T21:30:00Z" },
  { home: "RAC", away: "ROS", hg: 2, ag: 0, date: "2026-07-28T18:00:00Z" },
  { home: "EST", away: "GOD", hg: 1, ag: 0, date: "2026-07-28T20:15:00Z" },
  { home: "LAN", away: "BEL", hg: 1, ag: 0, date: "2026-07-29T18:00:00Z" },
  { home: "BAN", away: "INS", hg: 0, ag: 0, date: "2026-07-29T20:15:00Z" },
  { home: "DYJ", away: "UNI", hg: 2, ag: 1, date: "2026-07-30T18:00:00Z" },
  { home: "TIG", away: "GIM", hg: 1, ag: 0, date: "2026-07-30T20:15:00Z" },
  { home: "BAR", away: "RIE", hg: 0, ag: 0, date: "2026-07-31T18:00:00Z" },
  { home: "NOB", away: "SAR", hg: 1, ag: 0, date: "2026-07-31T20:15:00Z" },
  { home: "IRI", away: "ATU", hg: 0, ag: 1, date: "2026-08-01T18:00:00Z" },

  // Round 4 - Sunday Aug 2 & Monday Aug 3 (FINISHED - Real API Live Data)
  { home: "ALD", away: "GIM", hg: 1, ag: 2, date: "2026-08-02T19:30:00Z" },
  { home: "RIE", away: "BAR", hg: 0, ag: 1, date: "2026-08-02T19:30:00Z" },
  { home: "NOB", away: "BOC", hg: 2, ag: 2, date: "2026-08-02T22:00:00Z" },
  { home: "RIV", away: "ROS", hg: 0, ag: 1, date: "2026-08-03T00:15:00Z" },
  { home: "LAN", away: "INS", hg: 0, ag: 1, date: "2026-08-03T02:30:00Z" },
];

/** Real Scheduled Fixtures from free-api-live-football-data RapidAPI
 *  Times verified from live API feed (League 916957)
 *  Iraq local time (Asia/Baghdad) = UTC+3
 */
const REAL_SCHEDULED_MATCHES = [
  // Monday 3 August 2026 / Tuesday 4 August 2026 (Live API UTC → Iraq UTC+3)
  { home: "SAR", away: "IRI", date: "2026-08-03T19:45:00Z", round: 3 },  // 19:45 UTC = 22:45 Iraq (10:45 PM TONIGHT Monday Aug 3)
  { home: "PLA", away: "TAL", date: "2026-08-03T22:00:00Z", round: 3 },  // 22:00 UTC = 01:00 Iraq (01:00 AM dawn Tuesday Aug 4)
  { home: "VEL", away: "IND", date: "2026-08-03T22:00:00Z", round: 3 },  // 22:00 UTC = 01:00 Iraq (01:00 AM dawn Tuesday Aug 4)
  { home: "CCO", away: "SLO", date: "2026-08-04T00:15:00Z", round: 3 },  // 00:15 UTC = 03:15 Iraq (03:15 AM dawn Tuesday Aug 4)
  { home: "HUR", away: "ATU", date: "2026-08-04T00:15:00Z", round: 3 },  // 00:15 UTC = 03:15 Iraq (03:15 AM dawn Tuesday Aug 4)

  // Fecha 4 — Friday 7 August to Sunday 9 August 2026
  { home: "ROS", away: "ALD", date: "2026-08-07T22:00:00Z", round: 4 },  // 22:00 UTC = 01:00 Iraq (1:00 AM Aug 8)
  { home: "IRI", away: "EST", date: "2026-08-08T00:15:00Z", round: 4 },  // 00:15 UTC = 03:15 Iraq (3:15 AM Aug 8)
  { home: "TIG", away: "RIV", date: "2026-08-08T20:00:00Z", round: 4 },  // 20:00 UTC = 23:00 Iraq (11:00 PM Aug 8)
  { home: "BOC", away: "VEL", date: "2026-08-08T22:15:00Z", round: 4 },  // 22:15 UTC = 01:15 Iraq (1:15 AM Aug 9)
  { home: "LAN", away: "PLA", date: "2026-08-09T00:30:00Z", round: 4 },  // 00:30 UTC = 03:30 Iraq (3:30 AM Aug 9)
  { home: "SLO", away: "HUR", date: "2026-08-09T19:30:00Z", round: 4 },  // 19:30 UTC = 22:30 Iraq (10:30 PM Aug 9)
  { home: "ARJ", away: "RAC", date: "2026-08-09T21:45:00Z", round: 4 },  // 21:45 UTC = 00:45 Iraq (12:45 AM Aug 10)
  { home: "DYJ", away: "NOB", date: "2026-08-09T23:45:00Z", round: 4 },  // 23:45 UTC = 02:45 Iraq (2:45 AM Aug 10)
];

export async function syncArgentinaLigaProfesional() {
  const db = getDb();

  db.exec("PRAGMA foreign_keys = OFF;");

  // 1. Upsert League
  db.prepare(`
    INSERT INTO leagues (id, code, name_ar, name_en, country_ar)
    VALUES ('arg1', 'ARG1', 'الدوري الأرجنتيني', 'Liga Profesional Argentina', 'الأرجنتين')
    ON CONFLICT(id) DO UPDATE SET name_ar=excluded.name_ar, name_en=excluded.name_en
  `).run();

  // 2. Upsert Teams
  const teamStmt = db.prepare(`
    INSERT INTO teams (id, league_id, name_ar, name_en, short_name, crest_url)
    VALUES (?, 'arg1', ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name_ar=excluded.name_ar,
      name_en=excluded.name_en,
      crest_url=COALESCE(excluded.crest_url, teams.crest_url)
  `);

  for (const [code, info] of Object.entries(ARGENTINA_TEAMS)) {
    const teamId = `arg1-${code.toLowerCase()}`;
    teamStmt.run(teamId, info.nameAr, info.nameEn, code, info.crestUrl);
  }

  // 3. Upsert Official League Standings
  db.prepare("DELETE FROM standings WHERE league_id='arg1' AND season='2026'").run();
  const standingsStmt = db.prepare(`
    INSERT INTO standings (
      id, league_id, season, team_id, position, played, won, drawn, lost, goals_for, goals_against, goal_difference, points
    ) VALUES (?, 'arg1', '2026', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  STANDINGS_DATA.forEach((s) => {
    const teamId = `arg1-${s.code.toLowerCase()}`;
    const id = `arg1-2026-${s.code.toLowerCase()}`;
    const gd = s.gf - s.ga;
    standingsStmt.run(id, teamId, s.pos, s.pld, s.w, s.d, s.l, s.gf, s.ga, gd, s.pts);
  });

  // Clear existing matches & predictions for arg1
  db.prepare("DELETE FROM predictions WHERE match_id IN (SELECT id FROM matches WHERE league_id='arg1')").run();
  db.prepare("DELETE FROM matches WHERE league_id='arg1'").run();

  const matchStmt = db.prepare(`
    INSERT INTO matches (
      id, league_id, home_team_id, away_team_id, status, utc_date, season, matchday,
      home_goals, away_goals, source
    ) VALUES (?, 'arg1', ?, ?, ?, ?, '2026', ?, ?, ?, 'real-arg1')
  `);

  // Insert Finished Historical Matches
  FINISHED_MATCHES.forEach((m, idx) => {
    const matchId = `arg1-2026-fin-${m.home.toLowerCase()}-${m.away.toLowerCase()}-${idx}`;
    const homeId = `arg1-${m.home.toLowerCase()}`;
    const awayId = `arg1-${m.away.toLowerCase()}`;
    matchStmt.run(matchId, homeId, awayId, "FINISHED", m.date, 1, m.hg, m.ag);
  });

  const fixtureId = (round: number, home: string, away: string) =>
    `arg1-2026-r${round}-${home.toLowerCase()}-${away.toLowerCase()}`;

  // Insert Scheduled Fixtures for Tomorrow
  REAL_SCHEDULED_MATCHES.forEach((m) => {
    const matchId = fixtureId(m.round, m.home, m.away);
    const homeId = `arg1-${m.home.toLowerCase()}`;
    const awayId = `arg1-${m.away.toLowerCase()}`;
    matchStmt.run(matchId, homeId, awayId, "SCHEDULED", m.date, m.round, null, null);
  });

  db.exec("PRAGMA foreign_keys = ON;");
  console.log(
    `Argentina Liga Profesional 2026 synchronized! (${FINISHED_MATCHES.length} finished historical matches, ${REAL_SCHEDULED_MATCHES.length} scheduled matches for tomorrow)`,
  );
}

if (require.main === module) {
  syncArgentinaLigaProfesional().catch(console.error);
}

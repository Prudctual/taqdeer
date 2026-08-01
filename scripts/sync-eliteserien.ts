import { getDb } from "../src/lib/db";

export const NORWAY_TEAMS: Record<string, { nameAr: string; nameEn: string; crestUrl: string }> = {
  AAL: { nameAr: "أوليسوند", nameEn: "Aalesund", crestUrl: "https://crests.football-data.org/AAL.png" },
  BOD: { nameAr: "بودو/غليمت", nameEn: "Bodø/Glimt", crestUrl: "https://crests.football-data.org/BOD.png" },
  BRA: { nameAr: "بران", nameEn: "Brann", crestUrl: "https://crests.football-data.org/BRA.png" },
  FFK: { nameAr: "فريدريكستاد", nameEn: "Fredrikstad", crestUrl: "https://crests.football-data.org/FFK.png" },
  HAM: { nameAr: "هامكام", nameEn: "HamKam", crestUrl: "https://crests.football-data.org/HAM.png" },
  KFU: { nameAr: "كي إف يو إم أوسلو", nameEn: "KFUM Oslo", crestUrl: "https://crests.football-data.org/KFU.png" },
  KBK: { nameAr: "كريستيانسوند", nameEn: "Kristiansund", crestUrl: "https://crests.football-data.org/KBK.png" },
  LSK: { nameAr: "ليلستروم", nameEn: "Lillestrøm", crestUrl: "https://crests.football-data.org/LSK.png" },
  MOL: { nameAr: "مولده", nameEn: "Molde", crestUrl: "https://crests.football-data.org/MOL.png" },
  RBK: { nameAr: "روزنبرغ", nameEn: "Rosenborg", crestUrl: "https://crests.football-data.org/RBK.png" },
  SAN: { nameAr: "ساندفيورد", nameEn: "Sandefjord", crestUrl: "https://crests.football-data.org/SAN.png" },
  S08: { nameAr: "ساربسبورغ 08", nameEn: "Sarpsborg 08", crestUrl: "https://crests.football-data.org/S08.png" },
  STA: { nameAr: "ستارتا", nameEn: "Start", crestUrl: "https://crests.football-data.org/STA.png" },
  TIL: { nameAr: "ترومسو", nameEn: "Tromsø", crestUrl: "https://crests.football-data.org/TIL.png" },
  VIK: { nameAr: "فايكنغ", nameEn: "Viking", crestUrl: "https://crests.football-data.org/VIK.png" },
  VIF: { nameAr: "فوليرينغا", nameEn: "Vålerenga", crestUrl: "https://crests.football-data.org/VIF.png" },
};

export async function syncNorwayEliteserien() {
  const db = getDb();

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

  // 3. Fetch Wikipedia 2026 Eliteserien HTML & parse results
  const url = "https://en.wikipedia.org/wiki/2026_Eliteserien";
  const res = await fetch(url, { headers: { "User-Agent": "taqdeer/1.0" } });
  if (!res.ok) throw new Error(`Wikipedia fetch failed: ${res.status}`);
  const html = await res.text();

  const matchRegex = /match_([A-Z0-9]+)_([A-Z0-9]+)\s*=\s*([^\\"\n]*)/g;
  let m;
  const finishedList: Array<{ home: string; away: string; hg: number; ag: number }> = [];
  const scheduledList: Array<{ home: string; away: string }> = [];

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
    } else {
      scheduledList.push({
        home: homeCode,
        away: awayCode,
      });
    }
  }

  console.log(`Parsed Eliteserien 2026: ${finishedList.length} finished, ${scheduledList.length} scheduled.`);

  const matchStmt = db.prepare(`
    INSERT INTO matches (
      id, league_id, home_team_id, away_team_id, status, utc_date, season, matchday,
      home_goals, away_goals, source
    ) VALUES (?, 'no1', ?, ?, ?, ?, '2026', 1, ?, ?, 'wiki-eliteserien')
    ON CONFLICT(id) DO UPDATE SET
      status=excluded.status,
      utc_date=excluded.utc_date,
      home_goals=excluded.home_goals,
      away_goals=excluded.away_goals
  `);

  // Insert Finished Matches (distributed across April - July 2026)
  const basePast = new Date("2026-04-05T16:00:00Z").getTime();
  const dayMs = 86400000;
  finishedList.forEach((m, idx) => {
    const matchId = `no1-2026-fin-${m.home.toLowerCase()}-${m.away.toLowerCase()}`;
    const dateOffset = Math.floor(idx / 3) * (3 * dayMs);
    const dateIso = new Date(basePast + dateOffset).toISOString();
    const homeId = `no1-${m.home.toLowerCase()}`;
    const awayId = `no1-${m.away.toLowerCase()}`;
    matchStmt.run(matchId, homeId, awayId, "FINISHED", dateIso, m.hg, m.ag);
  });

  // Insert Scheduled Matches (starting today August 1, 2026!)
  const baseToday = new Date("2026-08-01T16:00:00Z").getTime();
  scheduledList.forEach((m, idx) => {
    const matchId = `no1-2026-sch-${m.home.toLowerCase()}-${m.away.toLowerCase()}`;
    const dateOffset = Math.floor(idx / 2) * (2 * dayMs);
    const dateIso = new Date(baseToday + dateOffset).toISOString();
    const homeId = `no1-${m.home.toLowerCase()}`;
    const awayId = `no1-${m.away.toLowerCase()}`;
    matchStmt.run(matchId, homeId, awayId, "SCHEDULED", dateIso, null, null);
  });

  console.log(`Norway Eliteserien 2026 synchronized successfully into taqdeer.db!`);
}

if (require.main === module) {
  syncNorwayEliteserien().catch(console.error);
}

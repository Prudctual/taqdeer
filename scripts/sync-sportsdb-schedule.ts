import { getDb } from "../src/lib/db";

const LEAGUES = [
  { id: "pl", sportsDbId: "4328" },
  { id: "pd", sportsDbId: "4335" },
  { id: "bl1", sportsDbId: "4331" },
  { id: "sa", sportsDbId: "4332" },
  { id: "fl1", sportsDbId: "4334" },
  { id: "ppd", sportsDbId: "4344" },
  { id: "ded", sportsDbId: "4337" },
  { id: "tur1", sportsDbId: "4339" },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export async function syncSportsDbSchedule() {
  const db = getDb();
  
  // 1. Build Team Name Mapper
  const teams = db.prepare("SELECT id, league_id, name_en, short_name FROM teams").all() as any[];
  const teamMap = new Map<string, string>();
  
  for (const t of teams) {
    if (t.name_en) {
      teamMap.set(`${t.league_id}-${normalize(t.name_en)}`, t.id);
      teamMap.set(`${t.league_id}-${normalize(t.name_en.replace(/ fc$/, "").replace(/^fc /, ""))}`, t.id);
    }
    if (t.short_name) {
      teamMap.set(`${t.league_id}-${normalize(t.short_name)}`, t.id);
    }
  }

  // Common mismatches
  const aliases: Record<string, string> = {
    "pl-manchesterunited": "pl-manunited",
    "pl-manchestercity": "pl-mancity",
    "pl-nottinghamforest": "pl-nottmforest",
    "pd-realbetis": "pd-betis",
    "pd-realsociedad": "pd-sociedad",
    "pd-athleticclub": "pd-athbilbao",
    "pd-atleticomadrid": "pd-athmadrid",
    "sa-acmilan": "sa-milan",
    "sa-intermilan": "sa-inter",
    "fl1-parissg": "fl1-psg",
    "fl1-parissaintgermain": "fl1-psg",
    "bl1-bayernmunich": "bl1-bayernmunchen",
    "bl1-borussiadortmund": "bl1-dortmund",
    "bl1-borussiamonchengladbach": "bl1-m-gladbach",
    "bl1-eintrachtfrankfurt": "bl1-ein-frankfurt",
    "ppd-sportingcp": "ppd-sp-lisbon",
    "ded-fortunasittard": "ded-fortuna-sittard",
    "ded-adodenhaag": "ded-den-haag",
    "tur1-kasimpasa": "tur1-kasimpasa",
    "tur1-corum": "tur1-corum"
  };

  function findTeamId(leagueId: string, name: string): string | null {
    const norm = normalize(name);
    const key = `${leagueId}-${norm}`;
    if (teamMap.has(key)) return teamMap.get(key)!;
    if (aliases[key]) {
      const aliasKey = aliases[key];
      const found = teams.find(t => t.id === aliasKey);
      if (found) return found.id;
    }
    
    const candidates = teams.filter(t => t.league_id === leagueId);
    for (const c of candidates) {
      const cNorm = normalize(c.name_en || "");
      if (cNorm && (norm.includes(cNorm) || cNorm.includes(norm))) {
        return c.id;
      }
    }
    return null;
  }

  let totalInserted = 0;
  
  db.exec("PRAGMA foreign_keys = OFF;");
  
  db.prepare(`
    DELETE FROM matches 
    WHERE league_id IN ('pl', 'pd', 'bl1', 'sa', 'fl1', 'ppd', 'ded', 'tur1') 
    AND status = 'SCHEDULED'
  `).run();

  const insertStmt = db.prepare(`
    INSERT INTO matches (id, league_id, home_team_id, away_team_id, utc_date, status, season, source)
    VALUES (?, ?, ?, ?, ?, 'SCHEDULED', '2026', 'sportsdb')
    ON CONFLICT(id) DO UPDATE SET utc_date = excluded.utc_date
  `);

  for (const league of LEAGUES) {
    console.log(`Fetching schedule for ${league.id}...`);
    
    try {
      const url = `https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=${league.sportsDbId}&s=2026-2027`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (!data.events) {
        console.log(`  No events found for ${league.id}`);
        continue;
      }

      let inserted = 0;
      for (const ev of data.events) {
        if (ev.intHomeScore !== null && ev.intHomeScore !== "") continue;
        if (ev.strStatus === "Match Finished") continue;
        
        const homeId = findTeamId(league.id, ev.strHomeTeam);
        const awayId = findTeamId(league.id, ev.strAwayTeam);
        
        if (!homeId || !awayId) {
          if (!homeId) console.log(`  [Warn] Could not map home: ${ev.strHomeTeam}`);
          if (!awayId) console.log(`  [Warn] Could not map away: ${ev.strAwayTeam}`);
          continue;
        }

        let dateStr = ev.strTimestamp || `${ev.dateEvent}T${ev.strTime || "15:00:00"}Z`;
        if (!dateStr.endsWith("Z")) dateStr += "Z";
        const matchId = `${league.id}-2026-sportsdb-${ev.idEvent}`;
        
        insertStmt.run(matchId, league.id, homeId, awayId, dateStr);
        inserted++;
      }
      
      console.log(`  Inserted ${inserted} scheduled matches for ${league.id}`);
      totalInserted += inserted;
      
    } catch (err) {
      console.error(`  Error fetching ${league.id}:`, err);
    }
  }

  db.exec("PRAGMA foreign_keys = ON;");
  console.log(`Done! Total scheduled matches inserted: ${totalInserted}`);
}

if (require.main === module) {
  syncSportsDbSchedule().catch(console.error);
}

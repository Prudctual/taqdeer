import fs from "fs";
import path from "path";
import { getDb, closeDb } from "../src/lib/db";
import { HISTORICAL_SEASONS, LEAGUES, ukSeasonPath } from "../src/lib/leagues";

const ROOT = process.cwd();
const RAW_DIR = path.join(ROOT, "data", "raw");

async function main() {
  const db = getDb();
  console.log("Starting halftime goals backfill from local raw CSV files...");

  // Import ingestCsv from sync-data
  const syncDataModule = await import("./sync-data");
  
  let totalProcessed = 0;
  // Include all seasons present in raw data back to 2021
  const seasonsToBackfill = [2021, ...HISTORICAL_SEASONS.filter(y => y !== 2021)];
  for (const league of LEAGUES) {
    if (!league.fdUkCode) continue;
    for (const year of seasonsToBackfill) {
      const seg = ukSeasonPath(year);
      // Try both standard fdUkCode (e.g. E0-2122.csv) and leagueId prefix (e.g. pl_2122.csv)
      const candidates = [
        path.join(RAW_DIR, `${league.fdUkCode}-${seg}.csv`),
        path.join(RAW_DIR, `${league.id}_${seg}.csv`),
      ];
      const local = candidates.find(c => fs.existsSync(c));
      if (!local) continue;
      const text = fs.readFileSync(local, "utf8");
      if (!text || (!text.includes("HomeTeam") && !text.includes("Home"))) continue;

      interface Ingestible {
        ingestCsv?: (db: unknown, leagueId: string, season: string, csvText: string, ukCode: string) => number;
      }
      const syncer = syncDataModule as unknown as Ingestible;
      const n = syncer.ingestCsv ? syncer.ingestCsv(db, league.id, String(year), text, league.fdUkCode) : -1;
      totalProcessed += (n > 0 ? n : 0);
    }
  }

  const check = db.prepare(`SELECT COUNT(*) as c FROM matches WHERE ht_home_goals IS NOT NULL`).get() as { c: number };
  console.log(`Backfill completed. Total processed: ${totalProcessed}, Matches with ht_home_goals: ${check.c}`);
  closeDb();
}

main().catch(console.error);

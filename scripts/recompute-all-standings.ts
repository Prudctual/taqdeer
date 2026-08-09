/**
 * إعادة بناء جداول الترتيب لكل دوري/موسم من نتائج المباريات.
 * يضمن ظهور كل فرق الموسم حتى قبل أن تلعب.
 */
import { getDb } from "../src/lib/db";
import { LEAGUES } from "../src/lib/leagues";
import { recomputeStandings } from "./sync-data";

async function main() {
  const db = getDb();
  const pairs = db
    .prepare(
      `SELECT DISTINCT league_id, season FROM matches
       WHERE season IS NOT NULL AND season != ''
       ORDER BY league_id, season`,
    )
    .all() as Array<{ league_id: string; season: string }>;

  const active = new Set(LEAGUES.map((l) => l.id));
  let n = 0;
  for (const { league_id, season } of pairs) {
    if (!active.has(league_id)) continue;
    recomputeStandings(db, league_id, season);
    const teams = db
      .prepare(`SELECT COUNT(*) AS c FROM standings WHERE league_id=? AND season=?`)
      .get(league_id, season) as { c: number };
    console.log(`  ${league_id} ${season}: ${teams.c} فريقاً`);
    n++;
  }

  // النرويج عبر مساره الخاص أيضاً
  try {
    const { syncNorwayEliteserien } = await import("./sync-eliteserien");
    await syncNorwayEliteserien();
  } catch (e) {
    console.warn("  sync eliteserien:", e);
  }

  console.log(`done — recomputed ${n} league-seasons`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

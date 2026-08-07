/**
 * دمج الفرق المكررة بهوياتها القياسية (CSV aliases).
 * يُشغَّل يدوياً أو ضمن sync.
 */
import { closeDb, getDb } from "../src/lib/db";
import { cleanupOrphanTeams, mergeAliasTeams } from "./sync-data";

function main() {
  const db = getDb();
  mergeAliasTeams(db);
  // دمج يدوي لهويات slug متضاربة بلا alias كامل
  const hard: Array<[string, string]> = [
    ["ded-fortuna-sittard", "ded-for-sittard"],
    ["ppd-sporting-cp", "ppd-sp-lisbon"],
    ["ppd-academico-viseu", "ppd-academico"],
    ["ppd-acad-mico", "ppd-academico"],
  ];
  for (const [from, to] of hard) {
    const src = db.prepare(`SELECT id FROM teams WHERE id=?`).get(from) as
      | { id: string }
      | undefined;
    const dst = db.prepare(`SELECT id FROM teams WHERE id=?`).get(to) as
      | { id: string }
      | undefined;
    if (!src) continue;
    if (!dst) {
      db.prepare(`UPDATE teams SET id=? WHERE id=?`).run(to, from);
      console.log(`  إعادة تسمية: ${from} → ${to}`);
      continue;
    }
    const tx = db.transaction(() => {
      db.prepare(`UPDATE matches SET home_team_id=? WHERE home_team_id=?`).run(to, from);
      db.prepare(`UPDATE matches SET away_team_id=? WHERE away_team_id=?`).run(to, from);
      db.prepare(`UPDATE OR IGNORE players SET team_id=? WHERE team_id=?`).run(to, from);
      db.prepare(`DELETE FROM players WHERE team_id=?`).run(from);
      db.prepare(`DELETE FROM elo_snapshots WHERE team_id=?`).run(from);
      db.prepare(`DELETE FROM standings WHERE team_id=?`).run(from);
      db.prepare(`DELETE FROM team_strengths WHERE team_id=?`).run(from);
      db.prepare(`DELETE FROM player_availability WHERE team_id=?`).run(from);
      db.prepare(`DELETE FROM teams WHERE id=?`).run(from);
    });
    tx();
    console.log(`  دمج صلب: ${from} → ${to}`);
  }
  cleanupOrphanTeams(db);
  closeDb();
  console.log("merge-duplicate-teams done");
}

main();

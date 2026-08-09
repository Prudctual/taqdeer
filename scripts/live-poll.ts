/**
 * عامل مزامنة البث الحي — يستدعي syncRealLiveMatches كل 25 ثانية
 * عندما توجد مباريات في نافذة الانطلاق (±3 ساعات).
 */
import { getDb } from "../src/lib/db";
import { syncRealLiveMatches } from "../src/lib/live-sync";

const INTERVAL_MS = 25_000;

function hasLiveWindow(): boolean {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM matches
       WHERE source NOT IN ('preview-holdout','synthetic','demo')
         AND utc_date BETWEEN datetime('now', '-3 hours') AND datetime('now', '+3 hours')
         AND status NOT IN ('FINISHED','POSTPONED','CANCELLED','AWARDED')`,
    )
    .get() as { n: number };
  return (row?.n ?? 0) > 0;
}

async function tick() {
  try {
    if (!hasLiveWindow()) {
      console.log(`[live-poll] idle — no matches in window @ ${new Date().toISOString()}`);
      return;
    }
    const n = await syncRealLiveMatches();
    console.log(`[live-poll] synced ${n} @ ${new Date().toISOString()}`);
  } catch (e) {
    console.error("[live-poll] error:", e);
  }
}

console.log("[live-poll] starting");
await tick();
setInterval(() => {
  void tick();
}, INTERVAL_MS);

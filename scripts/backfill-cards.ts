/**
 * إعادة ملء بطاقات الحكّام (HY/AY/HR/AR) من مواسم football-data.co.uk
 * دون إعادة بناء كل المباريات من الصفر.
 */
import { parse } from "csv-parse/sync";
import { closeDb, getDb } from "../src/lib/db";
import { HISTORICAL_SEASONS, LEAGUES, ukSeasonPath } from "../src/lib/leagues";
import { resolveTeamName } from "../src/lib/team-aliases";
import { slugify } from "../src/lib/team-names";

function parseCsvRows(csvText: string): Record<string, string>[] {
  const text = csvText.replace(/^\uFEFF/, "");
  const rows = parse(text, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as Record<string, string>[];
  return rows.map((r) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      out[k.replace(/^\uFEFF/, "").trim()] = v;
    }
    return out;
  });
}

function num(v: string | undefined): number | null {
  if (v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseUkDate(dateRaw: string): string | null {
  // DD/MM/YYYY or DD/MM/YY
  const m = dateRaw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let y = Number(m[3]);
  if (y < 100) y += y >= 70 ? 1900 : 2000;
  const month = m[2]!.padStart(2, "0");
  const day = m[1]!.padStart(2, "0");
  return `${y}-${month}-${day}`;
}

async function main() {
  const db = getDb();
  const upd = db.prepare(`
    UPDATE matches SET
      yellow_home = COALESCE(?, yellow_home),
      yellow_away = COALESCE(?, yellow_away),
      red_home = COALESCE(?, red_home),
      red_away = COALESCE(?, red_away),
      referee_name = COALESCE(referee_name, ?)
    WHERE id = ?
  `);

  let updated = 0;
  for (const league of LEAGUES) {
    if (!league.fdUkCode) continue;
    for (const season of HISTORICAL_SEASONS) {
      const url = `https://www.football-data.co.uk/mmz4281/${ukSeasonPath(season)}/${league.fdUkCode}.csv`;
      const res = await fetch(url, {
        headers: { "User-Agent": "taqdeer/enrich-cards" },
      });
      if (!res.ok) continue;
      const text = await res.text();
      const rows = parseCsvRows(text);
      const withDiv = rows.filter((r) => r.Div);
      if (
        withDiv.length > 0 &&
        withDiv.every((r) => r.Div !== league.fdUkCode)
      ) {
        continue;
      }
      const tx = db.transaction(() => {
        for (const r of rows) {
          if (r.Div && r.Div !== league.fdUkCode) continue;
          const home = resolveTeamName(r.HomeTeam || r.Home || "");
          const away = resolveTeamName(r.AwayTeam || r.Away || "");
          const day = r.Date ? parseUkDate(r.Date) : null;
          if (!home || !away || !day) continue;
          const hy = num(r.HY);
          const ay = num(r.AY);
          const hr = num(r.HR);
          const ar = num(r.AR);
          if (hy == null && ay == null && hr == null && ar == null) continue;
          const id = `${league.id}-${season}-${slugify(home)}-${slugify(away)}-${day}`;
          const ref = r.Referee ? String(r.Referee).trim() : null;
          const info = upd.run(hy, ay, hr, ar, ref, id);
          updated += info.changes;
        }
      });
      tx();
      console.log(`  ${league.id} ${season}: cards pass`);
    }
  }
  console.log(`backfill-cards: updated ${updated} rows`);
  closeDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * مزامنة تشكيلة الفرق والصور من TheSportsDB → جدول players
 * الاستخدام: bun tsx scripts/sync-players.ts
 * اختياري: --league=pl أو --team=pl-arsenal
 */
import { getDb, closeDb } from "../src/lib/db";
import { isPlayingPosition } from "../src/lib/players";

const TSDB = "https://www.thesportsdb.com/api/v1/json/3";

const LEAGUE_HINTS: Record<string, string[]> = {
  pl: ["Premier League", "English Premier"],
  pd: ["La Liga", "Spanish La Liga"],
  bl1: ["Bundesliga", "German Bundesliga"],
  sa: ["Serie A", "Italian Serie A"],
  fl1: ["Ligue 1", "French Ligue 1"],
  ppd: ["Primeira Liga", "Portuguese"],
  ded: ["Eredivisie", "Dutch"],
  tur1: ["Super Lig", "Turkish"],
};

/** أسماء بحث بديلة عندما يفشل الاسم الإنجليزي في القاعدة */
const SEARCH_ALIASES: Record<string, string[]> = {};

type SportsDbTeam = {
  idTeam?: string;
  strTeam?: string;
  strSport?: string;
  strLeague?: string;
  strAlternate?: string;
};

type SportsDbPlayer = {
  idPlayer?: string;
  strPlayer?: string;
  strPosition?: string;
  strNumber?: string;
  strCutout?: string | null;
  strThumb?: string | null;
  strRender?: string | null;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": "taqdeer/1.0 (player-sync)" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function resolveSportsDbTeamId(
  nameEn: string,
  leagueId: string,
  cachedId: string | null,
): Promise<string | null> {
  if (cachedId) return cachedId;

  const queries = [nameEn, ...(SEARCH_ALIASES[nameEn] ?? [])];
  for (const q of queries) {
    const data = await fetchJson<{ teams?: SportsDbTeam[] | null }>(
      `${TSDB}/searchteams.php?t=${encodeURIComponent(q)}`,
    );
    await sleep(280);
    if (!data) continue;
    const teams = (data.teams ?? []).filter(
      (t) => t.strSport === "Soccer" && t.idTeam,
    );
    if (teams.length === 0) continue;

    const hints = LEAGUE_HINTS[leagueId] ?? [];
    const byLeague = teams.find((t) =>
      hints.some((h) => (t.strLeague ?? "").includes(h)),
    );
    if (byLeague?.idTeam) return byLeague.idTeam;

    const nq = normalize(q);
    const exact = teams.find((t) => normalize(t.strTeam ?? "") === nq);
    if (exact?.idTeam) return exact.idTeam;

    if (hints.length > 0) continue;
    return teams[0]?.idTeam ?? null;
  }
  return null;
}

function pickPhoto(p: SportsDbPlayer): string | null {
  return p.strCutout || p.strRender || p.strThumb || null;
}

async function syncTeamPlayers(
  teamId: string,
  nameEn: string,
  leagueId: string,
  sportsdbId: string | null,
): Promise<number> {
  const db = getDb();
  const sid = await resolveSportsDbTeamId(nameEn, leagueId, sportsdbId);
  if (!sid) {
    console.log(`  ⚠ لا فريق SportsDB لـ ${nameEn}`);
    return 0;
  }

  await sleep(900);
  const data = await fetchJson<{ player?: SportsDbPlayer[] | null }>(
    `${TSDB}/lookup_all_players.php?id=${sid}`,
  );
  const raw = data?.player ?? [];
  const players = raw.filter(
    (p) => p.strPlayer && isPlayingPosition(p.strPosition ?? ""),
  );

  if (players.length === 0) {
    console.log(`  ⚠ لا لاعبين من SportsDB لـ ${nameEn} (id=${sid})`);
    return 0;
  }

  if (sid !== sportsdbId) {
    db.prepare(`UPDATE teams SET sportsdb_id = ? WHERE id = ?`).run(sid, teamId);
  }

  const upsert = db.prepare(`
    INSERT INTO players (
      id, team_id, name_en, name_ar, position, shirt_number, photo_url, sportsdb_id, updated_at
    ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      team_id=excluded.team_id,
      name_en=excluded.name_en,
      position=excluded.position,
      shirt_number=excluded.shirt_number,
      photo_url=COALESCE(excluded.photo_url, players.photo_url),
      sportsdb_id=excluded.sportsdb_id,
      updated_at=excluded.updated_at
  `);

  const now = new Date().toISOString();
  let n = 0;
  const seen = new Set<string>();
  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM players WHERE team_id = ?`).run(teamId);
    for (const p of players) {
      const name = p.strPlayer!.trim();
      const num = p.strNumber ? parseInt(p.strNumber, 10) : null;
      const id = p.idPlayer
        ? `${teamId}-tsdb-${p.idPlayer}`
        : `${teamId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      if (seen.has(id) || seen.has(name.toLowerCase())) continue;
      seen.add(id);
      seen.add(name.toLowerCase());
      upsert.run(
        id,
        teamId,
        name,
        p.strPosition ?? null,
        Number.isFinite(num) ? num : null,
        pickPhoto(p),
        p.idPlayer ?? null,
        now,
      );
      n += 1;
    }

    // انسخ التشكيلة إلى صفوف الفرق المكررة بنفس الاسم في الدوري
    const aliases = db
      .prepare(
        `SELECT id FROM teams
         WHERE league_id = ? AND lower(name_en) = lower(?) AND id != ?`,
      )
      .all(leagueId, nameEn, teamId) as { id: string }[];

    for (const a of aliases) {
      db.prepare(`DELETE FROM players WHERE team_id = ?`).run(a.id);
      db.prepare(`UPDATE teams SET sportsdb_id = ? WHERE id = ?`).run(sid, a.id);
      for (const p of players) {
        const name = p.strPlayer!.trim();
        if (!isPlayingPosition(p.strPosition ?? "")) continue;
        const num = p.strNumber ? parseInt(p.strNumber, 10) : null;
        if (!p.idPlayer) continue;
        const id = `${a.id}-tsdb-${p.idPlayer}`;
        upsert.run(
          id,
          a.id,
          name,
          p.strPosition ?? null,
          Number.isFinite(num) ? num : null,
          pickPhoto(p),
          p.idPlayer ?? null,
          now,
        );
      }
    }
  });
  tx();
  return n;
}

async function main() {
  const args = process.argv.slice(2);
  const leagueArg = args.find((a) => a.startsWith("--league="))?.split("=")[1];
  const teamArg = args.find((a) => a.startsWith("--team="))?.split("=")[1];

  const db = getDb();

  let teams: Array<{
    id: string;
    name_en: string;
    league_id: string;
    sportsdb_id: string | null;
  }>;

  if (teamArg) {
    teams = db
      .prepare(
        `SELECT id, name_en, league_id, sportsdb_id FROM teams WHERE id = ?`,
      )
      .all(teamArg) as typeof teams;
  } else if (leagueArg) {
    teams = db
      .prepare(
        `SELECT id, name_en, league_id, sportsdb_id FROM teams WHERE league_id = ? ORDER BY name_en`,
      )
      .all(leagueArg) as typeof teams;
  } else {
    teams = db
      .prepare(
        `SELECT t.id, t.name_en, t.league_id, t.sportsdb_id,
                MAX(m.utc_date) AS last_date
         FROM teams t
         LEFT JOIN matches m
           ON (m.home_team_id = t.id OR m.away_team_id = t.id)
          AND m.utc_date >= datetime('now', '-30 days')
         GROUP BY t.id
         ORDER BY
           CASE WHEN last_date IS NOT NULL THEN 0 ELSE 1 END,
           last_date DESC,
           t.league_id,
           t.name_en`,
      )
      .all() as typeof teams;
  }

  // تجنّب مزامنة نفس الاسم مرتين إن وُجدت صفوف فرق مكررة
  const deduped: typeof teams = [];
  const seenTeam = new Set<string>();
  for (const t of teams) {
    const key = `${t.league_id}::${t.name_en.toLowerCase()}`;
    if (seenTeam.has(key)) continue;
    seenTeam.add(key);
    deduped.push(t);
  }
  teams = deduped;

  console.log(`مزامنة لاعبين لـ ${teams.length} فريقاً من TheSportsDB...`);
  let total = 0;
  let okTeams = 0;

  for (const t of teams) {
    try {
      const n = await syncTeamPlayers(
        t.id,
        t.name_en,
        t.league_id,
        t.sportsdb_id,
      );
      if (n > 0) {
        okTeams += 1;
        total += n;
        console.log(`  ✓ ${t.name_en}: ${n} لاعب`);
      }
      await sleep(1100);
    } catch (e) {
      console.error(`  ✗ ${t.name_en}:`, e);
      await sleep(2000);
    }
  }

  console.log(`تم: ${okTeams} فريق · ${total} لاعب`);
  closeDb();
}

main().catch((e) => {
  console.error(e);
  closeDb();
  process.exit(1);
});

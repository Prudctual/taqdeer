/**
 * مزامنة جداول المواسم الكاملة من fixturedownload.com — يشمل كل الجولات وأرقامها.
 * يحلّ محل مزامنة TheSportsDB القديمة التي كانت نسختها المجانية تعيد 5 مباريات فقط لكل دوري.
 *
 * المزامنة تفاضلية: المباراة الموجودة تُحدَّث في مكانها (فتحتفظ بتوقعها ولقطته المقفولة)،
 * ولا يُحذف إلا ما اختفى فعلاً من التغذية.
 */
import { pathToFileURL } from "url";
import { getDb, closeDb } from "../src/lib/db";
import { latestSeasonStartYear } from "../src/lib/leagues";
import { resolveTeamName } from "../src/lib/team-aliases";
import { nameAr, slugify } from "../src/lib/team-names";
import { recomputeStandings, syncUpcomingOdds } from "./sync-data";

// موسم 2026-27 → "2026". يُشتق من التاريخ فلا يتقادم مع المواسم القادمة.
const SEASON = String(latestSeasonStartYear());

const FEEDS = [
  { id: "pl", slug: `epl-${SEASON}` },
  { id: "pd", slug: `la-liga-${SEASON}` },
  { id: "bl1", slug: `bundesliga-${SEASON}` },
  { id: "sa", slug: `serie-a-${SEASON}` },
  { id: "fl1", slug: `ligue-1-${SEASON}` },
  { id: "ppd", slug: `primeira-liga-${SEASON}` },
  { id: "ded", slug: `eredivisie-${SEASON}` },
  { id: "tur1", slug: `super-lig-${SEASON}` },
];

/**
 * أسماء المصدر → الأسماء القياسية القصيرة (football-data.co.uk) المستخدمة كمعرّفات فرق.
 * الفرق الصاعدة الجديدة تُسمّى باسمها القياسي في CSV حتى تتوحّد نتائجها لاحقاً مع جدولها.
 */
const FEED_ALIASES: Record<string, string> = {
  // pl
  "Man Utd": "Man United",
  Spurs: "Tottenham",
  // pd
  "Atlético de Madrid": "Ath Madrid",
  "Málaga CF": "Malaga",
  "R. Racing Club": "Santander",
  "RC Deportivo": "La Coruna",
  // bl1
  "SC Paderborn 07": "Paderborn",
  // fl1
  "RC Lens": "Lens",
  "Havre Athletic Club": "Le Havre",
  "Stade Rennais FC": "Rennes",
  "Le Mans FC": "Le Mans",
  // ppd
  "Sporting CP": "Sp Lisbon",
  "SC Braga": "Sp Braga",
  "Vitória SC": "Guimaraes",
  // ded
  AZ: "AZ Alkmaar",
  PSV: "PSV Eindhoven",
  "Fortuna Sittard": "For Sittard",
  "ADO Den Haag": "Den Haag",
  // tur1
  "Istanbul Basaksehir": "Buyuksehyr",
  "Çorum": "Corum",
};

type FeedMatch = {
  MatchNumber: number;
  RoundNumber: number;
  DateUtc: string;
  HomeTeam: string;
  AwayTeam: string;
  HomeTeamScore: number | null;
  AwayTeamScore: number | null;
};

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function norm(s: string): string {
  return stripDiacritics(s).toLowerCase().replace(/[^a-z0-9]/g, "");
}

const FETCH_ATTEMPTS = 3;

async function fetchFeed(slug: string): Promise<FeedMatch[] | null> {
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`https://fixturedownload.com/feed/json/${slug}`, {
        headers: { "User-Agent": "taqdeer/1.0 (fixtures; educational)" },
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const data = (await res.json()) as FeedMatch[];
        if (Array.isArray(data) && data.length > 0) return data;
        console.warn(`  ${slug}: استجابة فارغة`);
        return null;
      }
      console.warn(`  فشل جلب ${slug}: ${res.status} (محاولة ${attempt}/${FETCH_ATTEMPTS})`);
    } catch (e) {
      console.warn(`  خطأ في جلب ${slug} (محاولة ${attempt}/${FETCH_ATTEMPTS}):`, e);
    }
    if (attempt < FETCH_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, attempt * 2500));
    }
  }
  return null;
}

/** أولوية المصادر عند تكرار نفس النتيجة: CSV الرسمي (يحمل الأودز والإحصائيات) يفوز دائماً */
const SOURCE_RANK: Record<string, number> = {
  "football-data.co.uk": 3,
  fixturedownload: 2,
};

/**
 * نفس المباراة المنتهية قد تصل من مصدرين (التغذية أولاً ثم CSV الرسمي لاحقاً) بهويتين مختلفتين،
 * فتُحسب مرتين في الترتيب. هذا التمرير يُبقي النسخة الأعلى أولويةً وينقل إليها التوقع
 * واللقطة المقفولة قبل حذف النسخة المكررة.
 */
export function dedupeFinishedAcrossSources(db: ReturnType<typeof getDb>): number {
  const finished = db
    .prepare(
      `SELECT id, league_id, season, home_team_id, away_team_id,
              date(utc_date) AS day, source, odds_home
       FROM matches WHERE status = 'FINISHED'`,
    )
    .all() as Array<{
    id: string;
    league_id: string;
    season: string;
    home_team_id: string;
    away_team_id: string;
    day: string;
    source: string;
    odds_home: number | null;
  }>;

  const groups = new Map<string, typeof finished>();
  for (const m of finished) {
    const key = `${m.league_id}|${m.home_team_id}|${m.away_team_id}|${m.day}`;
    const g = groups.get(key);
    if (g) g.push(m);
    else groups.set(key, [m]);
  }

  const migratePrediction = db.prepare(`
    UPDATE predictions SET match_id = @target
    WHERE match_id = @src
      AND NOT EXISTS (SELECT 1 FROM predictions WHERE match_id = @target)
  `);
  const migrateSnapshot = db.prepare(`
    UPDATE prediction_snapshots SET match_id = @target
    WHERE match_id = @src
      AND NOT EXISTS (SELECT 1 FROM prediction_snapshots WHERE match_id = @target)
  `);
  const deletePredictions = db.prepare(`DELETE FROM predictions WHERE match_id = ?`);
  const deleteSnapshots = db.prepare(`DELETE FROM prediction_snapshots WHERE match_id = ?`);
  const deleteMatch = db.prepare(`DELETE FROM matches WHERE id = ?`);

  const affected = new Set<string>();
  let removed = 0;

  const run = db.transaction(() => {
    for (const g of groups.values()) {
      if (g.length < 2) continue;
      const sorted = [...g].sort((a, b) => {
        const ra = SOURCE_RANK[a.source] ?? 1;
        const rb = SOURCE_RANK[b.source] ?? 1;
        if (rb !== ra) return rb - ra;
        // عند تساوي المصدر: النسخة التي تحمل أودز أغنى بالبيانات
        if ((b.odds_home != null ? 1 : 0) !== (a.odds_home != null ? 1 : 0)) {
          return (b.odds_home != null ? 1 : 0) - (a.odds_home != null ? 1 : 0);
        }
        return a.id.localeCompare(b.id);
      });
      const keeper = sorted[0]!;
      for (const dup of sorted.slice(1)) {
        migratePrediction.run({ src: dup.id, target: keeper.id });
        migrateSnapshot.run({ src: dup.id, target: keeper.id });
        deletePredictions.run(dup.id);
        deleteSnapshots.run(dup.id);
        deleteMatch.run(dup.id);
        affected.add(`${dup.league_id}|${dup.season}`);
        removed++;
      }
    }
  });
  run();

  for (const key of affected) {
    const [leagueId, season] = key.split("|") as [string, string];
    recomputeStandings(db, leagueId, season);
  }
  if (removed) {
    console.log(`  حُذفت ${removed} نتيجة مكررة عبر المصادر وأُعيد حساب الترتيب`);
  }
  return removed;
}

export async function syncFixtureSchedule() {
  const db = getDb();

  const teams = db
    .prepare("SELECT id, league_id, name_en, short_name FROM teams")
    .all() as Array<{ id: string; league_id: string; name_en: string; short_name: string | null }>;

  const exact = new Map<string, string>();
  for (const t of teams) {
    if (t.name_en) exact.set(`${t.league_id}-${norm(t.name_en)}`, t.id);
    if (t.short_name) {
      const key = `${t.league_id}-${norm(t.short_name)}`;
      if (!exact.has(key)) exact.set(key, t.id);
    }
  }

  const insertTeam = db.prepare(`
    INSERT INTO teams (id, league_id, name_ar, name_en, short_name)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `);

  let createdTeams = 0;

  function findOrCreateTeam(leagueId: string, feedName: string): string {
    const canonical = resolveTeamName(FEED_ALIASES[feedName] ?? feedName);
    const n = norm(canonical);

    const hit = exact.get(`${leagueId}-${n}`);
    if (hit) return hit;

    // مطابقة بالاحتواء: «FC Porto» → «Porto». طول 5 حروف حداً أدنى يمنع التطابقات الزائفة
    let best: { id: string; len: number } | null = null;
    for (const t of teams) {
      if (t.league_id !== leagueId || !t.name_en) continue;
      const c = norm(t.name_en);
      const shorter = Math.min(c.length, n.length);
      if (shorter < 5) continue;
      if ((n.includes(c) || c.includes(n)) && (!best || shorter > best.len)) {
        best = { id: t.id, len: shorter };
      }
    }
    if (best) {
      exact.set(`${leagueId}-${n}`, best.id);
      return best.id;
    }

    // فريق صاعد جديد غير موجود في القاعدة — يُنشأ بهوية قياسية ثابتة
    const id = `${leagueId}-${slugify(stripDiacritics(canonical))}`;
    insertTeam.run(id, leagueId, nameAr(canonical), canonical, canonical.slice(0, 12));
    teams.push({ id, league_id: leagueId, name_en: canonical, short_name: null });
    exact.set(`${leagueId}-${n}`, id);
    createdTeams++;
    console.log(`  فريق جديد: ${canonical} (${id})`);
    return id;
  }

  // المباريات المجدولة الحالية من هذا المصدر — يُحذف منها لاحقاً ما لم يعد في التغذية فقط
  const listScheduled = db.prepare(`
    SELECT id FROM matches
    WHERE league_id = ?
      AND status IN ('SCHEDULED', 'TIMED')
      AND source IN ('sportsdb', 'fixturedownload')
  `);
  const deleteMatchById = db.prepare(`DELETE FROM matches WHERE id = ?`);
  const deletePredictionsByMatch = db.prepare(`DELETE FROM predictions WHERE match_id = ?`);
  const deleteSnapshotsByMatch = db.prepare(`DELETE FROM prediction_snapshots WHERE match_id = ?`);

  // نقل التوقع واللقطة المقفولة إلى نسخة المباراة الرسمية قبل حذف النسخة المكررة
  const migratePrediction = db.prepare(`
    UPDATE predictions SET match_id = @target
    WHERE match_id = @src
      AND NOT EXISTS (SELECT 1 FROM predictions WHERE match_id = @target)
  `);
  const migrateSnapshot = db.prepare(`
    UPDATE prediction_snapshots SET match_id = @target
    WHERE match_id = @src
      AND NOT EXISTS (SELECT 1 FROM prediction_snapshots WHERE match_id = @target)
  `);

  const insertMatch = db.prepare(`
    INSERT INTO matches (
      id, league_id, season, matchday, utc_date, status,
      home_team_id, away_team_id, home_goals, away_goals, source, external_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'fixturedownload', ?)
    ON CONFLICT(id) DO UPDATE SET
      utc_date = excluded.utc_date,
      matchday = excluded.matchday,
      status = CASE
        WHEN excluded.status = 'FINISHED' THEN 'FINISHED'
        WHEN matches.status = 'FINISHED' THEN 'FINISHED'
        ELSE excluded.status
      END,
      home_goals = COALESCE(excluded.home_goals, matches.home_goals),
      away_goals = COALESCE(excluded.away_goals, matches.away_goals)
  `);

  // نتيجة منتهية من مصدر آخر (CSV الرسمي) لنفس المواجهة في نفس اليوم — لا نكرّرها
  const finishedElsewhere = db.prepare(`
    SELECT id FROM matches
    WHERE league_id = ? AND home_team_id = ? AND away_team_id = ?
      AND status = 'FINISHED' AND source != 'fixturedownload'
      AND date(utc_date) = date(?)
    LIMIT 1
  `);

  const getStatus = db.prepare(`SELECT status FROM matches WHERE id = ?`);

  let totalScheduled = 0;
  let touchedAnyLeague = false;

  for (const feed of FEEDS) {
    const fixtures = await fetchFeed(feed.slug);
    if (!fixtures) {
      console.warn(`  ${feed.id}: أُبقيت البيانات الحالية دون حذف`);
      continue;
    }
    touchedAnyLeague = true;

    let scheduled = 0;
    let finished = 0;
    let finishedFlips = 0;

    const apply = db.transaction(() => {
      const feedIds = new Set<string>();

      for (const f of fixtures) {
        if (!f.HomeTeam || !f.AwayTeam || !f.DateUtc) continue;
        // DateUtc من المصدر يجب أن يُعامل كـ UTC دائماً — بلا منطقة زمنية يُلحق Z
        let iso = f.DateUtc.trim().replace(" ", "T");
        if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso)) iso += "Z";
        const parsed = Date.parse(iso);
        if (Number.isNaN(parsed)) continue;
        iso = new Date(parsed).toISOString();

        const homeId = findOrCreateTeam(feed.id, f.HomeTeam);
        const awayId = findOrCreateTeam(feed.id, f.AwayTeam);
        const played = f.HomeTeamScore != null && f.AwayTeamScore != null;
        const id = `${feed.id}-${SEASON}-fx-${f.MatchNumber}`;

        if (played) {
          const official = finishedElsewhere.get(feed.id, homeId, awayId, iso) as
            | { id: string }
            | undefined;
          if (official) {
            // النتيجة موجودة من المصدر الرسمي: تُنقل إليها اللقطة/التوقع ثم تُحذف نسختنا
            migratePrediction.run({ src: id, target: official.id });
            migrateSnapshot.run({ src: id, target: official.id });
            deletePredictionsByMatch.run(id);
            deleteSnapshotsByMatch.run(id);
            deleteMatchById.run(id);
            continue;
          }
        }

        const before = getStatus.get(id) as { status: string } | undefined;

        insertMatch.run(
          id,
          feed.id,
          SEASON,
          f.RoundNumber ?? null,
          iso,
          played ? "FINISHED" : "SCHEDULED",
          homeId,
          awayId,
          played ? f.HomeTeamScore : null,
          played ? f.AwayTeamScore : null,
          String(f.MatchNumber),
        );
        feedIds.add(id);
        if (played) {
          finished++;
          if (before && before.status !== "FINISHED") finishedFlips++;
        } else {
          scheduled++;
        }
      }

      // حذف تفاضلي: المجدولة التي لم تعد في التغذية فقط (تغيير جدول أو بقايا مصدر قديم)
      const current = listScheduled.all(feed.id) as Array<{ id: string }>;
      for (const row of current) {
        if (feedIds.has(row.id)) continue;
        deletePredictionsByMatch.run(row.id);
        deleteSnapshotsByMatch.run(row.id);
        deleteMatchById.run(row.id);
      }
    });
    apply();

    totalScheduled += scheduled;
    console.log(
      `  ${feed.id}: ${scheduled} مجدولة + ${finished} منتهية من أصل ${fixtures.length}` +
        (finishedFlips ? ` (${finishedFlips} تحوّلت لمنتهية مع بقاء لقطاتها)` : ""),
    );

    // نتائج جديدة من التغذية تدخل الترتيب فوراً دون انتظار CSV الأسبوعي
    if (finished > 0) recomputeStandings(db, feed.id, SEASON);
  }

  if (touchedAnyLeague) {
    dedupeFinishedAcrossSources(db);
  }

  // أودز سوق حقيقية للمباريات القادمة — تُجلب بعد بناء الجدول كي تجد مبارياتها
  await syncUpcomingOdds(db);

  // توقعات يتيمة بعد إعادة بناء الجداول
  db.prepare(
    `DELETE FROM predictions WHERE match_id NOT IN (SELECT id FROM matches)`,
  ).run();

  // توقعات live-v1 المختلقة القديمة (أرقام ثابتة لا نموذج خلفها) — لم تعد تُنشأ، وتُطهَّر بقاياها
  db.prepare(`DELETE FROM predictions WHERE model_version = 'live-v1'`).run();

  console.log(
    `تم: ${totalScheduled} مباراة مجدولة عبر ${FEEDS.length} دوريات${createdTeams ? `، و${createdTeams} فريقاً جديداً` : ""}`,
  );
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  syncFixtureSchedule()
    .then(() => closeDb())
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

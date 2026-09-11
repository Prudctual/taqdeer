/**
 * حصر لائحة الترشيح على الجولة الحالية لكل دوري.
 *
 * نافذة الترشيح 14 يوماً تضم جولتين أو ثلاثاً، والترتيب بحسب الموثوقية يخلطها
 * فتظهر مباراة من الجولة القادمة فوق مباراة الغد. هنا نُبقي فقط الجولة الأقرب
 * (حسب أول انطلاق قادم) لكل دوري، ولا تظهر الجولة التالية إلا بعد اكتمالها.
 */
import type Database from "better-sqlite3";

export type RoundRow = {
  leagueId: string;
  matchday: number | null;
  utcDate: string;
};

/** مفتاح الجولة: رقم الجولة إن وُجد، وإلا يوم الانطلاق */
export function roundBucket(
  matchday: number | null | undefined,
  utcDate: string,
): string {
  return matchday != null ? `md-${matchday}` : `day-${utcDate.slice(0, 10)}`;
}

/**
 * حجم كل جولة بكل حالاتها (ملعوبة وقادمة) داخل نافذة الترشيح.
 * يميّز المباراة المؤجّلة اليتيمة (جولة من مباراة واحدة) عن ذيل جولة كاملة
 * بقيت منها مباراة واحدة — الأولى تُضمّ معها الجولة التالية، والثانية لا.
 */
function loadRoundSizes(
  db: Database.Database,
  leagueId?: string,
): Map<string, number> {
  const scoped = !!leagueId && leagueId !== "all";
  const rows = db
    .prepare(
      `
      SELECT league_id AS leagueId,
             CASE WHEN matchday IS NULL
                  THEN 'day-' || substr(utc_date, 1, 10)
                  ELSE 'md-' || matchday END AS bucket,
             count(*) AS n
      FROM matches
      WHERE substr(utc_date, 1, 19) >= strftime('%Y-%m-%dT%H:%M:%S', 'now', '-7 days')
        AND substr(utc_date, 1, 19) <= strftime('%Y-%m-%dT%H:%M:%S', 'now', '+14 days')
        AND status NOT IN ('POSTPONED', 'CANCELLED', 'CANCELED', 'SUSPENDED')
        ${scoped ? "AND league_id = ?" : ""}
      GROUP BY league_id, bucket
    `,
    )
    .all(...(scoped ? [leagueId] : [])) as Array<{
    leagueId: string;
    bucket: string;
    n: number;
  }>;
  return new Map(rows.map((r) => [`${r.leagueId}|${r.bucket}`, r.n]));
}

/**
 * يُبقي من الصفوف القادمة مباريات الجولة الأقرب لكل دوري فقط.
 * الصفوف المدخلة يجب أن تكون مباريات لم تُلعب بعد.
 */
export function keepCurrentRound<T extends RoundRow>(
  rows: T[],
  db: Database.Database,
  leagueId?: string,
): T[] {
  if (rows.length === 0) return rows;

  const byLeague = new Map<string, T[]>();
  for (const r of rows) {
    const list = byLeague.get(r.leagueId);
    if (list) list.push(r);
    else byLeague.set(r.leagueId, [r]);
  }

  const sizes = loadRoundSizes(db, leagueId);
  const allowed = new Set<string>();

  for (const [lid, list] of byLeague) {
    const order: string[] = [];
    const seen = new Set<string>();
    for (const r of [...list].sort((a, b) => a.utcDate.localeCompare(b.utcDate))) {
      const b = roundBucket(r.matchday, r.utcDate);
      if (!seen.has(b)) {
        seen.add(b);
        order.push(b);
      }
    }

    const first = order[0];
    if (!first) continue;
    allowed.add(`${lid}|${first}`);

    // جولة حجمها الكلي مباراة واحدة = مؤجّلة يتيمة — اضمّ الجولة التالية كي لا تفرغ اللائحة
    const firstSize = sizes.get(`${lid}|${first}`) ?? list.length;
    if (firstSize <= 1 && order[1]) {
      allowed.add(`${lid}|${order[1]}`);
    }
  }

  return rows.filter((r) =>
    allowed.has(`${r.leagueId}|${roundBucket(r.matchday, r.utcDate)}`),
  );
}

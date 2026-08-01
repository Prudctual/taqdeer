/**
 * تصنيف ذكي لحالة المباراة في الواجهة:
 * لم تُلعب بعد · جارية · انتهت (مع مراعاة تأخّر تحديث الحالة من المصدر).
 */

export type MatchPhase =
  | "scheduled"
  | "live"
  | "finished"
  | "postponed"
  | "cancelled";

const LIVE_STATUSES = new Set([
  "IN_PLAY",
  "PAUSED",
  "LIVE",
  "1H",
  "2H",
  "HT",
  "ET",
  "P",
  "BREAK",
  "BT",
  "INT",
]);

const FINISHED_STATUSES = new Set([
  "FINISHED",
  "FT",
  "AET",
  "PEN",
  "COMPLETED",
  "AWARDED",
]);

const POSTPONED_STATUSES = new Set(["POSTPONED", "SUSPENDED"]);
const CANCELLED_STATUSES = new Set(["CANCELLED", "CANCELED", "ABANDONED"]);

/** مدة نموذجية قصوى للمباراة (شوطان + وقت بدل + هامش) */
export const MATCH_WINDOW_MS = 150 * 60 * 1000;

export type MatchStatusInput = {
  status: string;
  utcDate: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
  now?: number | Date;
};

function normalizeStatus(status: string): string {
  return (status || "").toUpperCase().trim();
}

function toMs(now?: number | Date): number {
  if (now == null) return Date.now();
  return typeof now === "number" ? now : now.getTime();
}

/** هل الحالة صريحة: جارية؟ */
export function isLiveStatus(status: string): boolean {
  return LIVE_STATUSES.has(normalizeStatus(status));
}

/** هل الحالة صريحة: منتهية؟ */
export function isFinishedStatus(status: string): boolean {
  return FINISHED_STATUSES.has(normalizeStatus(status));
}

/**
 * يحدّد مرحلة المباراة من الحالة الرسمية مع سقوط زمني ذكي
 * عندما يتأخّر المصدر عن تحديث الحالة بعد صافرة البداية أو النهاية.
 */
export function resolveMatchPhase(input: MatchStatusInput): MatchPhase {
  const status = normalizeStatus(input.status);
  const now = toMs(input.now);

  if (CANCELLED_STATUSES.has(status)) return "cancelled";
  if (POSTPONED_STATUSES.has(status)) return "postponed";
  if (FINISHED_STATUSES.has(status)) return "finished";
  if (LIVE_STATUSES.has(status)) return "live";

  const kickoff = Date.parse(input.utcDate);
  if (!Number.isFinite(kickoff)) return "scheduled";

  const elapsed = now - kickoff;

  // لم تبدأ بعد
  if (elapsed < 0) return "scheduled";

  // داخل نافذة المباراة المعتادة — اعتبرها جارية حتى يصل تحديث رسمي
  if (elapsed <= MATCH_WINDOW_MS) return "live";

  // تجاوزت النافذة دون حالة مباشرة → انتهت
  return "finished";
}

/** هل النتيجة جاهزة للعرض؟ */
export function hasRecordedScore(
  homeGoals: number | null | undefined,
  awayGoals: number | null | undefined,
): boolean {
  return homeGoals != null && awayGoals != null;
}

/**
 * نص النتيجة للواجهة، أو null لعرض VS/ضد.
 * - جارية: تظهر دائماً (0–0 مقبول قبل الهدف الأول)
 * - منتهية: تظهر فقط عند وجود أهداف مسجّلة
 * - لم تُلعب / مؤجّلة / ملغاة: null
 */
export function formatMatchScore(
  phase: MatchPhase,
  homeGoals: number | null | undefined,
  awayGoals: number | null | undefined,
): string | null {
  if (phase === "live") {
    return `${homeGoals ?? 0}–${awayGoals ?? 0}`;
  }
  if (phase === "finished" && hasRecordedScore(homeGoals, awayGoals)) {
    return `${homeGoals}–${awayGoals}`;
  }
  return null;
}

/** اختصار شائع للمكوّنات: مرحلة + نص النتيجة */
export function matchDisplay(input: MatchStatusInput): {
  phase: MatchPhase;
  isLive: boolean;
  isFinished: boolean;
  isScheduled: boolean;
  score: string | null;
} {
  const phase = resolveMatchPhase(input);
  return {
    phase,
    isLive: phase === "live",
    isFinished: phase === "finished",
    isScheduled: phase === "scheduled",
    score: formatMatchScore(phase, input.homeGoals, input.awayGoals),
  };
}

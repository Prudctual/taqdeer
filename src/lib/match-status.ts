/**
 * تصنيف ذكي لحالة المباراة في الواجهة:
 * لم تبدأ · انطلقت بانتظار البيانات · جارية · انتهت.
 *
 * القاعدة الحاكمة: لا نزعم أن المباراة «جارية» إلا بدليل من المصدر
 * (حالة مباشرة، أو دقيقة، أو نتيجة مسجّلة). مضيّ موعد الانطلاق وحده لا يكفي،
 * فكثير من المباريات لا يصلها بث حيّ وتبقى حالتها SCHEDULED إلى ما بعد نهايتها.
 */

export type MatchPhase =
  | "scheduled"
  | "awaiting"
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

/** زمن اللعب الفعلي: شوطان + استراحة + وقت بدل محتسب */
export const MATCH_DURATION_MS = 115 * 60 * 1000;

/** بعد هذا الحد تُعدّ الحالة المباشرة عالقة — المصدر توقف عن التحديث */
export const STALE_LIVE_MS = 4 * 60 * 60 * 1000;

export type MatchStatusInput = {
  status: string;
  utcDate: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
  minute?: number | null;
  liveStatusAr?: string | null;
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

/** هل النتيجة مسجّلة؟ */
export function hasRecordedScore(
  homeGoals: number | null | undefined,
  awayGoals: number | null | undefined,
): boolean {
  return homeGoals != null && awayGoals != null;
}

/** دليل من المصدر على أن المباراة انطلقت فعلاً */
function hasLiveSignal(input: MatchStatusInput): boolean {
  return (
    input.minute != null ||
    !!input.liveStatusAr ||
    hasRecordedScore(input.homeGoals, input.awayGoals)
  );
}

export function resolveMatchPhase(input: MatchStatusInput): MatchPhase {
  const status = normalizeStatus(input.status);
  const now = toMs(input.now);

  if (CANCELLED_STATUSES.has(status)) return "cancelled";
  if (POSTPONED_STATUSES.has(status)) return "postponed";
  if (FINISHED_STATUSES.has(status)) return "finished";

  const kickoff = Date.parse(input.utcDate);
  const elapsed = Number.isFinite(kickoff) ? now - kickoff : null;

  if (LIVE_STATUSES.has(status)) {
    // حالة مباشرة عالقة بعد نهاية المباراة بزمن طويل → نعتبرها منتهية
    if (elapsed != null && elapsed > STALE_LIVE_MS) return "finished";
    return "live";
  }

  if (elapsed == null || elapsed < 0) return "scheduled";

  if (elapsed <= MATCH_DURATION_MS) {
    // داخل زمن اللعب: «جارية» فقط بدليل، وإلا فهي انطلقت وبيانها متأخر
    return hasLiveSignal(input) ? "live" : "awaiting";
  }

  // تجاوزت زمن اللعب بلا حالة مباشرة → انتهت
  return "finished";
}

/**
 * نص النتيجة للواجهة، أو null عند غيابها.
 * - جارية: تظهر دائماً (0–0 مقبول قبل الهدف الأول)
 * - منتهية: تظهر فقط عند وجود أهداف مسجّلة
 * - لم تبدأ / بانتظار البيانات / مؤجّلة / ملغاة: null
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

/** تسمية عربية موجزة تصلح للشارات الضيقة */
export function matchPhaseBadge(phase: MatchPhase): string {
  switch (phase) {
    case "finished":
      return "انتهت";
    case "awaiting":
      return "—";
    case "postponed":
      return "مؤجّلة";
    case "cancelled":
      return "ملغاة";
    default:
      return "VS";
  }
}

/** تسمية عربية كاملة للسياقات الفسيحة */
export function matchPhaseLabel(phase: MatchPhase): string {
  switch (phase) {
    case "live":
      return "جارية الآن";
    case "finished":
      return "انتهت";
    case "awaiting":
      return "بانتظار النتيجة";
    case "postponed":
      return "مؤجّلة";
    case "cancelled":
      return "ملغاة";
    default:
      return "لم تبدأ";
  }
}

/** اختصار شائع للمكوّنات: مرحلة + نتيجة + تسميات */
export function matchDisplay(input: MatchStatusInput): {
  phase: MatchPhase;
  isLive: boolean;
  isFinished: boolean;
  isScheduled: boolean;
  isAwaiting: boolean;
  score: string | null;
  badge: string;
  label: string;
} {
  const phase = resolveMatchPhase(input);
  return {
    phase,
    isLive: phase === "live",
    isFinished: phase === "finished",
    isScheduled: phase === "scheduled",
    isAwaiting: phase === "awaiting",
    score: formatMatchScore(phase, input.homeGoals, input.awayGoals),
    badge: matchPhaseBadge(phase),
    label: matchPhaseLabel(phase),
  };
}

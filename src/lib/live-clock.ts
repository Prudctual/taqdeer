/** ساعة مباراة حية — تقدير من الانطلاق + تثبيت على آخر مزامنة */

export type LivePeriod = "NS" | "1H" | "HT" | "2H" | "FT";

export type LiveClockState = {
  period: LivePeriod;
  /** الدقيقة المعروضة (1–45 أو 46–90 أو بدل ضائع كرقم أساسي) */
  minute: number;
  /** الثواني داخل الدقيقة الحالية 0–59 */
  second: number;
  /** دقائق بدل ضائع فوق 45/90 إن وُجدت */
  stoppage: number;
  /** هل الساعة تتحرك؟ (متوقفة في الاستراحة) */
  ticking: boolean;
  /** عرض مضغوط مثل البث: 14:37 أو 45+2 أو HT */
  display: string;
  /** سطر عربي كامل */
  labelAr: string;
  /** شارة قصيرة للقوائم */
  shortAr: string;
};

export function estimateMinuteFromKickoff(
  utcDate: string,
  nowMs = Date.now(),
): { minute: number; liveStatusAr: string; period: Exclude<LivePeriod, "NS"> } | null {
  const kickoff = Date.parse(utcDate);
  if (!Number.isFinite(kickoff)) return null;
  const elapsed = Math.floor((nowMs - kickoff) / 60_000);
  if (elapsed < 0) return null;
  if (elapsed <= 45) {
    return {
      minute: Math.max(1, elapsed),
      liveStatusAr: `الشوط الأول · د ${Math.max(1, elapsed)}'`,
      period: "1H",
    };
  }
  if (elapsed <= 60) {
    return { minute: 45, liveStatusAr: "استراحة الشوطين", period: "HT" };
  }
  if (elapsed <= 105) {
    const m = Math.min(90, elapsed - 15);
    return {
      minute: m,
      liveStatusAr: `الشوط الثاني · د ${m}'`,
      period: "2H",
    };
  }
  if (elapsed <= 120) {
    return { minute: 90, liveStatusAr: "وقت بدل ضائع / ختام", period: "2H" };
  }
  return { minute: 90, liveStatusAr: "انتهت", period: "FT" };
}

/** يستخرج دقيقة رقمية من نص FotMob مثل "7’" أو "45+2" */
export function parseLiveMinute(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, Math.round(raw));
  const s = String(raw).replace(/[\u200e\u200f\u202a-\u202e]/g, "").trim();
  const plus = s.match(/(\d+)\s*\+\s*(\d+)/);
  if (plus) return parseInt(plus[1]!, 10) + parseInt(plus[2]!, 10);
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1]!, 10) : null;
}

export function liveStatusFromFotmob(status: {
  started?: boolean;
  finished?: boolean;
  ongoing?: boolean;
  liveTime?: { short?: string; long?: string; maxTime?: number; addedTime?: number };
  halfs?: Record<string, string>;
}): { minute: number | null; liveStatusAr: string; statusStr: string } {
  if (status.finished) {
    return { minute: 90, liveStatusAr: "انتهت", statusStr: "FINISHED" };
  }
  if (!status.started && !status.ongoing) {
    return { minute: null, liveStatusAr: "", statusStr: "SCHEDULED" };
  }

  const minute = parseLiveMinute(status.liveTime?.short ?? status.liveTime?.long);
  const halfs = status.halfs || {};
  const firstEnded = !!halfs.firstHalfEnded;
  const secondStarted = !!halfs.secondHalfStarted;

  if (firstEnded && !secondStarted) {
    return { minute: 45, liveStatusAr: "استراحة الشوطين", statusStr: "IN_PLAY" };
  }
  if (secondStarted || (minute != null && minute > 45)) {
    return {
      minute: minute ?? 46,
      liveStatusAr: `الشوط الثاني · د ${minute ?? 46}'`,
      statusStr: "IN_PLAY",
    };
  }
  return {
    minute: minute ?? 1,
    liveStatusAr: `الشوط الأول · د ${minute ?? 1}'`,
    statusStr: "IN_PLAY",
  };
}

function detectPeriod(
  liveStatusAr: string | null | undefined,
  syncedMinute: number | null | undefined,
  kickoffPeriod: LivePeriod | null,
): LivePeriod {
  const s = liveStatusAr || "";
  if (s.includes("انتهت") || s.includes("نهاية")) return "FT";
  if (s.includes("استراحة")) return "HT";
  if (s.includes("الثاني") || s.includes("إضافي")) return "2H";
  if (s.includes("الأول")) return "1H";
  if (syncedMinute != null) {
    if (syncedMinute > 45) return "2H";
    if (syncedMinute === 45 && s.includes("استراحة")) return "HT";
  }
  return kickoffPeriod && kickoffPeriod !== "NS" ? kickoffPeriod : "1H";
}

function formatClockParts(
  period: LivePeriod,
  baseMinute: number,
  second: number,
): Pick<LiveClockState, "minute" | "second" | "stoppage" | "display" | "labelAr" | "shortAr" | "ticking"> {
  const pad = (n: number) => String(n).padStart(2, "0");

  if (period === "HT") {
    return {
      minute: 45,
      second: 0,
      stoppage: 0,
      ticking: false,
      display: "HT",
      shortAr: "استراحة",
      labelAr: "استراحة الشوطين",
    };
  }
  if (period === "FT") {
    return {
      minute: 90,
      second: 0,
      stoppage: 0,
      ticking: false,
      display: "FT",
      shortAr: "انتهت",
      labelAr: "انتهت المباراة",
    };
  }

  const halfCap = period === "2H" ? 90 : 45;
  const halfStart = period === "2H" ? 46 : 1;
  let minute = Math.max(halfStart, baseMinute);
  let stoppage = 0;

  if (minute > halfCap) {
    stoppage = minute - halfCap;
    minute = halfCap;
  }

  const display =
    stoppage > 0
      ? `${halfCap}+${stoppage}:${pad(second)}`
      : `${minute}:${pad(second)}`;

  const periodAr = period === "2H" ? "الشوط الثاني" : "الشوط الأول";
  const shortAr =
    stoppage > 0 ? `${halfCap}+${stoppage}'` : `${minute}:${pad(second)}`;
  const labelAr =
    stoppage > 0
      ? `${periodAr} · ${halfCap}+${stoppage}'`
      : `${periodAr} · ${minute}:${pad(second)}`;

  return {
    minute: stoppage > 0 ? halfCap : minute,
    second,
    stoppage,
    ticking: true,
    display,
    shortAr,
    labelAr,
  };
}

/**
 * ساعة حية احترافية:
 * - تُثبَّت على آخر دقيقة مزامَنة ثم تتقدّم بالثواني محلياً
 * - تتوقف عند الاستراحة
 * - تُقدَّر من موعد الانطلاق إن لم تصل مزامنة بعد
 */
export function resolveLiveClock(opts: {
  utcDate: string;
  nowMs: number;
  syncedMinute?: number | null;
  /** وقت استلام آخر دقيقة من المصدر */
  syncedAtMs?: number | null;
  liveStatusAr?: string | null;
}): LiveClockState {
  const est = estimateMinuteFromKickoff(opts.utcDate, opts.nowMs);
  const period = detectPeriod(
    opts.liveStatusAr,
    opts.syncedMinute,
    est?.period ?? null,
  );

  if (period === "HT" || period === "FT") {
    return { period, ...formatClockParts(period, period === "FT" ? 90 : 45, 0) };
  }

  const kickoff = Date.parse(opts.utcDate);
  let totalSeconds: number;

  if (
    opts.syncedMinute != null &&
    opts.syncedAtMs != null &&
    Number.isFinite(opts.syncedAtMs)
  ) {
    const advanceSec = Math.max(
      0,
      Math.floor((opts.nowMs - opts.syncedAtMs) / 1000),
    );
    totalSeconds = opts.syncedMinute * 60 + advanceSec;
  } else if (Number.isFinite(kickoff) && opts.nowMs >= kickoff) {
    // من الانطلاق مع خصم استراحة 15 دقيقة بعد الدقيقة 45
    let elapsedSec = Math.floor((opts.nowMs - kickoff) / 1000);
    if (elapsedSec > 45 * 60) {
      // أثناء الاستراحة
      if (elapsedSec <= 60 * 60) {
        return { period: "HT", ...formatClockParts("HT", 45, 0) };
      }
      elapsedSec -= 15 * 60; // أزل الاستراحة للشوط الثاني
    }
    totalSeconds = Math.max(60, elapsedSec); // ابدأ من 1:00 تقريباً
  } else {
    const m = Math.max(1, opts.syncedMinute ?? est?.minute ?? 1);
    totalSeconds = m * 60;
  }

  // لا ترجع للخلف عن آخر مزامنة
  if (opts.syncedMinute != null) {
    totalSeconds = Math.max(totalSeconds, opts.syncedMinute * 60);
  }

  let minute = Math.floor(totalSeconds / 60);
  let second = totalSeconds % 60;

  // حدود الشوط
  if (period === "1H" && minute > 45) {
    // بدل ضائع الشوط الأول
    second = totalSeconds - 45 * 60;
    const stopMin = Math.floor(second / 60);
    second = second % 60;
    minute = 45 + stopMin;
  }
  if (period === "2H") {
    // تأكد أننا في نطاق الشوط الثاني
    if (minute < 46) minute = Math.max(46, minute);
  }

  return {
    period,
    ...formatClockParts(period, minute, second),
  };
}

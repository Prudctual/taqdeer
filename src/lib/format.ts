export function pct(p: number, digits = 0): string {
  return `${(p * 100).toFixed(digits)}٪`;
}

/** نسبة لخصائص CSS فقط — علامة % اللاتينية */
export function pctCss(p: number, digits = 2): string {
  return `${(p * 100).toFixed(digits)}%`;
}

/**
 * الصفحات تُرسم على الخادم وتُخزَّن مؤقتاً، فلا يوجد "توقيت محلي" للقارئ وقت الرسم.
 * نثبّت منطقة عرض واحدة معلنة بدل توقيت الخادم العشوائي.
 */
export const DISPLAY_TZ = "Asia/Riyadh";
export const DISPLAY_TZ_LABEL = "بتوقيت مكة";

function parseDate(iso: string): Date {
  return new Date(iso);
}

const isoDayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: DISPLAY_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** رقم اليوم التقويمي في منطقة العرض */
function dayNumber(d: Date): number {
  const [y, m, day] = isoDayFmt.format(d).split("-").map(Number);
  return Math.round(Date.UTC(y!, m! - 1, day!) / 86_400_000);
}

/** فرق الأيام التقويمية في منطقة العرض (موجب = مستقبل) */
export function calendarDayOffset(iso: string, now = new Date()): number {
  return dayNumber(parseDate(iso)) - dayNumber(now);
}

/** اليوم / غداً / أمس عند القرب؛ وإلا null */
export function formatRelativeDay(iso: string, now = new Date()): string | null {
  const offset = calendarDayOffset(iso, now);
  if (offset === 0) return "اليوم";
  if (offset === 1) return "غداً";
  if (offset === 2) return "بعد غد";
  if (offset === -1) return "أمس";
  if (offset === -2) return "قبل أمس";
  return null;
}

export function formatMatchTime(iso: string): string {
  return new Intl.DateTimeFormat("ar", {
    timeZone: DISPLAY_TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(parseDate(iso));
}

/** يوم مختصر: ١٥ أغسطس */
export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("ar", {
    timeZone: DISPLAY_TZ,
    day: "numeric",
    month: "short",
  }).format(parseDate(iso));
}

/** يوم كامل بدون وقت: السبت ١٥ أغسطس */
export function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat("ar", {
    timeZone: DISPLAY_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parseDate(iso));
}

/** عنوان سكة الأيام: اليوم · السبت ١٥ أغسطس */
export function formatDayHeading(iso: string, now = new Date()): string {
  const rel = formatRelativeDay(iso, now);
  const full = formatLongDate(iso);
  return rel ? `${rel} · ${full}` : full;
}

/** سطر موعد المباراة: غداً · ٢٠:٣٠ أو السبت ١٥ أغسطس · ٢٠:٣٠ */
export function formatMatchDate(iso: string, now = new Date()): string {
  const rel = formatRelativeDay(iso, now);
  const time = formatMatchTime(iso);
  if (rel) return `${rel} · ${time}`;
  return `${formatLongDate(iso)} · ${time}`;
}

/** ختم زمني للميتا (آخر تدريب) */
export function formatMetaStamp(iso: string): string {
  return new Intl.DateTimeFormat("ar", {
    timeZone: DISPLAY_TZ,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parseDate(iso));
}

function pluralAr(
  n: number,
  one: string,
  dual: string,
  few: string,
  many: string,
): string {
  const abs = Math.abs(n);
  if (abs === 1) return one;
  if (abs === 2) return dual;
  if (abs >= 3 && abs <= 10) return few;
  return many;
}

/** عدّ تنازلي بشري للمباريات القادمة */
export function formatCountdown(iso: string, now = new Date()): string {
  const t = parseDate(iso).getTime() - now.getTime();
  if (t <= 0) return "الآن";

  const mins = Math.round(t / 60_000);
  if (mins < 60) {
    if (mins <= 1) return "خلال دقيقة";
    return `بعد ${mins} ${pluralAr(mins, "دقيقة", "دقيقتين", "دقائق", "دقيقة")}`;
  }

  const hours = Math.round(mins / 60);
  if (hours < 24) {
    if (hours === 1) return "بعد ساعة";
    if (hours === 2) return "بعد ساعتين";
    return `بعد ${hours} ${pluralAr(hours, "ساعة", "ساعتين", "ساعات", "ساعة")}`;
  }

  const days = Math.round(hours / 24);
  if (days < 14) {
    if (days === 1) return "بعد يوم";
    if (days === 2) return "بعد يومين";
    return `بعد ${days} ${pluralAr(days, "يوم", "يومين", "أيام", "يوماً")}`;
  }

  const weeks = Math.round(days / 7);
  if (weeks === 1) return "بعد أسبوع";
  if (weeks === 2) return "بعد أسبوعين";
  return `بعد ${weeks} ${pluralAr(weeks, "أسبوع", "أسبوعين", "أسابيع", "أسبوعاً")}`;
}

/** أجزاء جاهزة لواجهة الموعد */
export function kickoffParts(iso: string, now = new Date()) {
  const rel = formatRelativeDay(iso, now);
  return {
    relative: rel,
    weekday: new Intl.DateTimeFormat("ar", { timeZone: DISPLAY_TZ, weekday: "long" }).format(
      parseDate(iso),
    ),
    date: formatShortDate(iso),
    longDate: formatLongDate(iso),
    time: formatMatchTime(iso),
    countdown: formatCountdown(iso, now),
    dayHeading: formatDayHeading(iso, now),
    line: formatMatchDate(iso, now),
  };
}

/** YYYY-MM-DD in local calendar for grouping fixtures */
export function dayKey(iso: string): string {
  return isoDayFmt.format(parseDate(iso));
}

export function groupByDay<T extends { utcDate: string }>(
  items: T[],
  now = new Date(),
): { key: string; label: string; relative: string | null; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = dayKey(item.utcDate);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return [...map.entries()].map(([key, group]) => {
    const sample = group[0]!.utcDate;
    return {
      key,
      label: formatDayHeading(sample, now),
      relative: formatRelativeDay(sample, now),
      items: group,
    };
  });
}

/** بديل الشعار الغائب: أول حرفين من اسم النادي — يعرّف الفريق، بخلاف رمز 1/2 العام */
export function crestInitials(name: string): string {
  const word = name.trim().split(/\s+/).find((w) => /\p{L}/u.test(w));
  return word?.slice(0, 2).trim() || "•";
}

export function confidenceLabel(c: number): string {
  if (c >= 0.72) return "إشارة واضحة";
  if (c >= 0.55) return "إشارة متوسطة";
  return "مباراة متقاربة";
}

export type OutcomeKey = "H" | "D" | "A";

export function topOutcome(
  pHome: number,
  pDraw: number,
  pAway: number,
): { key: OutcomeKey; label: string; p: number } {
  if (pHome >= pDraw && pHome >= pAway) {
    return { key: "H", label: "فوز المضيف", p: pHome };
  }
  if (pAway >= pDraw && pAway >= pHome) {
    return { key: "A", label: "فوز الضيف", p: pAway };
  }
  return { key: "D", label: "تعادل", p: pDraw };
}

export function outcomeLabel(pHome: number, pDraw: number, pAway: number): string {
  return topOutcome(pHome, pDraw, pAway).label;
}

/** نتيجة فعلية من أهداف المباراة */
export function actualOutcome(
  homeGoals: number,
  awayGoals: number,
): OutcomeKey {
  if (homeGoals > awayGoals) return "H";
  if (awayGoals > homeGoals) return "A";
  return "D";
}

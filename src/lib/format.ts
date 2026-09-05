/** نسب النموذج تُعرض بمنزلة عشرية واحدة — لا تقريب يخفي الفوارق الحقيقية */
export function pct(p: number, digits = 1): string {
  return `${(p * 100).toFixed(digits)}٪`;
}

/** نسبة لخصائص CSS فقط — علامة % اللاتينية */
export function pctCss(p: number, digits = 2): string {
  return `${(p * 100).toFixed(digits)}%`;
}

/**
 * الصفحات تُرسم على الخادم، فلا يوجد توقيت متصفح موثوق وقت الرسم.
 * العرض للقارئ: أونتاريو. ختم البيانات: العراق (المصدر المخزّن بعد التحويل من UTC).
 */
export const DATA_TZ = "Asia/Baghdad";
export const DATA_TZ_LABEL = "العراق";
export const DISPLAY_TZ = "America/Toronto";
export const DISPLAY_TZ_LABEL = "أونتاريو";

function parseDate(iso: string): Date {
  return new Date(iso);
}

function isoDayFmtFor(tz: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

const isoDayFmt = isoDayFmtFor(DISPLAY_TZ);

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

export function cleanSpace(str: string): string {
  return str.replace(/[\u00a0\u202f\u2007\u200b]/g, " ").replace(/\s+/g, " ").trim();
}

/** بعض المصادر تخزّن اليوم فقط كـ midnight UTC — لا نعرض ساعة وهمية. */
export function hasKnownKickoffTime(iso: string): boolean {
  return !/T00:00:00(\.0+)?Z?$/i.test(iso.trim());
}

/**
 * ساعة الانطلاق. الافتراضي أونتاريو. مرّر DATA_TZ لتوقيت العراق المخزّن.
 * صيغة 24 ساعة بأرقام لاتينية (21:00 لا 09:00 م).
 */
export function formatMatchTime(iso: string, tz?: string): string {
  if (!hasKnownKickoffTime(iso)) return "—";
  return cleanSpace(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz || DISPLAY_TZ,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(parseDate(iso))
  );
}

/** يوم مختصر: ١٥ أغسطس */
export function formatShortDate(iso: string, tz?: string): string {
  return cleanSpace(
    new Intl.DateTimeFormat("ar", {
      timeZone: tz || DISPLAY_TZ,
      day: "numeric",
      month: "short",
    }).format(parseDate(iso))
  );
}

/** يوم كامل بدون وقت: السبت ١٥ أغسطس ٢٠٢٦ */
export function formatLongDate(iso: string, tz?: string): string {
  return cleanSpace(
    new Intl.DateTimeFormat("ar", {
      timeZone: tz || DISPLAY_TZ,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(parseDate(iso))
  );
}

export function dayKeyInTz(iso: string, tz: string): string {
  return isoDayFmtFor(tz).format(parseDate(iso));
}

/** موعد كامل للجدول: تاريخ أونتاريو + ساعته + ساعة العراق للبيانات */
export function formatKickoffAbsolute(iso: string): string {
  const ontDate = formatLongDate(iso, DISPLAY_TZ);
  if (!hasKnownKickoffTime(iso)) {
    const irqDate = formatLongDate(iso, DATA_TZ);
    return ontDate === irqDate
      ? ontDate
      : `${ontDate} ${DISPLAY_TZ_LABEL} · ${irqDate} ${DATA_TZ_LABEL}`;
  }
  const ontTime = formatMatchTime(iso, DISPLAY_TZ);
  const irqTime = formatMatchTime(iso, DATA_TZ);
  if (dayKey(iso) === dayKeyInTz(iso, DATA_TZ)) {
    return `${ontDate} · ${ontTime} ${DISPLAY_TZ_LABEL} · ${irqTime} ${DATA_TZ_LABEL}`;
  }
  const irqDate = formatLongDate(iso, DATA_TZ);
  return `${ontDate} · ${ontTime} ${DISPLAY_TZ_LABEL} · ${irqDate} · ${irqTime} ${DATA_TZ_LABEL}`;
}

/** عنوان سكة الأيام: اليوم · السبت ١٥ أغسطس ٢٠٢٦ */
export function formatDayHeading(iso: string, now = new Date()): string {
  const rel = formatRelativeDay(iso, now);
  const full = formatLongDate(iso);
  return rel ? `${rel} · ${full}` : full;
}

/** سطر موعد المباراة مع اليوم النسبي إن وُجد */
export function formatMatchDate(iso: string, now = new Date()): string {
  const rel = formatRelativeDay(iso, now);
  const abs = formatKickoffAbsolute(iso);
  return rel ? `${rel} · ${abs}` : abs;
}

/** ختم زمني للميتا (آخر تدريب) */
export function formatMetaStamp(iso: string): string {
  return cleanSpace(
    new Intl.DateTimeFormat("ar", {
      timeZone: DISPLAY_TZ,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parseDate(iso))
  );
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
  const knownTime = hasKnownKickoffTime(iso);
  return {
    relative: rel,
    weekday: new Intl.DateTimeFormat("ar", { timeZone: DISPLAY_TZ, weekday: "long" }).format(
      parseDate(iso),
    ),
    date: formatShortDate(iso),
    longDate: formatLongDate(iso),
    time: formatMatchTime(iso),
    dataTime: formatMatchTime(iso, DATA_TZ),
    dataDate: formatLongDate(iso, DATA_TZ),
    knownTime,
    countdown: formatCountdown(iso, now),
    dayHeading: formatDayHeading(iso, now),
    line: formatMatchDate(iso, now),
    absolute: formatKickoffAbsolute(iso),
  };
}

/** YYYY-MM-DD in local calendar for grouping fixtures */
export function dayKey(iso: string): string {
  return isoDayFmt.format(parseDate(iso));
}

export function groupByDay<T extends { utcDate: string }>(
  items: T[],
  now = new Date(),
  direction: "asc" | "desc" = "asc",
): { key: string; label: string; relative: string | null; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = dayKey(item.utcDate);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return [...map.entries()]
    .sort(([keyA], [keyB]) =>
      direction === "desc" ? keyB.localeCompare(keyA) : keyA.localeCompare(keyB),
    )
    .map(([key, group]) => {
      // Ensure matches inside each day are sorted by kickoff time ascending
      group.sort((a, b) => a.utcDate.localeCompare(b.utcDate));
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

export const BANKER_EDGE_GAP = 0.08;
/** أأمن التوقعات: ثقة «إشارة متوسطة» على الأقل */
export const BANKER_MIN_CONFIDENCE = 0.55;
/** أأمن التوقعات: أفضلية حقيقية لـ 1 أو 2، لا تعادل ولا سباق متقارب */
export const BANKER_MIN_PROBABILITY = 0.5;

export type OutcomeKey = "H" | "D" | "A" | "EQ";

export function topOutcome(
  pHome: number,
  pDraw: number,
  pAway: number,
): { key: OutcomeKey; label: string; p: number; isEquallyBalanced?: boolean } {
  const sorted = [
    { key: "H" as const, label: "فوز المضيف", p: pHome },
    { key: "D" as const, label: "تعادل", p: pDraw },
    { key: "A" as const, label: "فوز الضيف", p: pAway },
  ].sort((a, b) => b.p - a.p);

  const top1 = sorted[0]!;
  const top2 = sorted[1]!;

  // حد التكافؤ: أقل من 8٪ بين الأول والثاني → لا نُقدّم «إشارة حاسمة»
  // (حالة ساندفيورد 40٪ مقابل 33٪ كانت ستُعامل كمتكافئة)
  if (top1.p - top2.p < BANKER_EDGE_GAP) {
    return {
      key: "EQ",
      label: "مواجهة متكافئة",
      p: top1.p,
      isEquallyBalanced: true,
    };
  }

  return top1;
}

/**
 * اختيار بنكر صريح: فوز مضيف أو ضيف بفجوة وثقة كافيتين.
 * المواجهة المتكافئة تُستبعد — لا نُعلن فائزاً بفارق 1–2٪.
 */
export function selectBankerSide(
  pHome: number,
  pDraw: number,
  pAway: number,
  confidence: number | null | undefined,
): { key: "H" | "A"; label: string; p: number } | null {
  const pick = topOutcome(pHome, pDraw, pAway);
  if (pick.isEquallyBalanced || pick.key === "EQ" || pick.key === "D") {
    return null;
  }
  if (pick.p < BANKER_MIN_PROBABILITY) return null;
  if ((confidence ?? 0) < BANKER_MIN_CONFIDENCE) return null;
  return {
    key: pick.key,
    label: pick.key === "H" ? "فوز المضيف (1)" : "فوز الضيف (2)",
    p: pick.p,
  };
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




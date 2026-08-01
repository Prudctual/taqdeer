"use client";

import { useEffect, useState } from "react";
import {
  formatCountdown,
  formatLongDate,
  formatMatchTime,
  formatRelativeDay,
  formatShortDate,
} from "@/lib/format";

type Variant = "row" | "inline" | "detail";

/**
 * ساعة العميل — تُقرأ بعد التركيب فقط.
 * الخادم وأول رسم في المتصفح يتفقان على null، فلا ينحرف الترطيب.
 * الوقت المطلق يبقى في HTML من الخادم؛ التسميات النسبية تُضاف بعد التركيب.
 */
function useClientNow(tick: boolean): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    if (!tick) return;
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, [tick]);

  return now;
}

function useClientTz(): string | undefined {
  const [tz, setTz] = useState<string | undefined>(undefined);

  useEffect(() => {
    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (userTz) setTz(userTz);
    } catch {
      // fallback to default DISPLAY_TZ
    }
  }, []);

  return tz;
}

/**
 * عرض موحّد لموعد المباراة — تاريخ / وقت / عدّ تنازلي.
 * row: عمود القائمة · inline: سطر واحد · detail: صفحة المباراة
 */
export function MatchWhen({
  iso,
  variant = "inline",
  showCountdown = true,
  finished = false,
  isLive = false,
  liveMinute = null,
  liveStatusAr = null,
  /** إخفاء «اليوم/غداً» عند وجودها في سكة الأيام أعلاه */
  hideRelative = false,
  className = "",
}: {
  iso: string;
  variant?: Variant;
  showCountdown?: boolean;
  finished?: boolean;
  isLive?: boolean;
  liveMinute?: number | null;
  liveStatusAr?: string | null;
  hideRelative?: boolean;
  className?: string;
}) {
  /** هل ينتظر السطر عدّاً تنازلياً؟ يُحجز مكانه مسبقاً فلا يقفز السطر */
  const live = showCountdown && !finished && !isLive;
  const now = useClientNow(live);
  const clientTz = useClientTz();

  // مطلق — مشتق من التاريخ وحده بتوقيت جهاز القارئ
  const time = formatMatchTime(iso, clientTz);
  const shortDate = formatShortDate(iso, clientTz);
  const longDate = formatLongDate(iso, clientTz);

  // نسبي — مشتق من الساعة، بعد التركيب فقط
  const relative = now && !hideRelative ? formatRelativeDay(iso, now) : null;
  const countdown = live && now ? formatCountdown(iso, now) : null;

  if (isLive) {
    const liveText = liveStatusAr || (liveMinute ? `د ${liveMinute}'` : "مباشر الآن");
    if (variant === "row") {
      return (
        <div className={`min-w-0 tabular ${className}`}>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>{liveText}</span>
          </span>
        </div>
      );
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs ${className}`}>
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        <span>مباشر · {liveText}</span>
      </span>
    );
  }

  if (variant === "row") {
    return (
      <div className={`min-w-0 tabular ${className}`}>
        <time
          dateTime={iso}
          suppressHydrationWarning
          className="block text-[13px] font-semibold leading-none text-ink"
        >
          {time}
        </time>
        {!hideRelative ? (
          <div
            suppressHydrationWarning
            className={`mt-1.5 truncate text-[11px] leading-none ${
              relative ? "text-accent" : "text-faint"
            }`}
          >
            {relative ?? shortDate}
          </div>
        ) : null}
        {live ? (
          <div
            suppressHydrationWarning
            className="mt-1.5 min-h-[0.6875rem] truncate text-[11px] leading-none text-faint"
          >
            {countdown}
          </div>
        ) : null}
      </div>
    );
  }

  if (variant === "detail") {
    const state = finished ? "انتهت" : countdown;
    return (
      <div className={`min-w-0 ${className}`}>
        <p className="text-sm font-semibold text-ink">
          <time dateTime={iso} suppressHydrationWarning>
            {longDate}
          </time>
          <span className="mx-1.5 text-faint" aria-hidden>
            ·
          </span>
          <span className="tabular" suppressHydrationWarning>
            {time}
          </span>
        </p>
        <p
          suppressHydrationWarning
          className="mt-1 min-h-4 text-xs leading-4 text-muted"
        >
          {relative ? <span className="text-accent">{relative}</span> : null}
          {relative && state ? (
            <span className="mx-1.5 text-faint" aria-hidden>
              ·
            </span>
          ) : null}
          {state ? <span className="tabular">{state}</span> : null}
        </p>
      </div>
    );
  }

  // inline
  return (
    <span
      suppressHydrationWarning
      className={`tabular text-xs text-muted ${className}`}
    >
      {relative ? (
        <span className="font-medium text-accent">{relative}</span>
      ) : (
        <time dateTime={iso}>{longDate}</time>
      )}
      <span className="mx-1.5 text-faint" aria-hidden>
        ·
      </span>
      <span className="font-medium text-ink">{time}</span>
    </span>
  );
}

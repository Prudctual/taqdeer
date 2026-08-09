"use client";

import { useEffect, useState } from "react";
import {
  formatCountdown,
  formatLongDate,
  formatMatchTime,
  formatRelativeDay,
  formatShortDate,
  hasKnownKickoffTime,
} from "@/lib/format";
import { LiveMatchClock } from "@/components/LiveMatchClock";

type Variant = "row" | "inline" | "detail";

/**
 * ساعة العميل — تُقرأ بعد التركيب فقط.
 * الخادم وأول رسم في المتصفح يتفقان على null، فلا ينحرف الترطيب.
 * الوقت المطلق يبقى في HTML من الخادم بتوقيت العرض الثابت (بغداد).
 */
function useClientNow(tick: boolean, intervalMs = 60_000): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    if (!tick) return;
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [tick, intervalMs]);

  return now;
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
  /** انطلقت لكن لم تصل بياناتها بعد */
  awaiting = false,
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
  awaiting?: boolean;
  liveMinute?: number | null;
  liveStatusAr?: string | null;
  hideRelative?: boolean;
  className?: string;
}) {
  /** عدّ تنازلي قبل الانطلاق */
  const preKick = showCountdown && !finished && !isLive && !awaiting;
  const now = useClientNow(preKick, 60_000);

  // مطلق — دائماً بتوقيت العرض المعلن (بغداد)، بلا تبديل لمنطقة المتصفح
  const knownTime = hasKnownKickoffTime(iso);
  const time = formatMatchTime(iso);
  const shortDate = formatShortDate(iso);
  const longDate = formatLongDate(iso);

  // نسبي — مشتق من الساعة، بعد التركيب فقط (نفس تقويم منطقة العرض)
  const relative = now && !hideRelative ? formatRelativeDay(iso, now) : null;
  const countdown = preKick && knownTime && now ? formatCountdown(iso, now) : null;

  if (isLive) {
    if (variant === "row") {
      return (
        <LiveMatchClock
          utcDate={iso}
          liveMinute={liveMinute}
          liveStatusAr={liveStatusAr}
          size="row"
          className={className}
        />
      );
    }
    if (variant === "detail") {
      return (
        <div className={`min-w-0 space-y-1 ${className}`}>
          <LiveMatchClock
            utcDate={iso}
            liveMinute={liveMinute}
            liveStatusAr={liveStatusAr}
            size="hero"
          />
          <p className="text-[11px] font-semibold text-muted">
            <time dateTime={iso}>{longDate}</time>
            {knownTime ? (
              <>
                <span className="mx-1.5 text-faint">·</span>
                <span className="tabular">{time}</span>
              </>
            ) : null}
          </p>
        </div>
      );
    }
    return (
      <LiveMatchClock
        utcDate={iso}
        liveMinute={liveMinute}
        liveStatusAr={liveStatusAr}
        size="chip"
        showPeriod={false}
        className={className}
      />
    );
  }

  if (finished || awaiting) {
    if (variant === "row") {
      return (
        <div className={`min-w-0 tabular ${className}`}>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-panel border border-line text-muted font-semibold text-[11px]">
            {finished ? "انتهت" : "بانتظار النتيجة"}
          </span>
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
        </div>
      );
    }
  }

  if (variant === "row") {
    return (
      <div className={`min-w-0 tabular ${className}`}>
        <time
          dateTime={iso}
          suppressHydrationWarning
          className="block text-[13px] font-semibold leading-none text-ink"
        >
          {knownTime ? time : shortDate}
        </time>
        {!hideRelative ? (
          <div
            suppressHydrationWarning
            className={`mt-1.5 truncate text-[11px] leading-none ${
              relative ? "text-accent" : "text-faint"
            }`}
          >
            {knownTime ? (relative ?? shortDate) : (relative ?? "يوم المباراة")}
          </div>
        ) : null}
        {preKick && knownTime ? (
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
    const state = finished ? "انتهت" : awaiting ? "بانتظار النتيجة" : countdown;
    return (
      <div className={`min-w-0 ${className}`}>
        <p className="text-sm font-semibold text-ink">
          <time dateTime={iso} suppressHydrationWarning>
            {longDate}
          </time>
          {knownTime ? (
            <>
              <span className="mx-1.5 text-faint" aria-hidden>
                ·
              </span>
              <span className="tabular" suppressHydrationWarning>
                {time}
              </span>
            </>
          ) : (
            <span className="ms-1.5 text-xs font-semibold text-muted">· التوقيت غير مؤكد</span>
          )}
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
      {knownTime ? (
        <>
          <span className="mx-1.5 text-faint" aria-hidden>
            ·
          </span>
          <span className="font-medium text-ink">{time}</span>
        </>
      ) : null}
    </span>
  );
}

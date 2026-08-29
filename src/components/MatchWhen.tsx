"use client";

import { useEffect, useState } from "react";
import {
  DATA_TZ,
  DATA_TZ_LABEL,
  DISPLAY_TZ_LABEL,
  dayKey,
  dayKeyInTz,
  formatCountdown,
  formatKickoffAbsolute,
  formatLongDate,
  formatMatchTime,
  formatRelativeDay,
  hasKnownKickoffTime,
} from "@/lib/format";
import { LiveMatchClock } from "@/components/LiveMatchClock";

type Variant = "row" | "inline" | "detail";

/**
 * ساعة العميل — تُقرأ بعد التركيب فقط.
 * الخادم وأول رسم يتفقان على null، فلا ينحرف الترطيب.
 * الوقت المطلق من الخادم: أونتاريو للعرض، العراق للبيانات.
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

function DualStamp({ iso, knownTime }: { iso: string; knownTime: boolean }) {
  const userDate = formatLongDate(iso);
  const dataDate = formatLongDate(iso, DATA_TZ);
  const userTime = formatMatchTime(iso);
  const dataTime = formatMatchTime(iso, DATA_TZ);
  const sameDay = dayKey(iso) === dayKeyInTz(iso, DATA_TZ);

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {userDate}
      {knownTime ? (
        <>
          <span className="mx-1.5 text-faint" aria-hidden>
            ·
          </span>
          <span className="tabular">
            {userTime} {DISPLAY_TZ_LABEL}
          </span>
          <span className="mx-1.5 text-faint" aria-hidden>
            ·
          </span>
          <span className="tabular text-muted">
            {sameDay ? null : `${dataDate} · `}
            {dataTime} {DATA_TZ_LABEL}
          </span>
        </>
      ) : sameDay ? null : (
        <>
          <span className="mx-1.5 text-faint" aria-hidden>
            ·
          </span>
          <span className="text-muted">
            {DISPLAY_TZ_LABEL} · {dataDate} {DATA_TZ_LABEL}
          </span>
        </>
      )}
    </time>
  );
}

export function MatchWhen({
  iso,
  variant = "inline",
  showCountdown = true,
  finished = false,
  isLive = false,
  awaiting = false,
  liveMinute = null,
  liveStatusAr = null,
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
  const preKick = showCountdown && !finished && !isLive && !awaiting;
  const now = useClientNow(preKick, 60_000);

  const knownTime = hasKnownKickoffTime(iso);
  const userTime = formatMatchTime(iso);
  const dataTime = formatMatchTime(iso, DATA_TZ);
  const userDate = formatLongDate(iso);
  const dataDate = formatLongDate(iso, DATA_TZ);
  const sameDay = dayKey(iso) === dayKeyInTz(iso, DATA_TZ);
  const relative = now && !hideRelative ? formatRelativeDay(iso, now) : null;
  const countdown = preKick && knownTime && now ? formatCountdown(iso, now) : null;

  if (isLive) {
    if (variant === "row") {
      return (
        <div className={`min-w-0 tabular ${className}`}>
          <LiveMatchClock
            utcDate={iso}
            liveMinute={liveMinute}
            liveStatusAr={liveStatusAr}
            size="row"
          />
          <div className="mt-1.5 text-[11px] leading-snug text-muted">
            <DualStamp iso={iso} knownTime={knownTime} />
          </div>
        </div>
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
            <DualStamp iso={iso} knownTime={knownTime} />
          </p>
        </div>
      );
    }
    return (
      <span className={`inline-flex flex-wrap items-center gap-x-1.5 ${className}`}>
        <LiveMatchClock
          utcDate={iso}
          liveMinute={liveMinute}
          liveStatusAr={liveStatusAr}
          size="chip"
          showPeriod={false}
        />
        <span className="text-[11px] text-muted tabular">
          <DualStamp iso={iso} knownTime={knownTime} />
        </span>
      </span>
    );
  }

  if (finished || awaiting) {
    if (variant === "row") {
      return (
        <div className={`min-w-0 tabular ${className}`}>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-panel border border-line text-muted font-semibold text-[11px]">
            {finished ? "انتهت" : "بانتظار النتيجة"}
          </span>
          <div className="mt-1.5 text-[11px] leading-snug text-muted">
            <DualStamp iso={iso} knownTime={knownTime} />
          </div>
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
          className="block text-[12px] font-semibold leading-snug text-ink"
        >
          {knownTime ? `${userTime} ${DISPLAY_TZ_LABEL}` : userDate}
        </time>
        <div
          suppressHydrationWarning
          className="mt-1.5 text-[11px] leading-snug text-muted"
        >
          {relative ? <span className="text-accent">{relative} · </span> : null}
          {knownTime ? userDate : "التوقيت غير مؤكد بعد"}
        </div>
        {knownTime ? (
          <div className="mt-1 text-[11px] leading-snug text-faint tabular">
            {sameDay ? null : `${dataDate} · `}
            {dataTime} {DATA_TZ_LABEL}
          </div>
        ) : null}
        {preKick && knownTime ? (
          <div
            suppressHydrationWarning
            className="mt-1.5 min-h-[0.6875rem] text-[11px] leading-snug text-faint"
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
          <DualStamp iso={iso} knownTime={knownTime} />
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

  return (
    <span
      suppressHydrationWarning
      className={`tabular text-xs text-muted ${className}`}
    >
      {relative ? (
        <>
          <span className="font-medium text-accent">{relative}</span>
          <span className="mx-1.5 text-faint" aria-hidden>
            ·
          </span>
        </>
      ) : null}
      <time dateTime={iso} className="text-ink">
        {formatKickoffAbsolute(iso)}
      </time>
    </span>
  );
}

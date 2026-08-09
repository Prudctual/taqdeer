"use client";

import { useEffect, useRef, useState } from "react";
import { resolveLiveClock, type LiveClockState } from "@/lib/live-clock";

export function useLiveMatchClock({
  utcDate,
  liveMinute = null,
  liveStatusAr = null,
  active = true,
}: {
  utcDate: string;
  liveMinute?: number | null;
  liveStatusAr?: string | null;
  active?: boolean;
}): LiveClockState | null {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);
  const anchor = useRef<{ minute: number | null; at: number }>({
    minute: null,
    at: 0,
  });

  useEffect(() => {
    const t = Date.now();
    setMounted(true);
    setNow(t);
    anchor.current = { minute: liveMinute ?? null, at: t };
    // مرساة أولية فقط عند التركيب
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // إعادة تثبيت عند وصول دقيقة أحدث من المصدر
  useEffect(() => {
    if (!mounted) return;
    if (liveMinute == null) return;
    if (anchor.current.minute == null || liveMinute !== anchor.current.minute) {
      anchor.current = { minute: liveMinute, at: Date.now() };
    }
  }, [liveMinute, mounted]);

  useEffect(() => {
    if (!active || !mounted) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active, mounted]);

  if (!active || !mounted || !now) return null;

  return resolveLiveClock({
    utcDate,
    nowMs: now,
    syncedMinute: anchor.current.minute,
    syncedAtMs: anchor.current.at || now,
    liveStatusAr,
  });
}

type Size = "row" | "chip" | "hero" | "banner";

/**
 * ساعة بث مباشر احترافية — تتحرّك كل ثانية دون تحديث الصفحة.
 */
export function LiveMatchClock({
  utcDate,
  liveMinute = null,
  liveStatusAr = null,
  size = "chip",
  showPeriod = true,
  className = "",
}: {
  utcDate: string;
  liveMinute?: number | null;
  liveStatusAr?: string | null;
  size?: Size;
  showPeriod?: boolean;
  className?: string;
}) {
  const clock = useLiveMatchClock({
    utcDate,
    liveMinute,
    liveStatusAr,
    active: true,
  });

  const fallback =
    liveStatusAr ||
    (liveMinute != null ? `د ${liveMinute}'` : "مباشر الآن");

  const face = clock?.ticking
    ? clock.display
    : clock?.shortAr || fallback;

  if (size === "row") {
    return (
      <div className={`min-w-0 tabular ${className}`}>
        <span className="live-badge">
          <span className="live-badge-dot live-pulse-dot" />
          <span className="live-clock-face font-mono font-semibold tracking-tight">
            {face}
          </span>
        </span>
        {showPeriod && clock?.period === "HT" ? (
          <div className="mt-1.5 text-[10px] font-bold text-muted leading-none">
            استراحة الشوطين
          </div>
        ) : null}
        {showPeriod && clock && (clock.period === "1H" || clock.period === "2H") ? (
          <div className="mt-1.5 text-[10px] font-bold text-live/80 leading-none">
            {clock.period === "2H" ? "الشوط الثاني" : "الشوط الأول"}
          </div>
        ) : null}
      </div>
    );
  }

  if (size === "hero") {
    return (
      <div className={`live-badge px-4 py-1.5 text-xs gap-2.5 ${className}`}>
        <span className="live-badge-dot live-pulse-dot" />
        <span className="flex items-baseline gap-2">
          <span className="live-clock-face font-mono text-sm font-semibold tracking-tight tabular">
            {face}
          </span>
          {showPeriod ? (
            <span className="font-bold opacity-90">
              {clock?.period === "HT"
                ? "استراحة الشوطين"
                : clock?.period === "2H"
                  ? "الشوط الثاني"
                  : clock?.period === "FT"
                    ? "انتهت"
                    : "الشوط الأول"}
            </span>
          ) : null}
        </span>
      </div>
    );
  }

  if (size === "banner") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success-dim border border-success/25 text-success font-mono font-semibold text-[11px] tabular ${className}`}
      >
        <span className="live-badge-dot live-pulse-dot" />
        <span className="live-clock-face">{face}</span>
      </span>
    );
  }

  return (
    <span className={`live-badge ${className}`}>
      <span className="live-badge-dot live-pulse-dot" />
      <span className="live-clock-face font-mono font-semibold tabular tracking-tight">
        {face}
      </span>
    </span>
  );
}

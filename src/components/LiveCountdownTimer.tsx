"use client";

import { useEffect, useState } from "react";

interface LiveCountdownProps {
  targetDate: string;
  className?: string;
  showBadge?: boolean;
}

function TimeCell({
  value,
  unit,
  accent = false,
}: {
  value: string | number;
  unit: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-xl px-2.5 py-1 border tabular ${
        accent
          ? "bg-accent text-on-fill border-accent"
          : "bg-panel text-ink border-line"
      }`}
    >
      <span className="font-extrabold">{value}</span>
      <span
        className={`text-[11px] font-sans font-bold ${
          accent ? "text-on-fill/80" : "text-faint"
        }`}
      >
        {unit}
      </span>
    </div>
  );
}

export function LiveCountdownTimer({
  targetDate,
  className = "",
  showBadge = true,
}: LiveCountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false,
  });

  useEffect(() => {
    function calculateTime() {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        isPast: false,
      });
    }

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.isPast) {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full bg-live-dim px-3.5 py-1 text-xs font-black text-live border border-live/30 ${className}`}
      >
        <span className="live-badge-dot live-pulse-dot" />
        موعد الانطلاق حان
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      {showBadge ? (
        <div className="inline-flex items-center gap-2 rounded-full bg-accent-dim px-3.5 py-1 text-xs font-black text-accent border border-line">
          ينطلق خلال:
        </div>
      ) : null}

      <div className="flex items-center gap-1.5 font-mono text-xs font-bold" dir="ltr">
        {timeLeft.days > 0 ? (
          <TimeCell value={timeLeft.days} unit="يوم" />
        ) : null}
        <TimeCell value={String(timeLeft.hours).padStart(2, "0")} unit="س" />
        <span className="text-faint font-bold">:</span>
        <TimeCell value={String(timeLeft.minutes).padStart(2, "0")} unit="د" />
        <span className="text-faint font-bold">:</span>
        <TimeCell
          value={String(timeLeft.seconds).padStart(2, "0")}
          unit="ث"
          accent
        />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

interface LiveCountdownProps {
  targetDate: string; // ISO date string
  className?: string;
  showBadge?: boolean;
}

export function LiveCountdownTimer({ targetDate, className = "", showBadge = true }: LiveCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });

  useEffect(() => {
    function calculateTime() {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    }

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.isPast) {
    return (
      <div className={`inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-black text-emerald-700 border border-emerald-200/80 shadow-2xs ${className}`}>
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
        </span>
        مباراة جارية أو منتهية
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      {showBadge ? (
        <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3.5 py-1 text-xs font-black text-accent border border-rose-200/60 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
          </span>
          ينطلق خلال:
        </div>
      ) : null}

      <div className="flex items-center gap-1.5 dir-ltr font-mono text-xs font-bold">
        {timeLeft.days > 0 ? (
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 border border-slate-200/80 text-slate-900 shadow-2xs">
            <span className="font-extrabold">{timeLeft.days}</span>
            <span className="text-[11px] text-slate-500 font-sans font-bold">يوم</span>
          </div>
        ) : null}

        <div className="flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 border border-slate-200/80 text-slate-900 shadow-2xs">
          <span className="font-extrabold">{String(timeLeft.hours).padStart(2, "0")}</span>
          <span className="text-[11px] text-slate-500 font-sans font-bold">س</span>
        </div>

        <span className="text-slate-400 font-bold">:</span>

        <div className="flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 border border-slate-200/80 text-slate-900 shadow-2xs">
          <span className="font-extrabold">{String(timeLeft.minutes).padStart(2, "0")}</span>
          <span className="text-[11px] text-slate-500 font-sans font-bold">د</span>
        </div>

        <span className="text-slate-400 font-bold">:</span>

        <div className="flex items-center gap-1 rounded-xl bg-rose-600 px-2.5 py-1 text-white shadow-xs transition-transform duration-200 active:scale-95">
          <span className="font-black animate-pulse">{String(timeLeft.seconds).padStart(2, "0")}</span>
          <span className="text-[11px] text-rose-100 font-sans font-bold">ث</span>
        </div>
      </div>
    </div>
  );
}

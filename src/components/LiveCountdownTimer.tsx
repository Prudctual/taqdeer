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
      <div className={`inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20 ${className}`}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        مباراة جارية أو منتهية حديثاً
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {showBadge ? (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-[11px] font-bold text-blue-400 border border-blue-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
          عدّاد تنازلي حقيقي
        </div>
      ) : null}

      <div className="flex items-center gap-1.5 dir-ltr font-mono text-xs font-bold">
        {timeLeft.days > 0 ? (
          <div className="flex items-center gap-1 rounded-md bg-zinc-900 px-2 py-1 border border-zinc-800 text-zinc-200">
            <span>{timeLeft.days}</span>
            <span className="text-[10px] text-zinc-500 font-sans">يوم</span>
          </div>
        ) : null}

        <div className="flex items-center gap-1 rounded-md bg-zinc-900 px-2 py-1 border border-zinc-800 text-zinc-200">
          <span>{String(timeLeft.hours).padStart(2, "0")}</span>
          <span className="text-[10px] text-zinc-500 font-sans">س</span>
        </div>

        <span className="text-zinc-600">:</span>

        <div className="flex items-center gap-1 rounded-md bg-zinc-900 px-2 py-1 border border-zinc-800 text-zinc-200">
          <span>{String(timeLeft.minutes).padStart(2, "0")}</span>
          <span className="text-[10px] text-zinc-500 font-sans">د</span>
        </div>

        <span className="text-zinc-600">:</span>

        <div className="flex items-center gap-1 rounded-md bg-zinc-900 px-2 py-1 border border-blue-500/40 text-blue-400 bg-blue-500/5">
          <span>{String(timeLeft.seconds).padStart(2, "0")}</span>
          <span className="text-[10px] text-blue-500/70 font-sans">ث</span>
        </div>
      </div>
    </div>
  );
}

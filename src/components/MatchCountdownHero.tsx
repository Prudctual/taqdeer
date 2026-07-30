"use client";

import { useEffect, useState } from "react";

interface MatchCountdownHeroProps {
  utcDate: string;
  status?: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
}

export function MatchCountdownHero({
  utcDate,
  status,
  homeGoals,
  awayGoals,
}: MatchCountdownHeroProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isFinished: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isFinished: false });

  useEffect(() => {
    const target = new Date(utcDate).getTime();

    function updateTimer() {
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0 || status === "FINISHED") {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isFinished: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isFinished: false });
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [utcDate, status]);

  if (status === "FINISHED" && homeGoals != null && awayGoals != null) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-panel px-4 py-1.5 text-xs font-black text-ink">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <span>نتيجة منتهية: <strong className="tabular font-bold">{homeGoals} - {awayGoals}</strong></span>
      </div>
    );
  }

  if (timeLeft.isFinished) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-4 py-1.5 text-xs font-black text-accent">
        <span className="h-2 w-2 rounded-full bg-accent animate-ping" />
        <span>المباراة جارية الآن ⚽ LIVE</span>
      </div>
    );
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl bg-panel/80 px-4 py-2 text-xs font-bold text-ink border-0 shadow-none">
      <span className="text-muted text-[11px]">ينطلق خلال:</span>
      <div className="flex items-center gap-1.5 font-mono text-xs tabular text-accent font-black">
        <span className="rounded-md bg-surface px-2 py-0.5">{timeLeft.days} يوم</span>
        <span className="text-muted">:</span>
        <span className="rounded-md bg-surface px-2 py-0.5">{timeLeft.hours} س</span>
        <span className="text-muted">:</span>
        <span className="rounded-md bg-surface px-2 py-0.5">{timeLeft.minutes} د</span>
        <span className="text-muted">:</span>
        <span className="rounded-md bg-surface px-2 py-0.5">{timeLeft.seconds} ث</span>
      </div>
    </div>
  );
}

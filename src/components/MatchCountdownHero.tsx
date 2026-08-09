"use client";

import { useEffect, useState } from "react";
import { LiveMatchClock, useLiveMatchClock } from "@/components/LiveMatchClock";
import { matchDisplay } from "@/lib/match-status";

interface MatchCountdownHeroProps {
  utcDate: string;
  status?: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
  minute?: number | null;
  liveStatusAr?: string | null;
}

export function MatchCountdownHero({
  utcDate,
  status = "SCHEDULED",
  homeGoals,
  awayGoals,
  minute,
  liveStatusAr,
}: MatchCountdownHeroProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { phase, isLive, isFinished, score } = matchDisplay({
    status,
    utcDate,
    homeGoals,
    awayGoals,
    minute,
    liveStatusAr,
    now,
  });

  const awaitingClock = useLiveMatchClock({
    utcDate,
    liveMinute: minute,
    liveStatusAr,
    active: phase === "awaiting",
  });

  if (isFinished) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-panel px-4 py-1.5 text-xs font-semibold text-ink">
        {score ? (
          <span>
            نتيجة منتهية:{" "}
            <strong className="tabular font-bold">{score.replace("–", " - ")}</strong>
          </span>
        ) : (
          <span>مباراة منتهية</span>
        )}
      </div>
    );
  }

  if (isLive) {
    return (
      <div className="inline-flex flex-wrap items-center gap-2">
        <LiveMatchClock
          utcDate={utcDate}
          liveMinute={minute}
          liveStatusAr={liveStatusAr}
          size="hero"
        />
        {score ? (
          <span className="inline-flex items-center rounded-full bg-panel border border-line px-3 py-1 text-xs font-semibold tabular text-ink">
            {score.replace("–", " - ")}
          </span>
        ) : null}
      </div>
    );
  }

  if (phase === "awaiting") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-warn-dim px-4 py-1.5 text-xs font-semibold text-warn border border-line">
        <span className="live-badge-dot live-pulse-dot" />
        <span className="font-mono tabular">
          {awaitingClock?.display || "—"}
        </span>
        <span>· بانتظار التحديث الحي</span>
      </div>
    );
  }

  if (phase === "postponed") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-panel px-4 py-1.5 text-xs font-semibold text-muted">
        مؤجّلة
      </div>
    );
  }

  if (phase === "cancelled") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-panel px-4 py-1.5 text-xs font-semibold text-muted">
        ملغاة
      </div>
    );
  }

  const target = Date.parse(utcDate);
  const difference = Number.isFinite(target) ? target - now : 0;
  const days = Math.max(0, Math.floor(difference / (1000 * 60 * 60 * 24)));
  const hours = Math.max(
    0,
    Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
  );
  const minutes = Math.max(
    0,
    Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
  );
  const seconds = Math.max(0, Math.floor((difference % (1000 * 60)) / 1000));

  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl bg-panel/80 px-4 py-2 text-xs font-bold text-ink border-0 shadow-none">
      <span className="text-muted text-[11px]">ينطلق خلال:</span>
      <div className="flex items-center gap-1.5 font-mono text-xs tabular text-accent font-semibold">
        <span className="rounded-md bg-surface px-2 py-0.5">{days} يوم</span>
        <span className="text-muted">:</span>
        <span className="rounded-md bg-surface px-2 py-0.5">{hours} س</span>
        <span className="text-muted">:</span>
        <span className="rounded-md bg-surface px-2 py-0.5">{minutes} د</span>
        <span className="text-muted">:</span>
        <span className="rounded-md bg-surface px-2 py-0.5 transition-all duration-300">
          {seconds} ث
        </span>
      </div>
    </div>
  );
}

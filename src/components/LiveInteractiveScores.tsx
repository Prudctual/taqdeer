"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crest } from "./Crest";
import { pct } from "@/lib/format";

type LiveMatchData = {
  id: string;
  leagueId: string;
  leagueNameAr: string;
  utcDate: string;
  status: string;
  homeNameAr: string;
  awayNameAr: string;
  homeCrestUrl: string | null;
  awayCrestUrl: string | null;
  homeGoals: number;
  awayGoals: number;
  minute: number;
  liveStatusAr: string;
  pHome: number;
  pDraw: number;
  pAway: number;
  liveEventsJson?: string | null;
};

export function LiveInteractiveScores() {
  const [liveMatches, setLiveMatches] = useState<LiveMatchData[]>([]);
  const [lastGoalNotification, setLastGoalNotification] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Poll live matches every 10 seconds
  useEffect(() => {
    let active = true;

    async function fetchLive() {
      try {
        const res = await fetch("/api/v1/live-matches", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data.liveMatches)) {
          // Check for new goals
          if (liveMatches.length > 0) {
            data.liveMatches.forEach((newMatch: LiveMatchData) => {
              const oldMatch = liveMatches.find((m) => m.id === newMatch.id);
              if (
                oldMatch &&
                (newMatch.homeGoals !== oldMatch.homeGoals ||
                  newMatch.awayGoals !== oldMatch.awayGoals)
              ) {
                const scorer =
                  newMatch.homeGoals > oldMatch.homeGoals
                    ? newMatch.homeNameAr
                    : newMatch.awayNameAr;
                setLastGoalNotification(
                  `⚽ هدف مباشر! ${scorer} يسجل في الدقيقة ${newMatch.minute}' (${newMatch.homeNameAr} ${newMatch.homeGoals} - ${newMatch.awayGoals} ${newMatch.awayNameAr})`
                );
                setTimeout(() => setLastGoalNotification(null), 8000);
              }
            });
          }

          setLiveMatches(data.liveMatches);
          setLoading(false);
        }
      } catch (e) {
        console.error("Live fetch error:", e);
      }
    }

    fetchLive();
    const interval = setInterval(fetchLive, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [liveMatches]);

  if (loading && liveMatches.length === 0) return null;
  if (liveMatches.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {/* Live Goal Notification Toast Alert */}
      {lastGoalNotification && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-bounce shadow-lg">
          <span className="text-base">🚨</span>
          <span>{lastGoalNotification}</span>
        </div>
      )}

      {/* Live Active Matches Banner Card */}
      <div className="rounded-2xl border border-emerald-500/30 bg-panel p-4 sm:p-5 space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs sm:text-sm font-black text-ink">
              بث النتائج الحية والتحليل اللحظي المباشر ({liveMatches.length} مباراة جارية)
            </span>
          </div>

          <span className="text-[10px] font-bold text-muted bg-surface px-2.5 py-1 rounded-full border border-line">
            تحديث تلقائي كل 10 ثوانٍ ⚡
          </span>
        </div>

        {/* Live Match Row List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {liveMatches.map((m) => (
            <Link
              key={m.id}
              href={`/match/${m.id}`}
              className="group rounded-xl border border-line bg-surface p-3.5 hover:border-emerald-500/50 transition-all space-y-3"
            >
              {/* League & Minute */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-muted">{m.leagueNameAr}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-black text-[11px] inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {m.liveStatusAr || `د ${m.minute}'`}
                </span>
              </div>

              {/* Match Teams & Live Score */}
              <div className="flex items-center justify-between gap-2">
                {/* Home */}
                <div className="flex items-center gap-2 flex-1">
                  <Crest src={m.homeCrestUrl} alt={m.homeNameAr} size="chip" />
                  <span className="text-xs font-black text-ink truncate">{m.homeNameAr}</span>
                </div>

                {/* Score */}
                <div className="px-3 py-1 rounded-lg bg-panel border border-line font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                  {m.homeGoals} - {m.awayGoals}
                </div>

                {/* Away */}
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <span className="text-xs font-black text-ink truncate text-end">{m.awayNameAr}</span>
                  <Crest src={m.awayCrestUrl} alt={m.awayNameAr} size="chip" />
                </div>
              </div>

              {/* Live Probability Bar */}
              <div className="space-y-1 pt-1 border-t border-line">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted">
                  <span>احتمال الفوز الحقيقي الآن:</span>
                  <span className="font-mono text-ink">
                    1: {pct(m.pHome, 0)} | X: {pct(m.pDraw, 0)} | 2: {pct(m.pAway, 0)}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-panel overflow-hidden flex">
                  <div style={{ width: `${m.pHome * 100}%` }} className="bg-home h-full" />
                  <div style={{ width: `${m.pDraw * 100}%` }} className="bg-draw h-full" />
                  <div style={{ width: `${m.pAway * 100}%` }} className="bg-away h-full" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

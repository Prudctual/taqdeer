"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Crest } from "./Crest";
import { LiveMatchClock } from "./LiveMatchClock";
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
  pHome: number | null;
  pDraw: number | null;
  pAway: number | null;
  liveEventsJson?: string | null;
};

export function LiveInteractiveScores() {
  const [liveMatches, setLiveMatches] = useState<LiveMatchData[]>([]);
  const [lastGoalNotification, setLastGoalNotification] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const prevRef = useRef<LiveMatchData[]>([]);

  useEffect(() => {
    let active = true;

    async function fetchLive() {
      try {
        const res = await fetch("/api/v1/live-matches", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!active || !Array.isArray(data.liveMatches)) return;

        const prev = prevRef.current;
        if (prev.length > 0) {
          for (const newMatch of data.liveMatches as LiveMatchData[]) {
            const oldMatch = prev.find((m) => m.id === newMatch.id);
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
                `⚽ هدف! ${scorer} · ${newMatch.homeNameAr} ${newMatch.homeGoals}–${newMatch.awayGoals} ${newMatch.awayNameAr}`,
              );
              window.setTimeout(() => setLastGoalNotification(null), 8000);
            }
          }
        }

        prevRef.current = data.liveMatches;
        setLiveMatches(data.liveMatches);
        setLoading(false);
      } catch (e) {
        console.error("Live fetch error:", e);
      }
    }

    fetchLive();
    // مزامنة فورية تقريباً للنتيجة/الأحداث — الساعة تتحرّك محلياً كل ثانية
    const interval = setInterval(fetchLive, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (loading && liveMatches.length === 0) return null;
  if (liveMatches.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {lastGoalNotification && (
        <div className="rounded-xl border border-success/40 bg-success-dim p-3 text-xs sm:text-sm font-semibold text-success flex items-center gap-2 shadow-lg animate-[fadeInUp_0.35s_ease-out]">
          <span className="live-badge-dot live-pulse-dot" />
          <span>{lastGoalNotification}</span>
        </div>
      )}

      <div className="rounded-2xl border border-success/30 bg-panel p-4 sm:p-5 space-y-4 shadow-md">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <span className="live-badge-dot live-pulse-dot" />
          <span className="text-xs sm:text-sm font-semibold text-ink">
            مباشر الآن · {liveMatches.length} مباراة
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {liveMatches.map((m) => (
            <Link
              key={m.id}
              href={`/match/${m.id}`}
              className="group rounded-xl border border-line bg-surface p-3.5 hover:border-success/50 transition-all space-y-3"
            >
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="font-bold text-muted truncate">{m.leagueNameAr}</span>
                <LiveMatchClock
                  utcDate={m.utcDate}
                  liveMinute={m.minute}
                  liveStatusAr={m.liveStatusAr}
                  size="banner"
                  showPeriod={false}
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Crest src={m.homeCrestUrl} alt={m.homeNameAr} size="chip" />
                  <span className="text-xs font-semibold text-ink truncate">{m.homeNameAr}</span>
                </div>

                <div className="px-3 py-1 rounded-lg bg-panel border border-line font-mono font-semibold text-sm text-success tabular">
                  {m.homeGoals} - {m.awayGoals}
                </div>

                <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                  <span className="text-xs font-semibold text-ink truncate text-end">{m.awayNameAr}</span>
                  <Crest src={m.awayCrestUrl} alt={m.awayNameAr} size="chip" />
                </div>
              </div>

              {m.pHome != null && m.pDraw != null && m.pAway != null && (
                <div className="space-y-1 pt-1 border-t border-line">
                  <div className="flex items-center justify-between text-[10px] font-bold text-muted">
                    <span>احتمال لحظي</span>
                    <span className="font-mono text-ink tabular">
                      1: {pct(m.pHome)} · X: {pct(m.pDraw)} · 2: {pct(m.pAway)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-panel overflow-hidden flex">
                    <div style={{ width: `${m.pHome * 100}%` }} className="bg-home h-full" />
                    <div style={{ width: `${m.pDraw * 100}%` }} className="bg-draw h-full" />
                    <div style={{ width: `${m.pAway * 100}%` }} className="bg-away h-full" />
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

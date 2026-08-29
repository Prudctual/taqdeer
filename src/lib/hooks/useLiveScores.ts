"use client";

import { useEffect, useState } from "react";
import {
  DATA_TZ,
  DATA_TZ_LABEL,
  DISPLAY_TZ_LABEL,
  formatMatchTime,
} from "@/lib/format";
import { isFinishedStatus } from "@/lib/match-status";

/** بطاقة قائمة/حي — متوافقة مع MatchListCard على السيرفر وMatchCard محلياً */
export type LiveListCard = {
  id: string;
  leagueId: string;
  leagueNameAr: string;
  utcDate: string;
  status: string;
  homeNameAr: string;
  awayNameAr: string;
  homeNameEn: string;
  awayNameEn: string;
  homeCrestUrl: string | null;
  awayCrestUrl: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  pHome: number | null;
  pDraw: number | null;
  pAway: number | null;
  confidence: number | null;
  marketHome: number | null;
  marketDraw: number | null;
  marketAway: number | null;
  eloHome: number | null;
  eloAway: number | null;
  matchday?: number | null;
  minute?: number | null;
  liveStatusAr?: string | null;
};

export function isFinishedCard(m: { status?: string | null }): boolean {
  return isFinishedStatus(String(m.status || ""));
}

/** يكتب النتيجة/الحالة الحية على بطاقة القائمة دون تغيير الهوية */
export function overlayMatchScores<T extends { id: string }>(
  matches: T[],
  live: ReadonlyArray<{ id: string }>,
): T[] {
  if (live.length === 0) return matches;
  const byId = new Map(live.map((m) => [m.id, m]));
  return matches.map((m) => {
    const patch = byId.get(m.id);
    return patch ? ({ ...m, ...patch } as T) : m;
  });
}

export function useLiveScores(intervalMs = 3000) {
  const [liveMatches, setLiveMatches] = useState<LiveListCard[]>([]);
  const [recentlyFinished, setRecentlyFinished] = useState<LiveListCard[]>([]);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchLiveScores() {
      try {
        const res = await fetch("/api/v1/live-matches", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted || !data.success) return;
        const live = (data.liveMatches || []) as LiveListCard[];
        setLiveMatches(live);
        setRecentlyFinished((data.recentlyFinished || []) as LiveListCard[]);
        setIsLiveActive(live.length > 0);
        const stamp = new Date().toISOString();
        setLastUpdated(
          `${formatMatchTime(stamp)} ${DISPLAY_TZ_LABEL} · ${formatMatchTime(stamp, DATA_TZ)} ${DATA_TZ_LABEL}`,
        );
      } catch {
        // silent fail
      }
    }

    fetchLiveScores();
    const interval = setInterval(fetchLiveScores, intervalMs);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [intervalMs]);

  return { liveMatches, recentlyFinished, isLiveActive, lastUpdated };
}

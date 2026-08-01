"use client";

import { useEffect, useState } from "react";
import type { MatchCard } from "@/lib/queries";

export function useLiveScores(intervalMs = 12000) {
  const [liveMatches, setLiveMatches] = useState<MatchCard[]>([]);
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchLiveScores() {
      try {
        const res = await fetch("/api/v1/live-matches");
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.success) {
          setLiveMatches(data.liveMatches || []);
          setIsLiveActive((data.liveMatches || []).length > 0);
          setLastUpdated(new Date().toLocaleTimeString("ar-SA"));
        }
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

  return { liveMatches, isLiveActive, lastUpdated };
}

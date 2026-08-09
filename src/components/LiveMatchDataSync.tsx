"use client";

import { useCallback, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

export function LiveMatchDataSync({
  intervalSeconds = 3,
  finished = false,
  isLive = false,
}: {
  intervalSeconds?: number;
  finished?: boolean;
  isLive?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const pollSec = isLive ? Math.min(intervalSeconds, 3) : Math.min(intervalSeconds, 8);

  const handleRefresh = useCallback(async () => {
    try {
      await fetch("/api/v1/live-matches", { cache: "no-store" });
    } catch {
      /* silent — الساعة تبقى تعمل محلياً */
    }
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    if (finished) return;
    void handleRefresh();
    const pollTimer = setInterval(() => {
      void handleRefresh();
    }, pollSec * 1000);
    return () => clearInterval(pollTimer);
  }, [finished, handleRefresh, pollSec]);

  // بلا شريط «تحديث كل X ثوانٍ» — المزامنة صامتة وفورية
  return null;
}

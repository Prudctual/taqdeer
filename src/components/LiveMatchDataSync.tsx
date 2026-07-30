"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function LiveMatchDataSync({
  intervalSeconds = 30,
}: {
  intervalSeconds?: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

  const handleRefresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
      setLastUpdated(new Date());
      setSecondsAgo(0);
    });
  }, [router]);

  // حلقة تكرار التحديث التلقائي من السيرفر
  useEffect(() => {
    const pollTimer = setInterval(() => {
      handleRefresh();
    }, intervalSeconds * 1000);

    const secondsTimer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);

    return () => {
      clearInterval(pollTimer);
      clearInterval(secondsTimer);
    };
  }, [handleRefresh, intervalSeconds, lastUpdated]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 shadow-2xs text-xs">
      {/* حالة البث والمزامنة */}
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <span className="font-black text-ink">مزامنة البيانات والنماذج الحية متصلة</span>
          <span className="text-muted font-bold text-[11px]">
            (تحديث تلقائي كل {intervalSeconds} ثانية)
          </span>
        </div>
      </div>

      {/* العداد والتحديث اليدوي */}
      <div className="flex items-center gap-3 ms-auto">
        <span className="text-[11px] font-semibold text-muted tabular">
          آخر مزامنة: {secondsAgo === 0 ? "الآن" : `منذ ${secondsAgo} ثانية`}
        </span>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isPending}
          className="press-scale flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1.5 font-extrabold text-ink hover:bg-surface disabled:opacity-50 cursor-pointer"
        >
          <svg
            className={`h-3.5 w-3.5 shrink-0 transition-transform duration-500 ${isPending ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{isPending ? "جاري المزامنة..." : "تحديث البيانات الآن"}</span>
        </button>
      </div>
    </div>
  );
}

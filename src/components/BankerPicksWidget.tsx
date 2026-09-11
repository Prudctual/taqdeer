"use client";

import { useState } from "react";
import Link from "next/link";
import { SectionCard } from "./ui";
import { pct } from "@/lib/format";
import type { BankerPick } from "@/lib/queries";

export type { BankerPick };

export function BankerPicksWidget({
  picks,
  title = "نموذج الاختيار وأأمن الترشيحات (Selection Model & Bankers)",
}: {
  picks?: BankerPick[];
  title?: string;
}) {
  const [filterMode, setFilterMode] = useState<"all" | "balanced" | "safest">("all");

  const rawList = picks && picks.length > 0 ? picks : [];

  const filteredList = rawList.filter((item) => {
    if (filterMode === "balanced") {
      return !item.isTrap && (item.edge ?? 0) >= -0.02;
    }
    if (filterMode === "safest") {
      return item.probability >= 0.50;
    }
    return true;
  }).slice(0, 8);

  if (rawList.length === 0) {
    return null;
  }

  return (
    <SectionCard
      title={title}
      subtitle="ترتيب الترشيحات وفق موثوقية النموذج 2 (ثلاثون عاملاً) فوق احتمالات النموذج 1"
    >
      {/* Sub-navigation Controls */}
      <div className="px-4 sm:px-5 pt-3 pb-1 flex flex-wrap items-center justify-between gap-2 border-b border-line">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterMode === "all"
                ? "bg-accent text-on-fill shadow-xs"
                : "bg-panel text-muted hover:text-ink border border-line"
            }`}
          >
            كافة الترشيحات ({rawList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("balanced")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterMode === "balanced"
                ? "bg-success text-on-fill shadow-xs"
                : "bg-panel text-muted hover:text-ink border border-line"
            }`}
          >
            ⚖️ خيارات متوازنة (استبعاد المصائد)
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("safest")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterMode === "safest"
                ? "bg-home text-on-fill shadow-xs"
                : "bg-panel text-muted hover:text-ink border border-line"
            }`}
          >
            🛡️ أعلى احتمالية فوز
          </button>
        </div>

        <span className="text-[11px] font-bold text-muted">
          عتبة الأمان: فارق حسم &gt; 4٪
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs p-4 sm:p-5">
        {filteredList.map((item) => {
          const score = item.model2?.reliability != null
            ? Math.round(item.model2.reliability)
            : item.selectionScore ?? Math.round(item.probability * 100);
          const sep = item.separationGap != null ? item.separationGap : null;
          const edge = item.edge != null ? item.edge : null;

          return (
            <Link
              key={item.matchId}
              href={`/match/${encodeURIComponent(item.matchId)}`}
              className={`group block rounded-2xl border overflow-hidden shadow-2xs space-y-0 transition-all cursor-pointer ${
                item.isTrap
                  ? "border-amber-500/40 bg-surface hover:border-amber-500"
                  : "border-line bg-surface hover:border-accent hover:shadow-md"
              }`}
            >
              {/* Header Strip */}
              <div className="bg-panel border-b border-line px-3.5 py-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted truncate">
                  {item.leagueName}
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.stabilityScore != null && (
                    <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[10px] px-1.5 py-0.5 rounded-md tabular">
                      🛡️ أمان {item.stabilityScore}%
                    </span>
                  )}
                  <span className="bg-accent-dim text-accent border border-accent/20 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md tabular">
                    موثوقية {score}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-3.5 space-y-2.5 bg-surface text-start">
                <div className="font-semibold text-ink text-xs truncate group-hover:text-accent transition-colors">
                  {item.homeTeam}{" "}
                  <span className="text-muted font-normal me-1 ms-1">ضد</span>{" "}
                  {item.awayTeam}
                </div>

                <div className="text-[11px] font-semibold text-muted flex items-center justify-between">
                  <span>التوقع:</span>
                  <strong className="text-ink font-semibold">{item.pickLabel}</strong>
                </div>

                {/* Separation & Probability Row */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-line/60">
                  <div className="rounded-lg bg-panel/70 p-2 border border-line/50 space-y-0.5">
                    <span className="text-[9px] font-bold text-muted block">احتمال النموذج</span>
                    <span className="font-mono font-semibold text-ink tabular text-sm">
                      {pct(item.probability, 1)}
                    </span>
                  </div>

                  <div className="rounded-lg bg-panel/70 p-2 border border-line/50 space-y-0.5">
                    <span className="text-[9px] font-bold text-muted block">فارق الحسم (Separation)</span>
                    <span className="font-mono font-semibold text-success tabular text-sm">
                      {sep != null ? `+${(sep * 100).toFixed(1)}%` : "—"}
                    </span>
                  </div>
                </div>

                {/* Market Price & Edge / Value Trap Warning */}
                {item.odds != null && (
                  <div className="pt-1 border-t border-line/60 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted font-medium">سعر السوق:</span>
                      <span className="font-mono text-ink font-semibold tabular">
                        {item.odds.toFixed(2)} ({item.americanOdds ?? "—"})
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted font-medium">فارق السعر (Edge):</span>
                      <span
                        className={`font-mono font-bold tabular ${
                          edge != null && edge >= 0
                            ? "text-success"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {edge != null ? `${edge >= 0 ? "+" : ""}${(edge * 100).toFixed(1)}%` : "—"}
                      </span>
                    </div>

                    {item.isTrap && (
                      <div className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                        ⚠️ مصيدة قيمة: سعر السوق يطلب نسبة أعلى بكثير من احتمالات النموذج
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </SectionCard>
  );
}


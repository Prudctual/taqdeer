"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { MatchCard, MatchRow } from "@/lib/queries";
import { formatMatchTime, cleanSpace } from "@/lib/format";
import { LeagueAccuracyChart } from "@/components/LeagueAccuracyChart";
import { Crest } from "@/components/Crest";

/** هيكل انتظار موحد أثناء تحميل حزمة Recharts كسولاً */
function ChartSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-panel p-6 shadow-2xs">
      <div className="h-72 w-full animate-pulse rounded-xl bg-surface" />
    </div>
  );
}

// Recharts مكتبة ثقيلة — تُحمَّل عند الطلب بدل تضخيم حزمة الصفحة الأولى
const AccuracyLineChart = dynamic(
  () => import("@/components/charts/AccuracyLineChart").then((m) => m.AccuracyLineChart),
  { ssr: false, loading: ChartSkeleton },
);
const EvAreaChart = dynamic(
  () => import("@/components/charts/EvAreaChart").then((m) => m.EvAreaChart),
  { ssr: false, loading: ChartSkeleton },
);
const OutcomePieChart = dynamic(
  () => import("@/components/charts/OutcomePieChart").then((m) => m.OutcomePieChart),
  { ssr: false, loading: ChartSkeleton },
);
const TeamRadarChart = dynamic(
  () => import("@/components/charts/TeamRadarChart").then((m) => m.TeamRadarChart),
  { ssr: false, loading: ChartSkeleton },
);
const ConfidenceRadialChart = dynamic(
  () => import("@/components/charts/ConfidenceRadialChart").then((m) => m.ConfidenceRadialChart),
  { ssr: false, loading: ChartSkeleton },
);

type ChartCategory = "all" | "radar" | "pie" | "ev" | "goals" | "line" | "radial";
type FlexibleMatch = MatchCard & Partial<MatchRow>;

export function MatchChartsInteractiveContainer({
  matches = [],
}: {
  matches: MatchCard[];
}) {
  const [selectedId, setSelectedId] = useState<string>(
    matches.length > 0 ? matches[0].id : ""
  );

  const [activeCategory, setActiveCategory] = useState<ChartCategory>("all");

  const activeMatch = (matches.find((m) => m.id === selectedId) || matches[0] || null) as FlexibleMatch | null;

  const homeName = activeMatch?.homeNameAr || activeMatch?.home_name_ar || "المضيف";
  const awayName = activeMatch?.awayNameAr || activeMatch?.away_name_ar || "الضيف";
  const leagueName = activeMatch?.leagueNameAr || activeMatch?.league_name_ar || "الدوري";

  return (
    <div className="space-y-6">
      {/* 1. Sleek Match Selector Banner */}
      <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6 space-y-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-black text-ink">
            تحليل مخططات المباراة المحددة
          </h2>

          {/* Selector Dropdown */}
          <div className="w-full sm:w-auto">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full sm:w-80 px-4 py-2.5 rounded-xl border border-line bg-surface font-bold text-xs text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {matches.map((m) => {
                const flexM = m as FlexibleMatch;
                const hName = flexM.homeNameAr || flexM.home_name_ar || "المضيف";
                const aName = flexM.awayNameAr || flexM.away_name_ar || "الضيف";
                const lName = flexM.leagueNameAr || flexM.league_name_ar;

                return (
                  <option key={m.id} value={m.id}>
                    {lName ? `[${lName}] ` : ""}
                    {hName} ضد {aName}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Selected Match Details Card */}
        {activeMatch && (
          <div className="pt-4 border-t border-line grid grid-cols-1 sm:grid-cols-3 gap-4 items-center bg-surface/60 p-4 rounded-xl border border-line/60">
            {/* Home Team */}
            <div className="flex items-center gap-3 justify-start sm:justify-start">
              <Crest src={activeMatch.homeCrestUrl} alt={homeName} size="md" fallback={homeName.slice(0, 1)} />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-muted">المضيف</span>
                <p className="text-sm font-black text-ink">{homeName}</p>
                <span className="text-[10px] font-mono text-muted">Elo: {activeMatch.eloHome ?? 1800}</span>
              </div>
            </div>

            {/* Center VS / Status */}
            <div className="text-center space-y-1 my-2 sm:my-0">
              <span className="px-2.5 py-0.5 rounded-full bg-surface border border-accent/40 text-accent font-mono font-black text-xs inline-block">
                VS
              </span>
              <p className="text-xs font-bold text-muted">
                {leagueName}
              </p>
              {activeMatch.utcDate && (
                <span className="text-[11px] font-mono font-bold text-ink" suppressHydrationWarning>
                  {cleanSpace(formatMatchTime(activeMatch.utcDate))}
                </span>
              )}
            </div>

            {/* Away Team */}
            <div className="flex items-center gap-3 justify-start sm:justify-end">
              <div className="space-y-0.5 text-start sm:text-end">
                <span className="text-xs font-bold text-muted">الضيف</span>
                <p className="text-sm font-black text-ink">{awayName}</p>
                <span className="text-[10px] font-mono text-muted">Elo: {activeMatch.eloAway ?? 1750}</span>
              </div>
              <Crest src={activeMatch.awayCrestUrl} alt={awayName} size="md" fallback={awayName.slice(0, 1)} />
            </div>
          </div>
        )}

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-2">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`press-scale px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border ${
              activeCategory === "all"
                ? "bg-home text-on-fill border-home shadow-xs"
                : "bg-surface text-ink border-line hover:bg-panel"
            }`}
          >
            جميع التحليلات
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory("radar")}
            className={`press-scale px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border ${
              activeCategory === "radar"
                ? "bg-accent text-on-fill border-accent shadow-xs"
                : "bg-surface text-ink border-line hover:bg-panel"
            }`}
          >
            المقارنة التكتيكية (الرادارية)
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory("pie")}
            className={`press-scale px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border ${
              activeCategory === "pie"
                ? "bg-home text-on-fill border-home shadow-xs"
                : "bg-surface text-ink border-line hover:bg-panel"
            }`}
          >
            توزيع الاحتمالات (الدائرية)
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory("ev")}
            className={`press-scale px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border ${
              activeCategory === "ev"
                ? "bg-success text-on-fill border-success shadow-xs"
                : "bg-surface text-ink border-line hover:bg-panel"
            }`}
          >
            مقارنة القيمة (+EV)
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory("goals")}
            className={`press-scale px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border ${
              activeCategory === "goals"
                ? "bg-accent text-on-fill border-accent shadow-xs"
                : "bg-surface text-ink border-line hover:bg-panel"
            }`}
          >
            مقارنة الدوري (الشريطية)
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory("line")}
            className={`press-scale px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border ${
              activeCategory === "line"
                ? "bg-home text-on-fill border-home shadow-xs"
                : "bg-surface text-ink border-line hover:bg-panel"
            }`}
          >
            تطور الدقة (الخطية)
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory("radial")}
            className={`press-scale px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border ${
              activeCategory === "radial"
                ? "bg-accent text-on-fill border-accent shadow-xs"
                : "bg-surface text-ink border-line hover:bg-panel"
            }`}
          >
            مؤشرات الثقة (الإشعاعية)
          </button>
        </div>
      </div>

      {/* 2. Dynamic Charts Linked to Active Match */}
      <div className="space-y-8">
        {/* Section 1: Tactical Radar Chart */}
        {(activeCategory === "all" || activeCategory === "radar") && (
          <section aria-label="المقارنة التكتيكية السداسية" className="space-y-3">
            <h2 className="text-base font-black text-ink">
              المقارنة التكتيكية بين {homeName} و {awayName}
            </h2>
            <TeamRadarChart match={activeMatch} />
          </section>
        )}

        {/* Section 2: Outcome & Goal Market Pie Charts */}
        {(activeCategory === "all" || activeCategory === "pie") && (
          <section aria-label="توزيع احتمالات النتيجة وأسواق الأهداف" className="space-y-3">
            <h2 className="text-base font-black text-ink">
              توزيع احتمالات الفوز والتهديف
            </h2>
            <OutcomePieChart match={activeMatch} />
          </section>
        )}

        {/* Section 3: Expected Value (+EV) Bar/Area Chart */}
        {(activeCategory === "all" || activeCategory === "ev") && (
          <section aria-label="مقارنة القيمة المتوقعة" className="space-y-3">
            <h2 className="text-base font-black text-ink">
              مقارنة القيمة المتوقعة (+EV) لأسعار المراهنين
            </h2>
            <EvAreaChart match={activeMatch} />
          </section>
        )}

        {/* Section 4: League Bar Chart */}
        {(activeCategory === "all" || activeCategory === "goals") && (
          <section aria-label="مقارنة الدوري" className="space-y-3">
            <h2 className="text-base font-black text-ink">
              مقارنة دقة النماذج في {leagueName}
            </h2>
            <LeagueAccuracyChart />
          </section>
        )}

        {/* Section 5: Progress Line Chart */}
        {(activeCategory === "all" || activeCategory === "line") && (
          <section aria-label="تطور الدقة" className="space-y-3">
            <h2 className="text-base font-black text-ink">
              مسار تطور دقة التوقعات عبر الجولات
            </h2>
            <AccuracyLineChart />
          </section>
        )}

        {/* Section 6: Confidence Radial Chart */}
        {(activeCategory === "all" || activeCategory === "radial") && (
          <section aria-label="مؤشرات ثقة المعايرة" className="space-y-3">
            <h2 className="text-base font-black text-ink">
              مؤشرات ثقة التوقع واستقرار إشارات هذه المباراة
            </h2>
            <ConfidenceRadialChart match={activeMatch} />
          </section>
        )}
      </div>
    </div>
  );
}

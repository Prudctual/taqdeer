"use client";

import { useMemo, useState } from "react";
import { Crest } from "./Crest";
import { pct } from "@/lib/format";
import type { FinishedPredictionItem } from "@/lib/queries";

export function PredictionArchiveLog({
  items,
}: {
  items: FinishedPredictionItem[];
}) {
  const [selectedLeague, setSelectedLeague] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "hit" | "miss" | "dc_hit">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Extract unique leagues list
  const leagues = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      if (item.leagueId && item.leagueNameAr) {
        map.set(item.leagueId, item.leagueNameAr);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  // Filter items based on selected league, status, search query
  const filtered = useMemo(() => {
    return items.filter((item) => {
      // 1. League Filter
      if (selectedLeague !== "all" && item.leagueId !== selectedLeague) {
        return false;
      }

      // 2. Status Filter
      if (selectedStatus === "hit" && !item.isHit) return false;
      if (selectedStatus === "miss" && item.isHit) return false;
      if (selectedStatus === "dc_hit" && !item.doubleChanceHit) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const homeAr = (item.homeNameAr || "").toLowerCase();
        const awayAr = (item.awayNameAr || "").toLowerCase();
        const homeEn = (item.homeNameEn || "").toLowerCase();
        const awayEn = (item.awayNameEn || "").toLowerCase();
        if (
          !homeAr.includes(q) &&
          !awayAr.includes(q) &&
          !homeEn.includes(q) &&
          !awayEn.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [items, selectedLeague, selectedStatus, searchQuery]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = filtered.length;
    if (total === 0)
      return { total: 0, hits: 0, hitRate: 0, dcHits: 0, dcHitRate: 0, avgBrier: 0 };

    const hits = filtered.filter((i) => i.isHit).length;
    const dcHits = filtered.filter((i) => i.doubleChanceHit).length;
    const totalBrier = filtered.reduce((acc, i) => acc + i.brierScore, 0);

    return {
      total,
      hits,
      hitRate: hits / total,
      dcHits,
      dcHitRate: dcHits / total,
      avgBrier: totalBrier / total,
    };
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-line bg-panel p-4 space-y-1">
          <span className="text-[11px] font-bold text-muted block">إجمالي التوقعات المحفوظة</span>
          <div className="text-xl sm:text-2xl font-black text-ink font-mono tabular">
            {stats.total} <span className="text-xs text-muted font-normal">مباراة</span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
            نسبة النجاح المباشر (1X2)
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular">
            {pct(stats.hitRate, 1)}{" "}
            <span className="text-xs font-normal text-muted">({stats.hits} مباراة)</span>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-1">
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block">
            نجاح الفرصة المزدوجة (DC)
          </span>
          <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono tabular">
            {pct(stats.dcHitRate, 1)}{" "}
            <span className="text-xs font-normal text-muted">({stats.dcHits} مباراة)</span>
          </div>
        </div>

        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-1">
          <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 block">
            معيار المعايرة (Brier)
          </span>
          <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 font-mono tabular">
            {stats.avgBrier.toFixed(3)}
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="rounded-2xl border border-line bg-panel p-4 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* League Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedLeague("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors ${
                selectedLeague === "all"
                  ? "bg-accent text-accent-contrast shadow-2xs"
                  : "bg-surface border border-line text-muted hover:text-ink"
              }`}
            >
              جميع الدوريات ({items.length})
            </button>
            {leagues.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelectedLeague(l.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors ${
                  selectedLeague === l.id
                    ? "bg-accent text-accent-contrast shadow-2xs"
                    : "bg-surface border border-line text-muted hover:text-ink"
                }`}
              >
                {l.name}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative shrink-0 sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الفريق..."
              className="w-full rounded-xl border border-line bg-surface px-3 py-1.5 pe-8 text-xs font-bold text-ink placeholder:text-muted focus:border-accent focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute end-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Outcome Status Filter */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line">
          <span className="text-[11px] font-bold text-muted me-1">تصفية التوافق:</span>
          <button
            onClick={() => setSelectedStatus("all")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              selectedStatus === "all"
                ? "bg-ink text-surface"
                : "bg-surface text-muted hover:text-ink border border-line"
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setSelectedStatus("hit")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              selectedStatus === "hit"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20"
            }`}
          >
            أصابت التوقع (✓)
          </button>
          <button
            onClick={() => setSelectedStatus("miss")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              selectedStatus === "miss"
                ? "bg-rose-600 text-white shadow-2xs"
                : "bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20"
            }`}
          >
            إخفقت التوقع (✗)
          </button>
          <button
            onClick={() => setSelectedStatus("dc_hit")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              selectedStatus === "dc_hit"
                ? "bg-blue-600 text-white shadow-2xs"
                : "bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-500/20"
            }`}
          >
            نجاح الفرصة المزدوجة (🎯)
          </button>
        </div>
      </div>

      {/* Prediction History Records List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-line bg-panel p-8 text-center space-y-2">
            <span className="text-2xl">🔍</span>
            <p className="text-sm font-bold text-muted">لا توجد سجلات توقعات مطابقة لخيارات التصفية</p>
          </div>
        ) : (
          filtered.map((item) => {
            const pHome = item.pHome ?? 0;
            const pDraw = item.pDraw ?? 0;
            const pAway = item.pAway ?? 0;

            const predText =
              item.predictedOutcome === "H"
                ? `فوز ${item.homeNameAr}`
                : item.predictedOutcome === "D"
                ? "التعادل"
                : `فوز ${item.awayNameAr}`;

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-line bg-panel p-4 sm:p-5 hover:border-accent/40 transition-all shadow-2xs space-y-4"
              >
                {/* Header info */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-surface border border-line font-black text-ink">
                      {item.leagueNameAr}
                    </span>
                    <span className="text-muted font-mono">
                      {new Date(item.utcDate).toLocaleDateString("ar-IQ", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        timeZone: "Asia/Baghdad",
                      })}
                    </span>
                  </div>

                  {/* Prediction Hit Status Pill */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black inline-flex items-center gap-1 ${
                        item.isHit
                          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {item.isHit ? "✓ أصابت التوقع" : "✗ إخفقت التوقع"}
                    </span>
                  </div>
                </div>

                {/* Teams & Score Matchup */}
                <div className="grid grid-cols-12 items-center gap-2 py-1">
                  {/* Home Team */}
                  <div className="col-span-5 flex items-center justify-start gap-2.5">
                    <Crest src={item.homeCrestUrl} alt={item.homeNameAr} size="chip" />
                    <span className="text-xs sm:text-sm font-black text-ink truncate">
                      {item.homeNameAr}
                    </span>
                  </div>

                  {/* Actual Final Score */}
                  <div className="col-span-2 text-center">
                    <div className="inline-flex items-center justify-center px-3 py-1 rounded-xl bg-surface border border-line font-mono font-black text-sm sm:text-base text-ink">
                      {item.homeGoals} - {item.awayGoals}
                    </div>
                  </div>

                  {/* Away Team */}
                  <div className="col-span-5 flex items-center justify-end gap-2.5">
                    <span className="text-xs sm:text-sm font-black text-ink truncate text-end">
                      {item.awayNameAr}
                    </span>
                    <Crest src={item.awayCrestUrl} alt={item.awayNameAr} size="chip" />
                  </div>
                </div>

                {/* Prediction Breakdown Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-line text-xs">
                  {/* Top Prediction */}
                  <div className="rounded-xl bg-surface p-2.5 border border-line space-y-1">
                    <span className="text-[10px] font-bold text-muted block">التوقع الرئيسي المسجل</span>
                    <div className="font-black text-ink flex items-center justify-between">
                      <span>{predText}</span>
                      <span className="font-mono text-accent">{pct(item.topProb, 0)}</span>
                    </div>
                  </div>

                  {/* Double Chance Rec */}
                  <div className="rounded-xl bg-surface p-2.5 border border-line space-y-1">
                    <span className="text-[10px] font-bold text-muted block">الفرصة المزدوجة (Double Chance)</span>
                    <div className="font-black text-ink flex items-center justify-between">
                      <span className="font-mono">{item.doubleChanceRec}</span>
                      <span className={`font-bold text-[11px] ${item.doubleChanceHit ? "text-emerald-600" : "text-rose-500"}`}>
                        {item.doubleChanceHit ? "ناجح 🎯" : "غير موفق"}
                      </span>
                    </div>
                  </div>

                  {/* Probability Spread */}
                  <div className="rounded-xl bg-surface p-2.5 border border-line space-y-1">
                    <span className="text-[10px] font-bold text-muted block">توزيع الاحتمالات (1 - X - 2)</span>
                    <div className="flex items-center gap-2 font-mono font-bold text-[11px]">
                      <span className="text-home">{pct(pHome, 0)}</span>
                      <span className="text-muted">/</span>
                      <span className="text-draw">{pct(pDraw, 0)}</span>
                      <span className="text-muted">/</span>
                      <span className="text-away">{pct(pAway, 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

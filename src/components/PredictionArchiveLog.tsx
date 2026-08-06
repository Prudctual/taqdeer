"use client";

import { useMemo, useState } from "react";
import { Crest } from "./Crest";
import { formatMatchTime, formatShortDate, pct } from "@/lib/format";
import type { FinishedPredictionItem, MatchCard } from "@/lib/queries";

export function PredictionArchiveLog({
  items,
  upcomingSnapshots = [],
}: {
  items: FinishedPredictionItem[];
  upcomingSnapshots?: MatchCard[];
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
    upcomingSnapshots.forEach((item) => {
      if (item.leagueId && item.leagueNameAr) {
        map.set(item.leagueId, item.leagueNameAr);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items, upcomingSnapshots]);

  // Filter finished items
  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (selectedLeague !== "all" && item.leagueId !== selectedLeague) {
        return false;
      }
      if (selectedStatus === "hit" && !item.isHit) return false;
      if (selectedStatus === "miss" && item.isHit) return false;
      if (selectedStatus === "dc_hit" && !item.doubleChanceHit) return false;

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

  // Filter upcoming snapshots
  const filteredUpcoming = useMemo(() => {
    return upcomingSnapshots.filter((item) => {
      if (selectedLeague !== "all" && item.leagueId !== selectedLeague) {
        return false;
      }
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
  }, [upcomingSnapshots, selectedLeague, searchQuery]);

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
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-line bg-panel p-4 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted block">المباريات المؤرشفة</span>
          <div className="text-xl sm:text-2xl font-black text-ink font-mono tabular">
            {stats.total} <span className="text-xs text-muted font-normal">مباراة</span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
            دقة التوقع المباشر (1X2)
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular">
            {stats.total > 0 ? pct(stats.hitRate, 1) : "—"}{" "}
            <span className="text-xs font-normal text-muted">({stats.hits} مباراة)</span>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block">
            دقة الفرصة المزدوجة (DC)
          </span>
          <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono tabular">
            {stats.total > 0 ? pct(stats.dcHitRate, 1) : "—"}{" "}
            <span className="text-xs font-normal text-muted">({stats.dcHits} مباراة)</span>
          </div>
        </div>

        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-accent block">المباريات المجمّدة مسبقاً</span>
          <div className="text-xl sm:text-2xl font-black text-ink font-mono tabular">
            {upcomingSnapshots.length} <span className="text-xs text-muted font-normal">مباراة مجدولة</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="rounded-2xl border border-line bg-panel p-4 space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* League Filter */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedLeague("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedLeague === "all"
                  ? "bg-accent text-accent-contrast shadow-2xs"
                  : "bg-surface border border-line text-muted hover:text-ink"
              }`}
            >
              جميع الدوريات ({items.length + upcomingSnapshots.length})
            </button>
            {leagues.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setSelectedLeague(l.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
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
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute end-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Outcome Filter */}
        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-line">
            <span className="text-[11px] font-bold text-muted me-1">تصفية التوافق:</span>
            <button
              type="button"
              onClick={() => setSelectedStatus("all")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedStatus === "all"
                  ? "bg-ink text-surface"
                  : "bg-surface text-muted hover:text-ink border border-line"
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("hit")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedStatus === "hit"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20"
              }`}
            >
              أصابت التوقع (✓)
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("miss")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedStatus === "miss"
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20"
              }`}
            >
              إخفقت التوقع (✗)
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("dc_hit")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedStatus === "dc_hit"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-500/20"
              }`}
            >
              نجاح الفرصة المزدوجة (🎯)
            </button>
          </div>
        )}
      </div>

      {/* Finished Matches List */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-black text-ink uppercase tracking-wide flex items-center gap-2 px-1">
            <span className="w-1.5 h-4 bg-emerald-500 rounded-full inline-block" />
            <span>المباريات المكتملة والمؤرشفة</span>
          </h2>
          {filtered.map((item) => {
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
                    {item.isSnapshotLocked && (
                      <span
                        className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 font-black text-[10px] text-blue-600 dark:text-blue-400"
                        title="تم تجميد التوقع الصادر رسمياً قبل بداية المباراة بجدول غير قابل للتعديل"
                      >
                        🔒 مجمد قبل المباراة
                      </span>
                    )}
                    <span className="text-muted font-mono">
                      {new Date(item.utcDate).toLocaleDateString("ar-IQ", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        timeZone: "Asia/Baghdad",
                      })}
                    </span>
                  </div>

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

                {/* Scoreline */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  {/* Home Team */}
                  <div className="flex items-center justify-end gap-3 min-w-0">
                    <span className="font-bold text-sm text-ink truncate text-end">
                      {item.homeNameAr}
                    </span>
                    <Crest src={item.homeCrestUrl} alt={item.homeNameAr} size="md" />
                  </div>

                  {/* Score */}
                  <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-line font-mono font-black text-base text-ink">
                    <span>{item.homeGoals ?? 0}</span>
                    <span className="text-muted">-</span>
                    <span>{item.awayGoals ?? 0}</span>
                  </div>

                  {/* Away Team */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Crest src={item.awayCrestUrl} alt={item.awayNameAr} size="md" />
                    <span className="font-bold text-sm text-ink truncate">
                      {item.awayNameAr}
                    </span>
                  </div>
                </div>

                {/* Predictions Comparison Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-line text-xs">
                  <div className="rounded-xl bg-surface p-2.5 space-y-1">
                    <span className="text-muted block text-[11px] font-semibold">
                      التوقع الرئيسي المسجل
                    </span>
                    <div className="font-black text-ink flex items-center justify-between">
                      <span>{predText}</span>
                      <span className="font-mono text-accent">{pct(item.topProb)}</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-surface p-2.5 space-y-1">
                    <span className="text-muted block text-[11px] font-semibold">
                      الفرصة المزدوجة (Double Chance)
                    </span>
                    <div className="font-black text-ink flex items-center justify-between">
                      <span className="font-mono">{item.doubleChanceRec}</span>
                      <span
                        className={
                          item.doubleChanceHit ? "text-emerald-600 font-bold" : "text-muted"
                        }
                      >
                        {item.doubleChanceHit ? "ناجح 🎯" : "غير موفق"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-surface p-2.5 space-y-1">
                    <span className="text-muted block text-[11px] font-semibold">
                      توزيع الاحتمالات (1 - X - 2)
                    </span>
                    <div className="font-mono font-bold text-ink flex items-center justify-between">
                      <span>{pct(pHome)}</span>
                      <span className="text-muted">/</span>
                      <span>{pct(pDraw)}</span>
                      <span className="text-muted">/</span>
                      <span>{pct(pAway)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upcoming Frozen Snapshots Section */}
      {filteredUpcoming.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 sm:p-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
                <h2 className="text-base sm:text-lg font-black text-ink">
                  توقعات الجولات القادمة المجمّدة (بدء الأرشفة التوثيقية)
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-surface border border-line text-xs font-black text-accent font-mono">
                🔒 {filteredUpcoming.length} مباراة قادمة مجمّدة ومجهّزة
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-muted leading-relaxed max-w-3xl">
              ينطلق السجل الأرشيفي التوثيقي رسمياً بداية من مباريات الغد (7 أغسطس 2026). جميع المباريات أدناه تم قفل توقعاتها مسبقاً بجدول غير قابل للتعديل وسوف تنتقل تلقائياً للسجل فور صفارة النهاية.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredUpcoming.map((item) => {
              const pHome = item.pHome ?? 0;
              const pDraw = item.pDraw ?? 0;
              const pAway = item.pAway ?? 0;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-line bg-panel p-4 hover:border-accent/40 transition-all shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between text-xs border-b border-line pb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-surface border border-line font-black text-ink">
                      {item.leagueNameAr}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] font-black text-blue-600 dark:text-blue-400">
                        🔒 مجمّد ومجهّز
                      </span>
                      <span className="text-muted font-mono font-bold">
                        {formatShortDate(item.utcDate)} · {formatMatchTime(item.utcDate)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-1">
                    <div className="flex items-center justify-end gap-2 min-w-0">
                      <span className="font-bold text-xs text-ink truncate text-end">
                        {item.homeNameAr}
                      </span>
                      <Crest src={item.homeCrestUrl} alt={item.homeNameAr} size="sm" />
                    </div>
                    <span className="text-xs font-black text-muted px-2 py-0.5 rounded-md bg-surface border border-line">
                      VS
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      <Crest src={item.awayCrestUrl} alt={item.awayNameAr} size="sm" />
                      <span className="font-bold text-xs text-ink truncate">
                        {item.awayNameAr}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-surface p-2.5 flex items-center justify-between text-xs font-mono font-bold">
                    <span className="text-muted text-[11px] font-sans">التوقعات (1 - X - 2):</span>
                    <div className="flex items-center gap-2 text-ink">
                      <span className="text-accent">{pct(pHome)}</span>
                      <span className="text-muted">/</span>
                      <span>{pct(pDraw)}</span>
                      <span className="text-muted">/</span>
                      <span>{pct(pAway)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

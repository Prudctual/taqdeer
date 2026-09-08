"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";
import { Crest } from "./Crest";
import { ProbBar } from "./ProbBar";
import { EmptyState } from "./ui";
import {
  DISPLAY_TZ,
  DISPLAY_TZ_LABEL,
  DATA_TZ,
  DATA_TZ_LABEL,
  formatLongDate,
  formatMatchTime,
  groupByDay,
  pct,
} from "@/lib/format";
import { leagueEmblemUrl } from "@/lib/leagues";
import type { FinishedPredictionItem, MatchCard } from "@/lib/queries";

function countryAr(leagueId?: string): string {
  const id = (leagueId || "").trim().toLowerCase();
  if (id === "pl" || id === "elc") return "إنجلترا";
  if (id === "ppd") return "البرتغال";
  if (id === "pd") return "إسبانيا";
  if (id === "sa") return "إيطاليا";
  if (id === "bl1") return "ألمانيا";
  if (id === "fl1") return "فرنسا";
  if (id === "ded") return "هولندا";
  if (id === "cl" || id === "ucl") return "أوروبا";
  if (id === "uel" || id === "el") return "أوروبا";
  return "";
}

export function PredictionArchiveLog({
  items,
  upcomingSnapshots = [],
  showFinished = true,
}: {
  items: FinishedPredictionItem[];
  upcomingSnapshots?: MatchCard[];
  showFinished?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "finished">(() =>
    items.length > 0 ? "finished" : "upcoming",
  );
  const [selectedLeague, setSelectedLeague] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "hit" | "miss" | "dc_hit"
  >("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Accordion state for finished days
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Accordion state for upcoming days
  const [expandedUpcomingDays, setExpandedUpcomingDays] = useState<
    Record<string, boolean>
  >({});

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

  const finishedForSummary = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedLeague !== "all" && item.leagueId !== selectedLeague) return false;
      if (!q) return true;
      const homeAr = (item.homeNameAr || "").toLowerCase();
      const awayAr = (item.awayNameAr || "").toLowerCase();
      const homeEn = (item.homeNameEn || "").toLowerCase();
      const awayEn = (item.awayNameEn || "").toLowerCase();
      return (
        homeAr.includes(q) ||
        awayAr.includes(q) ||
        homeEn.includes(q) ||
        awayEn.includes(q)
      );
    });
  }, [items, selectedLeague, searchQuery]);

  const filtered = useMemo(() => {
    return finishedForSummary.filter((item) => {
      if (selectedStatus === "hit" && !item.isHit) return false;
      if (selectedStatus === "miss" && item.isHit) return false;
      if (selectedStatus === "dc_hit" && !item.doubleChanceHit) return false;
      return true;
    });
  }, [finishedForSummary, selectedStatus]);

  // Group finished predictions by day descending (Newest days first)
  const finishedDays = useMemo(() => {
    return groupByDay(filtered, new Date(), "desc").map((day) => {
      const n = day.items.length;
      const hits = day.items.filter((i) => i.isHit).length;
      const dcHits = day.items.filter((i) => i.doubleChanceHit).length;
      const hitRate = n > 0 ? hits / n : 0;
      const dcRate = n > 0 ? dcHits / n : 0;
      const best =
        [...day.items]
          .filter((i) => i.isHit)
          .sort((a, b) => b.topProb - a.topProb)[0] ?? null;
      const worst =
        [...day.items]
          .filter((i) => !i.isHit)
          .sort((a, b) => b.topProb - a.topProb)[0] ?? null;
      return {
        ...day,
        n,
        hits,
        dcHits,
        hitRate,
        dcRate,
        best,
        worst,
      };
    });
  }, [filtered]);

  // Overall statistics for the filtered finished set
  const overallStats = useMemo(() => {
    const total = filtered.length;
    const hits = filtered.filter((i) => i.isHit).length;
    const dcHits = filtered.filter((i) => i.doubleChanceHit).length;
    const hitRate = total > 0 ? hits / total : 0;
    const dcRate = total > 0 ? dcHits / total : 0;
    return { total, hits, dcHits, hitRate, dcRate };
  }, [filtered]);

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

  const upcomingByDay = useMemo(
    () => groupByDay(filteredUpcoming, new Date(), "asc"),
    [filteredUpcoming],
  );

  const visibleTab: "upcoming" | "finished" = showFinished
    ? activeTab
    : "upcoming";

  const tabLeagueCount = (leagueId: string) => {
    if (visibleTab === "upcoming") {
      return upcomingSnapshots.filter(
        (u) => u.leagueId.toLowerCase() === leagueId.toLowerCase(),
      ).length;
    }
    return items.filter(
      (i) => i.leagueId.toLowerCase() === leagueId.toLowerCase(),
    ).length;
  };

  const tabTotal =
    visibleTab === "upcoming" ? upcomingSnapshots.length : items.length;

  // Accordion helpers for finished days
  const isDayExpanded = (key: string, index: number) => {
    if (expandedDays[key] !== undefined) return expandedDays[key];
    // By default, the newest day is open
    return index === 0;
  };

  const toggleDay = (key: string, index: number) => {
    const current = isDayExpanded(key, index);
    setExpandedDays((prev) => ({ ...prev, [key]: !current }));
  };

  const expandAllFinished = () => {
    const next: Record<string, boolean> = {};
    finishedDays.forEach((d) => {
      next[d.key] = true;
    });
    setExpandedDays(next);
  };

  const collapseAllFinished = () => {
    const next: Record<string, boolean> = {};
    finishedDays.forEach((d) => {
      next[d.key] = false;
    });
    setExpandedDays(next);
  };

  // Accordion helpers for upcoming days
  const isUpcomingDayExpanded = (key: string, index: number) => {
    if (expandedUpcomingDays[key] !== undefined)
      return expandedUpcomingDays[key];
    return index === 0;
  };

  const toggleUpcomingDay = (key: string, index: number) => {
    const current = isUpcomingDayExpanded(key, index);
    setExpandedUpcomingDays((prev) => ({ ...prev, [key]: !current }));
  };

  const expandAllUpcoming = () => {
    const next: Record<string, boolean> = {};
    upcomingByDay.forEach((d) => {
      next[d.key] = true;
    });
    setExpandedUpcomingDays(next);
  };

  const collapseAllUpcoming = () => {
    const next: Record<string, boolean> = {};
    upcomingByDay.forEach((d) => {
      next[d.key] = false;
    });
    setExpandedUpcomingDays(next);
  };

  const tabBtn = (active: boolean) =>
    `press-scale flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold motion-colors whitespace-nowrap cursor-pointer ${
      active
        ? "bg-surface text-ink border border-line shadow-2xs"
        : "text-muted hover:text-ink hover:bg-surface/60 border border-transparent"
    }`;

  const filterBtn = (active: boolean) =>
    `press-scale flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-start motion-colors cursor-pointer ${
      active
        ? "bg-accent-dim border-accent text-ink"
        : "bg-surface border-line text-ink hover:bg-panel"
    }`;

  return (
    <div className="space-y-6">
      {/* Primary Tab Switcher */}
      {showFinished ? (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none rounded-xl bg-panel p-1.5 border border-line">
          <button
            type="button"
            onClick={() => setActiveTab("finished")}
            className={tabBtn(visibleTab === "finished")}
          >
            <span>نتائج مكتملة</span>
            <span
              className={`tabular px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                visibleTab === "finished"
                  ? "bg-success-dim text-success"
                  : "bg-surface text-muted border border-line"
              }`}
            >
              {items.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={tabBtn(visibleTab === "upcoming")}
          >
            <span>لم تُلعب بعد</span>
            <span
              className={`tabular px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                visibleTab === "upcoming"
                  ? "bg-accent-dim text-accent"
                  : "bg-surface text-muted border border-line"
              }`}
            >
              {upcomingSnapshots.length}
            </span>
          </button>
        </div>
      ) : null}

      {/* Filter and Search Card */}
      <section className="card overflow-hidden">
        <div className="card-head flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 space-y-0.5">
            <h2 className="type-section text-ink">
              {visibleTab === "finished"
                ? "تصفية الأرشيف والنتائج المكتملة"
                : "تصفية المباريات القادمة"}
            </h2>
            <p className="text-xs text-muted">
              {visibleTab === "finished"
                ? "تُوثّق النتائج الفعلية تلقائياً بعد الصافرة مع مقارنة توقعات النموذج المحفوظة مسبقاً"
                : "توقعات ومؤشرات محفوظة بدقة قبل انطلاق المباريات"}
            </p>
          </div>
          <div className="relative w-full sm:w-64 shrink-0">
            <label className="sr-only" htmlFor="archive-search">
              بحث باسم الفريق
            </label>
            <input
              id="archive-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الفريق…"
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 pe-8 text-xs font-medium text-ink placeholder:text-faint focus-visible:outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute end-2 top-1/2 -translate-y-1/2 text-faint hover:text-ink text-xs font-semibold cursor-pointer"
                aria-label="مسح البحث"
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* League Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <button
              type="button"
              onClick={() => setSelectedLeague("all")}
              className={filterBtn(selectedLeague === "all")}
              data-league={undefined}
            >
              <span className="text-xs font-semibold truncate">جميع الدوريات</span>
              <span className="tabular text-[11px] font-semibold text-muted shrink-0">
                {tabTotal}
              </span>
            </button>

            {leagues.map((l) => {
              const count = tabLeagueCount(l.id);
              const isSelected = selectedLeague === l.id;
              const country = countryAr(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setSelectedLeague(l.id)}
                  data-league={l.id.toLowerCase()}
                  className={filterBtn(isSelected)}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="chip-dot" aria-hidden />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={leagueEmblemUrl(l.id)}
                      alt=""
                      className="w-5 h-5 object-contain shrink-0"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/icon.svg";
                      }}
                    />
                    <span className="min-w-0 text-start">
                      <span className="text-xs font-semibold truncate block">
                        {l.name}
                      </span>
                      {country ? (
                        <span className="text-[10px] text-faint block">{country}</span>
                      ) : null}
                    </span>
                  </span>
                  <span className="tabular text-[11px] font-semibold text-muted shrink-0">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Status Sub-Filters for Finished */}
          {visibleTab === "finished" && items.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <span className="type-label me-1">حالة التوقع:</span>
              {(
                [
                  ["all", "جميع الحالات"],
                  ["hit", "توقع صائب فقط"],
                  ["miss", "توقع غير صائب"],
                  ["dc_hit", "نجاح الفرصة المزدوجة"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedStatus(key)}
                  className={`press-scale rounded-md px-3 py-1 text-xs font-semibold border motion-colors cursor-pointer ${
                    selectedStatus === key
                      ? key === "hit"
                        ? "bg-success-dim text-success border-success/30"
                        : key === "miss"
                          ? "bg-danger-dim text-danger border-danger/30"
                          : key === "dc_hit"
                            ? "bg-accent-dim text-accent border-accent/30"
                            : "bg-panel text-ink border-line"
                      : "bg-surface text-muted border-line hover:text-ink hover:bg-panel"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* Finished Tab Content */}
      {visibleTab === "finished" && (
        <div className="space-y-4">
          {/* High-level summary cards for filtered selection */}
          {filtered.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="card p-3 sm:p-4 text-center space-y-1">
                <span className="type-label block text-xs">إجمالي المباريات</span>
                <span className="text-xl sm:text-2xl font-bold tabular text-ink block">
                  {overallStats.total}
                </span>
                <span className="text-[11px] text-muted">مكتملة ومحفوظة</span>
              </div>
              <div className="card p-3 sm:p-4 text-center space-y-1">
                <span className="type-label block text-xs">دقة التوقع الرئيسي</span>
                <span className="text-xl sm:text-2xl font-bold tabular text-success block">
                  {pct(overallStats.hitRate)}
                </span>
                <span className="text-[11px] text-muted tabular">
                  {overallStats.hits} من {overallStats.total} صائب
                </span>
              </div>
              <div className="card p-3 sm:p-4 text-center space-y-1">
                <span className="type-label block text-xs">نجاح الفرصة المزدوجة</span>
                <span className="text-xl sm:text-2xl font-bold tabular text-accent block">
                  {pct(overallStats.dcRate)}
                </span>
                <span className="text-[11px] text-muted tabular">
                  {overallStats.dcHits} من {overallStats.total} ناجح
                </span>
              </div>
              <div className="card p-3 sm:p-4 text-center space-y-1">
                <span className="type-label block text-xs">أيام الأرشيف</span>
                <span className="text-xl sm:text-2xl font-bold tabular text-ink block">
                  {finishedDays.length}
                </span>
                <span className="text-[11px] text-accent font-medium">
                  تنازلياً من الأحدث للأقدم
                </span>
              </div>
            </div>
          )}

          {/* Section Toolbar: Header + Expand / Collapse all */}
          {finishedDays.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" />
                <h3 className="type-section text-ink">سجل الأيام التنازلي</h3>
                <span className="tabular text-xs font-semibold px-2 py-0.5 rounded-md bg-panel border border-line text-muted">
                  {finishedDays.length} يوم
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={expandAllFinished}
                  className="press-scale text-xs font-medium px-3 py-1.5 rounded-lg border border-line bg-surface text-ink hover:bg-panel transition-colors cursor-pointer"
                >
                  توسيع الكل
                </button>
                <button
                  type="button"
                  onClick={collapseAllFinished}
                  className="press-scale text-xs font-medium px-3 py-1.5 rounded-lg border border-line bg-surface text-muted hover:text-ink hover:bg-panel transition-colors cursor-pointer"
                >
                  طي الكل
                </button>
              </div>
            </div>
          )}

          {/* Collapsible Days List in Descending Order */}
          {finishedDays.length > 0 ? (
            <div className="space-y-3">
              {finishedDays.map((day, idx) => {
                const isOpen = isDayExpanded(day.key, idx);

                return (
                  <div
                    key={day.key}
                    className="card overflow-hidden transition-all duration-200 border-line hover:border-line-strong"
                  >
                    {/* Accordion Trigger Header */}
                    <button
                      type="button"
                      onClick={() => toggleDay(day.key, idx)}
                      aria-expanded={isOpen}
                      className={`w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 text-start transition-colors cursor-pointer select-none ${
                        isOpen ? "bg-panel/40" : "hover:bg-panel/30"
                      }`}
                    >
                      {/* Right info (RTL): chevron, relative badge, date, match count */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-200 ${
                            isOpen
                              ? "bg-accent-dim border-accent/30 text-accent rotate-180"
                              : "bg-surface border-line text-muted"
                          }`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </div>

                        {day.relative ? (
                          <span className="bg-accent-dim text-accent px-2.5 py-0.5 rounded-md text-xs font-semibold border border-accent/20 shrink-0">
                            {day.relative}
                          </span>
                        ) : null}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="type-section text-ink font-semibold truncate">
                              {formatLongDate(day.items[0]!.utcDate)}
                            </h3>
                            <span className="text-[11px] text-faint hidden md:inline">
                              ({DISPLAY_TZ_LABEL})
                            </span>
                          </div>
                          <p className="text-[11px] text-muted truncate mt-0.5">
                            {day.n === 1
                              ? "مباراة واحدة مكتملة"
                              : day.n === 2
                                ? "مباراتان مكتملتان"
                                : day.n <= 10
                                  ? `${day.n} مباريات مكتملة`
                                  : `${day.n} مباراة مكتملة`}
                          </p>
                        </div>
                      </div>

                      {/* Left info (RTL): Day performance summary badges */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold tabular border ${
                            day.hitRate >= 0.6
                              ? "bg-success-dim text-success border-success/30"
                              : day.hitRate >= 0.4
                                ? "bg-panel text-ink border-line"
                                : "bg-danger-dim text-danger border-danger/30"
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{day.hits}/{day.n} صائب</span>
                          <span className="opacity-80">({pct(day.hitRate)})</span>
                        </span>

                        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold tabular bg-surface border border-line text-muted">
                          <span>مزدوجة: {pct(day.dcRate)}</span>
                        </span>
                      </div>
                    </button>

                    {/* Collapsible Content */}
                    {isOpen && (
                      <div className="border-t border-line">
                        {/* Day Performance Summary Strip */}
                        <div className="p-3 sm:p-4 bg-panel/30 border-b border-line grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="rounded-lg bg-surface border border-line p-2.5">
                            <p className="type-label text-[10px]">إصابة التوقع الرئيسي</p>
                            <p className="mt-1 text-xs sm:text-sm font-semibold tabular text-ink">
                              {day.hits}/{day.n}
                              <span className="ms-1.5 text-xs text-muted font-normal">
                                ({pct(day.hitRate)})
                              </span>
                            </p>
                          </div>
                          <div className="rounded-lg bg-surface border border-line p-2.5">
                            <p className="type-label text-[10px]">نجاح الفرصة المزدوجة</p>
                            <p className="mt-1 text-xs sm:text-sm font-semibold tabular text-ink">
                              {day.dcHits}/{day.n}
                              <span className="ms-1.5 text-xs text-muted font-normal">
                                ({pct(day.dcRate)})
                              </span>
                            </p>
                          </div>
                          <div className="rounded-lg bg-surface border border-line p-2.5 col-span-2 sm:col-span-1">
                            <p className="type-label text-[10px] text-success">أفضل إصابة</p>
                            <p className="mt-1 text-xs font-semibold text-ink truncate">
                              {day.best
                                ? `${day.best.homeNameAr} × ${day.best.awayNameAr}`
                                : "—"}
                            </p>
                            {day.best ? (
                              <p className="text-[10px] font-medium text-muted tabular mt-0.5">
                                @ {pct(day.best.topProb)}
                              </p>
                            ) : null}
                          </div>
                          <div className="rounded-lg bg-surface border border-line p-2.5 col-span-2 sm:col-span-1">
                            <p className="type-label text-[10px] text-danger">أقوى مفاجأة / إخفاق</p>
                            <p className="mt-1 text-xs font-semibold text-ink truncate">
                              {day.worst
                                ? `${day.worst.homeNameAr} × ${day.worst.awayNameAr}`
                                : "—"}
                            </p>
                            {day.worst ? (
                              <p className="text-[10px] font-medium text-muted tabular mt-0.5">
                                توقّع @ {pct(day.worst.topProb)}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {/* Match Cards Grid */}
                        <div className="p-3.5 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-3.5 bg-bg/40">
                          {day.items.map((item) => {
                            const pHome = item.pHome ?? 0;
                            const pDraw = item.pDraw ?? 0;
                            const pAway = item.pAway ?? 0;
                            const predText =
                              item.predictedOutcome === "H"
                                ? `فوز ${item.homeNameAr}`
                                : item.predictedOutcome === "D"
                                  ? "التعادل"
                                  : `فوز ${item.awayNameAr}`;

                            const homeWon =
                              (item.homeGoals ?? 0) > (item.awayGoals ?? 0);
                            const awayWon =
                              (item.awayGoals ?? 0) > (item.homeGoals ?? 0);

                            return (
                              <article
                                key={item.id}
                                data-league={item.leagueId?.toLowerCase()}
                                className="card overflow-hidden bg-surface border-line hover:border-line-strong transition-all flex flex-col justify-between"
                              >
                                {/* Match Card Header */}
                                <div className="flex items-center justify-between gap-2 border-b border-line px-3.5 py-2.5 bg-panel/25 text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={leagueEmblemUrl(item.leagueId || "")}
                                      alt=""
                                      className="w-4 h-4 object-contain shrink-0"
                                      onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = "/icon.svg";
                                      }}
                                    />
                                    <span className="font-semibold text-ink truncate">
                                      {item.leagueNameAr}
                                    </span>
                                    {item.matchday != null ? (
                                      <span className="tabular px-1.5 py-0.5 rounded bg-surface border border-line text-[10px] font-semibold text-muted shrink-0">
                                        ج{item.matchday}
                                      </span>
                                    ) : null}
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[11px] text-muted tabular">
                                      {formatMatchTime(item.utcDate, DISPLAY_TZ)}{" "}
                                      {DISPLAY_TZ_LABEL} ·{" "}
                                      {formatMatchTime(item.utcDate, DATA_TZ)}{" "}
                                      {DATA_TZ_LABEL}
                                    </span>
                                    <span
                                      className={`verdict-chip ${
                                        item.isHit
                                          ? "verdict-chip-hit"
                                          : "verdict-chip-miss"
                                      }`}
                                    >
                                      {item.isHit ? "توقع صائب ✓" : "توقع غير صائب ✗"}
                                    </span>
                                  </div>
                                </div>

                                {/* Teams & Real Score */}
                                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 sm:gap-3 px-3.5 py-3.5">
                                  <div className="flex items-center justify-end gap-2.5 min-w-0">
                                    <span
                                      className={`text-xs sm:text-sm truncate text-end ${
                                        homeWon
                                          ? "font-bold text-ink"
                                          : "font-medium text-muted"
                                      }`}
                                    >
                                      {item.homeNameAr}
                                    </span>
                                    <Crest
                                      src={item.homeCrestUrl}
                                      alt={item.homeNameAr}
                                      size="md"
                                      className="shrink-0"
                                    />
                                  </div>

                                  {/* Score Pill */}
                                  <div className="flex items-center justify-center gap-2 px-3 py-1 rounded-lg bg-panel border border-line font-bold text-lg sm:text-xl tabular text-ink shadow-2xs">
                                    <span
                                      className={
                                        homeWon
                                          ? "text-ink font-black"
                                          : "text-muted"
                                      }
                                    >
                                      {item.homeGoals ?? 0}
                                    </span>
                                    <span className="text-faint font-normal">–</span>
                                    <span
                                      className={
                                        awayWon
                                          ? "text-ink font-black"
                                          : "text-muted"
                                      }
                                    >
                                      {item.awayGoals ?? 0}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <Crest
                                      src={item.awayCrestUrl}
                                      alt={item.awayNameAr}
                                      size="md"
                                      className="shrink-0"
                                    />
                                    <span
                                      className={`text-xs sm:text-sm truncate ${
                                        awayWon
                                          ? "font-bold text-ink"
                                          : "font-medium text-muted"
                                      }`}
                                    >
                                      {item.awayNameAr}
                                    </span>
                                  </div>
                                </div>

                                {/* Model Predictions Comparison */}
                                <div className="grid grid-cols-2 gap-2 px-3.5 pb-3">
                                  <div className="rounded-lg bg-panel/50 border border-line p-2.5 space-y-1">
                                    <span className="type-label block text-[10px]">
                                      التوقع الرئيسي المسجل
                                    </span>
                                    <div className="flex items-center justify-between gap-1 text-xs font-semibold text-ink">
                                      <span className="truncate">{predText}</span>
                                      <span className="tabular text-accent shrink-0">
                                        {pct(item.topProb)}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="rounded-lg bg-panel/50 border border-line p-2.5 space-y-1">
                                    <span className="type-label block text-[10px]">
                                      الفرصة المزدوجة
                                    </span>
                                    <div className="flex items-center justify-between gap-1 text-xs font-semibold text-ink">
                                      <span className="tabular">
                                        {item.doubleChanceRec}
                                      </span>
                                      <span
                                        className={`text-[10px] font-semibold shrink-0 ${
                                          item.doubleChanceHit
                                            ? "text-success"
                                            : "text-muted"
                                        }`}
                                      >
                                        {item.doubleChanceHit
                                          ? "ناجح ✓"
                                          : "غير موفق ✗"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* 1X2 ProbBar */}
                                <div className="px-3.5 pb-3.5 mt-auto">
                                  <ProbBar
                                    pHome={pHome}
                                    pDraw={pDraw}
                                    pAway={pAway}
                                    compact
                                  />
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card">
              <EmptyState
                title="لا نتائج مطابقة للتصفية"
                body="لم يُعثر على مباريات مكتملة تطابق معايير البحث أو التصفية الحالية. جرب تغيير خيارات التصفية أعلاه."
              />
            </div>
          )}
        </div>
      )}

      {/* Upcoming Tab Content */}
      {visibleTab === "upcoming" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent" />
              <h3 className="type-section text-ink">
                التوقعات المحفوظة للجولات القادمة
              </h3>
              <span className="text-xs font-medium text-muted bg-panel px-2.5 py-0.5 rounded-md border border-line tabular">
                {filteredUpcoming.length} مباراة
              </span>
            </div>

            {upcomingByDay.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={expandAllUpcoming}
                  className="press-scale text-xs font-medium px-3 py-1.5 rounded-lg border border-line bg-surface text-ink hover:bg-panel transition-colors cursor-pointer"
                >
                  توسيع الكل
                </button>
                <button
                  type="button"
                  onClick={collapseAllUpcoming}
                  className="press-scale text-xs font-medium px-3 py-1.5 rounded-lg border border-line bg-surface text-muted hover:text-ink hover:bg-panel transition-colors cursor-pointer"
                >
                  طي الكل
                </button>
              </div>
            )}
          </div>

          {upcomingByDay.length > 0 ? (
            <div className="space-y-3">
              {upcomingByDay.map((day, idx) => {
                const isOpen = isUpcomingDayExpanded(day.key, idx);
                const first = day.items[0];
                const uniformRound =
                  first?.matchday != null &&
                  day.items.every(
                    (x) =>
                      x.matchday === first.matchday &&
                      x.leagueId === first.leagueId,
                  )
                    ? first.matchday
                    : null;
                const roundLabel =
                  first?.matchday != null &&
                  day.items.every((x) => x.matchday === first.matchday)
                    ? first.matchday
                    : null;

                return (
                  <div
                    key={day.key}
                    className="card overflow-hidden transition-all duration-200 border-line hover:border-line-strong"
                  >
                    {/* Accordion Trigger */}
                    <button
                      type="button"
                      onClick={() => toggleUpcomingDay(day.key, idx)}
                      aria-expanded={isOpen}
                      className={`w-full flex items-center justify-between gap-3 p-3.5 sm:p-4 text-start transition-colors cursor-pointer select-none ${
                        isOpen ? "bg-panel/40" : "hover:bg-panel/30"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-200 ${
                            isOpen
                              ? "bg-accent-dim border-accent/30 text-accent rotate-180"
                              : "bg-surface border-line text-muted"
                          }`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </div>

                        {day.relative ? (
                          <span className="bg-accent-dim text-accent px-2.5 py-0.5 rounded-md text-xs font-semibold border border-accent/20 shrink-0">
                            {day.relative}
                          </span>
                        ) : null}

                        {(uniformRound ?? roundLabel) != null ? (
                          <span className="bg-surface text-ink px-2 py-0.5 rounded-md text-[11px] font-semibold tabular border border-line shrink-0">
                            الجولة {uniformRound ?? roundLabel}
                          </span>
                        ) : null}

                        <h4 className="type-section text-ink font-semibold truncate">
                          {formatLongDate(day.items[0]!.utcDate)}
                          <span className="ms-2 text-[11px] font-medium text-faint hidden md:inline">
                            ({DISPLAY_TZ_LABEL})
                          </span>
                        </h4>
                      </div>

                      <span className="text-[11px] font-medium text-muted shrink-0">
                        {day.items.length === 1
                          ? "مباراة واحدة"
                          : day.items.length === 2
                            ? "مباراتان"
                            : day.items.length <= 10
                              ? `${day.items.length} مباريات`
                              : `${day.items.length} مباراة`}
                      </span>
                    </button>

                    {/* Upcoming Matches Grid */}
                    {isOpen && (
                      <div className="p-3.5 sm:p-5 border-t border-line grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-bg/40">
                        {day.items.map((item) => {
                          const pHome = item.pHome ?? 0;
                          const pDraw = item.pDraw ?? 0;
                          const pAway = item.pAway ?? 0;

                          return (
                            <article
                              key={item.id}
                              data-league={item.leagueId?.toLowerCase()}
                              className="card overflow-hidden bg-surface border-line hover:border-line-strong transition-all flex flex-col justify-between"
                            >
                              <div className="flex items-center justify-between gap-2 border-b border-line px-3.5 py-2.5 bg-panel/25 text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={leagueEmblemUrl(item.leagueId || "")}
                                    alt=""
                                    className="w-4 h-4 object-contain shrink-0"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = "/icon.svg";
                                    }}
                                  />
                                  <span className="font-semibold text-ink truncate">
                                    {item.leagueNameAr}
                                  </span>
                                  {item.matchday != null ? (
                                    <span className="tabular px-1.5 py-0.5 rounded bg-surface border border-line text-[10px] font-semibold text-muted">
                                      ج{item.matchday}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="text-[11px] text-muted tabular shrink-0">
                                  {formatMatchTime(item.utcDate, DISPLAY_TZ)}{" "}
                                  {DISPLAY_TZ_LABEL} ·{" "}
                                  {formatMatchTime(item.utcDate, DATA_TZ)}{" "}
                                  {DATA_TZ_LABEL}
                                </div>
                              </div>

                              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3.5 py-3.5">
                                <div className="flex items-center justify-end gap-2 min-w-0">
                                  <span className="font-semibold text-xs sm:text-sm text-ink truncate text-end">
                                    {item.homeNameAr}
                                  </span>
                                  <Crest
                                    src={item.homeCrestUrl}
                                    alt={item.homeNameAr}
                                    size="md"
                                    className="shrink-0"
                                  />
                                </div>
                                <span className="text-[10px] font-semibold text-faint px-2">
                                  VS
                                </span>
                                <div className="flex items-center gap-2 min-w-0">
                                  <Crest
                                    src={item.awayCrestUrl}
                                    alt={item.awayNameAr}
                                    size="md"
                                    className="shrink-0"
                                  />
                                  <span className="font-semibold text-xs sm:text-sm text-ink truncate">
                                    {item.awayNameAr}
                                  </span>
                                </div>
                              </div>

                              <div className="px-3.5 pb-3.5 mt-auto">
                                <ProbBar
                                  pHome={pHome}
                                  pDraw={pDraw}
                                  pAway={pAway}
                                  compact
                                />
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card">
              <EmptyState
                title="لا مباريات قادمة في هذه التصفية"
                body="جرّب اختيار دوري آخر أو امسح البحث. المباريات ذات التوقعات المحفوظة تظهر هنا قبل انطلاقها."
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

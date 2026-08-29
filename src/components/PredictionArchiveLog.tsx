"use client";

import { useMemo, useState } from "react";
import { Crest } from "./Crest";
import { ProbBar } from "./ProbBar";
import { EmptyState } from "./ui";
import {
  DISPLAY_TZ_LABEL,
  formatKickoffAbsolute,
  formatLongDate,
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
  if (id === "tur1" || id === "tr1") return "تركيا";
  if (id === "no1") return "النرويج";
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
    !showFinished || upcomingSnapshots.length > 0 ? "upcoming" : "finished",
  );
  const [selectedLeague, setSelectedLeague] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "hit" | "miss" | "dc_hit"
  >("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

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

  const dailySummaries = useMemo(() => {
    return groupByDay(finishedForSummary).map((day) => {
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
        key: day.key,
        label: day.label,
        relative: day.relative,
        n,
        hits,
        dcHits,
        hitRate,
        dcRate,
        best,
        worst,
      };
    });
  }, [finishedForSummary]);

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
    () => groupByDay(filteredUpcoming),
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

  const tabBtn = (active: boolean) =>
    `press-scale flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold motion-colors whitespace-nowrap ${
      active
        ? "bg-surface text-ink border border-line"
        : "text-muted hover:text-ink hover:bg-surface/60 border border-transparent"
    }`;

  const filterBtn = (active: boolean) =>
    `press-scale flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-start motion-colors ${
      active
        ? "bg-accent-dim border-accent text-ink"
        : "bg-surface border-line text-ink hover:bg-panel"
    }`;

  return (
    <div className="space-y-6">
      {showFinished ? (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none rounded-xl bg-panel p-1.5 border border-line">
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
        </div>
      ) : null}

      <section className="card overflow-hidden">
        <div className="card-head flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 space-y-0.5">
            <h2 className="type-section text-ink">
              {visibleTab === "upcoming"
                ? "تصفية المباريات القادمة"
                : "تصفية النتائج المكتملة"}
            </h2>
            <p className="text-xs text-muted">
              {visibleTab === "upcoming"
                ? "توقعات محفوظة قبل انطلاق المباراة"
                : "تُحفظ تلقائياً بعد انتهاء المباراة مع مقارنة النتيجة"}
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
                className="absolute end-2 top-1/2 -translate-y-1/2 text-faint hover:text-ink text-xs font-semibold"
                aria-label="مسح البحث"
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
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

          {visibleTab === "finished" && items.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <span className="type-label me-1">تصفية النتائج</span>
              {(
                [
                  ["all", "الكل"],
                  ["hit", "توقع صائب"],
                  ["miss", "توقع غير صائب"],
                  ["dc_hit", "نجاح الفرصة المزدوجة"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedStatus(key)}
                  className={`press-scale rounded-md px-3 py-1 text-xs font-semibold border motion-colors ${
                    selectedStatus === key
                      ? key === "hit"
                        ? "bg-success-dim text-success border-success/30"
                        : key === "miss"
                          ? "bg-danger-dim text-danger border-danger/30"
                          : key === "dc_hit"
                            ? "bg-accent-dim text-accent border-accent/30"
                            : "bg-panel text-ink border-line"
                      : "bg-surface text-muted border-line hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {visibleTab === "finished" && dailySummaries.length > 0 ? (
        <div className="space-y-3">
          {dailySummaries.map((day) => (
            <div key={`sum-${day.key}`} className="card p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {day.relative ? (
                    <span className="bg-accent-dim text-accent px-2.5 py-0.5 rounded-md text-[11px] font-semibold border border-accent/20">
                      {day.relative}
                    </span>
                  ) : null}
                  <h3 className="type-section text-ink">{day.label}</h3>
                </div>
                <span className="text-[11px] font-medium text-muted tabular">
                  {day.n} مباراة مكتملة
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-lg bg-panel border border-line px-3 py-2.5">
                  <p className="type-label">إصابة التوقع الرئيسي</p>
                  <p className="mt-1 text-sm font-semibold tabular text-ink">
                    {day.hits}/{day.n}
                    <span className="ms-1.5 text-xs text-muted">
                      ({pct(day.hitRate)})
                    </span>
                  </p>
                </div>
                <div className="rounded-lg bg-panel border border-line px-3 py-2.5">
                  <p className="type-label">نجاح الفرصة المزدوجة</p>
                  <p className="mt-1 text-sm font-semibold tabular text-ink">
                    {day.dcHits}/{day.n}
                    <span className="ms-1.5 text-xs text-muted">
                      ({pct(day.dcRate)})
                    </span>
                  </p>
                </div>
                <div className="rounded-lg bg-panel border border-line px-3 py-2.5 col-span-2 sm:col-span-1">
                  <p className="type-label text-success">أفضل إصابة</p>
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
                <div className="rounded-lg bg-panel border border-line px-3 py-2.5 col-span-2 sm:col-span-1">
                  <p className="type-label text-danger">أقوى إخفاق</p>
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
            </div>
          ))}
        </div>
      ) : null}

      {visibleTab === "finished" && filtered.length > 0 ? (
        <div className="space-y-3">
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
              <article
                key={item.id}
                data-league={item.leagueId?.toLowerCase()}
                className="card overflow-hidden league-row"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="chip-dot" aria-hidden />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={leagueEmblemUrl(item.leagueId || "")}
                      alt=""
                      className="w-5 h-5 object-contain"
                    />
                    <span className="text-sm font-semibold text-ink truncate">
                      {item.leagueNameAr}
                    </span>
                    {item.matchday != null ? (
                      <span className="tabular px-2 py-0.5 rounded-md bg-panel border border-line text-[10px] font-semibold text-muted">
                        الجولة {item.matchday}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted tabular">
                      {formatKickoffAbsolute(item.utcDate)}
                    </span>
                    <span
                      className={`verdict-chip ${
                        item.isHit ? "verdict-chip-hit" : "verdict-chip-miss"
                      }`}
                    >
                      {item.isHit ? "توقع صائب" : "توقع غير صائب"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4">
                  <div className="flex items-center justify-end gap-2.5 min-w-0">
                    <span className="font-semibold text-sm sm:text-base text-ink truncate text-end">
                      {item.homeNameAr}
                    </span>
                    <Crest
                      src={item.homeCrestUrl}
                      alt={item.homeNameAr}
                      size="lg"
                      className="shrink-0"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 px-3 py-1 rounded-lg bg-panel border border-line font-semibold text-xl sm:text-2xl tabular text-ink">
                    <span>{item.homeGoals ?? 0}</span>
                    <span className="text-faint text-sm font-normal">–</span>
                    <span>{item.awayGoals ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Crest
                      src={item.awayCrestUrl}
                      alt={item.awayNameAr}
                      size="lg"
                      className="shrink-0"
                    />
                    <span className="font-semibold text-sm sm:text-base text-ink truncate">
                      {item.awayNameAr}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-4 pb-3">
                  <div className="rounded-lg bg-panel border border-line p-3 space-y-1">
                    <span className="type-label block">التوقع الرئيسي المسجل</span>
                    <div className="flex items-center justify-between gap-2 text-sm font-semibold text-ink">
                      <span>{predText}</span>
                      <span className="tabular text-accent">{pct(item.topProb)}</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-panel border border-line p-3 space-y-1">
                    <span className="type-label block">الفرصة المزدوجة</span>
                    <div className="flex items-center justify-between gap-2 text-sm font-semibold text-ink">
                      <span className="tabular">{item.doubleChanceRec}</span>
                      <span
                        className={
                          item.doubleChanceHit ? "text-success" : "text-muted"
                        }
                      >
                        {item.doubleChanceHit ? "توقع ناجح" : "غير موفق"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <ProbBar pHome={pHome} pDraw={pDraw} pAway={pAway} />
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {visibleTab === "finished" && filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            title="لا نتائج مكتملة بعد"
            body="عند صافرة النهاية تنتقل المباراة تلقائياً من «لم تُلعب بعد» إلى هنا، مع مقارنة النتيجة بتوقع النموذج."
          />
        </div>
      ) : null}

      {visibleTab === "upcoming" && filteredUpcoming.length > 0 ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="type-section text-ink">
              التوقعات المحفوظة للجولات القادمة
            </h3>
            <span className="text-[11px] font-medium text-muted bg-panel px-3 py-1 rounded-md border border-line tabular">
              {filteredUpcoming.length} مباراة
            </span>
          </div>

          {upcomingByDay.map((day) => {
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
              <section key={day.key} className="space-y-3">
                <div className="day-rail flex flex-wrap items-center justify-between gap-2 rounded-lg px-4 py-2.5 border border-line">
                  <div className="flex flex-wrap items-center gap-2">
                    {day.relative ? (
                      <span className="bg-accent-dim text-accent px-2.5 py-0.5 rounded-md text-xs font-semibold border border-accent/20">
                        {day.relative}
                      </span>
                    ) : null}
                    {(uniformRound ?? roundLabel) != null ? (
                      <span className="bg-surface text-ink px-2 py-0.5 rounded-md text-[11px] font-semibold tabular border border-line">
                        الجولة {uniformRound ?? roundLabel}
                      </span>
                    ) : null}
                    <h4 className="day-rail-label">
                      {formatLongDate(day.items[0]!.utcDate)}
                      <span className="ms-2 text-[11px] font-medium text-faint">
                        {DISPLAY_TZ_LABEL}
                      </span>
                    </h4>
                  </div>
                  <span className="text-[11px] font-medium text-muted">
                    {day.items.length === 1
                      ? "مباراة واحدة"
                      : day.items.length === 2
                        ? "مباراتان"
                        : day.items.length <= 10
                          ? `${day.items.length} مباريات`
                          : `${day.items.length} مباراة`}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {day.items.map((item) => {
                    const pHome = item.pHome ?? 0;
                    const pDraw = item.pDraw ?? 0;
                    const pAway = item.pAway ?? 0;

                    return (
                      <article
                        key={item.id}
                        data-league={item.leagueId?.toLowerCase()}
                        className="card overflow-hidden league-row"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="chip-dot" aria-hidden />
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={leagueEmblemUrl(item.leagueId || "")}
                              alt=""
                              className="w-4 h-4 object-contain"
                            />
                            <span className="font-semibold text-ink truncate">
                              {item.leagueNameAr}
                            </span>
                            {item.matchday != null ? (
                              <span className="tabular px-1.5 py-0.5 rounded bg-panel border border-line text-[10px] font-semibold text-muted">
                                ج{item.matchday}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2 text-muted tabular shrink-0">
                            <span className="text-xs text-muted tabular">
                              {formatKickoffAbsolute(item.utcDate)}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3">
                          <div className="flex items-center justify-end gap-2 min-w-0">
                            <span className="font-semibold text-sm text-ink truncate text-end">
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
                            <span className="font-semibold text-sm text-ink truncate">
                              {item.awayNameAr}
                            </span>
                          </div>
                        </div>

                        <div className="px-4 pb-4">
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
              </section>
            );
          })}
        </div>
      ) : null}

      {visibleTab === "upcoming" && filteredUpcoming.length === 0 ? (
        <div className="card">
          <EmptyState
            title="لا مباريات قادمة في هذه التصفية"
            body="جرّب دورياً آخر أو امسح البحث. المباريات ذات التوقعات المحفوظة تظهر هنا قبل انطلاقها."
          />
        </div>
      ) : null}
    </div>
  );
}

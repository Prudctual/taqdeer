"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { pct, formatShortDate, formatRelativeDay, formatMatchTime, crestInitials } from "@/lib/format";
import { getTeamColors } from "@/lib/team-colors";
import { Crest } from "@/components/Crest";
import type {
  ConfinedPlatformData,
  ParlayCandidateMatch,
  BankerPick,
} from "@/lib/queries";
import { HasrHeader } from "./HasrHeader";
import { Model2Breakdown } from "@/components/Model2Breakdown";

interface HasrTerminalViewProps {
  initialData: ConfinedPlatformData;
}

export function HasrTerminalView({ initialData }: HasrTerminalViewProps) {
  const [activeTab, setActiveTab] = useState<"screener" | "parlay" | "radar" | "calibration">("screener");
  const [selectedLeague, setSelectedLeague] = useState<string>("all");
  const [strategyFilter, setStrategyFilter] = useState<"all" | "safety" | "value" | "balanced" | "traps">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [sortBy, setSortBy] = useState<"date_asc" | "score_desc" | "prob_desc" | "edge_desc">("score_desc");

  // Selected match for detailed inspection modal
  const [inspectingMatch, setInspectingMatch] = useState<BankerPick | null>(null);

  // Legal modal state (Anti-slop rules 29 & 30)
  const [legalModalOpen, setLegalModalOpen] = useState<"terms" | "privacy" | null>(null);

  // Parlay Lab selection state
  const [selectedMatch1, setSelectedMatch1] = useState<ParlayCandidateMatch | null>(
    initialData.parlayCandidates[0] || null
  );
  const [selectedMatch2, setSelectedMatch2] = useState<ParlayCandidateMatch | null>(
    initialData.parlayCandidates[1] || null
  );

  // Filter and sort confined matches
  const filteredConfined = useMemo(() => {
    let list = [...initialData.confinedMatches];

    if (strategyFilter === "safety") {
      list = [...initialData.strategies.safety];
    } else if (strategyFilter === "value") {
      list = [...initialData.strategies.value];
    } else if (strategyFilter === "balanced") {
      list = [...initialData.strategies.balanced];
    } else if (strategyFilter === "traps") {
      list = [...initialData.strategies.traps];
    }

    if (selectedLeague !== "all") {
      const leagueNameMap: Record<string, string> = {
        PL: "الدوري الإنجليزي",
        PD: "الدوري الإسباني",
        SA: "الدوري الإيطالي",
        BL1: "الدوري الألماني",
        FL1: "الدوري الفرنسي",
        PPD: "الدوري البرتغالي",
        DED: "الدوري الهولندي",
      };
      const expectedName = leagueNameMap[selectedLeague];
      if (expectedName) {
        list = list.filter((m) => m.leagueName.includes(expectedName) || m.leagueName === expectedName);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.homeTeam.toLowerCase().includes(q) ||
          m.awayTeam.toLowerCase().includes(q) ||
          m.leagueName.toLowerCase().includes(q)
      );
    }

    // Sort order
    list.sort((a, b) => {
      if (sortBy === "date_asc") {
        const timeA = a.utcDate ? new Date(a.utcDate).getTime() : 0;
        const timeB = b.utcDate ? new Date(b.utcDate).getTime() : 0;
        if (timeA !== timeB) return timeA - timeB;
        return (b.selectionScore ?? 0) - (a.selectionScore ?? 0);
      }
      if (sortBy === "score_desc") {
        const br = b.model2?.reliability ?? b.selectionScore ?? 0;
        const ar = a.model2?.reliability ?? a.selectionScore ?? 0;
        return br - ar;
      }
      if (sortBy === "prob_desc") {
        return b.probability - a.probability;
      }
      if (sortBy === "edge_desc") {
        return (b.edge ?? 0) - (a.edge ?? 0);
      }
      return 0;
    });

    return list;
  }, [initialData, selectedLeague, strategyFilter, searchQuery, sortBy]);

  // Filtered and sorted excluded matches
  const filteredExcluded = useMemo(() => {
    let list = [...initialData.excludedMatches];
    if (selectedLeague !== "all") {
      list = list.filter((m) => m.leagueId === selectedLeague);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.homeTeam.toLowerCase().includes(q) ||
          m.awayTeam.toLowerCase().includes(q) ||
          m.leagueNameAr.toLowerCase().includes(q)
      );
    }
    // Sort excluded matches chronologically ascending
    list.sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
    return list;
  }, [initialData.excludedMatches, selectedLeague, searchQuery]);

  // Dual Parlay calculations
  const parlayStats = useMemo(() => {
    if (!selectedMatch1 || !selectedMatch2) return null;
    if (selectedMatch1.matchId === selectedMatch2.matchId) return null;

    const p1 = selectedMatch1.probability;
    const p2 = selectedMatch2.probability;
    const jointProb = p1 * p2;

    const o1 = selectedMatch1.odds || (p1 > 0 ? 1 / p1 : 2.0);
    const o2 = selectedMatch2.odds || (p2 > 0 ? 1 / p2 : 2.0);
    const marketOdds = Number((o1 * o2).toFixed(2));
    const fairOdds = jointProb > 0 ? Number((1 / jointProb).toFixed(2)) : 99.0;

    // Edge % = (Market Odds / Fair Odds) - 1
    const edge = fairOdds > 0 ? Number(((marketOdds / fairOdds - 1) * 100).toFixed(1)) : 0;

    const stab1 = selectedMatch1.stabilityScore ?? 70;
    const stab2 = selectedMatch2.stabilityScore ?? 70;
    const jointStability = Math.round((stab1 + stab2) / 2);

    const hasTrap = selectedMatch1.isTrap || selectedMatch2.isTrap;
    const isExcluded = selectedMatch1.isStrictlyExcluded || selectedMatch2.isStrictlyExcluded;
    const highRandomness = (selectedMatch1.matchRandomnessIndex ?? 0) >= 60 || (selectedMatch2.matchRandomnessIndex ?? 0) >= 60;

    let verdictAr = "بارلي مؤهل ومحصور";
    let isRecommended = true;

    if (isExcluded || highRandomness) {
      verdictAr = "محظور إحصائياً: إحدى المباراتين محاطة بمؤشر عشوائية مرتفع";
      isRecommended = false;
    } else if (hasTrap) {
      verdictAr = "تحذير: السعر السوقي غير مجدٍ مقارنة باحتمالية الفوز";
      isRecommended = false;
    } else if (edge < 0) {
      verdictAr = "عائد سالب (-EV) مقارنة باحتمال النموذج";
      isRecommended = false;
    }

    return {
      jointProb,
      fairOdds,
      marketOdds,
      edge,
      jointStability,
      verdictAr,
      isRecommended,
      hasTrap,
    };
  }, [selectedMatch1, selectedMatch2]);

  const addMatchToParlay = (item: BankerPick) => {
    const existing = initialData.parlayCandidates.find((c) => c.matchId === item.matchId);
    const chosen: ParlayCandidateMatch = existing || {
      matchId: item.matchId,
      leagueId: "",
      leagueNameAr: item.leagueName,
      utcDate: item.utcDate,
      homeTeam: item.homeTeam,
      awayTeam: item.awayTeam,
      recommendedSide: (item.pickKey || "H") as "H" | "D" | "A",
      recommendedSideLabel: item.pickLabel,
      probability: item.probability,
      secondProbability: item.secondProbability ?? 0.3,
      separationGap: item.separationGap ?? 0.1,
      selectionScore: item.selectionScore ?? 75,
      odds: item.odds ?? (item.probability > 0 ? Number((1 / item.probability).toFixed(2)) : 2.0),
      americanOdds: item.americanOdds || "+100",
      impliedProb: item.impliedProb ?? item.probability,
      edge: item.edge ?? 0,
      isTrap: Boolean(item.isTrap),
      confidence: item.confidence ?? item.probability,
      matchRandomnessIndex: item.matchRandomnessIndex,
      stabilityScore: item.stabilityScore,
      isStrictlyExcluded: item.isStrictlyExcluded,
    };

    if (!selectedMatch1 || selectedMatch1.matchId === item.matchId) {
      setSelectedMatch2(chosen);
    } else {
      setSelectedMatch1(chosen);
    }
    setActiveTab("parlay");
  };

  const formatKickoff = (iso: string) => {
    if (!iso) return { label: "موعد غير محدد", time: "—", relative: "—" };
    const rel = formatRelativeDay(iso);
    const time = formatMatchTime(iso, "Asia/Baghdad");
    const date = formatShortDate(iso, "Asia/Baghdad");
    return {
      label: rel ? `${rel} · ${time}` : `${date} · ${time}`,
      time,
      date,
      relative: rel || date,
    };
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      {/* Header */}
      <HasrHeader
        summaryStats={initialData.summaryStats}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedLeague={selectedLeague}
        onLeagueChange={setSelectedLeague}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* TAB 1: SCREENER (المباريات المحصورة) */}
        {activeTab === "screener" && (
          <div className="space-y-4">
            <div className="rounded border border-line bg-panel px-4 py-3 text-xs text-muted">
              <span className="font-semibold text-ink">مسار النموذج 2: </span>
              لائحة {initialData.pipeline.slateN} → مرشحون {initialData.pipeline.candidates} → أقوى {initialData.pipeline.topN}
            </div>
            {/* Control Bar: Filters, Search, Sort & View Switch */}
            <div className="flex flex-col gap-3 border-b border-line pb-4">
              {/* Category Filter Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    onClick={() => setStrategyFilter("all")}
                    className={`px-3 py-1.5 rounded font-medium border transition-colors ${
                      strategyFilter === "all"
                        ? "bg-ink text-surface border-ink"
                        : "bg-panel text-muted hover:text-ink border-line"
                    }`}
                  >
                    كافة المحصورة ({initialData.confinedMatches.length})
                  </button>
                  <button
                    onClick={() => setStrategyFilter("safety")}
                    className={`px-3 py-1.5 rounded font-medium border transition-colors ${
                      strategyFilter === "safety"
                        ? "bg-ink text-surface border-ink"
                        : "bg-panel text-muted hover:text-ink border-line"
                    }`}
                  >
                    الأعلى أماناً ({initialData.strategies.safety.length})
                  </button>
                  <button
                    onClick={() => setStrategyFilter("value")}
                    className={`px-3 py-1.5 rounded font-medium border transition-colors ${
                      strategyFilter === "value"
                        ? "bg-ink text-surface border-ink"
                        : "bg-panel text-muted hover:text-ink border-line"
                    }`}
                  >
                    أعلى قيمة ({initialData.strategies.value.length})
                  </button>
                  <button
                    onClick={() => setStrategyFilter("balanced")}
                    className={`px-3 py-1.5 rounded font-medium border transition-colors ${
                      strategyFilter === "balanced"
                        ? "bg-ink text-surface border-ink"
                        : "bg-panel text-muted hover:text-ink border-line"
                    }`}
                  >
                    المتوازنة ({initialData.strategies.balanced.length})
                  </button>
                  <button
                    onClick={() => setStrategyFilter("traps")}
                    className={`px-3 py-1.5 rounded font-medium border transition-colors ${
                      strategyFilter === "traps"
                        ? "bg-ink text-surface border-ink"
                        : "bg-panel text-muted hover:text-ink border-line"
                    }`}
                  >
                    مصائد السوق ({initialData.strategies.traps.length})
                  </button>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center border border-line rounded overflow-hidden text-xs">
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`px-3 py-1.5 font-medium transition-colors ${
                      viewMode === "cards"
                        ? "bg-ink text-surface"
                        : "bg-panel text-muted hover:text-ink"
                    }`}
                  >
                    بطاقات مصممة
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`px-3 py-1.5 font-medium transition-colors ${
                      viewMode === "table"
                        ? "bg-ink text-surface"
                        : "bg-panel text-muted hover:text-ink"
                    }`}
                  >
                    جدول مكثف
                  </button>
                </div>
              </div>

              {/* Sub-bar: Search & Sorting */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث عن فريق أو دوري..."
                    className="text-xs bg-panel border border-line rounded px-3 py-1.5 text-ink placeholder:text-muted focus:outline-hidden focus:border-accent w-64"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute end-2 top-1.5 text-xs text-muted hover:text-ink"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <label htmlFor="sort-select" className="text-muted font-medium">
                    الترتيب:
                  </label>
                  <select
                    id="sort-select"
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(
                        e.target.value as "date_asc" | "score_desc" | "prob_desc" | "edge_desc"
                      )
                    }
                    className="text-xs bg-panel border border-line rounded px-2.5 py-1 text-ink focus:outline-hidden focus:border-accent"
                  >
                    <option value="date_asc">الأقرب موعداً (تصاعدياً من الأقرب للابعد)</option>
                    <option value="score_desc">الأعلى موثوقية (النموذج 2)</option>
                    <option value="prob_desc">أعلى نسبة احتمال فوز</option>
                    <option value="edge_desc">أعلى قيمة مضافة (+EV Edge)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Content: Empty State or Match Listing */}
            {filteredConfined.length === 0 ? (
              <div className="p-12 text-center rounded border border-line bg-panel space-y-2">
                <p className="text-sm font-semibold text-ink">لا توجد مباريات مطابقة للبحث أو التصفية</p>
                <p className="text-xs text-muted">جرب تعديل كلمة البحث أو اختيار دوري واستراتيجية مختلفة</p>
              </div>
            ) : viewMode === "cards" ? (
              /* Enhanced Cards View with Distinct Team Colors & Dates */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredConfined.map((item, idx) => {
                  const homeCol = getTeamColors(item.homeTeam, item.homeTeamId);
                  const awayCol = getTeamColors(item.awayTeam, item.awayTeamId);
                  const kickoff = formatKickoff(item.utcDate);

                  return (
                    <div
                      key={item.matchId}
                      className={`group rounded border transition-all relative overflow-hidden flex flex-col justify-between ${
                        item.isTrap
                          ? "bg-rose-500/5 border-rose-500/30"
                          : idx < 8
                            ? "bg-surface border-accent/40 hover:border-accent"
                            : "bg-surface border-line hover:border-accent"
                      }`}
                    >
                      {/* Top Bar: League, Matchday, Kickoff */}
                      <div className="p-3.5 border-b border-line bg-panel/40 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{item.leagueName}</span>
                          {idx < 8 && sortBy === "score_desc" && strategyFilter === "all" ? (
                            <span className="text-[10px] text-accent px-1.5 py-0.5 rounded bg-surface border border-accent/30 tabular">
                              أقوى {idx + 1}
                            </span>
                          ) : null}
                          {item.matchday ? (
                            <span className="text-[10px] text-muted px-1.5 py-0.5 rounded bg-surface border border-line tabular">
                              الجولة {item.matchday}
                            </span>
                          ) : null}
                        </div>

                        {/* Kickoff Timing (Ascending Nearest) */}
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
                          <span className="text-[11px] font-semibold text-ink tabular">
                            {kickoff.label}
                          </span>
                        </div>
                      </div>

                      {/* Card Body: Interactive Click to inspect */}
                      <div
                        onClick={() => setInspectingMatch(item)}
                        className="p-4 space-y-4 cursor-pointer"
                        title="انقر لعرض تفاصيل المباراة الكاملة"
                      >
                        {/* Matchup with Team Colors */}
                        <div className="space-y-2.5">
                          {/* Home Team */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Team Color Pill & Crest */}
                              <span
                                className="w-1.5 h-5 rounded-xs shrink-0"
                                style={{ backgroundColor: homeCol.hex }}
                                title={`لون ${item.homeTeam}`}
                              />
                              <Crest
                                src={item.homeCrestUrl}
                                alt={item.homeTeam}
                                size="sm"
                                fallback={crestInitials(item.homeTeam)}
                              />
                              <span className="text-sm font-bold text-ink truncate group-hover:text-accent transition-colors">
                                {item.homeTeam}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-muted tabular">
                              {item.pickKey === "H" ? (
                                <span className="text-accent font-black">
                                  {pct(item.probability)}
                                </span>
                              ) : (
                                "مضيف"
                              )}
                            </span>
                          </div>

                          {/* Away Team */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Team Color Pill & Crest */}
                              <span
                                className="w-1.5 h-5 rounded-xs shrink-0"
                                style={{ backgroundColor: awayCol.hex }}
                                title={`لون ${item.awayTeam}`}
                              />
                              <Crest
                                src={item.awayCrestUrl}
                                alt={item.awayTeam}
                                size="sm"
                                fallback={crestInitials(item.awayTeam)}
                              />
                              <span className="text-sm font-bold text-ink truncate group-hover:text-accent transition-colors">
                                {item.awayTeam}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-muted tabular">
                              {item.pickKey === "A" ? (
                                <span className="text-accent font-black">
                                  {pct(item.probability)}
                                </span>
                              ) : (
                                "ضيف"
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Pick & Score Bar */}
                        <div className="p-2.5 rounded bg-panel/70 border border-line flex items-center justify-between text-xs">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-muted block">ترشيح الحصر</span>
                            <span className="font-bold text-ink">{item.pickLabel}</span>
                          </div>
                          <div className="text-end space-y-0.5">
                            <span className="text-[10px] text-muted block">احتمال النموذج</span>
                            <span className="text-sm font-black text-ink tabular">
                              {pct(item.probability)}
                            </span>
                          </div>
                        </div>

                        {/* 3 Metrics Row */}
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="p-2 rounded bg-panel/40 border border-line/60">
                            <span className="text-[10px] text-muted block">سعر السوق</span>
                            <span className="font-bold tabular text-ink">
                              {item.odds ? item.odds.toFixed(2) : "—"}
                            </span>
                          </div>
                          <div className="p-2 rounded bg-panel/40 border border-line/60">
                            <span className="text-[10px] text-muted block">القيمة (Edge)</span>
                            <span
                              className={`font-bold tabular ${
                                (item.edge ?? 0) > 0
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-muted"
                              }`}
                            >
                              {item.edge !== null && item.edge !== undefined
                                ? `${item.edge > 0 ? "+" : ""}${Math.round(item.edge * 100)}%`
                                : "—"}
                            </span>
                          </div>
                          <div className="p-2 rounded bg-panel/40 border border-line/60">
                            <span className="text-[10px] text-muted block">موثوقية 2</span>
                            <span className="font-bold tabular text-ink">
                              {item.model2?.reliability != null
                                ? item.model2.reliability.toFixed(0)
                                : item.selectionScore ?? "—"}
                            </span>
                          </div>
                        </div>

                        {/* Trap Warning if applicable */}
                        {item.isTrap && (
                          <div className="p-2 rounded text-[11px] bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-medium">
                            تنبيه مصيدة سعرية: السعر المعروض يتطلب احتمالية فوز أعلى من تقدير النموذج
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="p-3 border-t border-line bg-panel/20 flex items-center justify-between text-xs gap-2">
                        <button
                          onClick={() => setInspectingMatch(item)}
                          className="text-muted hover:text-ink font-semibold transition-colors text-[11px]"
                        >
                          معاينة الفحص ↗
                        </button>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/match/${item.matchId}`}
                            className="text-xs text-muted hover:text-accent font-medium underline-offset-4 hover:underline"
                          >
                            صفحة اللقاء الكاملة
                          </Link>

                          <button
                            onClick={() => addMatchToParlay(item)}
                            className="px-2.5 py-1 rounded bg-panel hover:bg-ink hover:text-surface text-ink text-[11px] font-semibold border border-line transition-colors"
                          >
                            + بارلي
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Dense Table View */
              <div className="overflow-x-auto rounded border border-line bg-surface">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="border-b border-line bg-panel/50 text-muted font-semibold">
                      <th className="p-3">الموعد والجولة</th>
                      <th className="p-3">المباراة والفرق</th>
                      <th className="p-3">الدوري</th>
                      <th className="p-3 text-center">الترشيح</th>
                      <th className="p-3 text-center">احتمال النموذج</th>
                      <th className="p-3 text-center">سعر السوق</th>
                      <th className="p-3 text-center">القيمة (Edge)</th>
                      <th className="p-3 text-center">مؤشر الأمان</th>
                      <th className="p-3 text-center">درجة الحصر</th>
                      <th className="p-3 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredConfined.map((item) => {
                      const homeCol = getTeamColors(item.homeTeam, item.homeTeamId);
                      const awayCol = getTeamColors(item.awayTeam, item.awayTeamId);
                      const kickoff = formatKickoff(item.utcDate);

                      return (
                        <tr
                          key={item.matchId}
                          className={`hover:bg-panel/40 transition-colors cursor-pointer ${
                            item.isTrap ? "bg-rose-500/5" : ""
                          }`}
                          onClick={() => setInspectingMatch(item)}
                        >
                          {/* Kickoff & Round */}
                          <td className="p-3 text-muted tabular whitespace-nowrap">
                            <span className="font-semibold text-ink block">{kickoff.label}</span>
                            {item.matchday ? (
                              <span className="text-[10px] text-faint">الجولة {item.matchday}</span>
                            ) : null}
                          </td>

                          {/* Match with Colors */}
                          <td className="p-3 font-semibold text-ink">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-1 h-3.5 rounded-xs"
                                style={{ backgroundColor: homeCol.hex }}
                              />
                              <span>{item.homeTeam}</span>
                              <span className="text-muted font-normal text-[11px]">×</span>
                              <span
                                className="w-1 h-3.5 rounded-xs"
                                style={{ backgroundColor: awayCol.hex }}
                              />
                              <span>{item.awayTeam}</span>
                            </div>
                            {item.isTrap && (
                              <span className="mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                مصيدة قيمة
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-muted">{item.leagueName}</td>

                          <td className="p-3 text-center">
                            <span className="font-bold text-ink">
                              {item.pickLabel}
                            </span>
                          </td>

                          <td className="p-3 text-center tabular font-bold text-ink">
                            {pct(item.probability)}
                          </td>

                          <td className="p-3 text-center tabular text-ink">
                            {item.odds ? item.odds.toFixed(2) : "—"}
                          </td>

                          <td className="p-3 text-center tabular font-semibold">
                            <span
                              className={
                                (item.edge ?? 0) > 0
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-muted"
                              }
                            >
                              {item.edge !== null && item.edge !== undefined
                                ? `${item.edge > 0 ? "+" : ""}${Math.round(item.edge * 100)}%`
                                : "—"}
                            </span>
                          </td>

                          <td className="p-3 text-center tabular text-muted">
                            {item.stabilityScore ?? 70}%
                          </td>

                          <td className="p-3 text-center tabular font-bold text-ink">
                            {item.selectionScore}
                          </td>

                          <td
                            className="p-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => addMatchToParlay(item)}
                                className="px-2 py-1 rounded bg-panel hover:bg-ink hover:text-surface text-ink text-[11px] font-semibold border border-line transition-colors"
                              >
                                + بارلي
                              </button>
                              <Link
                                href={`/match/${item.matchId}`}
                                className="p-1 text-muted hover:text-accent text-[11px]"
                                title="فتح صفحة المباراة في تقدير العام"
                              >
                                ↗
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PARLAY LAB (حاسبة البارلي المزدوج) */}
        {activeTab === "parlay" && (
          <div className="space-y-5">
            <div className="p-4 rounded border border-line bg-panel space-y-1">
              <h2 className="text-sm font-bold text-ink">
                حاسبة البارلي المزدوج (Dual-Selection Parlay)
              </h2>
              <p className="text-xs text-muted">
                تقليص الاختيارات إلى مباراتين فقط لتقليل مخاطر التراكمات غير الخطية والتحقق من القيمة المشتركة
              </p>
            </div>

            {/* Selection Slots */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Match 1 Slot */}
              <div className="p-4 rounded border border-line bg-surface space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">المباراة الأولى</span>
                  <select
                    value={selectedMatch1?.matchId || ""}
                    onChange={(e) => {
                      const found = initialData.parlayCandidates.find((c) => c.matchId === e.target.value);
                      setSelectedMatch1(found || null);
                    }}
                    className="text-xs bg-panel border border-line rounded px-2.5 py-1 text-ink focus:outline-hidden focus:border-accent"
                  >
                    {initialData.parlayCandidates.map((c) => (
                      <option key={c.matchId} value={c.matchId}>
                        {c.homeTeam} × {c.awayTeam} ({pct(c.probability)})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedMatch1 ? (
                  <div className="space-y-2 pt-2 border-t border-line">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-4 rounded-xs"
                        style={{ backgroundColor: getTeamColors(selectedMatch1.homeTeam).hex }}
                      />
                      <span className="text-sm font-bold text-ink">
                        {selectedMatch1.homeTeam} × {selectedMatch1.awayTeam}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>الترشيح: <strong className="text-ink font-semibold">{selectedMatch1.recommendedSideLabel}</strong></span>
                      <span>الاحتمال: <strong className="text-ink font-bold tabular">{pct(selectedMatch1.probability)}</strong></span>
                      <span>السعر: <strong className="text-ink font-bold tabular">{selectedMatch1.odds ? selectedMatch1.odds.toFixed(2) : "—"}</strong></span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted py-4 text-center">يرجى اختيار المباراة الأولى</p>
                )}
              </div>

              {/* Match 2 Slot */}
              <div className="p-4 rounded border border-line bg-surface space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">المباراة الثانية</span>
                  <select
                    value={selectedMatch2?.matchId || ""}
                    onChange={(e) => {
                      const found = initialData.parlayCandidates.find((c) => c.matchId === e.target.value);
                      setSelectedMatch2(found || null);
                    }}
                    className="text-xs bg-panel border border-line rounded px-2.5 py-1 text-ink focus:outline-hidden focus:border-accent"
                  >
                    {initialData.parlayCandidates.map((c) => (
                      <option key={c.matchId} value={c.matchId}>
                        {c.homeTeam} × {c.awayTeam} ({pct(c.probability)})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedMatch2 ? (
                  <div className="space-y-2 pt-2 border-t border-line">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-4 rounded-xs"
                        style={{ backgroundColor: getTeamColors(selectedMatch2.homeTeam).hex }}
                      />
                      <span className="text-sm font-bold text-ink">
                        {selectedMatch2.homeTeam} × {selectedMatch2.awayTeam}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>الترشيح: <strong className="text-ink font-semibold">{selectedMatch2.recommendedSideLabel}</strong></span>
                      <span>الاحتمال: <strong className="text-ink font-bold tabular">{pct(selectedMatch2.probability)}</strong></span>
                      <span>السعر: <strong className="text-ink font-bold tabular">{selectedMatch2.odds ? selectedMatch2.odds.toFixed(2) : "—"}</strong></span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted py-4 text-center">يرجى اختيار المباراة الثانية</p>
                )}
              </div>
            </div>

            {/* Joint Parlay Output */}
            {parlayStats && (
              <div className="rounded border border-line bg-surface p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
                  <div>
                    <span className="text-[11px] font-semibold text-muted block">
                      المطابقة المزدوجة
                    </span>
                    <h3 className="text-sm font-bold text-ink">
                      {selectedMatch1?.homeTeam} ({selectedMatch1?.recommendedSideLabel}) + {selectedMatch2?.homeTeam} ({selectedMatch2?.recommendedSideLabel})
                    </h3>
                  </div>

                  <div
                    className={`px-3 py-1 rounded text-xs font-semibold border ${
                      parlayStats.isRecommended
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                    }`}
                  >
                    {parlayStats.verdictAr}
                  </div>
                </div>

                {/* 4 Clean Metric Blocks */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded bg-panel border border-line space-y-1">
                    <span className="text-[11px] text-muted block">الاحتمال التراكمي المشترك</span>
                    <div className="text-lg font-bold text-ink tabular">
                      {pct(parlayStats.jointProb)}
                    </div>
                    <span className="text-[10px] text-muted block tabular">
                      {pct(selectedMatch1?.probability || 0)} × {pct(selectedMatch2?.probability || 0)}
                    </span>
                  </div>

                  <div className="p-3 rounded bg-panel border border-line space-y-1">
                    <span className="text-[11px] text-muted block">السعر العادل للنموذج</span>
                    <div className="text-lg font-bold text-ink tabular">
                      {parlayStats.fairOdds}
                    </div>
                    <span className="text-[10px] text-muted block">
                      1 مقسوماً على الاحتمال
                    </span>
                  </div>

                  <div className="p-3 rounded bg-panel border border-line space-y-1">
                    <span className="text-[11px] text-muted block">سعر السوق التراكمي</span>
                    <div className="text-lg font-bold text-ink tabular">
                      {parlayStats.marketOdds}
                    </div>
                    <span className="text-[10px] text-muted block">
                      حاصل ضرب السعرين
                    </span>
                  </div>

                  <div className="p-3 rounded bg-panel border border-line space-y-1">
                    <span className="text-[11px] text-muted block">فارق القيمة (Edge)</span>
                    <div
                      className={`text-lg font-bold tabular ${
                        parlayStats.edge > 0
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-muted"
                      }`}
                    >
                      {parlayStats.edge > 0 ? `+${parlayStats.edge}%` : `${parlayStats.edge}%`}
                    </div>
                    <span className="text-[10px] text-muted block">
                      {parlayStats.edge > 0 ? "قيمة إيجابية" : "عائد دون المستوى"}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded bg-panel border border-line text-xs text-muted leading-relaxed">
                  <strong>الأساس الرياضي:</strong> دمج أكثر من مباراتين يقلل احتمال النجاح الكلي بصورة غير خطية (تراكمية). يوصى بالالتزام بمباراتين محصورتين فقط لضمان بقاء الاحتمال التراكمي في نطاق آمن ومربح على المدى الطويل.
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STRICT EXCLUSION RADAR (رادار المستبعدات) */}
        {activeTab === "radar" && (
          <div className="space-y-4">
            <div className="p-4 rounded border border-line bg-panel space-y-1">
              <h2 className="text-sm font-bold text-ink">
                رادار الاستبعاد الصارم
              </h2>
              <p className="text-xs text-muted">
                المباريات والفرق التي تم إسقاطها من الحصر والبارلي مرتبة تصاعدياً حسب موعد اللقاء لتوضيح أسباب الحظر
              </p>
            </div>

            {/* Excluded Table */}
            <div className="overflow-x-auto rounded border border-line bg-surface">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="border-b border-line bg-panel/50 text-muted font-semibold">
                    <th className="p-3">الموعد</th>
                    <th className="p-3">المباراة والفرق</th>
                    <th className="p-3 text-center">الدوري</th>
                    <th className="p-3 text-center">مؤشر العشوائية (MRI)</th>
                    <th className="p-3 text-center">مؤشر الأمان</th>
                    <th className="p-3 text-center">السبب المباشر</th>
                    <th className="p-3">التفصيل الإحصائي</th>
                    <th className="p-3 text-center">تفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredExcluded.map((match) => {
                    const homeCol = getTeamColors(match.homeTeam);
                    const awayCol = getTeamColors(match.awayTeam);
                    const kickoff = formatKickoff(match.utcDate);

                    return (
                      <tr key={match.matchId} className="hover:bg-panel/30 transition-colors">
                        <td className="p-3 text-muted tabular whitespace-nowrap">
                          {kickoff.label}
                        </td>
                        <td className="p-3 font-semibold text-ink">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1 h-3.5 rounded-xs" style={{ backgroundColor: homeCol.hex }} />
                            <span>{match.homeTeam}</span>
                            <span className="text-muted font-normal text-[11px]">×</span>
                            <span className="w-1 h-3.5 rounded-xs" style={{ backgroundColor: awayCol.hex }} />
                            <span>{match.awayTeam}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center text-muted">
                          {match.leagueNameAr}
                        </td>
                        <td className="p-3 text-center tabular font-bold text-rose-700 dark:text-rose-400">
                          {match.matchRandomnessIndex} / 100
                        </td>
                        <td className="p-3 text-center tabular text-muted font-medium">
                          {match.stabilityScore}%
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                            {match.primaryExclusionPillar === "draw_trap" && "فخ تعادل متكرر"}
                            {match.primaryExclusionPillar === "second_half_fragility" && "تراجع الشوط الثاني"}
                            {match.primaryExclusionPillar === "disciplinary_risk" && "مخاطر طرد وبطاقات"}
                            {match.primaryExclusionPillar === "volatility" && "تذبذب نتائج حاد"}
                            {match.primaryExclusionPillar === "other" && "عشوائية حرجة"}
                          </span>
                        </td>
                        <td className="p-3 text-muted text-[11px] leading-relaxed max-w-sm">
                          {match.primaryReasonAr}
                        </td>
                        <td className="p-3 text-center">
                          <Link
                            href={`/match/${match.matchId}`}
                            className="text-xs text-muted hover:text-accent underline-offset-4 hover:underline"
                          >
                            عرض ↗
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CALIBRATION MATRIX (المعايرة الإحصائية) */}
        {activeTab === "calibration" && (
          <div className="space-y-4">
            <div className="p-4 rounded border border-line bg-panel space-y-1">
              <h2 className="text-sm font-bold text-ink">
                مصفوفة المعايرة الإحصائية
              </h2>
              <p className="text-xs text-muted">
                مطابقة نسب الفوز الفعلية المحققة مع متوسط احتمال النموذج عبر فئات الاحتمالات المختلفة للتأكد من موثوقية التقديرات
              </p>
            </div>

            <div className="overflow-x-auto rounded border border-line bg-surface">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="border-b border-line bg-panel/50 text-muted font-semibold">
                    <th className="p-3">فئة الاحتمال</th>
                    <th className="p-3 text-center">عدد المباريات</th>
                    <th className="p-3 text-center">المباريات المحققة</th>
                    <th className="p-3 text-center">نسبة الفوز الفعلية</th>
                    <th className="p-3 text-center">متوسط احتمال النموذج</th>
                    <th className="p-3 text-center">فارق المعايرة</th>
                    <th className="p-3 text-center">التقييم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {initialData.calibration.bins.map((bin) => {
                    const isAccurate = Math.abs(bin.calibrationError) <= 0.05;
                    return (
                      <tr key={bin.label} className="hover:bg-panel/30 transition-colors">
                        <td className="p-3 font-bold text-ink tabular">{bin.label}</td>
                        <td className="p-3 text-center tabular text-muted">{bin.nMatches}</td>
                        <td className="p-3 text-center tabular text-ink font-semibold">
                          {bin.nCorrect}
                        </td>
                        <td className="p-3 text-center tabular font-bold text-ink">
                          {pct(bin.winRate)}
                        </td>
                        <td className="p-3 text-center tabular text-muted">
                          {pct(bin.meanProb)}
                        </td>
                        <td className="p-3 text-center tabular">
                          <span
                            className={`font-semibold ${
                              bin.calibrationError > 0
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-muted"
                            }`}
                          >
                            {bin.calibrationError > 0 ? "+" : ""}
                            {pct(bin.calibrationError)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              isAccurate
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : "bg-panel text-muted border border-line"
                            }`}
                          >
                            {isAccurate ? "معايرة دقيقة" : "معايرة مقبولة"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 rounded bg-panel border border-line text-xs text-muted leading-relaxed">
              <strong>قاعدة الحصر الإحصائي:</strong> تشير المعايرة إلى أن الفئات التي تتجاوز 55% تمتاز بارتفاع حاد في نسبة الفوز الفعلية، مما يبرر اعتماد معايير الفصل الصارمة لفرز المباريات الآمنة.
            </div>
          </div>
        )}
      </main>

      {/* QUICK MATCH INSPECTION MODAL (عند النقر على البطاقة أو الصف تظهر بياناتها بدقة) */}
      {inspectingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
          <div className="bg-surface border border-line rounded max-w-xl w-full p-6 space-y-5 shadow-none animate-fade-in-up max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <span className="text-xs font-semibold text-muted block">
                  {inspectingMatch.leagueName} {inspectingMatch.matchday ? `· الجولة ${inspectingMatch.matchday}` : ""}
                </span>
                <span className="text-xs text-accent font-medium tabular">
                  {formatKickoff(inspectingMatch.utcDate).label}
                </span>
              </div>
              <button
                onClick={() => setInspectingMatch(null)}
                className="text-muted hover:text-ink text-sm font-bold px-2 py-1"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            {/* Teams Matchup with Official Colors */}
            <div className="p-4 rounded border border-line bg-panel/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="w-2 h-6 rounded-xs"
                    style={{ backgroundColor: getTeamColors(inspectingMatch.homeTeam, inspectingMatch.homeTeamId).hex }}
                  />
                  <Crest
                    src={inspectingMatch.homeCrestUrl}
                    alt={inspectingMatch.homeTeam}
                    size="md"
                    fallback={crestInitials(inspectingMatch.homeTeam)}
                  />
                  <span className="text-base font-bold text-ink">
                    {inspectingMatch.homeTeam}
                  </span>
                </div>
                <span className="text-xs font-semibold text-muted">
                  المضيف
                </span>
              </div>

              <div className="border-t border-line/60 pt-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="w-2 h-6 rounded-xs"
                    style={{ backgroundColor: getTeamColors(inspectingMatch.awayTeam, inspectingMatch.awayTeamId).hex }}
                  />
                  <Crest
                    src={inspectingMatch.awayCrestUrl}
                    alt={inspectingMatch.awayTeam}
                    size="md"
                    fallback={crestInitials(inspectingMatch.awayTeam)}
                  />
                  <span className="text-base font-bold text-ink">
                    {inspectingMatch.awayTeam}
                  </span>
                </div>
                <span className="text-xs font-semibold text-muted">
                  الضيف
                </span>
              </div>
            </div>

            {/* Mathematical & Model Analysis */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
              <div className="p-2.5 rounded bg-panel border border-line">
                <span className="text-[10px] text-muted block">الترشيح المحصور</span>
                <span className="font-bold text-ink text-xs">{inspectingMatch.pickLabel}</span>
              </div>
              <div className="p-2.5 rounded bg-panel border border-line">
                <span className="text-[10px] text-muted block">احتمال النموذج</span>
                <span className="font-bold text-ink text-xs tabular">{pct(inspectingMatch.probability)}</span>
              </div>
              <div className="p-2.5 rounded bg-panel border border-line">
                <span className="text-[10px] text-muted block">سعر السوق</span>
                <span className="font-bold text-ink text-xs tabular">{inspectingMatch.odds ? inspectingMatch.odds.toFixed(2) : "—"}</span>
              </div>
              <div className="p-2.5 rounded bg-panel border border-line">
                <span className="text-[10px] text-muted block">القيمة (Edge)</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs tabular">
                  {inspectingMatch.edge ? `${inspectingMatch.edge > 0 ? "+" : ""}${Math.round(inspectingMatch.edge * 100)}%` : "—"}
                </span>
              </div>
            </div>

            <div className="rounded border border-line bg-panel/30 p-3">
              <Model2Breakdown model2={inspectingMatch.model2} compact />
            </div>

            {/* Anti-Randomness Assessment */}
            <div className="p-3 rounded bg-panel/30 border border-line text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">تقييم الأمان الإحصائي:</span>
                <span className="font-bold text-ink tabular">{inspectingMatch.stabilityScore ?? 70}%</span>
              </div>
              <p className="text-muted leading-relaxed text-[11px]">
                المباراة اجتازت فحص مؤشر العشوائية (MRI) بنجاح، ولا تقع تحت طائلة فخاخ التعادل المزمنة أو الانهيارات البدنية للشوط الثاني.
              </p>
            </div>

            {/* Modal Footer Actions */}
            <div className="border-t border-line pt-3 flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`/match/${inspectingMatch.matchId}`}
                className="px-3.5 py-1.5 rounded bg-ink text-surface text-xs font-semibold hover:bg-accent transition-colors flex items-center gap-1"
              >
                <span>صفحة التحليل الشاملة في تقدير</span>
                <span aria-hidden>↗</span>
              </Link>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    addMatchToParlay(inspectingMatch);
                    setInspectingMatch(null);
                  }}
                  className="px-3 py-1.5 rounded bg-panel hover:bg-surface text-ink text-xs font-semibold border border-line transition-colors"
                >
                  + ضم لمختبر البارلي
                </button>
                <button
                  onClick={() => setInspectingMatch(null)}
                  className="px-3 py-1.5 rounded text-muted hover:text-ink text-xs font-medium"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer: Compliant with Anti-Slop Rules 29 & 30 */}
      <footer className="border-t border-line bg-surface mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div>
            تقدير · منصة الفرق المحصورة والبارلي المزدوج · نماذج إحصائية رياضية
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLegalModalOpen("terms")}
              className="hover:text-ink underline-offset-4 hover:underline"
            >
              شروط الاستخدام والإخلاء الرياضي
            </button>
            <button
              onClick={() => setLegalModalOpen("privacy")}
              className="hover:text-ink underline-offset-4 hover:underline"
            >
              سياسة الخصوصية والشفافية
            </button>
          </div>
        </div>
      </footer>

      {/* Legal & Terms Modal (Anti-slop rules 29 & 30) */}
      {legalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40">
          <div className="bg-surface border border-line rounded max-w-lg w-full p-6 space-y-4 shadow-none">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ink">
                {legalModalOpen === "terms"
                  ? "شروط الاستخدام والإخلاء الرياضي"
                  : "سياسة الخصوصية والشفافية"}
              </h3>
              <button
                onClick={() => setLegalModalOpen(null)}
                className="text-muted hover:text-ink text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-muted space-y-3 leading-relaxed max-h-80 overflow-y-auto">
              {legalModalOpen === "terms" ? (
                <>
                  <p>
                    1. <strong>طبيعة المنصة:</strong> منصة تقدير ومنصة الفرق المحصورة هي أدوات تحليل رياضي وإحصائي مبنية على نماذج بواسون (Dixon–Coles) وتصنيفات إيلو (Elo Rating) ونماذج تقدير العشوائية (MRI).
                  </p>
                  <p>
                    2. <strong>عدم تقديم نصائح مالية:</strong> كافة النسب والأسعار المعروضة هي نتائج نمذجة رياضية بحتة ولا تمثل أي ضمان لنتائج المباريات أو دعوة للمراهنة أو نصيحة استثمارية.
                  </p>
                  <p>
                    3. <strong>المسؤولية:</strong> المستخدم وحده يتحمل المسؤولية الكاملة عن أي استخدام لمعلومات وبيانات المنصة.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    1. <strong>جمع البيانات:</strong> لا تقوم منصة تقدير بجمع أو بيع أي بيانات شخصية أو معلومات سرية للمستخدمين.
                  </p>
                  <p>
                    2. <strong>التخزين المحلي:</strong> يتم تخزين تفضيلات العرض (المظهر الفاتح والداكن والمرشحات) محلياً داخل متصفح المستخدم فقط.
                  </p>
                  <p>
                    3. <strong>الشفافية الكاملة:</strong> كافة خوارزميات الحصر والاستبعاد ومعادلات البارلي المزدوج منشورة ومتاحة للمراجعة والتدقيق الرياضي.
                  </p>
                </>
              )}
            </div>

            <div className="border-t border-line pt-3 flex justify-end">
              <button
                onClick={() => setLegalModalOpen(null)}
                className="px-4 py-1.5 rounded bg-ink text-surface text-xs font-semibold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { pct } from "@/lib/format";
import type {
  ConfinedPlatformData,
  ParlayCandidateMatch,
  BankerPick,
} from "@/lib/queries";
import { HasrHeader } from "./HasrHeader";

interface HasrTerminalViewProps {
  initialData: ConfinedPlatformData;
}

export function HasrTerminalView({ initialData }: HasrTerminalViewProps) {
  const [activeTab, setActiveTab] = useState<"screener" | "parlay" | "radar" | "calibration">("screener");
  const [selectedLeague, setSelectedLeague] = useState<string>("all");
  const [strategyFilter, setStrategyFilter] = useState<"all" | "safety" | "value" | "balanced" | "traps">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Legal modal state (Anti-slop rules 29 & 30)
  const [legalModalOpen, setLegalModalOpen] = useState<"terms" | "privacy" | null>(null);

  // Parlay Lab selection state
  const [selectedMatch1, setSelectedMatch1] = useState<ParlayCandidateMatch | null>(
    initialData.parlayCandidates[0] || null
  );
  const [selectedMatch2, setSelectedMatch2] = useState<ParlayCandidateMatch | null>(
    initialData.parlayCandidates[1] || null
  );

  // Filtered confined matches based on strategy, league, and search query
  const filteredConfined = useMemo(() => {
    let list = initialData.confinedMatches;
    if (strategyFilter === "safety") {
      list = initialData.strategies.safety;
    } else if (strategyFilter === "value") {
      list = initialData.strategies.value;
    } else if (strategyFilter === "balanced") {
      list = initialData.strategies.balanced;
    } else if (strategyFilter === "traps") {
      list = initialData.strategies.traps;
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
        TUR1: "الدوري التركي",
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

    return list;
  }, [initialData, selectedLeague, strategyFilter, searchQuery]);

  // Filtered excluded matches based on league and search query
  const filteredExcluded = useMemo(() => {
    let list = initialData.excludedMatches;
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
      utcDate: "",
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
            {/* Control Bar: Search, Category Filters, View Switch */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-line pb-4">
              {/* Category Filter Buttons */}
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

              {/* Search & View Mode Toggle */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث عن فريق أو دوري..."
                    className="text-xs bg-panel border border-line rounded px-3 py-1.5 text-ink placeholder:text-muted focus:outline-hidden focus:border-accent w-48 sm:w-56"
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

                <div className="flex items-center border border-line rounded overflow-hidden text-xs">
                  <button
                    onClick={() => setViewMode("table")}
                    className={`px-2.5 py-1.5 font-medium transition-colors ${
                      viewMode === "table"
                        ? "bg-ink text-surface"
                        : "bg-panel text-muted hover:text-ink"
                    }`}
                  >
                    جدول
                  </button>
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`px-2.5 py-1.5 font-medium transition-colors ${
                      viewMode === "cards"
                        ? "bg-ink text-surface"
                        : "bg-panel text-muted hover:text-ink"
                    }`}
                  >
                    بطاقات
                  </button>
                </div>
              </div>
            </div>

            {/* Content: Empty State or Match Listing */}
            {filteredConfined.length === 0 ? (
              <div className="p-12 text-center rounded border border-line bg-panel space-y-2">
                <p className="text-sm font-semibold text-ink">لا توجد مباريات مطابقة للبحث أو التصفية</p>
                <p className="text-xs text-muted">جرب تعديل كلمة البحث أو اختيار دوري واستراتيجية مختلفة</p>
              </div>
            ) : viewMode === "table" ? (
              /* Table View: High density, clean tabular figures, zero slop */
              <div className="overflow-x-auto rounded border border-line bg-surface">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="border-b border-line bg-panel/50 text-muted font-semibold">
                      <th className="p-3">المباراة</th>
                      <th className="p-3">الدوري</th>
                      <th className="p-3 text-center">الترشيح</th>
                      <th className="p-3 text-center">احتمال النموذج</th>
                      <th className="p-3 text-center">فارق الفصل</th>
                      <th className="p-3 text-center">سعر السوق</th>
                      <th className="p-3 text-center">القيمة (Edge)</th>
                      <th className="p-3 text-center">مؤشر الأمان</th>
                      <th className="p-3 text-center">درجة الحصر</th>
                      <th className="p-3 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredConfined.map((item) => (
                      <tr
                        key={item.matchId}
                        className={`hover:bg-panel/30 transition-colors ${
                          item.isTrap ? "bg-rose-500/5" : ""
                        }`}
                      >
                        <td className="p-3 font-semibold text-ink">
                          <Link
                            href={`/match/${item.matchId}`}
                            className="hover:text-accent underline-offset-4 hover:underline"
                          >
                            {item.homeTeam} × {item.awayTeam}
                          </Link>
                          {item.isTrap && (
                            <span className="ms-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                              مصيدة
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
                        <td className="p-3 text-center tabular text-muted">
                          +{Math.round((item.separationGap ?? 0) * 100)}%
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
                        <td className="p-3 text-center">
                          <button
                            onClick={() => addMatchToParlay(item)}
                            className="px-2.5 py-1 rounded bg-panel hover:bg-ink hover:text-surface text-ink text-[11px] font-semibold border border-line transition-colors"
                          >
                            + بارلي
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Cards View: Clean, structured, architectural cards */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredConfined.map((item) => (
                  <div
                    key={item.matchId}
                    className={`rounded border p-4 space-y-3 transition-colors ${
                      item.isTrap
                        ? "bg-rose-500/5 border-rose-500/30"
                        : "bg-surface border-line hover:border-line-strong"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted font-medium">{item.leagueName}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-panel border border-line text-muted tabular">
                          أمان {item.stabilityScore ?? 70}%
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-panel border border-line text-ink tabular">
                          {item.selectionScore}/100
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-bold text-ink">
                        {item.homeTeam} × {item.awayTeam}
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-muted">
                          الترشيح: <strong className="text-ink font-semibold">{item.pickLabel}</strong>
                        </span>
                        <span className="text-muted tabular">
                          الاحتمال: <strong className="text-ink font-bold">{pct(item.probability)}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2 rounded bg-panel border border-line text-center text-xs">
                      <div>
                        <span className="text-[10px] text-muted block">فارق الفصل</span>
                        <span className="font-semibold tabular text-ink">
                          +{Math.round((item.separationGap ?? 0) * 100)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted block">سعر السوق</span>
                        <span className="font-semibold tabular text-ink">
                          {item.odds ? item.odds.toFixed(2) : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted block">القيمة</span>
                        <span
                          className={`font-semibold tabular ${
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
                    </div>

                    {item.isTrap && (
                      <div className="p-2 rounded text-[11px] bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-medium">
                        تنبيه مصيدة: السعر المعروض يتطلب احتمالية فوز أعلى من تقدير النموذج
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <Link
                        href={`/match/${item.matchId}`}
                        className="text-muted hover:text-ink font-medium underline-offset-4 hover:underline"
                      >
                        تفاصيل المباراة ↗
                      </Link>

                      <button
                        onClick={() => addMatchToParlay(item)}
                        className="px-2.5 py-1 rounded bg-panel hover:bg-ink hover:text-surface text-ink text-[11px] font-semibold border border-line transition-colors"
                      >
                        + ضم لمختبر البارلي
                      </button>
                    </div>
                  </div>
                ))}
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
                    <div className="text-sm font-bold text-ink">
                      {selectedMatch1.homeTeam} × {selectedMatch1.awayTeam}
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
                    <div className="text-sm font-bold text-ink">
                      {selectedMatch2.homeTeam} × {selectedMatch2.awayTeam}
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
                المباريات والفرق التي تم إسقاطها من الحصر والبارلي بسبب فخاخ التعادل أو تراجع الشوط الثاني أو ارتفاع مؤشر العشوائية
              </p>
            </div>

            {/* Excluded Table */}
            <div className="overflow-x-auto rounded border border-line bg-surface">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="border-b border-line bg-panel/50 text-muted font-semibold">
                    <th className="p-3">المباراة</th>
                    <th className="p-3 text-center">الدوري</th>
                    <th className="p-3 text-center">مؤشر العشوائية (MRI)</th>
                    <th className="p-3 text-center">مؤشر الأمان</th>
                    <th className="p-3 text-center">السبب المباشر</th>
                    <th className="p-3">التفصيل الإحصائي</th>
                    <th className="p-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredExcluded.map((match) => (
                    <tr key={match.matchId} className="hover:bg-panel/30 transition-colors">
                      <td className="p-3 font-semibold text-ink">
                        <Link href={`/match/${match.matchId}`} className="hover:text-accent">
                          {match.homeTeam} × {match.awayTeam}
                        </Link>
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
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-panel border border-line text-muted">
                          مستبعدة
                        </span>
                      </td>
                    </tr>
                  ))}
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

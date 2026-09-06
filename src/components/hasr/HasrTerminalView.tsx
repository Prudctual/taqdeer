"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { pct } from "@/lib/format";
import type {
  ConfinedPlatformData,
  ParlayCandidateMatch,
} from "@/lib/queries";
import { HasrHeader } from "./HasrHeader";

interface HasrTerminalViewProps {
  initialData: ConfinedPlatformData;
}

export function HasrTerminalView({ initialData }: HasrTerminalViewProps) {
  const [activeTab, setActiveTab] = useState<"screener" | "parlay" | "calibration" | "radar">("screener");
  const [selectedLeague, setSelectedLeague] = useState<string>("all");
  const [strategyFilter, setStrategyFilter] = useState<"all" | "safety" | "value" | "balanced" | "traps">("all");

  // Parlay Lab selection state
  const [selectedMatch1, setSelectedMatch1] = useState<ParlayCandidateMatch | null>(
    initialData.parlayCandidates[0] || null
  );
  const [selectedMatch2, setSelectedMatch2] = useState<ParlayCandidateMatch | null>(
    initialData.parlayCandidates[1] || null
  );

  // Strategy & League filtered data
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
    return list;
  }, [initialData, selectedLeague, strategyFilter]);

  const filteredExcluded = useMemo(() => {
    if (selectedLeague === "all") return initialData.excludedMatches;
    return initialData.excludedMatches.filter((m) => m.leagueId === selectedLeague);
  }, [initialData.excludedMatches, selectedLeague]);

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
      verdictAr = "محظور — إحدى المباراتين محاطة بعشوائية مرتفعة";
      isRecommended = false;
    } else if (hasTrap) {
      verdictAr = "حذر — السعر السوقي مبالغ فيه (Value Trap)";
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

  return (
    <div className="min-h-screen bg-bg text-ink space-y-6">
      {/* Dedicated Subdomain Header */}
      <HasrHeader
        summaryStats={initialData.summaryStats}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedLeague={selectedLeague}
        onLeagueChange={setSelectedLeague}
      />

      {/* Main Terminal Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 space-y-6">
        {/* TAB 1: SCREENER (المباريات المحصورة) */}
        {activeTab === "screener" && (
          <div className="space-y-5">
            {/* Strategy Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                <span className="text-muted font-medium me-1">الاستراتيجية:</span>
                <button
                  onClick={() => setStrategyFilter("all")}
                  className={`px-3 py-1 rounded-full font-bold transition-colors ${
                    strategyFilter === "all"
                      ? "bg-ink text-surface"
                      : "bg-panel text-muted hover:text-ink border border-line"
                  }`}
                >
                  كافة المحصورة ({initialData.confinedMatches.length})
                </button>
                <button
                  onClick={() => setStrategyFilter("safety")}
                  className={`px-3 py-1 rounded-full font-bold transition-colors ${
                    strategyFilter === "safety"
                      ? "bg-emerald-600 text-white"
                      : "bg-panel text-muted hover:text-ink border border-line"
                  }`}
                >
                  🛡️ الأمان المطلق ({initialData.strategies.safety.length})
                </button>
                <button
                  onClick={() => setStrategyFilter("value")}
                  className={`px-3 py-1 rounded-full font-bold transition-colors ${
                    strategyFilter === "value"
                      ? "bg-accent text-white"
                      : "bg-panel text-muted hover:text-ink border border-line"
                  }`}
                >
                  💎 القيمة العالية (+EV) ({initialData.strategies.value.length})
                </button>
                <button
                  onClick={() => setStrategyFilter("balanced")}
                  className={`px-3 py-1 rounded-full font-bold transition-colors ${
                    strategyFilter === "balanced"
                      ? "bg-amber-600 text-white"
                      : "bg-panel text-muted hover:text-ink border border-line"
                  }`}
                >
                  ⚖️ التوازن الذكي ({initialData.strategies.balanced.length})
                </button>
                <button
                  onClick={() => setStrategyFilter("traps")}
                  className={`px-3 py-1 rounded-full font-bold transition-colors ${
                    strategyFilter === "traps"
                      ? "bg-rose-600 text-white"
                      : "bg-panel text-muted hover:text-ink border border-line"
                  }`}
                >
                  ⚠️ مصائد الأسعار ({initialData.strategies.traps.length})
                </button>
              </div>

              <span className="text-xs text-muted font-medium">
                تم استبعاد {initialData.summaryStats.totalExcluded} مباراة بسبب فخاخ التعادل والعشوائية
              </span>
            </div>

            {/* Confined Cards Grid */}
            {filteredConfined.length === 0 ? (
              <div className="p-12 text-center rounded-xl border border-line bg-panel space-y-2">
                <p className="text-sm font-semibold text-ink">لا توجد مباريات تطابق معايير الحصر الحالية</p>
                <p className="text-xs text-muted">جرب اختيار دوري آخر أو استراتيجية مختلفة من الشريط العلوي</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredConfined.map((item) => (
                  <div
                    key={item.matchId}
                    className={`rounded-xl border p-4 space-y-3 transition-colors ${
                      item.isTrap
                        ? "bg-rose-500/5 border-rose-500/30"
                        : "bg-panel border-line hover:border-accent/40"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted font-medium">{item.leagueName}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-surface border border-line text-muted tabular">
                          🛡️ أمان {item.stabilityScore ?? 70}%
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-accent/15 text-accent border border-accent/20 tabular">
                          درجة {item.selectionScore}/100
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-bold text-ink flex items-center justify-between">
                        <span>{item.homeTeam} × {item.awayTeam}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="font-semibold text-accent">
                          الترشيح: <strong>{item.pickLabel}</strong>
                        </span>
                        <span className="text-muted font-semibold tabular">
                          احتمال: <strong className="text-ink">{pct(item.probability)}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2 rounded bg-surface border border-line/60 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-muted block">فارق الفصل</span>
                        <span className="font-bold tabular text-ink">
                          +{Math.round((item.separationGap ?? 0) * 100)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted block">سعر السوق</span>
                        <span className="font-bold tabular text-ink">
                          {item.odds ? item.odds.toFixed(2) : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted block">الـ Edge</span>
                        <span
                          className={`font-bold tabular ${
                            (item.edge ?? 0) > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {item.edge !== null && item.edge !== undefined
                            ? `${item.edge > 0 ? "+" : ""}${Math.round(item.edge * 100)}%`
                            : "—"}
                        </span>
                      </div>
                    </div>

                    {item.isTrap && (
                      <div className="p-2 rounded text-[11px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-medium">
                        ⚠️ مصيدة قيمة: سعر السوق منخفض جداً ويتطلب فوزاً باحتمال أعلى من تقدير النموذج
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <Link
                        href={`/match/${item.matchId}`}
                        className="text-muted hover:text-ink font-medium underline-offset-4 hover:underline"
                      >
                        تحليل تفصيلي ↗
                      </Link>

                      <button
                        onClick={() => {
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
                        }}
                        className="px-2.5 py-1 rounded bg-surface hover:bg-ink hover:text-surface text-ink text-[11px] font-bold border border-line transition-colors"
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

        {/* TAB 2: PARLAY LAB (مختبر البارلي المزدوج) */}
        {activeTab === "parlay" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl border border-line bg-panel/60 space-y-1">
              <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                <span>⚡</span>
                <span>مختبر البارلي المحصور (Dual-Selection Parlay Lab)</span>
              </h2>
              <p className="text-xs text-muted">
                تطبيق مباشر لمعادلة حصر وتصفية المباريات إلى مباراتين فقط بإزالة خطر العشوائية ومقارنة السعر العادل بسعر السوق التراكمي
              </p>
            </div>

            {/* Selection Slots */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Match 1 Slot */}
              <div className="p-5 rounded-xl border border-line bg-panel space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-accent">المباراة الأولى في البارلي</span>
                  <select
                    value={selectedMatch1?.matchId || ""}
                    onChange={(e) => {
                      const found = initialData.parlayCandidates.find((c) => c.matchId === e.target.value);
                      setSelectedMatch1(found || null);
                    }}
                    className="text-xs bg-surface border border-line rounded px-2 py-1 text-ink"
                  >
                    {initialData.parlayCandidates.map((c) => (
                      <option key={c.matchId} value={c.matchId}>
                        {c.homeTeam} × {c.awayTeam} ({pct(c.probability)})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedMatch1 ? (
                  <div className="space-y-2 pt-2 border-t border-line/60">
                    <div className="text-sm font-bold text-ink">
                      {selectedMatch1.homeTeam} × {selectedMatch1.awayTeam}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>الترشيح: <strong className="text-ink">{selectedMatch1.recommendedSideLabel}</strong></span>
                      <span>الاحتمال: <strong className="text-ink">{pct(selectedMatch1.probability)}</strong></span>
                      <span>السعر: <strong className="text-ink">{selectedMatch1.odds ? selectedMatch1.odds.toFixed(2) : "—"}</strong></span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted py-4 text-center">يرجى اختيار المباراة الأولى</p>
                )}
              </div>

              {/* Match 2 Slot */}
              <div className="p-5 rounded-xl border border-line bg-panel space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-accent">المباراة الثانية في البارلي</span>
                  <select
                    value={selectedMatch2?.matchId || ""}
                    onChange={(e) => {
                      const found = initialData.parlayCandidates.find((c) => c.matchId === e.target.value);
                      setSelectedMatch2(found || null);
                    }}
                    className="text-xs bg-surface border border-line rounded px-2 py-1 text-ink"
                  >
                    {initialData.parlayCandidates.map((c) => (
                      <option key={c.matchId} value={c.matchId}>
                        {c.homeTeam} × {c.awayTeam} ({pct(c.probability)})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedMatch2 ? (
                  <div className="space-y-2 pt-2 border-t border-line/60">
                    <div className="text-sm font-bold text-ink">
                      {selectedMatch2.homeTeam} × {selectedMatch2.awayTeam}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>الترشيح: <strong className="text-ink">{selectedMatch2.recommendedSideLabel}</strong></span>
                      <span>الاحتمال: <strong className="text-ink">{pct(selectedMatch2.probability)}</strong></span>
                      <span>السعر: <strong className="text-ink">{selectedMatch2.odds ? selectedMatch2.odds.toFixed(2) : "—"}</strong></span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted py-4 text-center">يرجى اختيار المباراة الثانية</p>
                )}
              </div>
            </div>

            {/* Joint Parlay Verdict Card */}
            {parlayStats && (
              <div className="rounded-xl border border-line bg-surface p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">
                      نتيجة التحليل الرياضي للبارلي المشترك
                    </span>
                    <h3 className="text-base font-bold text-ink">
                      {selectedMatch1?.homeTeam} ({selectedMatch1?.recommendedSideLabel}) + {selectedMatch2?.homeTeam} ({selectedMatch2?.recommendedSideLabel})
                    </h3>
                  </div>

                  <div
                    className={`px-3 py-1 rounded text-xs font-bold border ${
                      parlayStats.isRecommended
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                    }`}
                  >
                    {parlayStats.verdictAr}
                  </div>
                </div>

                {/* Metrics 4-grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-panel border border-line space-y-1">
                    <span className="text-xs text-muted">احتمال نجاح البارلي</span>
                    <div className="text-xl font-black text-ink tabular">
                      {pct(parlayStats.jointProb)}
                    </div>
                    <span className="text-[11px] text-muted block">
                      ({pct(selectedMatch1?.probability || 0)} × {pct(selectedMatch2?.probability || 0)})
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-panel border border-line space-y-1">
                    <span className="text-xs text-muted">السعر العادل للنموذج</span>
                    <div className="text-xl font-black text-ink tabular">
                      {parlayStats.fairOdds}
                    </div>
                    <span className="text-[11px] text-muted block">
                      احتمال حقيقي {pct(parlayStats.jointProb)}
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-panel border border-line space-y-1">
                    <span className="text-xs text-muted">سعر السوق التراكمي</span>
                    <div className="text-xl font-black text-ink tabular">
                      {parlayStats.marketOdds}
                    </div>
                    <span className="text-[11px] text-muted block">
                      المعروض لدى وكلاء المراهنات
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-panel border border-line space-y-1">
                    <span className="text-xs text-muted">الـ Edge التراكمي</span>
                    <div
                      className={`text-xl font-black tabular ${
                        parlayStats.edge > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {parlayStats.edge > 0 ? `+${parlayStats.edge}%` : `${parlayStats.edge}%`}
                    </div>
                    <span className="text-[11px] text-muted block">
                      {parlayStats.edge > 0 ? "قيمة موجبة إيجابية" : "عائد سلبي بالنسبة للمخاطرة"}
                    </span>
                  </div>
                </div>

                {/* Tactical note */}
                <p className="text-xs text-muted leading-relaxed font-medium bg-panel/50 p-3 rounded border border-line/60">
                  💡 <strong>ملاحظة رياضية هامة:</strong> البارلي يضاعف المخاطرة لاخطياً. عند اختيار مباراتين باحتمال 65% و 54%، يصبح الاحتمال المشترك 35% فقط؛ لذا يجب التأكد من أن السعر المعروض يعوّض هذا الانخفاض الاحتمالي ولا يقع تحت طائلة فخاخ التعادل.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CALIBRATION (مصفوفة المعايرة) */}
        {activeTab === "calibration" && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl border border-line bg-panel/60 space-y-1">
              <h2 className="text-sm font-bold text-ink">مصفوفة المعايرة الإحصائية (Empirical Calibration Bins)</h2>
              <p className="text-xs text-muted">
                تدقيق تاريخي دقيق لكافة فئات الاحتمالات للتأكد من أن نسبة الفوز الفعلية تطابق متوسط الاحتمال المتوقع
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="border-b border-line bg-panel/60 text-muted font-bold">
                    <th className="p-3">فئة الاحتمال</th>
                    <th className="p-3 text-center">عدد المباريات</th>
                    <th className="p-3 text-center">الصحيحة</th>
                    <th className="p-3 text-center">نسبة الفوز الفعلية</th>
                    <th className="p-3 text-center">متوسط احتمال النموذج</th>
                    <th className="p-3 text-center">خطأ المعايرة (Error)</th>
                    <th className="p-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {initialData.calibration.bins.map((bin) => {
                    const isAccurate = Math.abs(bin.calibrationError) <= 0.05;
                    return (
                      <tr key={bin.label} className="hover:bg-panel/40 transition-colors">
                        <td className="p-3 font-bold text-ink tabular">{bin.label}</td>
                        <td className="p-3 text-center tabular">{bin.nMatches}</td>
                        <td className="p-3 text-center tabular text-emerald-600 dark:text-emerald-400 font-bold">
                          {bin.nCorrect}
                        </td>
                        <td className="p-3 text-center tabular font-black text-ink">
                          {pct(bin.winRate)}
                        </td>
                        <td className="p-3 text-center tabular text-muted">
                          {pct(bin.meanProb)}
                        </td>
                        <td className="p-3 text-center tabular">
                          <span
                            className={`font-bold ${
                              bin.calibrationError > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {bin.calibrationError > 0 ? "+" : ""}
                            {pct(bin.calibrationError)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              isAccurate
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-panel text-muted border border-line"
                            }`}
                          >
                            {isAccurate ? "معايرة ممتازة" : "طبيعي"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-xl border border-line bg-panel text-xs space-y-2">
              <span className="font-bold text-ink block">الخلاصة الإحصائية للمعايرة:</span>
              <p className="text-muted leading-relaxed">
                تُظهر البيانات التجريبية عبر الدوريات التسعة أن فئات الاحتمالات فوق 55% تحقق قفزة نوعية في دقة الإصابة، مما يؤكد أن نظام «الحصر» عندما يضع حداً أدنى 50% مع فارق فصل قوي يعزل المباريات عالية الموثوقية بفعالية.
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: STRICT EXCLUSION RADAR (رادار الاستبعاد الصارم) */}
        {activeTab === "radar" && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl border border-line bg-panel/60 space-y-1">
              <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                <span>🚫</span>
                <span>رادار المباريات والفرق المستبعدة من الحصر</span>
              </h2>
              <p className="text-xs text-muted">
                المباريات التي أسقطها محرك العشوائية وحظر دخولها في ترشيحات الأمان أو البارلي بسبب الفخاخ والمخاطر الحرجة
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="border-b border-line bg-panel/60 text-muted font-bold">
                    <th className="p-3">المباراة</th>
                    <th className="p-3 text-center">الدوري</th>
                    <th className="p-3 text-center">مؤشر العشوائية (MRI)</th>
                    <th className="p-3 text-center">درجة الأمان</th>
                    <th className="p-3 text-center">سبب الاستبعاد الأساسي</th>
                    <th className="p-3">التفصيل الإحصائي للسبب</th>
                    <th className="p-3 text-center">الإجراء الموصى</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredExcluded.map((match) => (
                    <tr key={match.matchId} className="hover:bg-panel/40 transition-colors">
                      <td className="p-3 font-bold text-ink">
                        <Link href={`/match/${match.matchId}`} className="hover:text-accent">
                          {match.homeTeam} × {match.awayTeam}
                        </Link>
                      </td>
                      <td className="p-3 text-center text-muted font-medium">
                        {match.leagueNameAr}
                      </td>
                      <td className="p-3 text-center tabular font-black text-rose-600 dark:text-rose-400">
                        {match.matchRandomnessIndex} / 100
                      </td>
                      <td className="p-3 text-center tabular text-muted font-semibold">
                        {match.stabilityScore}%
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          {match.primaryExclusionPillar === "draw_trap" && "فخ تعادل مزمن"}
                          {match.primaryExclusionPillar === "second_half_fragility" && "انهيار شوط ثانٍ"}
                          {match.primaryExclusionPillar === "disciplinary_risk" && "خطر صدمة طرد"}
                          {match.primaryExclusionPillar === "volatility" && "تذبذب نتائج حاد"}
                          {match.primaryExclusionPillar === "other" && "عشوائية حرجة"}
                        </span>
                      </td>
                      <td className="p-3 text-muted text-[11px] max-w-xs leading-relaxed">
                        {match.primaryReasonAr}
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface border border-line text-muted">
                          حظر كامل
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

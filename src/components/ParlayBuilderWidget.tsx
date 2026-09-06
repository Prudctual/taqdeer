"use client";

import { useState, useMemo } from "react";
import {
  decimalToAmerican,
  americanToDecimal,
  oddsToImpliedProb,
  calculateEdge,
  detectValueTrap,
  calculateParlay,
  pct,
} from "@/lib/format";
import type { ParlayCandidateMatch } from "@/lib/queries";

export function ParlayBuilderWidget({
  candidates = [],
  title = "محلل وحاسبة البارلي والتجميعات الذكية (Parlay / Accumulator Analyzer)",
}: {
  candidates?: ParlayCandidateMatch[];
  title?: string;
}) {
  // Preset or selected matches (array of match IDs)
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    // Default: first 2 candidates if available
    return candidates.slice(0, 2).map((c) => c.matchId);
  });

  // Custom hypothetical odds simulation (matches chat transcript)
  const [useSimulation, setUseSimulation] = useState<boolean>(false);
  const [simLeg1Prob, setSimLeg1Prob] = useState<number>(65.5);
  const [simLeg1American, setSimLeg1American] = useState<string>("-167");
  const [simLeg2Prob, setSimLeg2Prob] = useState<number>(54.4);
  const [simLeg2American, setSimLeg2American] = useState<string>("-400");
  const [simMarketParlayOdds, setSimMarketParlayOdds] = useState<string>("+100");

  // Selected candidates
  const selectedCandidates = useMemo(() => {
    return candidates.filter((c) => selectedIds.includes(c.matchId));
  }, [candidates, selectedIds]);

  // Handle Preset Clicks
  const applyPreset = (type: "safety" | "value" | "balanced") => {
    setUseSimulation(false);
    if (candidates.length < 2) return;

    if (type === "safety") {
      // Top 2 by win prob
      const sorted = [...candidates].sort((a, b) => b.probability - a.probability);
      setSelectedIds(sorted.slice(0, 2).map((c) => c.matchId));
    } else if (type === "value") {
      // Top 2 by positive edge
      const sorted = [...candidates].sort((a, b) => b.edge - a.edge);
      setSelectedIds(sorted.slice(0, 2).map((c) => c.matchId));
    } else if (type === "balanced") {
      // Balanced: safe prob, no trap, positive edge
      const sorted = [...candidates]
        .filter((c) => !c.isTrap && c.edge >= -0.01)
        .sort((a, b) => b.selectionScore - a.selectionScore);
      if (sorted.length >= 2) {
        setSelectedIds(sorted.slice(0, 2).map((c) => c.matchId));
      } else {
        setSelectedIds(candidates.slice(0, 2).map((c) => c.matchId));
      }
    }
  };

  // Toggle match selection
  const toggleMatch = (id: string) => {
    setUseSimulation(false);
    if (selectedIds.includes(id)) {
      if (selectedIds.length <= 1) return; // Keep at least 1
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      if (selectedIds.length >= 4) return; // Max 4 legs
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Calculation for live candidates
  const parlayResult = useMemo(() => {
    if (useSimulation) {
      const p1 = simLeg1Prob / 100.0;
      const o1 = americanToDecimal(parseInt(simLeg1American, 10) || -167);
      const p2 = simLeg2Prob / 100.0;
      const o2 = americanToDecimal(parseInt(simLeg2American, 10) || -400);

      const modelProb = Number((p1 * p2).toFixed(4));
      // Manual parlay market odds if provided, otherwise o1 * o2
      const userAm = parseInt(simMarketParlayOdds, 10);
      const marketDec = userAm ? americanToDecimal(userAm) : Number((o1 * o2).toFixed(3));
      const marketImplied = oddsToImpliedProb(marketDec);
      const fairDec = modelProb > 0 ? Number((1.0 / modelProb).toFixed(3)) : 999.0;
      const parlayEdge = Number((modelProb - marketImplied).toFixed(4));
      const parlayEv = Number(((modelProb * marketDec) - 1.0).toFixed(4));
      const hasValueTrap = detectValueTrap(p1, o1) || detectValueTrap(p2, o2);

      return {
        modelProb,
        marketDecOdds: marketDec,
        marketAmericanOdds: decimalToAmerican(marketDec),
        marketImpliedProb: marketImplied,
        fairDecOdds: fairDec,
        fairAmericanOdds: decimalToAmerican(fairDec),
        parlayEdge,
        parlayEv,
        hasValueTrap,
        isPositiveEv: parlayEv > 0.0,
        legs: [
          {
            id: "sim1",
            matchName: "Telstar × Cambuur (محاكاة)",
            pickLabel: "فوز تيلستار",
            prob: p1,
            odds: o1,
            americanOdds: decimalToAmerican(o1),
            impliedProb: oddsToImpliedProb(o1),
            edge: calculateEdge(p1, o1),
            isTrap: detectValueTrap(p1, o1),
          },
          {
            id: "sim2",
            matchName: "Valencia × Barcelona (محاكاة)",
            pickLabel: "فوز برشلونة",
            prob: p2,
            odds: o2,
            americanOdds: decimalToAmerican(o2),
            impliedProb: oddsToImpliedProb(o2),
            edge: calculateEdge(p2, o2),
            isTrap: detectValueTrap(p2, o2),
          },
        ],
      };
    }

    const legs = selectedCandidates.map((c) => ({
      id: c.matchId,
      matchName: `${c.homeTeam} × ${c.awayTeam}`,
      pickLabel: c.recommendedSideLabel,
      prob: c.probability,
      odds: c.odds,
    }));

    return calculateParlay(legs);
  }, [
    useSimulation,
    simLeg1Prob,
    simLeg1American,
    simLeg2Prob,
    simLeg2American,
    simMarketParlayOdds,
    selectedCandidates,
  ]);

  return (
    <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-2xs space-y-0">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-line bg-panel space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-600 dark:text-purple-400 font-semibold text-[11px]">
              محلل مخاطر البارلي والـValue
            </span>
            <span className="text-[11px] font-bold text-muted bg-surface px-2.5 py-0.5 rounded-full border border-line">
              Parlay EV Engine
            </span>
          </div>

          {/* Quick Presets from Chat */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyPreset("safety")}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface border border-line text-muted hover:text-ink hover:border-accent transition-all cursor-pointer shadow-2xs"
            >
              🛡️ بارلي الأمان (أعلى احتمالات)
            </button>
            <button
              type="button"
              onClick={() => applyPreset("value")}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface border border-line text-muted hover:text-ink hover:border-success transition-all cursor-pointer shadow-2xs"
            >
              💎 بارلي القيمة (أعلى +EV)
            </button>
            <button
              type="button"
              onClick={() => applyPreset("balanced")}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-accent text-on-fill hover:opacity-90 transition-all cursor-pointer shadow-xs"
            >
              🎯 البارلي المتوازن الموصى به
            </button>
            <button
              type="button"
              onClick={() => setUseSimulation(!useSimulation)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                useSimulation
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-300"
                  : "bg-surface border-line text-muted hover:text-ink"
              }`}
            >
              🧪 محاكاة الحوار (تيلستار + برشلونة)
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-semibold text-ink tracking-tight">
            {title}
          </h2>
          <p className="text-xs font-medium text-muted leading-relaxed max-w-3xl">
            لا نختار للبارلي بمجرد النظر إلى نسبة الفوز؛ نختبر احتمال النجاح المشترك والأودز العادلة ونكشف ما إذا كان سعر السوق بخساً ومحمّلاً بقيمة سالبة (-EV) بسبب مبالغة السوق في تسعير المرشحين.
          </p>
        </div>
      </div>

      {/* Main Analysis Body */}
      <div className="p-4 sm:p-5 space-y-5">
        {/* Simulation Notice if Active */}
        {useSimulation && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                <span>⚡</span>
                <span>محاكاة تجربة الحوار: تيلستار (-167) + برشلونة (-400) بسعر بارلي +100</span>
              </span>
              <button
                type="button"
                onClick={() => setUseSimulation(false)}
                className="text-[11px] font-bold text-muted hover:text-ink underline"
              >
                العودة للمباريات الحية
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="rounded-lg bg-surface p-2.5 border border-line space-y-1">
                <span className="text-[10px] font-bold text-muted block">تيلستار: نسبة النموذج % وأودز</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    value={simLeg1Prob}
                    onChange={(e) => setSimLeg1Prob(parseFloat(e.target.value) || 50)}
                    className="w-full font-mono text-xs font-semibold px-2 py-1 rounded bg-panel border border-line text-ink"
                    placeholder="نسبة %"
                  />
                  <input
                    type="text"
                    value={simLeg1American}
                    onChange={(e) => setSimLeg1American(e.target.value)}
                    className="w-full font-mono text-xs font-semibold px-2 py-1 rounded bg-panel border border-line text-ink"
                    placeholder="أودز أمريكية"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-surface p-2.5 border border-line space-y-1">
                <span className="text-[10px] font-bold text-muted block">برشلونة: نسبة النموذج % وأودز</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    value={simLeg2Prob}
                    onChange={(e) => setSimLeg2Prob(parseFloat(e.target.value) || 50)}
                    className="w-full font-mono text-xs font-semibold px-2 py-1 rounded bg-panel border border-line text-ink"
                    placeholder="نسبة %"
                  />
                  <input
                    type="text"
                    value={simLeg2American}
                    onChange={(e) => setSimLeg2American(e.target.value)}
                    className="w-full font-mono text-xs font-semibold px-2 py-1 rounded bg-panel border border-line text-ink"
                    placeholder="أودز أمريكية"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-surface p-2.5 border border-line space-y-1">
                <span className="text-[10px] font-bold text-muted block">سعر البارلي المعروض في السوق</span>
                <input
                  type="text"
                  value={simMarketParlayOdds}
                  onChange={(e) => setSimMarketParlayOdds(e.target.value)}
                  className="w-full font-mono text-xs font-semibold px-2 py-1 rounded bg-panel border border-line text-ink"
                />
              </div>
            </div>
          </div>
        )}

        {/* Real Candidates Match Selector (if not simulation) */}
        {!useSimulation && candidates.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink">
                اختر مباريات التذكرة ({selectedIds.length} من 4 مباريات محددة):
              </span>
              <span className="text-[11px] text-muted">
                انقر على أي بطاقة لإضافتها أو استبعادها من التجميعة
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {candidates.map((c) => {
                const isSelected = selectedIds.includes(c.matchId);
                return (
                  <button
                    key={c.matchId}
                    type="button"
                    onClick={() => toggleMatch(c.matchId)}
                    className={`press-scale text-start p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? "bg-panel border-accent shadow-xs ring-1 ring-accent/30"
                        : "bg-surface border-line hover:border-line-strong opacity-80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-muted truncate">
                        {c.leagueNameAr}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          isSelected ? "bg-accent text-on-fill" : "bg-panel text-muted"
                        }`}
                      >
                        {isSelected ? "✓ مختارة" : "+ إضافة"}
                      </span>
                    </div>

                    <div className="font-semibold text-xs text-ink truncate">
                      {c.homeTeam} × {c.awayTeam}
                    </div>

                    <div className="text-[11px] font-semibold text-muted flex items-center justify-between">
                      <span>الترشيح:</span>
                      <span className="text-ink font-bold">{c.recommendedSideLabel}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-line/60 text-[10px] font-mono tabular">
                      <span className="text-muted">احتمال: {pct(c.probability, 0)}</span>
                      <span className="text-ink font-semibold">
                        {c.odds.toFixed(2)} ({c.americanOdds})
                      </span>
                    </div>

                    {c.isTrap && (
                      <span className="block text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded text-center">
                        ⚠️ مصيدة قيمة
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Parlay Results Card */}
        {parlayResult && (
          <div className="rounded-2xl border border-line bg-panel p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <span className="text-xs sm:text-sm font-semibold text-ink flex items-center gap-1.5">
                <span>📊</span>
                <span>نتيجة تحليل تجميعة البارلي ({parlayResult.legs.length} مباريات)</span>
              </span>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  parlayResult.isPositiveEv
                    ? "bg-success/20 text-success border border-success/30"
                    : "bg-danger/20 text-danger border border-danger/30"
                }`}
              >
                {parlayResult.isPositiveEv ? "✅ رهان إيجابي (+EV)" : "❌ رهان سالب (-EV)"}
              </span>
            </div>

            {/* Core Comparative Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="rounded-xl border border-line bg-surface p-2.5 text-center space-y-0.5">
                <span className="text-[10px] font-bold text-muted block">احتمال نجاح البارلي</span>
                <span className="text-lg font-semibold text-ink font-mono tabular">
                  {pct(parlayResult.modelProb, 1)}
                </span>
              </div>

              <div className="rounded-xl border border-line bg-surface p-2.5 text-center space-y-0.5">
                <span className="text-[10px] font-bold text-muted block">احتمال السوق الضمني</span>
                <span className="text-lg font-semibold text-muted font-mono tabular">
                  {pct(parlayResult.marketImpliedProb, 1)}
                </span>
              </div>

              <div className="rounded-xl border border-line bg-surface p-2.5 text-center space-y-0.5">
                <span className="text-[10px] font-bold text-muted block">أودز السوق المعروضة</span>
                <span className="text-lg font-semibold text-ink font-mono tabular">
                  {parlayResult.marketAmericanOdds}
                </span>
                <span className="text-[9px] font-mono text-muted block">
                  عشري: {parlayResult.marketDecOdds.toFixed(2)}
                </span>
              </div>

              <div className="rounded-xl border border-line bg-surface p-2.5 text-center space-y-0.5">
                <span className="text-[10px] font-bold text-muted block">الأودز العادلة (Fair Odds)</span>
                <span className="text-lg font-semibold text-home font-mono tabular">
                  {parlayResult.fairAmericanOdds}
                </span>
                <span className="text-[9px] font-mono text-muted block">
                  عشري: {parlayResult.fairDecOdds.toFixed(2)}
                </span>
              </div>

              <div className="rounded-xl border border-line bg-surface p-2.5 text-center space-y-0.5">
                <span className="text-[10px] font-bold text-muted block">فارق السعر (Edge)</span>
                <span
                  className={`text-lg font-semibold font-mono tabular ${
                    parlayResult.parlayEdge >= 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {parlayResult.parlayEdge >= 0 ? "+" : ""}
                  {(parlayResult.parlayEdge * 100).toFixed(1)}%
                </span>
              </div>

              <div className="rounded-xl border border-line bg-surface p-2.5 text-center space-y-0.5">
                <span className="text-[10px] font-bold text-muted block">العائد المتوقع (EV)</span>
                <span
                  className={`text-lg font-semibold font-mono tabular ${
                    parlayResult.parlayEv >= 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {parlayResult.parlayEv >= 0 ? "+" : ""}
                  {(parlayResult.parlayEv * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Strategic Decision & Verdict Box */}
            <div
              className={`rounded-xl border p-4 space-y-2 ${
                parlayResult.hasValueTrap
                  ? "bg-amber-500/10 border-amber-500/30 text-ink"
                  : parlayResult.isPositiveEv
                  ? "bg-success-dim border-success/30 text-ink"
                  : "bg-panel border-line text-ink"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">
                  {parlayResult.hasValueTrap ? "🚨" : parlayResult.isPositiveEv ? "🎯" : "⚠️"}
                </span>
                <h3 className="text-xs sm:text-sm font-semibold">
                  {parlayResult.hasValueTrap
                    ? "تحذير: التجميعة تحتوي على مصيدة قيمة تبتلع العائد!"
                    : parlayResult.isPositiveEv
                    ? "تجميعة ذكية ذات قيمة متوقعة موجبة (+EV)"
                    : "البارلي غير مجدٍ مقارنة بأسعار السوق"}
                </h3>
              </div>

              <p className="text-xs font-semibold text-muted leading-relaxed">
                {parlayResult.hasValueTrap ? (
                  <>
                    رغم أن بعض المرشحين يملكون احتمال فوز مرتفع، إلا أن سعر السوق المتاح يطلب فرصة فوز أعلى بكثير مما يراه النموذج، مما يخلق عائداً سالباً فادحاً (
                    <strong className="text-danger">
                      {(parlayResult.parlayEv * 100).toFixed(1)}% EV
                    </strong>
                    ). الأودز العادلة لنجاح هذا البارلي هي{" "}
                    <strong className="text-home">{parlayResult.fairAmericanOdds}</strong>، بينما السوق يعرض فقط{" "}
                    <strong className="text-ink">{parlayResult.marketAmericanOdds}</strong>. يُنصح باستبعاد الفريق صاحب المصيدة أو الاكتفاء بالرهان المنفرد.
                  </>
                ) : parlayResult.isPositiveEv ? (
                  <>
                    احتمال النموذج الإجمالي (
                    <strong className="text-success">{pct(parlayResult.modelProb, 1)}</strong>) يتفوق على احتمال السوق الضمني (
                    <strong className="text-ink">{pct(parlayResult.marketImpliedProb, 1)}</strong>)، مع فارق ربحي موجب قدره{" "}
                    <strong className="text-success">+{(parlayResult.parlayEv * 100).toFixed(1)}%</strong>. جميع الاختيارات في هذه التوليفة متوافقة إحصائياً.
                  </>
                ) : (
                  <>
                    الجمع بين هذه المباريات يقلل احتمال الفوز دون أن يقدم السوق سعراً عادلاً يعوض المخاطرة المضافة. يُفضل اللعب المنفرد (Single Bets).
                  </>
                )}
              </p>
            </div>

            {/* Individual Legs Breakdown Table */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-muted block">
                تفكيك الاختيارات الفردية داخل التجميعة:
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="border-b border-line text-muted text-[11px] font-bold">
                      <th scope="col" className="py-2 px-3 text-start">المباراة والترشيح</th>
                      <th scope="col" className="py-2 px-3 text-center">احتمال النموذج</th>
                      <th scope="col" className="py-2 px-3 text-center">أودز السوق</th>
                      <th scope="col" className="py-2 px-3 text-center">احتمال السوق</th>
                      <th scope="col" className="py-2 px-3 text-center">فارق السعر (Edge)</th>
                      <th scope="col" className="py-2 px-3 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {parlayResult.legs.map((leg, idx) => (
                      <tr key={leg.id || idx} className="hover:bg-surface/50">
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-ink block">{leg.matchName}</span>
                          <span className="text-[10px] text-muted">{leg.pickLabel}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-ink tabular">
                          {pct(leg.prob, 1)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-ink tabular">
                          {leg.odds.toFixed(2)} ({leg.americanOdds})
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-muted tabular">
                          {pct(leg.impliedProb, 1)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`font-mono font-bold tabular ${
                              leg.edge >= 0 ? "text-success" : "text-danger"
                            }`}
                          >
                            {leg.edge >= 0 ? "+" : ""}
                            {(leg.edge * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {leg.isTrap ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                              ⚠️ مصيدة
                            </span>
                          ) : leg.edge >= 0 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-success/20 text-success font-bold">
                              ✓ قيمة موجبة
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-panel text-muted font-bold">
                              متعادل
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import {
  pct,
  crestInitials,
  groupByDayAndRound,
  formatMatchTime,
  formatKickoffAbsolute,
  hasKnownKickoffTime,
  DATA_TZ,
  DATA_TZ_LABEL,
  DISPLAY_TZ_LABEL,
  type DayRoundGroup,
  type RoundedFixture,
} from "@/lib/format";
import { getTeamColors } from "@/lib/team-colors";
import { Crest } from "@/components/Crest";
import type {
  ConfinedPlatformData,
  ParlayCandidateMatch,
  BankerPick,
  StrictlyExcludedMatch,
} from "@/lib/queries";
import { HasrHeader } from "./HasrHeader";
import { ChevronIcon } from "@/components/ChevronIcon";
import { Model2BreakdownLazy } from "@/components/Model2BreakdownLazy";

interface HasrTerminalViewProps {
  initialData: ConfinedPlatformData;
}

function matchCountAr(count: number): string {
  if (count === 1) return "مباراة واحدة";
  if (count === 2) return "مباراتان";
  if (count >= 3 && count <= 10) return `${count} مباريات`;
  return `${count} مباراة`;
}

function exclusionPillarLabel(pillar: StrictlyExcludedMatch["primaryExclusionPillar"]): string {
  switch (pillar) {
    case "draw_trap":
      return "فخ تعادل متكرر";
    case "second_half_fragility":
      return "تراجع الشوط الثاني";
    case "disciplinary_risk":
      return "مخاطر طرد وبطاقات";
    case "volatility":
      return "تذبذب نتائج حاد";
    case "other":
      return "عشوائية حرجة";
    default: {
      const never: never = pillar;
      return never;
    }
  }
}

function roundCountAr(count: number): string {
  if (count === 1) return "جولة واحدة";
  if (count === 2) return "جولتان";
  if (count >= 3 && count <= 10) return `${count} جولات`;
  return `${count} جولة`;
}

/** ساعة الانطلاق بمنطقتي العرض والبيانات — نفس عرف بقية الموقع */
function kickoffClock(iso: string) {
  return {
    known: hasKnownKickoffTime(iso),
    userTime: formatMatchTime(iso),
    dataTime: formatMatchTime(iso, DATA_TZ),
  };
}

function KickoffStamp({ iso }: { iso: string }) {
  const clock = kickoffClock(iso);
  if (!clock.known) {
    return <span className="text-[11px] text-muted">التوقيت غير مؤكد بعد</span>;
  }
  return (
    <time dateTime={iso} className="flex flex-wrap items-baseline gap-x-1.5">
      <span className="text-[12px] font-bold text-ink tabular">{clock.userTime}</span>
      <span className="text-[10px] text-muted">{DISPLAY_TZ_LABEL}</span>
      <span className="text-[11px] text-faint tabular">
        {clock.dataTime} {DATA_TZ_LABEL}
      </span>
    </time>
  );
}

/**
 * يوم الجولة كبطاقة قابلة للطي: الرأس يحمل اسم اليوم والجولة،
 * والضغط يفتح المباريات أو يطويها بارتفاع شبكي قابل للمقاطعة.
 */
function DayPanel<T extends RoundedFixture>({
  day,
  unit,
  open,
  onToggle,
  label,
  children,
}: {
  day: DayRoundGroup<T>;
  unit: string;
  open: boolean;
  onToggle: () => void;
  label: string;
  children: () => ReactNode;
}) {
  // محتوى اليوم يُبنى عند أول فتح ثم يبقى: الجدول كامل الموسم يزيد على ٥٠٠ مباراة،
  // وبناؤها كلها مقدماً يُثقل الصفحة بلا أن يراها أحد
  const everOpen = useRef(open);
  if (open) everOpen.current = true;

  const firstRound = day.rounds[0]!;
  const uniformRound =
    firstRound.matchday != null &&
    day.rounds.every((r) => r.matchday === firstRound.matchday)
      ? firstRound.matchday
      : null;

  const times = day.items.map((m) => m.utcDate).sort((a, b) => a.localeCompare(b));
  const first = kickoffClock(times[0]!);
  const last = kickoffClock(times[times.length - 1]!);
  const span =
    first.known && last.known && first.userTime !== last.userTime
      ? `${first.userTime} — ${last.userTime}`
      : first.known
        ? first.userTime
        : null;

  return (
    <section
      aria-label={label}
      className={`rounded border overflow-hidden transition-[border-color,box-shadow] duration-200 ${
        open
          ? "border-line-strong bg-surface shadow-xs"
          : "border-line bg-panel hover:border-line-strong"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`w-full px-4 py-3 text-start select-none cursor-pointer transition-colors ${
          open ? "bg-panel" : "hover:bg-panel/80"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-lg border bg-surface transition-[transform,color,border-color] duration-200 ${
                open
                  ? "rotate-90 border-accent/30 text-accent"
                  : "-rotate-90 border-line text-muted"
              }`}
              aria-hidden
            >
              <ChevronIcon size={14} />
            </span>
            <h3 className="text-sm font-bold text-ink text-pretty">{day.weekday}</h3>
            {uniformRound != null ? (
              <span className="px-2 py-0.5 rounded bg-accent-dim text-accent border border-accent/20 text-[11px] font-bold tabular">
                الجولة {uniformRound}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-surface text-muted border border-line text-[11px] font-semibold">
                {roundCountAr(day.rounds.length)}
              </span>
            )}
            <span className="text-xs text-muted">{day.dateLabel}</span>
            {day.relative ? (
              <span suppressHydrationWarning className="text-[11px] font-semibold text-accent">
                {day.relative}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2.5 text-[11px]">
            {span ? (
              <span className="text-muted tabular hidden sm:inline">
                {span} {DISPLAY_TZ_LABEL}
              </span>
            ) : null}
            <span className="px-2.5 py-1 rounded-full bg-surface border border-line font-semibold text-muted tabular">
              {matchCountAr(day.items.length)} {unit}
            </span>
            <span className="font-semibold text-muted min-w-9">
              {open ? "إخفاء" : "عرض"}
            </span>
          </div>
        </div>

        {uniformRound == null ? (
          <ul className="flex flex-wrap items-center gap-1.5 border-t border-line/60 mt-2.5 pt-2.5">
            {day.rounds.map((round) => (
              <li
                key={round.key}
                className="px-2 py-0.5 rounded bg-surface border border-line text-[11px]"
              >
                <span className="text-muted">{round.leagueName}</span>
                <span className="mx-1 text-faint" aria-hidden>
                  ·
                </span>
                <span className="font-bold text-accent tabular">{round.roundLabel}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </button>

      <div className={`accordion-wrapper ${open ? "is-open" : ""}`}>
        <div className="accordion-content">
          {everOpen.current ? (
            <div className="border-t border-line bg-surface p-3 sm:p-4">{children()}</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function HasrTerminalView({ initialData }: HasrTerminalViewProps) {
  // اللائحة تُحدَّث من نفس مصدر الصفحة كل نصف دقيقة، فلا تتجمّد الأرقام بين الجولات
  const [data, setData] = useState<ConfinedPlatformData>(initialData);
  const [activeTab, setActiveTab] = useState<"screener" | "parlay" | "radar" | "calibration">("screener");
  const [selectedLeague, setSelectedLeague] = useState<string>("all");
  const [strategyFilter, setStrategyFilter] = useState<"all" | "safety" | "value" | "balanced" | "traps">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  // الافتراضي تصاعدي بساعة الانطلاق — الجدول يُقرأ كجدول جولة لا كلائحة ترتيب
  const [sortBy, setSortBy] = useState<"date_asc" | "score_desc" | "prob_desc" | "edge_desc">("date_asc");
  /** أيام مفتوحة صراحة — اليوم الأول من كل لائحة مفتوح ما لم يُطوَ */
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});

  // Selected match for detailed inspection modal
  const [inspectingMatch, setInspectingMatch] = useState<BankerPick | null>(null);

  // Legal modal state (Anti-slop rules 29 & 30)
  const [legalModalOpen, setLegalModalOpen] = useState<"terms" | "privacy" | null>(null);

  // Parlay Lab selection state
  const [selectedMatch1, setSelectedMatch1] = useState<ParlayCandidateMatch | null>(
    data.parlayCandidates[0] || null
  );
  const [selectedMatch2, setSelectedMatch2] = useState<ParlayCandidateMatch | null>(
    data.parlayCandidates[1] || null
  );

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function refresh() {
      try {
        const res = await fetch("/api/v1/hasr", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) return;
        const fresh = (await res.json()) as ConfinedPlatformData & { status?: string };
        if (!mounted || fresh.status === "error" || !fresh.confinedMatches) return;
        setData(fresh);
      } catch {
        // انقطاع مؤقت — نبقي اللائحة الحالية حتى الدورة التالية
      }
    }

    const id = window.setInterval(refresh, 30_000);
    return () => {
      mounted = false;
      controller.abort();
      window.clearInterval(id);
    };
  }, []);

  // Filter and sort confined matches
  const filteredConfined = useMemo(() => {
    let list =
      strategyFilter === "safety"
        ? data.strategies.safety
        : strategyFilter === "value"
          ? data.strategies.value
          : strategyFilter === "balanced"
            ? data.strategies.balanced
            : strategyFilter === "traps"
              ? data.strategies.traps
              : data.confinedMatches;

    if (selectedLeague !== "all") {
      list = list.filter((m) => m.leagueId === selectedLeague);
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
  }, [data, selectedLeague, strategyFilter, searchQuery]);

  /** ترتيب المباريات داخل اليوم — ترتيب الأيام نفسها يبقى زمنياً تصاعدياً */
  const sortWithinDay = useMemo(() => {
    return (a: BankerPick, b: BankerPick) => {
      if (sortBy === "score_desc") {
        const ar = a.model2?.reliability ?? a.selectionScore ?? 0;
        const br = b.model2?.reliability ?? b.selectionScore ?? 0;
        if (br !== ar) return br - ar;
      } else if (sortBy === "prob_desc") {
        if (b.probability !== a.probability) return b.probability - a.probability;
      } else if (sortBy === "edge_desc") {
        const ae = a.edge ?? 0;
        const be = b.edge ?? 0;
        if (be !== ae) return be - ae;
      }
      return a.utcDate.localeCompare(b.utcDate);
    };
  }, [sortBy]);

  /** أيام الجولة الحالية تصاعدياً، ومباريات كل يوم بداخله */
  const confinedDays = useMemo(
    () => groupByDayAndRound(filteredConfined, new Date(), sortWithinDay),
    [filteredConfined, sortWithinDay]
  );

  /** ترتيب الموثوقية عبر اللائحة كاملة — يبقى صحيحاً بعد التجميع بالأيام */
  const reliabilityRank = useMemo(() => {
    const ranked = [...filteredConfined].sort(
      (a, b) =>
        (b.model2?.reliability ?? b.selectionScore ?? 0) -
        (a.model2?.reliability ?? a.selectionScore ?? 0)
    );
    return new Map(ranked.map((m, i) => [m.matchId, i + 1]));
  }, [filteredConfined]);

  // Filtered excluded matches, grouped by day then round
  const excludedDays = useMemo(() => {
    let list = data.excludedMatches;
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
    return groupByDayAndRound(
      list.map((m) => ({ ...m, leagueName: m.leagueNameAr })),
      new Date()
    );
  }, [data.excludedMatches, selectedLeague, searchQuery]);

  const excludedCount = useMemo(
    () => excludedDays.reduce((acc, d) => acc + d.items.length, 0),
    [excludedDays]
  );

  /** بانتظار النموذج — تتبع تصفية الدوري كي لا تخالف اللائحة المعروضة */
  const awaitingModel = useMemo(
    () =>
      selectedLeague === "all"
        ? data.awaitingModel
        : data.awaitingModel.filter((m) => m.leagueId === selectedLeague),
    [data.awaitingModel, selectedLeague]
  );

  const isDayOpen = (scope: string, key: string, index: number) =>
    openDays[`${scope}:${key}`] ?? index === 0;

  const toggleDay = (scope: string, key: string, index: number) => {
    const id = `${scope}:${key}`;
    setOpenDays((prev) => ({
      ...prev,
      [id]: !(prev[id] ?? index === 0),
    }));
  };

  /** أعداد أزرار الاستراتيجيات تتبع نفس تصفية الدوري والبحث كي لا تخالف اللائحة المعروضة */
  const strategyCounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const visible = (list: BankerPick[]) =>
      list.filter(
        (m) =>
          (selectedLeague === "all" || m.leagueId === selectedLeague) &&
          (!q ||
            m.homeTeam.toLowerCase().includes(q) ||
            m.awayTeam.toLowerCase().includes(q) ||
            m.leagueName.toLowerCase().includes(q))
      ).length;

    return {
      all: visible(data.confinedMatches),
      safety: visible(data.strategies.safety),
      value: visible(data.strategies.value),
      balanced: visible(data.strategies.balanced),
      traps: visible(data.strategies.traps),
    };
  }, [data, selectedLeague, searchQuery]);

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
    const existing = data.parlayCandidates.find((c) => c.matchId === item.matchId);
    const chosen: ParlayCandidateMatch = existing || {
      matchId: item.matchId,
      leagueId: item.leagueId,
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

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      {/* Header */}
      <HasrHeader
        summaryStats={data.summaryStats}
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
                    كافة المحصورة ({strategyCounts.all})
                  </button>
                  <button
                    onClick={() => setStrategyFilter("safety")}
                    className={`px-3 py-1.5 rounded font-medium border transition-colors ${
                      strategyFilter === "safety"
                        ? "bg-ink text-surface border-ink"
                        : "bg-panel text-muted hover:text-ink border-line"
                    }`}
                  >
                    الأعلى أماناً ({strategyCounts.safety})
                  </button>
                  <button
                    onClick={() => setStrategyFilter("value")}
                    className={`px-3 py-1.5 rounded font-medium border transition-colors ${
                      strategyFilter === "value"
                        ? "bg-ink text-surface border-ink"
                        : "bg-panel text-muted hover:text-ink border-line"
                    }`}
                  >
                    أعلى قيمة ({strategyCounts.value})
                  </button>
                  <button
                    onClick={() => setStrategyFilter("balanced")}
                    className={`px-3 py-1.5 rounded font-medium border transition-colors ${
                      strategyFilter === "balanced"
                        ? "bg-ink text-surface border-ink"
                        : "bg-panel text-muted hover:text-ink border-line"
                    }`}
                  >
                    المتوازنة ({strategyCounts.balanced})
                  </button>
                  <button
                    onClick={() => setStrategyFilter("traps")}
                    className={`px-3 py-1.5 rounded font-medium border transition-colors ${
                      strategyFilter === "traps"
                        ? "bg-ink text-surface border-ink"
                        : "bg-panel text-muted hover:text-ink border-line"
                    }`}
                  >
                    مصائد السوق ({strategyCounts.traps})
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
                    الترتيب داخل اليوم:
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
                    <option value="date_asc">ساعة الانطلاق تصاعدياً</option>
                    <option value="score_desc">الأعلى موثوقية (النموذج 2)</option>
                    <option value="prob_desc">أعلى نسبة احتمال فوز</option>
                    <option value="edge_desc">أعلى قيمة مضافة (+EV Edge)</option>
                  </select>
                </div>
                <p className="basis-full text-[11px] text-faint">
                  الأيام مرتبة زمنياً تصاعدياً دائماً — الجمعة ثم السبت ثم الأحد ثم الاثنين — مع
                  اسم الجولة أمام كل يوم، والترتيب أعلاه يطبّق داخل اليوم فقط. الساعات بتوقيت{" "}
                  {DISPLAY_TZ_LABEL} ويقابلها توقيت {DATA_TZ_LABEL}.
                </p>
              </div>
            </div>

            {/* مباريات مجدولة لم يمر عليها النموذج: تُذكر صراحة كي لا تغيب بلا أثر */}
            {awaitingModel.length > 0 ? (
              <div className="rounded border border-amber-500/25 bg-amber-500/5 px-4 py-3 space-y-2">
                <p className="text-xs font-bold text-ink">
                  {matchCountAr(awaitingModel.length)} بانتظار تشغيل النموذج — خارج المحصورة
                  والمستبعدة
                </p>
                <p className="text-[11px] text-muted leading-relaxed">
                  مجدولة بلا مؤشر عشوائية أو تحليلات النموذج، فلا تُمنح درجة أمان مفترضة. تدخل
                  اللائحة تلقائياً بعد أقرب تشغيلة تقييم.
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {awaitingModel.slice(0, 10).map((m) => (
                    <li
                      key={m.matchId}
                      className="px-2 py-0.5 rounded bg-surface border border-line text-[11px] text-muted"
                    >
                      {m.homeTeam} × {m.awayTeam}
                      {m.matchday != null ? (
                        <span className="mx-1 text-faint tabular">· الجولة {m.matchday}</span>
                      ) : null}
                    </li>
                  ))}
                  {awaitingModel.length > 10 ? (
                    <li className="px-2 py-0.5 text-[11px] text-faint tabular">
                      و{awaitingModel.length - 10} أخرى
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            {/* Content: Empty State or Day → Round Listing */}
            {confinedDays.length === 0 ? (
              <div className="p-12 text-center rounded border border-line bg-panel space-y-2">
                <p className="text-sm font-semibold text-ink">
                  لا توجد مباريات مطابقة للبحث أو التصفية
                </p>
                <p className="text-xs text-muted">
                  جرب تعديل كلمة البحث أو اختيار دوري واستراتيجية مختلفة
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {confinedDays.map((day, index) => (
                  <DayPanel
                    key={day.key}
                    day={day}
                    unit="محصورة"
                    open={isDayOpen("confined", day.key, index)}
                    onToggle={() => toggleDay("confined", day.key, index)}
                    label={`المباريات المحصورة ${day.weekday} ${day.dateLabel}`}
                  >
                    {() => viewMode === "cards" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {day.items.map((item) => (
                          <ConfinedMatchCard
                            key={item.matchId}
                            item={item}
                            rank={reliabilityRank.get(item.matchId) ?? null}
                            showRank={strategyFilter === "all"}
                            onInspect={setInspectingMatch}
                            onAddParlay={addMatchToParlay}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded border border-line bg-surface">
                        <table className="w-full text-xs text-right border-collapse">
                          <caption className="sr-only">
                            المباريات المحصورة — {day.weekday} {day.dateLabel}
                          </caption>
                          <thead>
                            <tr className="border-b border-line bg-panel/50 text-muted font-semibold">
                              <th className="p-3">ساعة الانطلاق</th>
                              <th className="p-3">المباراة والفرق</th>
                              <th className="p-3">الدوري والجولة</th>
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
                            {day.items.map((item) => (
                              <ConfinedMatchRow
                                key={item.matchId}
                                item={item}
                                onInspect={setInspectingMatch}
                                onAddParlay={addMatchToParlay}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </DayPanel>
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
                      const found = data.parlayCandidates.find((c) => c.matchId === e.target.value);
                      setSelectedMatch1(found || null);
                    }}
                    className="text-xs bg-panel border border-line rounded px-2.5 py-1 text-ink focus:outline-hidden focus:border-accent"
                  >
                    {data.parlayCandidates.map((c) => (
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
                      const found = data.parlayCandidates.find((c) => c.matchId === e.target.value);
                      setSelectedMatch2(found || null);
                    }}
                    className="text-xs bg-panel border border-line rounded px-2.5 py-1 text-ink focus:outline-hidden focus:border-accent"
                  >
                    {data.parlayCandidates.map((c) => (
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
                المباريات والفرق التي تم إسقاطها من الحصر والبارلي، موزعة على أيام الجولة نفسها
                تصاعدياً لتوضيح أسباب الحظر
              </p>
            </div>

            {excludedCount === 0 ? (
              <div className="p-12 text-center rounded border border-line bg-panel space-y-2">
                <p className="text-sm font-semibold text-ink">
                  لا توجد مباريات مستبعدة مطابقة للبحث أو التصفية
                </p>
                <p className="text-xs text-muted">جرب تعديل كلمة البحث أو اختيار دوري آخر</p>
              </div>
            ) : (
              <div className="space-y-3">
                {excludedDays.map((day, index) => (
                  <DayPanel
                    key={day.key}
                    day={day}
                    unit="مستبعدة"
                    open={isDayOpen("excluded", day.key, index)}
                    onToggle={() => toggleDay("excluded", day.key, index)}
                    label={`المباريات المستبعدة ${day.weekday} ${day.dateLabel}`}
                  >
                    {() => (
                    <div className="overflow-x-auto rounded border border-line bg-surface">
                      <table className="w-full text-xs text-right border-collapse">
                        <caption className="sr-only">
                          المباريات المستبعدة — {day.weekday} {day.dateLabel}
                        </caption>
                        <thead>
                          <tr className="border-b border-line bg-panel/50 text-muted font-semibold">
                            <th className="p-3">ساعة الانطلاق</th>
                            <th className="p-3">المباراة والفرق</th>
                            <th className="p-3">الدوري والجولة</th>
                            <th className="p-3 text-center">مؤشر العشوائية (MRI)</th>
                            <th className="p-3 text-center">مؤشر الأمان</th>
                            <th className="p-3 text-center">السبب المباشر</th>
                            <th className="p-3">التفصيل الإحصائي</th>
                            <th className="p-3 text-center">تفاصيل</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {day.items.map((match) => {
                            const homeCol = getTeamColors(match.homeTeam);
                            const awayCol = getTeamColors(match.awayTeam);

                            return (
                              <tr
                                key={match.matchId}
                                className="hover:bg-panel/30 transition-colors"
                              >
                                <td className="p-3 whitespace-nowrap">
                                  <KickoffStamp iso={match.utcDate} />
                                </td>
                                <td className="p-3 font-semibold text-ink">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="w-1 h-3.5 rounded-xs"
                                      style={{ backgroundColor: homeCol.hex }}
                                    />
                                    <span>{match.homeTeam}</span>
                                    <span className="text-muted font-normal text-[11px]">×</span>
                                    <span
                                      className="w-1 h-3.5 rounded-xs"
                                      style={{ backgroundColor: awayCol.hex }}
                                    />
                                    <span>{match.awayTeam}</span>
                                  </div>
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  <span className="text-muted">{match.leagueNameAr}</span>
                                  {match.matchday != null ? (
                                    <span className="block text-[11px] font-semibold text-accent tabular">
                                      الجولة {match.matchday}
                                    </span>
                                  ) : null}
                                </td>
                                <td className="p-3 text-center tabular font-bold text-rose-700 dark:text-rose-400">
                                  {match.matchRandomnessIndex} / 100
                                </td>
                                <td className="p-3 text-center tabular text-muted font-medium">
                                  {match.stabilityScore}%
                                </td>
                                <td className="p-3 text-center">
                                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                    {exclusionPillarLabel(match.primaryExclusionPillar)}
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
                    )}
                  </DayPanel>
                ))}
              </div>
            )}
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
                  {data.calibration.bins.map((bin) => {
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
                <time
                  dateTime={inspectingMatch.utcDate}
                  className="text-xs text-accent font-medium tabular"
                >
                  {formatKickoffAbsolute(inspectingMatch.utcDate)}
                </time>
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
              <Model2BreakdownLazy
                matchId={inspectingMatch.matchId}
                model2={inspectingMatch.model2}
                compact
              />
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

interface ConfinedMatchProps {
  item: BankerPick;
  onInspect: (item: BankerPick) => void;
  onAddParlay: (item: BankerPick) => void;
}

/** بطاقة مباراة محصورة — الدوري والجولة يحملهما رأس الجولة فلا يتكرران هنا */
function ConfinedMatchCard({
  item,
  rank,
  showRank,
  onInspect,
  onAddParlay,
}: ConfinedMatchProps & { rank: number | null; showRank: boolean }) {
  const homeCol = getTeamColors(item.homeTeam, item.homeTeamId);
  const awayCol = getTeamColors(item.awayTeam, item.awayTeamId);
  const isTop = showRank && rank != null && rank <= 8;

  return (
    <div
      className={`group rounded border transition-all relative overflow-hidden flex flex-col justify-between ${
        item.isTrap
          ? "bg-rose-500/5 border-rose-500/30"
          : isTop
            ? "bg-surface border-accent/40 hover:border-accent"
            : "bg-surface border-line hover:border-accent"
      }`}
    >
      {/* Top Bar: League + round, kickoff in both zones, reliability rank */}
      <div className="px-3.5 py-3 border-b border-line bg-panel/40 space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-ink truncate">{item.leagueName}</span>
            {item.matchday != null ? (
              <span className="shrink-0 text-[10px] font-bold text-accent px-1.5 py-0.5 rounded bg-surface border border-accent/20 tabular">
                الجولة {item.matchday}
              </span>
            ) : null}
          </div>
          {isTop ? (
            <span className="shrink-0 text-[10px] text-accent px-1.5 py-0.5 rounded bg-surface border border-accent/30 tabular">
              أقوى {rank}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
          <KickoffStamp iso={item.utcDate} />
        </div>
      </div>

      {/* Card Body: Interactive Click to inspect */}
      <div
        onClick={() => onInspect(item)}
        className="p-4 space-y-4 cursor-pointer"
        title="انقر لعرض تفاصيل المباراة الكاملة"
      >
        {/* Matchup with Team Colors */}
        <div className="space-y-2.5">
          {/* Home Team */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
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
                <span className="text-accent font-black">{pct(item.probability)}</span>
              ) : (
                "مضيف"
              )}
            </span>
          </div>

          {/* Away Team */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
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
                <span className="text-accent font-black">{pct(item.probability)}</span>
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
            <span className="text-sm font-black text-ink tabular">{pct(item.probability)}</span>
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
                (item.edge ?? 0) > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-muted"
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
          onClick={() => onInspect(item)}
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
            onClick={() => onAddParlay(item)}
            className="px-2.5 py-1 rounded bg-panel hover:bg-ink hover:text-surface text-ink text-[11px] font-semibold border border-line transition-colors"
          >
            + بارلي
          </button>
        </div>
      </div>
    </div>
  );
}

/** صف الجدول المكثف — يقع داخل tbody الجولة التي يحمل رأسها الدوري ورقم الجولة */
function ConfinedMatchRow({ item, onInspect, onAddParlay }: ConfinedMatchProps) {
  const homeCol = getTeamColors(item.homeTeam, item.homeTeamId);
  const awayCol = getTeamColors(item.awayTeam, item.awayTeamId);

  return (
    <tr
      className={`hover:bg-panel/40 transition-colors cursor-pointer ${
        item.isTrap ? "bg-rose-500/5" : ""
      }`}
      onClick={() => onInspect(item)}
    >
      <td className="p-3 whitespace-nowrap">
        <KickoffStamp iso={item.utcDate} />
      </td>

      <td className="p-3 font-semibold text-ink">
        <div className="flex items-center gap-2">
          <span className="w-1 h-3.5 rounded-xs" style={{ backgroundColor: homeCol.hex }} />
          <span>{item.homeTeam}</span>
          <span className="text-muted font-normal text-[11px]">×</span>
          <span className="w-1 h-3.5 rounded-xs" style={{ backgroundColor: awayCol.hex }} />
          <span>{item.awayTeam}</span>
        </div>
        {item.isTrap && (
          <span className="mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
            مصيدة قيمة
          </span>
        )}
      </td>

      <td className="p-3 whitespace-nowrap">
        <span className="text-muted">{item.leagueName}</span>
        {item.matchday != null ? (
          <span className="block text-[11px] font-semibold text-accent tabular">
            الجولة {item.matchday}
          </span>
        ) : null}
      </td>

      <td className="p-3 text-center">
        <span className="font-bold text-ink">{item.pickLabel}</span>
      </td>

      <td className="p-3 text-center tabular font-bold text-ink">{pct(item.probability)}</td>

      <td className="p-3 text-center tabular text-ink">
        {item.odds ? item.odds.toFixed(2) : "—"}
      </td>

      <td className="p-3 text-center tabular font-semibold">
        <span
          className={
            (item.edge ?? 0) > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-muted"
          }
        >
          {item.edge !== null && item.edge !== undefined
            ? `${item.edge > 0 ? "+" : ""}${Math.round(item.edge * 100)}%`
            : "—"}
        </span>
      </td>

      <td className="p-3 text-center tabular text-muted">{item.stabilityScore ?? 70}%</td>

      <td className="p-3 text-center tabular font-bold text-ink">{item.selectionScore}</td>

      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => onAddParlay(item)}
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
}

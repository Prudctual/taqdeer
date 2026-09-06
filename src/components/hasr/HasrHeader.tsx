"use client";

import Link from "next/link";

interface HasrHeaderProps {
  summaryStats: {
    totalEvaluated: number;
    totalConfined: number;
    totalExcluded: number;
    avgStability: number;
  };
  activeTab: "screener" | "parlay" | "calibration" | "radar";
  onTabChange: (tab: "screener" | "parlay" | "calibration" | "radar") => void;
  selectedLeague: string;
  onLeagueChange: (league: string) => void;
}

export function HasrHeader({
  summaryStats,
  activeTab,
  onTabChange,
  selectedLeague,
  onLeagueChange,
}: HasrHeaderProps) {
  const leagues = [
    { id: "all", label: "كافة الدوريات" },
    { id: "PL", label: "الدوري الإنجليزي" },
    { id: "PD", label: "الدوري الإسباني" },
    { id: "SA", label: "الدوري الإيطالي" },
    { id: "BL1", label: "الدوري الألماني" },
    { id: "FL1", label: "الدوري الفرنسي" },
    { id: "PPD", label: "الدوري البرتغالي" },
    { id: "DED", label: "الدوري الهولندي" },
    { id: "TUR1", label: "الدوري التركي" },
  ];

  return (
    <header className="border-b border-line bg-surface/90 sticky top-0 z-30">
      {/* Top Banner: Subdomain Indicator & Quick Switch */}
      <div className="border-b border-line/60 bg-panel px-4 py-2 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-accent/10 text-accent border border-accent/20">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              دومين فرعي مستقل · hasr.taqdeer
            </span>
            <span className="text-muted hidden md:inline">
              بوابة حصر وتصفية الفرق والنخب الإحصائية (Banker & Safe Picks)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted hidden sm:inline">
              مرتبط لحظياً بقاعدة بيانات المشروع المشترك
            </span>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink hover:text-accent transition-colors bg-surface px-2.5 py-1 rounded border border-line"
            >
              <span>الموقع الرسمي (تقدير العام)</span>
              <span aria-hidden>↗</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Terminal Bar */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded bg-ink text-surface flex items-center justify-center font-black text-sm">
                ح
              </div>
              <div>
                <h1 className="text-lg font-bold text-ink leading-tight">
                  تقدير · منصة الفرق المحصورة
                </h1>
                <p className="text-xs text-muted font-medium">
                  نظام حصر المباريات الصارم وإزالة العشوائية والتراكميات المزدوجة
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded bg-panel border border-line text-ink">
              <span className="text-muted text-[11px] block">المحصورة المقبولة</span>
              <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 tabular">
                {summaryStats.totalConfined} مباراة
              </span>
            </div>
            <div className="px-3 py-1.5 rounded bg-panel border border-line text-ink">
              <span className="text-muted text-[11px] block">المستبعدة للعشوائية</span>
              <span className="font-bold text-sm text-rose-600 dark:text-rose-400 tabular">
                {summaryStats.totalExcluded} فخ/خطر
              </span>
            </div>
            <div className="px-3 py-1.5 rounded bg-panel border border-line text-ink">
              <span className="text-muted text-[11px] block">متوسط الأمان</span>
              <span className="font-bold text-sm text-accent tabular">
                {summaryStats.avgStability}%
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs & League Filter */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => onTabChange("screener")}
              className={`px-3.5 py-1.5 rounded font-semibold transition-colors shrink-0 ${
                activeTab === "screener"
                  ? "bg-ink text-surface shadow-xs"
                  : "text-muted hover:text-ink hover:bg-panel"
              }`}
            >
              🎯 المباريات المحصورة (Screener)
            </button>
            <button
              onClick={() => onTabChange("parlay")}
              className={`px-3.5 py-1.5 rounded font-semibold transition-colors shrink-0 ${
                activeTab === "parlay"
                  ? "bg-ink text-surface shadow-xs"
                  : "text-muted hover:text-ink hover:bg-panel"
              }`}
            >
              ⚡ صانع البارلي المزدوج (Dual Lab)
            </button>
            <button
              onClick={() => onTabChange("calibration")}
              className={`px-3.5 py-1.5 rounded font-semibold transition-colors shrink-0 ${
                activeTab === "calibration"
                  ? "bg-ink text-surface shadow-xs"
                  : "text-muted hover:text-ink hover:bg-panel"
              }`}
            >
              📊 مصفوفة المعايرة (Calibration)
            </button>
            <button
              onClick={() => onTabChange("radar")}
              className={`px-3.5 py-1.5 rounded font-semibold transition-colors shrink-0 ${
                activeTab === "radar"
                  ? "bg-ink text-surface shadow-xs"
                  : "text-muted hover:text-ink hover:bg-panel"
              }`}
            >
              🚫 رادار الاستبعاد الصارم ({summaryStats.totalExcluded})
            </button>
          </nav>

          {/* League Dropdown Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="league-select" className="text-xs text-muted font-medium">
              الدوري:
            </label>
            <select
              id="league-select"
              value={selectedLeague}
              onChange={(e) => onLeagueChange(e.target.value)}
              className="text-xs bg-panel border border-line rounded px-2.5 py-1 text-ink focus:outline-hidden focus:ring-1 focus:ring-accent"
            >
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { useTheme } from "../ThemeContext";

interface HasrHeaderProps {
  summaryStats: {
    totalEvaluated: number;
    totalConfined: number;
    totalExcluded: number;
    avgStability: number;
  };
  activeTab: "screener" | "parlay" | "radar" | "calibration";
  onTabChange: (tab: "screener" | "parlay" | "radar" | "calibration") => void;
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
  const { mode, setMode } = useTheme();

  const leagues = [
    { id: "all", label: "كافة الدوريات" },
    { id: "PL", label: "الدوري الإنجليزي" },
    { id: "PD", label: "الدوري الإسباني" },
    { id: "SA", label: "الدوري الإيطالي" },
    { id: "BL1", label: "الدوري الألماني" },
    { id: "FL1", label: "الدوري الفرنسي" },
    { id: "PPD", label: "الدوري البرتغالي" },
    { id: "DED", label: "الدوري الهولندي" },
  ];

  return (
    <header className="border-b border-line bg-surface sticky top-0 z-30">
      {/* Top Utility Bar */}
      <div className="border-b border-line bg-panel/50 px-4 py-2 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Identity & Status */}
          <div className="flex items-center gap-3">
            <span className="font-semibold text-ink">
              تقدير : الفرق المحصورة
            </span>
            <span className="text-muted hidden sm:inline">
              بوابة عزل العشوائية والبارلي المزدوج المعتمد رياضياً
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMode(mode === "dark" ? "light" : "dark")}
              className="px-2.5 py-1 rounded text-[11px] font-medium text-muted hover:text-ink bg-surface border border-line transition-colors"
              aria-label="تبديل المظهر"
            >
              {mode === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink hover:text-accent bg-surface px-2.5 py-1 rounded border border-line transition-colors"
            >
              <span>الموقع الرئيسي</span>
              <span aria-hidden>↗</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Bar: Stats & Navigation */}
      <div className="max-w-7xl mx-auto px-4 pt-3 pb-0 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3">
          <div>
            <h1 className="text-base font-bold text-ink tracking-tight">
              محرك الحصر الإحصائي
            </h1>
            <p className="text-xs text-muted mt-0.5">
              تصفية المباريات لاستخراج النخب ذات الاحتمال المرتفع وفارق الفصل الحقيقي
            </p>
          </div>

          {/* Summary Metric Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded bg-panel border border-line">
              <span className="text-muted text-[11px] block">المحصورة المقبولة</span>
              <span className="font-bold text-ink tabular text-xs">
                {summaryStats.totalConfined} مباراة
              </span>
            </div>
            <div className="px-3 py-1.5 rounded bg-panel border border-line">
              <span className="text-muted text-[11px] block">المستبعدة للعشوائية</span>
              <span className="font-bold text-ink tabular text-xs">
                {summaryStats.totalExcluded} مواجهة
              </span>
            </div>
            <div className="px-3 py-1.5 rounded bg-panel border border-line">
              <span className="text-muted text-[11px] block">متوسط مؤشر الأمان</span>
              <span className="font-bold text-ink tabular text-xs">
                {summaryStats.avgStability}%
              </span>
            </div>
          </div>
        </div>

        {/* Clean Vercel-style Tab Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line">
          <nav className="flex items-center gap-1 overflow-x-auto text-xs" aria-label="أقسام المنصة">
            <button
              onClick={() => onTabChange("screener")}
              className={`py-2.5 px-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "screener"
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              المباريات المحصورة ({summaryStats.totalConfined})
            </button>
            <button
              onClick={() => onTabChange("parlay")}
              className={`py-2.5 px-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "parlay"
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              حاسبة البارلي المزدوج
            </button>
            <button
              onClick={() => onTabChange("radar")}
              className={`py-2.5 px-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "radar"
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              رادار المستبعدات والفخاخ ({summaryStats.totalExcluded})
            </button>
            <button
              onClick={() => onTabChange("calibration")}
              className={`py-2.5 px-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "calibration"
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              المعايرة الإحصائية
            </button>
          </nav>

          {/* League Dropdown Filter */}
          <div className="flex items-center gap-2 py-2 shrink-0">
            <label htmlFor="league-select" className="text-xs text-muted">
              الدوري:
            </label>
            <select
              id="league-select"
              value={selectedLeague}
              onChange={(e) => onLeagueChange(e.target.value)}
              className="text-xs bg-panel border border-line rounded px-2.5 py-1 text-ink focus:outline-hidden focus:border-accent"
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

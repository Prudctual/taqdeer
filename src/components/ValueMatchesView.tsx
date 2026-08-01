"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatShortDate } from "@/lib/format";

export interface ValueMatchItem {
  id: string;
  league_id: string;
  league_name_ar: string;
  home_name_ar: string;
  away_name_ar: string;
  utc_date: string;
  p_home: number;
  p_draw: number;
  p_away: number;
  odds_home: number | null;
  odds_draw: number | null;
  odds_away: number | null;
  analytics_json: string | null;
}

const LEAGUES_CONFIG = [
  { id: "ALL", name: "جميع الدوريات", icon: "🌐" },
  { id: "pl", name: "الدوري الإنجليزي", icon: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "pd", name: "الدوري الإسباني", icon: "🇪🇸" },
  { id: "bl1", name: "الدوري الألماني", icon: "🇩🇪" },
  { id: "sa", name: "الدوري الإيطالي", icon: "🇮🇹" },
  { id: "fl1", name: "الدوري الفرنسي", icon: "🇫🇷" },
  { id: "no1", name: "الدوري النرويجي", icon: "🇳🇴" },
];

export function ValueMatchesView({ matches }: { matches: ValueMatchItem[] }) {
  const [selectedLeague, setSelectedLeague] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Compute metric summaries
  const evValues = useMemo(() => {
    return matches.map((m) => {
      try {
        const a = m.analytics_json ? JSON.parse(m.analytics_json) : null;
        return a?.value?.ev || 0;
      } catch {
        return 0;
      }
    });
  }, [matches]);

  const maxEv = evValues.length > 0 ? Math.max(...evValues) : 0;
  const avgEv = evValues.length > 0 ? evValues.reduce((a, b) => a + b, 0) / evValues.length : 0;

  // League match count map
  const leagueCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: matches.length };
    matches.forEach((m) => {
      counts[m.league_id] = (counts[m.league_id] || 0) + 1;
    });
    return counts;
  }, [matches]);

  // Filtered matches list
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      const matchLeague = selectedLeague === "ALL" || m.league_id === selectedLeague;
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        m.home_name_ar.toLowerCase().includes(query) ||
        m.away_name_ar.toLowerCase().includes(query) ||
        m.league_name_ar.toLowerCase().includes(query);

      return matchLeague && matchSearch;
    });
  }, [matches, selectedLeague, searchQuery]);

  return (
    <div className="space-y-4">
      {matches.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center space-y-2">
          <h2 className="text-sm font-black text-ink">لا توجد فرص قيمة حالياً</h2>
          <p className="text-xs text-muted max-w-lg mx-auto leading-relaxed">
            عند ظهور انحراف إيجابي بين احتمال النموذج وأسعار السوق ستظهر الفرص هنا تلقائياً.
          </p>
        </div>
      ) : null}

      {/* 1. Hero Header & Overview Metrics */}
      <div className="rounded-2xl border border-success/30 bg-panel p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-success-dim border border-success/25 text-success font-black text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            تحليل فرص القيمة والسيولة (+EV)
          </span>

          <span className="text-[11px] font-bold text-muted bg-surface px-3 py-0.5 rounded-full border border-line">
            حاسبة كيلي الربع (Quarter Kelly 25%)
          </span>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl sm:text-3xl font-black text-ink tracking-tight leading-tight">
            المباريات ذات القيمة (+EV Value Bets)
          </h1>
          <p className="text-xs font-semibold text-muted leading-relaxed max-w-3xl">
            يستعرض هذا القسم جميع المباريات المجدولة التي يُظهر فيها نموذج التحليل انحرافاً إيجابياً ومزايا رياضية (+EV ≥ 3%) مقارنة بأسعار إغلاق سوق المراهنين، مع حساب حصة رهان كيلي الربع الموصى بها.
          </p>
        </div>

        {/* Overview Stat Cards */}
        {matches.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2.5 border-t border-line">
            <div className="rounded-xl border border-line bg-surface p-2.5 space-y-0.5">
              <span className="text-[10px] font-bold text-muted block">عدد الفرص المتاحة</span>
              <span className="text-xl font-black text-success font-mono tabular">{matches.length}</span>
            </div>
            <div className="rounded-xl border border-line bg-surface p-2.5 space-y-0.5">
              <span className="text-[10px] font-bold text-muted block">أعلى عائد (+EV)</span>
              <span className="text-xl font-black text-home font-mono tabular">+{(maxEv * 100).toFixed(1)}%</span>
            </div>
            <div className="rounded-xl border border-line bg-surface p-2.5 space-y-0.5">
              <span className="text-[10px] font-bold text-muted block">متوسط الفائدة</span>
              <span className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono tabular">+{(avgEv * 100).toFixed(1)}%</span>
            </div>
            <div className="rounded-xl border border-line bg-surface p-2.5 space-y-0.5">
              <span className="text-[10px] font-bold text-muted block">مخاطرة المحفظة</span>
              <span className="text-xs font-black text-ink block pt-1">تحفّظ منضبط</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. League Tabs Navigation Bar */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 px-1">
          <h2 className="text-xs sm:text-sm font-black text-ink flex items-center gap-1.5">
            <span>🏆</span>
            <span>تصنيف القيمة حسب الدوري</span>
          </h2>
          <span className="text-[11px] font-bold text-muted">
            عرض ({filteredMatches.length}) مواجهة
          </span>
        </div>

        {/* Compact League Tabs Pills Bar */}
        <div className="w-full max-w-full overflow-x-auto scrollbar-none rounded-xl bg-panel p-1.5 border border-line" dir="rtl">
          <div className="flex items-center gap-1.5 min-w-max">
            {LEAGUES_CONFIG.map((league) => {
              const count = leagueCounts[league.id] || 0;
              const isActive = selectedLeague === league.id;

              return (
                <button
                  key={league.id}
                  type="button"
                  onClick={() => setSelectedLeague(league.id)}
                  className={`shrink-0 press-scale flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-surface text-ink border border-success/60 shadow-2xs font-black ring-1 ring-success/30"
                      : "text-muted hover:text-ink hover:bg-surface/50 border border-transparent"
                  }`}
                >
                  <span className="text-xs shrink-0">{league.icon}</span>
                  <span className="shrink-0">{league.name}</span>
                  <span
                    className={`shrink-0 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black ${
                      isActive
                        ? "bg-success text-on-fill"
                        : "bg-surface border border-line text-muted"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 ابحث باسم الفريق في فرص القيمة..."
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink placeholder:text-muted focus:border-success focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted hover:text-ink"
            >
              ✕ إلغاء
            </button>
          )}
        </div>
      </div>

      {/* 3. Match Value Cards List */}
      {filteredMatches.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center space-y-2 shadow-2xs">
          <span className="text-2xl block">🔍</span>
          <h3 className="text-xs font-black text-ink">لا توجد مواجهات مطابقة للفلتر المحدد</h3>
          <p className="text-[11px] text-muted max-w-md mx-auto">
            جرّب اختيار تبويب دوري آخر أو إعادة ضبط نص البحث لاستعراض كافة فرص القيمة.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedLeague("ALL");
              setSearchQuery("");
            }}
            className="press-scale inline-block px-3.5 py-1.5 rounded-xl bg-accent text-on-fill font-bold text-xs shadow-xs"
          >
            عرض كافة فرص القيمة ({matches.length})
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredMatches.map((m) => {
            const analytics = m.analytics_json ? JSON.parse(m.analytics_json) : null;
            const val = analytics?.value;
            const sideLabel =
              val?.side === "home"
                ? `فوز ${m.home_name_ar}`
                : val?.side === "away"
                ? `فوز ${m.away_name_ar}`
                : "التعادل";

            const sideTextColor =
              val?.side === "home"
                ? "text-home"
                : val?.side === "away"
                ? "text-danger"
                : "text-amber-600 dark:text-amber-400";

            return (
              <div
                key={m.id}
                className="rounded-xl border border-success/30 bg-surface p-3.5 sm:p-4 space-y-3 shadow-2xs hover:border-success/60 transition-all"
              >
                {/* Card Top Pill & Date */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-success-dim text-success font-black text-[11px]">
                      {m.league_name_ar}
                    </span>
                    <span className="text-[11px] font-bold text-muted">
                      {formatShortDate(m.utc_date)}
                    </span>
                  </div>

                  <Link
                    href={`/match/${encodeURIComponent(m.id)}`}
                    className="press-scale inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-panel border border-line hover:border-success text-ink hover:text-success dark:hover:text-success font-black text-xs no-underline transition-all shadow-2xs"
                  >
                    <span>تحليل المباراة</span>
                    <span>←</span>
                  </Link>
                </div>

                {/* Match Content Layout */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Teams & Probabilities */}
                  <div className="space-y-1">
                    <h3 className="text-sm sm:text-base font-black text-ink tracking-tight">
                      {m.home_name_ar} <span className="text-muted font-normal me-1 ms-1">ضد</span> {m.away_name_ar}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
                      <span>احتمال النموذج:</span>
                      <span className="font-bold text-ink">{(m.p_home * 100).toFixed(0)}% للمضيف</span>
                      <span>·</span>
                      <span className="font-bold text-ink">{(m.p_draw * 100).toFixed(0)}% تعادل</span>
                      <span>·</span>
                      <span className="font-bold text-ink">{(m.p_away * 100).toFixed(0)}% للضيف</span>
                    </div>
                  </div>

                  {/* Value Key Metrics Grid */}
                  {val && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs shrink-0">
                      <div className="rounded-lg border border-line bg-panel p-2 text-center space-y-0.5 shadow-2xs min-w-[5rem]">
                        <span className="text-[9px] font-bold text-muted block">الجانب المرشح</span>
                        <div className={`font-black truncate text-xs ${sideTextColor}`}>{sideLabel}</div>
                      </div>

                      <div className="rounded-lg border border-line bg-panel p-2 text-center space-y-0.5 shadow-2xs min-w-[4.5rem]">
                        <span className="text-[9px] font-bold text-muted block">السعر المتاح</span>
                        <div className="font-mono font-black text-ink text-xs tabular">{val.odds}</div>
                      </div>

                      <div className="rounded-lg border border-success/30 bg-success-dim p-2 text-center space-y-0.5 shadow-2xs min-w-[5rem]">
                        <span className="text-[9px] font-bold text-success block">الفائدة (+EV)</span>
                        <div className="font-mono font-black text-success text-xs tabular">+{(val.ev * 100).toFixed(1)}%</div>
                      </div>

                      <div className="rounded-lg border border-line bg-panel p-2 text-center space-y-0.5 shadow-2xs min-w-[4.5rem]">
                        <span className="text-[9px] font-bold text-muted block">رهان كيلي الربع</span>
                        <div className="font-mono font-black text-ink text-xs tabular">{(val.stake * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

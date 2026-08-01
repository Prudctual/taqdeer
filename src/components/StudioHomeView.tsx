"use client";

import { useState } from "react";
import Link from "next/link";
import { MatchList } from "@/components/MatchList";
import { HeroMatchBanner } from "@/components/HeroMatchBanner";
import { BankerPicksWidget, type BankerPick } from "@/components/BankerPicksWidget";
import { LeagueTableWidget, type StandingTeam } from "@/components/LeagueTableWidget";
import { NextKickoff } from "@/components/NextKickoff";
import type { MatchCard } from "@/lib/queries";

interface LeagueItem {
  id: string;
  name_ar: string;
  code: string;
  country_ar: string;
  crest_url: string | null;
}

interface MatchGroup {
  matches?: MatchCard[];
  items?: MatchCard[];
}

interface StudioHomeViewProps {
  matchCount: number;
  upcomingCount: number;
  lastFit: string | null;
  leagues: LeagueItem[];
  tableMatches: unknown[];
  groups: MatchGroup[];
  recentGroups?: MatchGroup[];
  nextMatch?: MatchCard;
  standingsByLeague?: Record<string, StandingTeam[]>;
  bankerPicks?: BankerPick[];
}

export function StudioHomeView({
  upcomingCount,
  leagues = [],
  groups = [],
  nextMatch,
  standingsByLeague = {},
  bankerPicks = [],
}: StudioHomeViewProps) {
  const [activeTab, setActiveTab] = useState<
    "matches" | "value" | "bankers" | "standings"
  >("matches");

  const upcomingMatchesList: MatchCard[] = groups
    ? groups.flatMap((g) => g.matches || g.items || [])
    : [];

  const heroMatch = nextMatch || upcomingMatchesList[0];

  return (
    <div className="space-y-6">
      {/* 1. Next Kickoff Bar */}
      {heroMatch && (
        <section aria-label="أول مباراة قادمة">
          <NextKickoff m={heroMatch} />
        </section>
      )}

      {/* 2. Hero Match Showcase */}
      {heroMatch && (
        <section aria-label="مواجهة البث الرئيسية" className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-ink uppercase tracking-wide flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              مباراة القمة القادمة
            </span>
            <span className="text-[11px] font-bold text-muted tabular">مواجهة قادمة</span>
          </div>
          <HeroMatchBanner match={heroMatch} />
        </section>
      )}

      {/* 3. Main Dashboard Tabs Navigation */}
      <div className="space-y-6 pt-2">
        {/* Tabs Bar - Clean analysis table theme matching DESIGN.md */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none rounded-2xl bg-panel p-1.5 border border-line">
          {/* Tab 1: Matches */}
          <button
            type="button"
            onClick={() => setActiveTab("matches")}
            className={`press-scale flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "matches"
                ? "bg-surface text-ink border border-accent/40 shadow-xs"
                : "text-muted hover:text-ink hover:bg-surface/50 border border-transparent"
            }`}
          >
            <svg className="h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>مواعيد ومباريات الجولة ({upcomingCount || upcomingMatchesList.length})</span>
          </button>

          {/* Tab 2: Value (+EV) */}
          <button
            type="button"
            onClick={() => setActiveTab("value")}
            className={`press-scale flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "value"
                ? "bg-surface text-ink border border-accent/40 shadow-xs"
                : "text-muted hover:text-ink hover:bg-surface/50 border border-transparent"
            }`}
          >
            <svg className="h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>فرص القيمة المحتملة (+EV)</span>
          </button>

          {/* Tab 3: Banker Picks */}
          <button
            type="button"
            onClick={() => setActiveTab("bankers")}
            className={`press-scale flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "bankers"
                ? "bg-surface text-ink border border-accent/40 shadow-xs"
                : "text-muted hover:text-ink hover:bg-surface/50 border border-transparent"
            }`}
          >
            <svg className="h-4 w-4 shrink-0 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>أأمن التوقعات (Banker Picks)</span>
          </button>

          {/* Tab 4: Standings */}
          <button
            type="button"
            onClick={() => setActiveTab("standings")}
            className={`press-scale flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "standings"
                ? "bg-surface text-ink border border-accent/40 shadow-xs"
                : "text-muted hover:text-ink hover:bg-surface/50 border border-transparent"
            }`}
          >
            <svg className="h-4 w-4 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span>جدول الترتيب المباشر</span>
          </button>
        </div>

        {/* Tab 1: Matches Feed */}
        {activeTab === "matches" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Upcoming Matches Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-panel p-3 rounded-2xl border border-line">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs font-black text-ink">
                  مواعيد ومباريات الجولة القادمة المباشرة
                </h3>
              </div>

              <span className="px-3 py-1 rounded-xl bg-surface border border-line text-xs font-black text-emerald-600 dark:text-emerald-400">
                🟢 {upcomingMatchesList.length} مواجهة قادمة
              </span>
            </div>

            {upcomingMatchesList.length > 0 ? (
              <div className="rounded-2xl border border-line bg-surface p-4 sm:p-6 shadow-2xs">
                <MatchList matches={upcomingMatchesList} groupDays showLeague />
              </div>
            ) : (
              <div className="rounded-2xl border border-line bg-surface p-8 text-center space-y-2 shadow-2xs">
                <h3 className="text-sm font-black text-ink">لا توجد مباريات مجدولة حالياً</h3>
                <p className="text-xs text-muted">ترتفع الجولة القادمة أوتوماتيكياً بمجرد إدراج المباريات الجديدة.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Value Bets (+EV) */}
        {activeTab === "value" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="bg-emerald-600 text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-xs">
                  فرص قيمة (+EV ≥ 3%)
                </span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">حاسبة كيلي الحسابية</span>
              </div>
              <h3 className="text-base font-black text-ink">المباريات ذات القيمة التهديفية والاستثمارية المحتملة</h3>
              <p className="text-xs font-semibold text-muted leading-relaxed max-w-2xl">
                يستعرض هذا القسم المباريات القادمة التي يُظهر فيها نموذج التحليل انحرافاً إيجابياً ومزايا رياضية عن أسعار المراهنين.
              </p>
              <Link href="/value" className="inline-block no-underline">
                <div className="press-scale inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-black shadow-xs transition-colors">
                  <span>تصفح صفحة مباريات القيمة الكاملة</span>
                  <span>←</span>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Tab 3: Banker Picks */}
        {activeTab === "bankers" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <BankerPicksWidget picks={bankerPicks} title="أأمن 4 توقعات للجولة الحالية" />
          </div>
        )}

        {/* Tab 4: Standings */}
        {activeTab === "standings" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <LeagueTableWidget leagues={leagues} standingsByLeague={standingsByLeague} />
          </div>
        )}
      </div>
    </div>
  );
}

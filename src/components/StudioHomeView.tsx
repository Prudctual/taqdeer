"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { MatchList } from "@/components/MatchList";
import { HeroMatchBanner } from "@/components/HeroMatchBanner";
import { LiveInteractiveScores } from "@/components/LiveInteractiveScores";
import { BankerPicksWidget, type BankerPick } from "@/components/BankerPicksWidget";
import { LeagueTableWidget, type StandingTeam } from "@/components/LeagueTableWidget";
import { ShadcnDataTable, type MatchTableRow } from "@/components/ShadcnDataTable";
import { useLiveScores } from "@/lib/hooks/useLiveScores";
import { resolveMatchPhase } from "@/lib/match-status";
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
  tableMatches?: MatchTableRow[];
  groups: MatchGroup[];
  recentGroups?: MatchGroup[];
  nextMatch?: MatchCard | null;
  standingsByLeague?: Record<string, StandingTeam[]>;
  bankerPicks?: BankerPick[];
}

export function StudioHomeView({
  upcomingCount,
  leagues = [],
  tableMatches = [],
  groups = [],
  nextMatch,
  standingsByLeague = {},
  bankerPicks = [],
}: StudioHomeViewProps) {
  const [activeTab, setActiveTab] = useState<
    "matches" | "value" | "bankers" | "standings"
  >("matches");
  const [matchesViewMode, setMatchesViewMode] = useState<"cards" | "table">("cards");

  const { liveMatches, isLiveActive } = useLiveScores(3000);

  const initialMatchesList: MatchCard[] = groups
    ? groups.flatMap((g) => g.matches || g.items || [])
    : [];

  const upcomingMatchesList = initialMatchesList
    .map((m) => {
      const liveUpdate = liveMatches.find((lm) => lm.id === m.id);
      return liveUpdate ? { ...m, ...liveUpdate } : m;
    })
    .filter((m) => {
      const phase = resolveMatchPhase({
        status: m.status,
        utcDate: m.utcDate,
        homeGoals: m.homeGoals,
        awayGoals: m.awayGoals,
        minute: m.minute,
        liveStatusAr: m.liveStatusAr,
      });
      return phase !== "finished" && phase !== "cancelled" && phase !== "postponed";
    });

  upcomingMatchesList.sort((a, b) => a.utcDate.localeCompare(b.utcDate));

  const liveTableMatches = useMemo(() => {
    return (tableMatches || []).map((m) => {
      const liveUpdate = liveMatches.find((lm) => lm.id === m.id);
      if (!liveUpdate) return m;
      const phase = resolveMatchPhase({
        status: liveUpdate.status,
        utcDate: liveUpdate.utcDate,
        homeGoals: liveUpdate.homeGoals,
        awayGoals: liveUpdate.awayGoals,
        minute: liveUpdate.minute,
        liveStatusAr: liveUpdate.liveStatusAr,
      });
      return {
        ...m,
        homeScore: liveUpdate.homeGoals ?? m.homeScore,
        awayScore: liveUpdate.awayGoals ?? m.awayScore,
        status: (phase === "live" ? "IN_PLAY" : phase === "finished" ? "FINISHED" : m.status) as MatchTableRow["status"],
      };
    });
  }, [tableMatches, liveMatches]);

  const heroMatch =
    (nextMatch &&
      resolveMatchPhase({
        status: nextMatch.status,
        utcDate: nextMatch.utcDate,
        homeGoals: nextMatch.homeGoals,
        awayGoals: nextMatch.awayGoals,
        minute: nextMatch.minute,
        liveStatusAr: nextMatch.liveStatusAr,
      }) !== "finished"
      ? nextMatch
      : null) ||
    upcomingMatchesList[0] ||
    null;
  const showKickoffHero = Boolean(heroMatch) && !isLiveActive;

  const tabClass = (active: boolean) =>
    `press-scale flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold motion-colors whitespace-nowrap ${
      active
        ? "bg-surface text-ink border border-line"
        : "text-muted hover:text-ink hover:bg-surface/50 border border-transparent"
    }`;

  return (
    <div className="space-y-6">
      <LiveInteractiveScores />

      {showKickoffHero && heroMatch ? (
        <section aria-label="المباراة القادمة">
          <HeroMatchBanner match={heroMatch} />
        </section>
      ) : null}

      <div className="space-y-6">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none rounded-xl bg-panel p-1.5 border border-line">
          <button
            type="button"
            onClick={() => setActiveTab("matches")}
            className={tabClass(activeTab === "matches")}
          >
            المباريات ({upcomingCount || upcomingMatchesList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("value")}
            className={tabClass(activeTab === "value")}
          >
            فرص القيمة (+EV)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bankers")}
            className={tabClass(activeTab === "bankers")}
          >
            أأمن التوقعات
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("standings")}
            className={tabClass(activeTab === "standings")}
          >
            الترتيب
          </button>
        </div>

        {activeTab === "matches" && (
          <div className="space-y-4">
            {isLiveActive && liveMatches.length > 0 && (
              <div className="space-y-3 rounded-xl border border-live/30 bg-live-dim p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="type-section text-ink flex items-center gap-2">
                    <span className="live-badge-dot live-pulse-dot" aria-hidden />
                    مباشر الآن ({liveMatches.length})
                  </h3>
                  <span className="live-badge">حي</span>
                </div>
                <div className="rounded-lg border border-line bg-surface overflow-hidden">
                  <MatchList matches={liveMatches} groupDays={false} showLeague />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              <div className="flex items-center gap-3">
                <h3 className="type-section text-ink">المباريات القادمة</h3>
                <span className="text-xs font-medium text-muted tabular">
                  {upcomingMatchesList.length} مواجهة
                </span>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-panel p-1 border border-line">
                <button
                  type="button"
                  onClick={() => setMatchesViewMode("cards")}
                  className={`press-scale flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    matchesViewMode === "cards"
                      ? "bg-surface text-ink shadow-xs border border-line"
                      : "text-muted hover:text-ink"
                  }`}
                  aria-label="عرض البطاقات"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
                  <span>بطاقات</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMatchesViewMode("table")}
                  className={`press-scale flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    matchesViewMode === "table"
                      ? "bg-surface text-ink shadow-xs border border-line"
                      : "text-muted hover:text-ink"
                  }`}
                  aria-label="عرض جدول النموذج"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
                  <span>جدول النموذج</span>
                </button>
              </div>
            </div>

            {matchesViewMode === "table" ? (
              <div className="space-y-3">
                <ShadcnDataTable matches={liveTableMatches} />
              </div>
            ) : upcomingMatchesList.length > 0 ? (
              <div className="card overflow-hidden">
                <MatchList matches={upcomingMatchesList} groupDays showLeague />
              </div>
            ) : (
              <div className="card">
                <div className="px-5 py-12 text-center">
                  <p className="type-section text-ink">لا توجد مباريات مجدولة حالياً</p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                    ترتفع الجولة القادمة تلقائياً عند إدراج المباريات الجديدة.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "value" && (
          <div className="card p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="type-section text-ink">فرص القيمة (+EV ≥ 3%)</h3>
              <span className="text-xs font-medium text-muted">حاسبة كيلي</span>
            </div>
            <p className="text-sm text-muted leading-relaxed max-w-2xl">
              مباريات يظهر فيها النموذج انحرافاً إيجابياً عن أسعار السوق. الاحتمال ليس يقيناً؛ راجع الثقة والمعايرة قبل أي قرار.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/value"
                className="press-scale inline-flex items-center gap-2 rounded-lg bg-accent text-on-fill px-4 py-2 text-xs font-semibold no-underline hover:opacity-90"
              >
                تصفح صفحة القيمة
              </Link>
              <Link
                href="/double-chance"
                className="press-scale inline-flex items-center gap-2 rounded-lg border border-line bg-surface text-ink px-4 py-2 text-xs font-semibold no-underline hover:border-accent"
              >
                الفرصة المزدوجة
              </Link>
            </div>
          </div>
        )}

        {activeTab === "bankers" && (
          <BankerPicksWidget
            picks={bankerPicks}
            title="أأمن 4 توقعات للجولة الحالية"
          />
        )}

        {activeTab === "standings" && (
          <LeagueTableWidget
            leagues={leagues}
            standingsByLeague={standingsByLeague}
          />
        )}
      </div>
    </div>
  );
}

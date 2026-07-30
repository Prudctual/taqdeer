"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MatchList } from "@/components/MatchList";
import { InteractiveMatchFilter, type FilterSortOption } from "@/components/InteractiveMatchFilter";
import { LiveCountdownTimer } from "@/components/LiveCountdownTimer";
import { ClockIcon } from "@/components/Icons";
import type { MatchCard } from "@/lib/queries";

interface Group {
  leagueId: string;
  leagueNameAr: string;
  matches: MatchCard[];
}

interface DynamicMatchSectionProps {
  groups: Group[];
  totalUpcomingCount?: number;
}

function formatMatchCount(count: number): string {
  if (count === 1) return "مباراة واحدة";
  if (count === 2) return "مباراتان";
  if (count >= 3 && count <= 10) return `${count} مباريات`;
  return `${count} مباراة`;
}

export function DynamicMatchSection({ groups }: DynamicMatchSectionProps) {
  const [filterSort, setFilterSort] = useState<FilterSortOption>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const topUpcomingMatch = groups[0]?.matches[0];

  const processedGroups = useMemo(() => {
    return groups
      .map((group) => {
        let matches = [...group.matches];

        // Filter by team search query if provided
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          matches = matches.filter(
            (m) =>
              m.homeNameAr.toLowerCase().includes(q) ||
              m.awayNameAr.toLowerCase().includes(q) ||
              m.homeNameEn?.toLowerCase().includes(q) ||
              m.awayNameEn?.toLowerCase().includes(q)
          );
        }

        // Sort matches based on selected option
        if (filterSort === "confidence") {
          matches.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
        } else if (filterSort === "sharp") {
          matches.sort((a, b) => (b.sharpSteamSide ? 1 : 0) - (a.sharpSteamSide ? 1 : 0));
        } else if (filterSort === "elo") {
          matches.sort((a, b) => ((b.eloHome ?? 1500) + (b.eloAway ?? 1500)) - ((a.eloHome ?? 1500) + (a.eloAway ?? 1500)));
        }

        return { ...group, matches };
      })
      .filter((g) => g.matches.length > 0);
  }, [groups, filterSort, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Fast Ticker / Nearest Match */}
      {topUpcomingMatch ? (
        <div className="bg-white p-4 sm:p-5 rounded-3xl border-0 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-black text-slate-900 flex items-center gap-2">
              <ClockIcon size={16} className="text-rose-600" />
              <span>أقرب مواجهة انطلاقاً:</span>
            </span>
            <Link
              href={`/match/${topUpcomingMatch.id}`}
              className="text-xs sm:text-sm font-black text-rose-600 hover:text-rose-700 bg-rose-50 px-3.5 py-1 rounded-full border border-rose-200/60 no-underline transition-colors"
            >
              {topUpcomingMatch.homeNameAr} ضد {topUpcomingMatch.awayNameAr}
            </Link>
          </div>
          <LiveCountdownTimer targetDate={topUpcomingMatch.utcDate} />
        </div>
      ) : null}

      {/* Filter and Search Bar */}
      <InteractiveMatchFilter
        onFilterChange={(opt, search) => {
          setFilterSort(opt);
          setSearchQuery(search);
        }}
      />

      {/* Leagues Groups List */}
      <div className="space-y-4">
        {processedGroups.length > 0 ? (
          processedGroups.map((group) => (
            <div
              key={group.leagueId}
              data-league={group.leagueId}
              className="card bg-white p-5 sm:p-6 rounded-3xl border-0 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <Link
                  href={`/leagues/${group.leagueId}`}
                  className="flex items-center gap-2 text-base font-black text-slate-900 no-underline hover:text-rose-600 transition-colors"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
                  <span>{group.leagueNameAr}</span>
                </Link>
                <span className="text-xs font-extrabold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                  {formatMatchCount(group.matches.length)}
                </span>
              </div>

              <MatchList
                matches={group.matches}
                groupDays={filterSort === "all" && !searchQuery}
                showLeague={false}
                leagueId={group.leagueId}
              />
            </div>
          ))
        ) : (
          <div className="bg-white p-8 rounded-3xl border-0 shadow-sm text-center text-xs font-bold text-slate-500">
            لا توجد مباريات تطابق البحث أو خيارات التصفية الحالية.
          </div>
        )}
      </div>
    </div>
  );
}

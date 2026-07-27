"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MatchList } from "@/components/MatchList";
import { InteractiveMatchFilter, type FilterSortOption } from "@/components/InteractiveMatchFilter";
import { LiveCountdownTimer } from "@/components/LiveCountdownTimer";
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
      {topUpcomingMatch ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/90 bg-panel p-3.5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-ink">أقرب مواجهة انطلاقاً:</span>
            <span className="font-bold text-blue-400">
              {topUpcomingMatch.homeNameAr} ضد {topUpcomingMatch.awayNameAr}
            </span>
          </div>
          <LiveCountdownTimer targetDate={topUpcomingMatch.utcDate} />
        </div>
      ) : null}

      <InteractiveMatchFilter
        onFilterChange={(opt, search) => {
          setFilterSort(opt);
          setSearchQuery(search);
        }}
      />

      <div className="divide-y divide-line rounded-xl border border-line bg-panel overflow-hidden">
        {processedGroups.length > 0 ? (
          processedGroups.map((group) => (
            <div key={group.leagueId} data-league={group.leagueId}>
              <div className="league-band relative flex items-center justify-between py-2.5 px-4 bg-zinc-950/80 border-b border-line">
                <Link
                  href={`/leagues/${group.leagueId}`}
                  className="league-name-chip motion-colors rounded-sm font-bold no-underline text-blue-400 hover:text-white text-sm"
                >
                  {group.leagueNameAr}
                </Link>
                <span className="type-label tabular text-muted text-xs">
                  {group.matches.length} مباراة
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
          <div className="p-8 text-center text-xs text-muted">
            لا توجد مباريات تطابق معلمة البحث أو التصفية الحالية.
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { SectionCard } from "./ui";
import { Crest } from "./Crest";

export interface StandingTeam {
  team_id: string;
  name_ar: string;
  crest_url: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goal_difference: number;
  points: number;
}

export interface LeagueItem {
  id: string;
  code?: string;
  name_ar: string;
  crest_url?: string | null;
}

export function LeagueTableWidget({
  leagues = [],
  standingsByLeague = {},
}: {
  leagues?: LeagueItem[];
  standingsByLeague?: Record<string, StandingTeam[]>;
}) {
  // Find leagues that actually have standings data
  const availableLeagues = leagues.filter(
    (l) => standingsByLeague[l.id] && standingsByLeague[l.id].length > 0
  );

  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(
    availableLeagues[0]?.id || leagues[0]?.id || "PL"
  );

  const activeLeague = availableLeagues.find((l) => l.id === selectedLeagueId) || availableLeagues[0];
  const standings = activeLeague ? (standingsByLeague[activeLeague.id] || []).slice(0, 10) : [];

  if (!activeLeague || standings.length === 0) return null;

  return (
    <SectionCard
      title={`جدول ترتيب — ${activeLeague.name_ar}`}
      subtitle="ترتيب الفرق، النقاط والأهداف بناءً على نتائج الموسم الحالية"
      headerRight={
        <Link
          href={`/leagues/${activeLeague.id}`}
          className="press-scale inline-flex items-center gap-1 text-xs font-black text-amber-600 dark:text-amber-400 hover:underline"
        >
          عرض الجدول الكامل ←
        </Link>
      }
    >
      <div className="p-4 space-y-4">
        {/* League Selector Chips */}
        {availableLeagues.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            <span className="text-[11px] font-bold text-muted shrink-0 me-1">اختر الدوري:</span>
            {availableLeagues.map((l) => {
              const isSelected = l.id === activeLeague.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setSelectedLeagueId(l.id)}
                  className={`press-scale flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border ${
                    isSelected
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : "bg-panel text-ink border-line hover:bg-surface"
                  }`}
                >
                  <Crest src={l.crest_url} alt={l.name_ar} size="chip" />
                  <span>{l.name_ar}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Standings Table */}
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="border-b border-line bg-panel text-faint font-bold text-start">
                <th scope="col" className="p-3 text-center w-10">#</th>
                <th scope="col" className="p-3 text-start">الفريق</th>
                <th scope="col" className="p-3 text-center tabular">لعب</th>
                <th scope="col" className="p-3 text-center tabular">فاز</th>
                <th scope="col" className="p-3 text-center tabular">تعادل</th>
                <th scope="col" className="p-3 text-center tabular">خسر</th>
                <th scope="col" className="p-3 text-center tabular hidden sm:table-cell">فارق الأهداف</th>
                <th scope="col" className="p-3 text-center tabular font-black text-ink">النقاط</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {standings.map((team, idx) => (
                <tr
                  key={team.team_id || idx}
                  className="hover:bg-panel/50 transition-colors"
                >
                  <td className="p-3 text-center font-bold tabular text-faint">
                    {idx + 1}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <Crest
                        src={team.crest_url}
                        alt={team.name_ar}
                        size="chip"
                      />
                      <span className="font-extrabold text-ink">
                        {team.name_ar}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-center tabular font-semibold text-muted">{team.played}</td>
                  <td className="p-3 text-center tabular font-semibold text-emerald-600 dark:text-emerald-400">{team.won}</td>
                  <td className="p-3 text-center tabular font-semibold text-muted">{team.drawn}</td>
                  <td className="p-3 text-center tabular font-semibold text-rose-600 dark:text-rose-400">{team.lost}</td>
                  <td className="p-3 text-center tabular font-semibold text-muted hidden sm:table-cell">
                    {team.goal_difference > 0 ? `+${team.goal_difference}` : team.goal_difference}
                  </td>
                  <td className="p-3 text-center tabular font-black text-sm text-amber-600 dark:text-amber-400">
                    {team.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionCard>
  );
}

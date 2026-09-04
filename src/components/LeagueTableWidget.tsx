"use client";

import { useState } from "react";
import Link from "next/link";
import { SectionCard } from "./ui";
import { Crest } from "./Crest";
import { getLeagueZone } from "@/lib/leagues";

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
  position?: number;
  elo?: number;
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
    (l) => standingsByLeague[l.id] && standingsByLeague[l.id].length > 0,
  );

  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(
    availableLeagues[0]?.id || leagues[0]?.id || "pl",
  );
  const [showAll, setShowAll] = useState<boolean>(false);

  const activeLeague =
    availableLeagues.find((l) => l.id === selectedLeagueId) ||
    availableLeagues[0];
  const allStandings = activeLeague
    ? standingsByLeague[activeLeague.id] || []
    : [];
  const standings = showAll ? allStandings : allStandings.slice(0, 10);

  if (!activeLeague || allStandings.length === 0) return null;

  const totalTeams = allStandings.length;

  return (
    <SectionCard
      title={`جدول ترتيب — ${activeLeague.name_ar}`}
      subtitle="ترتيب الفرق، النقاط والأهداف وتقييم Elo استناداً إلى نتائج الموسم"
      headerRight={
        <Link
          href={`/leagues/${activeLeague.id}`}
          className="press-scale inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
        >
          صفحة الدوري الكاملة ←
        </Link>
      }
    >
      <div className="p-4 sm:p-5 space-y-4">
        {/* League Selector Chips */}
        {availableLeagues.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            <span className="text-[11px] font-bold text-muted shrink-0 me-1">
              اختر الدوري:
            </span>
            {availableLeagues.map((l) => {
              const isSelected = l.id === activeLeague.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    setSelectedLeagueId(l.id);
                    setShowAll(false);
                  }}
                  className={`press-scale flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                    isSelected
                      ? "bg-accent text-on-fill border-accent shadow-xs"
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
        <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-2xs">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="border-b border-line bg-panel/80 text-muted font-bold text-start">
                <th scope="col" className="p-3 text-center w-12">#</th>
                <th scope="col" className="p-3 text-start min-w-[140px]">الفريق</th>
                <th scope="col" className="p-3 text-center tabular">لعب</th>
                <th scope="col" className="p-3 text-center tabular">فاز</th>
                <th scope="col" className="p-3 text-center tabular">تعادل</th>
                <th scope="col" className="p-3 text-center tabular">خسر</th>
                <th scope="col" className="p-3 text-center tabular hidden sm:table-cell">فارق الأهداف</th>
                <th scope="col" className="p-3 text-center tabular font-semibold text-accent">النقاط</th>
                <th scope="col" className="p-3 text-center tabular hidden md:table-cell">Elo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {standings.map((team, idx) => {
                const pos = team.position ?? idx + 1;
                const zone = getLeagueZone(pos, totalTeams, activeLeague.id);

                return (
                  <tr
                    key={team.team_id || idx}
                    className="hover:bg-panel/50 transition-colors"
                  >
                    <td
                      className={`p-3 text-center font-mono font-bold tabular ${
                        zone ? zone.positionTextColor : "text-muted"
                      }`}
                      style={
                        zone
                          ? { borderInlineStart: `4px solid ${zone.color}` }
                          : undefined
                      }
                      title={zone?.label}
                    >
                      {pos}
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/team/${team.team_id}`}
                        className="flex items-center gap-2.5 no-underline text-ink hover:text-accent font-semibold transition-colors"
                      >
                        <Crest
                          src={team.crest_url}
                          alt={team.name_ar}
                          size="chip"
                        />
                        <span className="truncate">{team.name_ar}</span>
                      </Link>
                    </td>
                    <td className="p-3 text-center tabular font-semibold text-muted">
                      {team.played}
                    </td>
                    <td className="p-3 text-center tabular font-semibold text-ink">
                      {team.won}
                    </td>
                    <td className="p-3 text-center tabular font-semibold text-muted">
                      {team.drawn}
                    </td>
                    <td className="p-3 text-center tabular font-semibold text-muted">
                      {team.lost}
                    </td>
                    <td className="p-3 text-center tabular font-semibold text-muted hidden sm:table-cell">
                      {team.goal_difference > 0
                        ? `+${team.goal_difference}`
                        : team.goal_difference}
                    </td>
                    <td className="p-3 text-center tabular font-bold text-sm text-accent">
                      {team.points}
                    </td>
                    <td className="p-3 text-center tabular font-mono font-semibold text-ink hidden md:table-cell">
                      {team.elo ? Math.round(team.elo) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer controls: Toggle full / top 10 + Dynamic Zone key */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-3 text-muted">
            {(() => {
              const seen = new Map<string, string>();
              standings.forEach((team, idx) => {
                const pos = team.position ?? idx + 1;
                const zone = getLeagueZone(pos, totalTeams, activeLeague.id);
                if (zone && !seen.has(zone.label)) {
                  seen.set(zone.label, zone.color);
                }
              });
              return Array.from(seen.entries()).map(([label, color]) => (
                <span key={label} className="flex items-center gap-1.5 font-medium">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span>{label}</span>
                </span>
              ));
            })()}
          </div>

          {allStandings.length > 10 && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="press-scale inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-line bg-panel text-xs font-semibold text-ink hover:border-accent hover:text-accent transition-colors cursor-pointer"
            >
              {showAll
                ? "عرض أول 10 أندية فقط ↑"
                : `استعراض الجدول كاملاً (${totalTeams} نادياً) ↓`}
            </button>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

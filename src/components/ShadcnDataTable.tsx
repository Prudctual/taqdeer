"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ProbBar } from "./ProbBar";
import { Crest } from "./Crest";
import { formatShortDate } from "@/lib/format";

export interface MatchTableRow {
  id: string;
  utcDate: string;
  status: "FINISHED" | "SCHEDULED" | "IN_PLAY" | "PAUSED";
  leagueId: string;
  leagueNameAr: string;
  homeTeam: string;
  homeTeamAr: string;
  awayTeam: string;
  awayTeamAr: string;
  homeScore?: number | null;
  awayScore?: number | null;
  pHome: number;
  pDraw: number;
  pAway: number;
  homeElo?: number;
  awayElo?: number;
}

export function ShadcnDataTable({
  matches,
  onSelectMatch,
}: {
  matches: MatchTableRow[];
  onSelectMatch?: (match: MatchTableRow) => void;
}) {
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedLeague, setSelectedLeague] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"date" | "confidence">("date");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Extract unique leagues
  const leagues = useMemo(() => {
    const map = new Map<string, string>();
    matches.forEach((m) => map.set(m.leagueId, m.leagueNameAr));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [matches]);

  // Filter & Sort matches
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      // Query filter (team names)
      const matchesQuery =
        !filterQuery ||
        m.homeTeamAr.toLowerCase().includes(filterQuery.toLowerCase()) ||
        m.awayTeamAr.toLowerCase().includes(filterQuery.toLowerCase()) ||
        m.homeTeam.toLowerCase().includes(filterQuery.toLowerCase()) ||
        m.awayTeam.toLowerCase().includes(filterQuery.toLowerCase());

      // League filter
      const matchesLeague =
        selectedLeague === "ALL" || m.leagueId === selectedLeague;

      // Status filter
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "LIVE" && (m.status === "IN_PLAY" || m.status === "PAUSED")) ||
        (statusFilter === "SCHEDULED" && m.status === "SCHEDULED") ||
        (statusFilter === "FINISHED" && m.status === "FINISHED");

      return matchesQuery && matchesLeague && matchesStatus;
    }).sort((a, b) => {
      if (sortBy === "confidence") {
        const maxA = Math.max(a.pHome, a.pDraw, a.pAway);
        const maxB = Math.max(b.pHome, b.pDraw, b.pAway);
        return maxB - maxA;
      }
      return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
    });
  }, [matches, filterQuery, selectedLeague, statusFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredMatches.length / pageSize) || 1;
  const paginatedMatches = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMatches.slice(start, start + pageSize);
  }, [filteredMatches, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      {/* Table Toolbar & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-line bg-panel/40 p-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => {
              setFilterQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="تصفية باسم الفريق..."
            className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 pe-8 text-xs text-ink placeholder-faint focus:border-accent focus:outline-none transition-all"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint text-xs">
            🔍
          </span>
        </div>

        {/* Filters & Sorting */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* League Dropdown */}
          <select
            value={selectedLeague}
            onChange={(e) => {
              setSelectedLeague(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-ink focus:border-accent focus:outline-none cursor-pointer"
          >
            <option value="ALL">جميع الدوريات ({matches.length})</option>
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-ink focus:border-accent focus:outline-none cursor-pointer"
          >
            <option value="ALL">كل الحالات</option>
            <option value="SCHEDULED">القادمة</option>
            <option value="FINISHED">المكتملة</option>
            <option value="LIVE">المباشرة</option>
          </select>

          {/* Sort Toggle */}
          <button
            type="button"
            onClick={() =>
              setSortBy((prev) => (prev === "date" ? "confidence" : "date"))
            }
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-muted hover:text-ink font-semibold transition-colors cursor-pointer"
          >
            ترتيب: {sortBy === "date" ? "حسب الموعد 🕒" : "حسب ثقة النموذج 🎯"}
          </button>
        </div>
      </div>

      {/* Table Canvas */}
      <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-xs">
        <table className="w-full border-collapse text-end text-xs">
          <thead>
            <tr className="border-b border-line bg-panel/60 text-muted font-bold">
              <th className="px-4 py-3 text-start">الدوري والحالة</th>
              <th className="px-4 py-3 text-center min-w-[200px]">المواجهة والنتيجة</th>
              <th className="px-4 py-3 text-center min-w-[180px]">احتمالات 1X2 (Dixon-Coles)</th>
              <th className="px-4 py-3 text-center">أرجح نتيجة</th>
              <th className="px-4 py-3 text-center">الإجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {paginatedMatches.length > 0 ? (
              paginatedMatches.map((m) => {
                const maxProb = Math.max(m.pHome, m.pDraw, m.pAway);
                const pickKey: "H" | "D" | "A" =
                  maxProb === m.pHome ? "H" : maxProb === m.pDraw ? "D" : "A";
                const pickLabel =
                  pickKey === "H" ? "فوز المضيف 1" : pickKey === "D" ? "تعادل X" : "فوز الضيف 2";

                return (
                  <tr
                    key={m.id}
                    className="match-row transition-colors hover:bg-panel/40 cursor-pointer"
                    onClick={() => onSelectMatch && onSelectMatch(m)}
                  >
                    {/* League & Status */}
                    <td className="px-4 py-3 text-start align-middle">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-ink">{m.leagueNameAr}</span>
                        <span className="text-[11px] text-faint tabular">
                          {formatShortDate(m.utcDate)}
                        </span>
                      </div>
                    </td>

                    {/* Matchup */}
                    <td className="px-4 py-3 text-center align-middle">
                      <div className="grid grid-cols-[1fr_3.25rem_1fr] items-center gap-1.5 max-w-sm mx-auto">
                        {/* Home Team - Pushed close to center VS */}
                        <div className="flex items-center gap-1.5 justify-end min-w-0">
                          <Crest alt={m.homeTeamAr} size="chip" />
                          <span className="font-bold text-ink truncate">{m.homeTeamAr}</span>
                        </div>

                        {/* Score or VS */}
                        <div className="w-13 shrink-0 text-center flex items-center justify-center mx-auto">
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md border border-line bg-panel font-mono font-black text-xs text-ink tabular min-w-[2.75rem]">
                            {m.status === "FINISHED" ? (
                              <span className="text-accent">
                                {m.homeScore ?? 0}–{m.awayScore ?? 0}
                              </span>
                            ) : (
                              "VS"
                            )}
                          </span>
                        </div>

                        {/* Away Team - Pushed close to center VS */}
                        <div className="flex items-center gap-1.5 justify-start min-w-0">
                          <span className="font-bold text-ink truncate">{m.awayTeamAr}</span>
                          <Crest alt={m.awayTeamAr} size="chip" />
                        </div>
                      </div>
                    </td>

                    {/* Probabilities Bar */}
                    <td className="px-4 py-3 text-center align-middle">
                      <div className="mx-auto max-w-[180px]">
                        <ProbBar
                          pHome={m.pHome}
                          pDraw={m.pDraw}
                          pAway={m.pAway}
                          compact
                        />
                      </div>
                    </td>

                    {/* Verdict */}
                    <td className="px-4 py-3 text-center align-middle">
                      <span className="inline-flex items-center rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] font-bold text-ink shadow-2xs">
                        {pickLabel} ({(maxProb * 100).toFixed(0)}٪)
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center align-middle">
                      <Link
                        href={`/match/${m.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center rounded-lg border border-line bg-surface px-3 py-1 text-xs font-bold text-muted hover:border-accent hover:text-accent transition-colors"
                      >
                        التحليل الكامل ←
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  لا توجد مباريات مطابقة للشروط المحددة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
        <div>
          عرض <span className="font-bold text-ink tabular">{paginatedMatches.length}</span> من{" "}
          <span className="font-bold text-ink tabular">{filteredMatches.length}</span> مباراة
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-line bg-surface px-3 py-1 font-bold text-ink disabled:opacity-40 hover:bg-panel cursor-pointer"
          >
            السابق
          </button>
          <span className="px-2 font-semibold tabular">
            الصفحة {currentPage} من {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-line bg-surface px-3 py-1 font-bold text-ink disabled:opacity-40 hover:bg-panel cursor-pointer"
          >
            التالي
          </button>
        </div>
      </div>
    </div>
  );
}

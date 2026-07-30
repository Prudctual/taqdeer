"use client";

import React from "react";
import Link from "next/link";
import { MatchTableRow } from "./ShadcnDataTable";
import { Crest } from "./Crest";
import { ProbBar } from "./ProbBar";
import { formatLongDate } from "@/lib/format";

export function MatchDetailModal({
  match,
  onClose,
}: {
  match: MatchTableRow | null;
  onClose: () => void;
}) {
  if (!match) return null;

  const maxProb = Math.max(match.pHome, match.pDraw, match.pAway);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-2xl z-10 overflow-hidden space-y-6 modal-enter">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <span className="text-xs font-bold text-accent">{match.leagueNameAr}</span>
            <h2 className="text-lg font-black text-ink mt-0.5">
              تحليل مواجهة {match.homeTeamAr} ضد {match.awayTeamAr}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-panel hover:text-ink active:scale-95 transition-transform duration-140 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Teams Matchup Header */}
        <div className="flex items-center justify-between rounded-xl border border-line bg-panel/40 p-4">
          {/* Home */}
          <div className="flex items-center gap-3 text-start">
            <Crest alt={match.homeTeamAr} size="md" />
            <div>
              <div className="font-black text-ink text-base">{match.homeTeamAr}</div>
              {match.homeElo ? (
                <div className="text-xs text-muted tabular">Elo: {match.homeElo}</div>
              ) : null}
            </div>
          </div>

          {/* Vs / Score */}
          <div className="text-center">
            <div className="text-2xl font-black text-ink tabular">
              {match.status === "FINISHED"
                ? `${match.homeScore} - ${match.awayScore}`
                : "VS"}
            </div>
            <div className="text-[11px] text-faint mt-1">
              {formatLongDate(match.utcDate)}
            </div>
          </div>

          {/* Away */}
          <div className="flex items-center gap-3 text-end">
            <div>
              <div className="font-black text-ink text-base">{match.awayTeamAr}</div>
              {match.awayElo ? (
                <div className="text-xs text-muted tabular">Elo: {match.awayElo}</div>
              ) : null}
            </div>
            <Crest alt={match.awayTeamAr} size="md" />
          </div>
        </div>

        {/* Probabilities Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-ink">
            <span>توزيع احتمالات Dixon-Coles المعايرة</span>
            <span className="text-accent">أرجح نتيجة: {(maxProb * 100).toFixed(0)}٪</span>
          </div>

          <ProbBar
            pHome={match.pHome}
            pDraw={match.pDraw}
            pAway={match.pAway}
          />

          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2">
            <div className="rounded-xl border border-line bg-panel/50 p-2.5">
              <div className="text-faint text-[11px]">فوز المضيف (1)</div>
              <div className="text-base font-black text-home mt-0.5 tabular">
                {(match.pHome * 100).toFixed(1)}٪
              </div>
            </div>
            <div className="rounded-xl border border-line bg-panel/50 p-2.5">
              <div className="text-faint text-[11px]">التعادل (X)</div>
              <div className="text-base font-black text-draw mt-0.5 tabular">
                {(match.pDraw * 100).toFixed(1)}٪
              </div>
            </div>
            <div className="rounded-xl border border-line bg-panel/50 p-2.5">
              <div className="text-faint text-[11px]">فوز الضيف (2)</div>
              <div className="text-base font-black text-away mt-0.5 tabular">
                {(match.pAway * 100).toFixed(1)}٪
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between border-t border-line pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-muted hover:bg-panel hover:text-ink active:scale-[0.97] transition-all duration-140 cursor-pointer"
          >
            إغلاق
          </button>
          <Link
            href={`/match/${match.id}`}
            className="rounded-xl bg-accent px-5 py-2 text-xs font-bold text-white hover:opacity-90 active:scale-[0.97] transition-all duration-140 shadow-xs"
          >
            فتح صفحة المباراة والتفكيك التكتيكي ←
          </Link>
        </div>
      </div>
    </div>
  );
}

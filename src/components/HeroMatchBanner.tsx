"use client";

import Link from "next/link";
import { Crest } from "./Crest";
import { LiveMatchClock } from "./LiveMatchClock";
import {
  formatKickoffAbsolute,
  formatCountdown,
  formatRelativeDay,
  hasKnownKickoffTime,
} from "@/lib/format";
import { matchDisplay } from "@/lib/match-status";
import type { MatchCard } from "@/lib/queries";

export function HeroMatchBanner({ match }: { match: MatchCard | null }) {
  if (!match) return null;

  const { isLive, isScheduled, score, label } = matchDisplay({
    status: match.status,
    utcDate: match.utcDate,
    homeGoals: match.homeGoals,
    awayGoals: match.awayGoals,
    minute: match.minute,
    liveStatusAr: match.liveStatusAr,
  });
  const knownTime = hasKnownKickoffTime(match.utcDate);
  const countdown = knownTime ? formatCountdown(match.utcDate) : null;
  const relativeDay = formatRelativeDay(match.utcDate);

  const hasPred =
    match.pHome != null && match.pDraw != null && match.pAway != null;
  const pHome = hasPred ? match.pHome! * 100 : null;
  const pDraw = hasPred ? match.pDraw! * 100 : null;
  const pAway = hasPred ? match.pAway! * 100 : null;

  return (
    <div className={`relative overflow-hidden rounded-2xl border-2 p-5 sm:p-7 shadow-xs transition-all ${
      isLive ? "border-live/50 bg-live-dim" : "border-line bg-surface"
    }`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left Info & Teams */}
        <div className="space-y-4 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="bg-accent-dim/60 text-accent px-2.5 py-0.5 rounded-md border border-accent/20">
              🏆 {match.leagueNameAr}
            </span>
            {relativeDay ? (
              <span className="bg-panel text-ink px-2.5 py-0.5 rounded-md border border-line">
                {relativeDay}
              </span>
            ) : null}
            {countdown && isScheduled ? (
              <span className="bg-panel text-accent px-2.5 py-0.5 rounded-md border border-accent/30 tabular font-medium">
                {countdown}
              </span>
            ) : null}
            <span className="text-faint">•</span>
            {isLive ? (
              <>
                <LiveMatchClock
                  utcDate={match.utcDate}
                  liveMinute={match.minute}
                  liveStatusAr={match.liveStatusAr}
                  size="chip"
                  showPeriod={false}
                />
                <span className="text-muted tabular font-medium">
                  {formatKickoffAbsolute(match.utcDate)}
                </span>
              </>
            ) : (
              <span className="text-muted tabular font-medium">{formatKickoffAbsolute(match.utcDate)}</span>
            )}
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <Crest src={match.homeCrestUrl} alt={match.homeNameAr} size="md" />
              <span className="text-base sm:text-lg font-semibold text-ink">{match.homeNameAr}</span>
            </div>
            
            {score ? (
              <span className={`text-lg sm:text-2xl font-mono font-semibold bg-panel border px-3 py-1 rounded-xl shadow-xs tabular ${
                isLive
                  ? "text-live border-live/40"
                  : "text-ink border-line"
              }`}>
                {score.replace("–", " – ")}
              </span>
            ) : isScheduled ? (
              <span className="text-xs font-bold text-faint">ضد</span>
            ) : (
              <span className="text-xs font-bold text-muted">{label}</span>
            )}

            <div className="flex items-center gap-3">
              <Crest src={match.awayCrestUrl} alt={match.awayNameAr} size="md" />
              <span className="text-base sm:text-lg font-semibold text-ink">{match.awayNameAr}</span>
            </div>
          </div>

          {/* نسب النموذج الحالية فقط — بلا أرقام افتراضية */}
          {hasPred ? (
          <div className="space-y-1.5 max-w-md">
            <div className="flex justify-between text-[11px] font-bold text-muted tabular">
              <span>فوز {match.homeNameAr} ({pHome!.toFixed(1)}٪)</span>
              <span>تعادل ({pDraw!.toFixed(1)}٪)</span>
              <span>فوز {match.awayNameAr} ({pAway!.toFixed(1)}٪)</span>
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-panel">
              <div style={{ width: `${pHome}%` }} className="bg-home" />
              <div style={{ width: `${pDraw}%` }} className="bg-draw" />
              <div style={{ width: `${pAway}%` }} className="bg-away" />
            </div>
          </div>
          ) : null}
        </div>

        {/* Right Action */}
        <div className="shrink-0">
          <Link
            href={`/match/${match.id}`}
            className="press-scale inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-xs font-semibold text-on-fill no-underline shadow-xs hover:bg-accent/90 transition-all"
          >
            <span>تحليل المباراة والتوقعات</span>
            <span>←</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

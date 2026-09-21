"use client";

import { MatchLink } from "./MatchLink";
import { Crest } from "./Crest";
import { LiveMatchClock } from "./LiveMatchClock";
import { ProbBar } from "./ProbBar";
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
  const when = [relativeDay, formatKickoffAbsolute(match.utcDate), countdown]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className={`card overflow-hidden ${isLive ? "border-live/40" : ""}`}
      data-league={match.leagueId?.toLowerCase()}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
        <p className="type-label flex min-w-0 items-center gap-2 text-ink">
          <span className="chip-dot" aria-hidden />
          <span className="truncate">{match.leagueNameAr}</span>
        </p>
        <p className="text-[11px] font-medium tabular text-muted">
          {isLive ? (
            <LiveMatchClock
              utcDate={match.utcDate}
              liveMinute={match.minute}
              liveStatusAr={match.liveStatusAr}
              size="chip"
              showPeriod={false}
            />
          ) : (
            when
          )}
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Crest src={match.homeCrestUrl} alt={match.homeNameAr} size="md" />
          <span className="truncate text-base font-semibold text-ink sm:text-lg">
            {match.homeNameAr}
          </span>
        </div>
        {score ? (
          <span
            className={`rounded-lg border bg-panel px-3 py-1 font-mono text-lg font-semibold tabular sm:text-xl ${
              isLive ? "border-live/40 text-live" : "border-line text-ink"
            }`}
          >
            {score.replace("–", " – ")}
          </span>
        ) : (
          <span className="text-[11px] font-medium text-faint">
            {isScheduled ? "ضد" : label}
          </span>
        )}
        <div className="flex min-w-0 items-center justify-end gap-2.5">
          <span className="truncate text-base font-semibold text-ink sm:text-lg">
            {match.awayNameAr}
          </span>
          <Crest src={match.awayCrestUrl} alt={match.awayNameAr} size="md" />
        </div>
      </div>

      {hasPred ? (
        <div className="border-t border-line px-4 py-3.5 sm:px-5">
          <ProbBar
            pHome={match.pHome!}
            pDraw={match.pDraw!}
            pAway={match.pAway!}
            showLabels={false}
          />
        </div>
      ) : null}

      <div className="border-t border-line px-4 py-3 sm:px-5">
        <MatchLink
          href={`/match/${match.id}`}
          className="motion-colors text-sm font-medium text-accent no-underline hover:text-ink"
        >
          تحليل المباراة
        </MatchLink>
      </div>
    </article>
  );
}

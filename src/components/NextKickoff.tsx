"use client";

import Link from "next/link";
import { ChevronIcon } from "./ChevronIcon";
import { Crest } from "./Crest";
import { LiveMatchClock } from "./LiveMatchClock";
import {
  DATA_TZ,
  DATA_TZ_LABEL,
  DISPLAY_TZ_LABEL,
  dayKey,
  dayKeyInTz,
  formatCountdown,
  formatLongDate,
  formatMatchTime,
  formatRelativeDay,
  hasKnownKickoffTime,
  pct,
  topOutcome,
} from "@/lib/format";
import { ProbBar } from "./ProbBar";
import { matchDisplay } from "@/lib/match-status";
import type { MatchRowItem } from "./MatchRow";

const GLYPH: Record<string, string> = { H: "1", D: "X", A: "2", EQ: "⚖" };
const TONE: Record<string, string> = {
  H: "var(--home)",
  D: "var(--draw)",
  A: "var(--away)",
  EQ: "oklch(0.75 0.16 75)",
};

function TeamLine({
  name,
  crestUrl,
  side,
}: {
  name: string;
  crestUrl?: string | null;
  side: "home" | "away";
}) {
  const label = side === "home" ? "مضيف" : "ضيف";
  return (
    <div
      className={`flex min-w-0 items-center gap-2.5 ${
        side === "away" ? "flex-row-reverse text-end" : ""
      }`}
    >
      <Crest
        src={crestUrl}
        alt={name}
        size="md"
        fallback={side === "home" ? "1" : "2"}
        tone={side}
      />
      <div className="min-w-0">
        <p className="type-label">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-ink" title={name}>
          {name}
        </p>
      </div>
    </div>
  );
}

export function NextKickoff({ m }: { m: MatchRowItem }) {
  const { isLive, isScheduled, score, label } = matchDisplay({
    status: m.status,
    utcDate: m.utcDate,
    homeGoals: m.homeGoals,
    awayGoals: m.awayGoals,
    minute: m.minute,
    liveStatusAr: m.liveStatusAr,
  });
  const pick =
    m.pHome != null ? topOutcome(m.pHome, m.pDraw!, m.pAway!) : null;
  const relative = formatRelativeDay(m.utcDate);
  const longDate = formatLongDate(m.utcDate);
  const knownTime = hasKnownKickoffTime(m.utcDate);
  const time = formatMatchTime(m.utcDate);
  const iraqTime = formatMatchTime(m.utcDate, DATA_TZ);
  const iraqDate = formatLongDate(m.utcDate, DATA_TZ);
  const sameDay = dayKey(m.utcDate) === dayKeyInTz(m.utcDate, DATA_TZ);
  const countdown = knownTime ? formatCountdown(m.utcDate) : null;
  const tone = m.leagueId?.toLowerCase() || undefined;

  return (
    <Link
      href={`/match/${encodeURIComponent(m.id)}`}
      data-league={tone}
      aria-label={`تحليل ${m.homeNameAr} ضد ${m.awayNameAr}`}
      className="card group block overflow-hidden no-underline"
    >
      <div className="league-band flex-wrap">
        <span className="flex min-w-0 items-center gap-2">
          {isLive ? (
            <LiveMatchClock
              utcDate={m.utcDate}
              liveMinute={m.minute}
              liveStatusAr={m.liveStatusAr}
              size="chip"
              showPeriod={false}
              className="text-[10px]"
            />
          ) : (
            <span className="type-label">إحاطة الجولة</span>
          )}
          <span className="text-line" aria-hidden>
            ·
          </span>
          <span className="league-name-chip min-w-0 truncate">
            {m.leagueNameAr}
          </span>
        </span>
        <span suppressHydrationWarning className="flex flex-wrap items-center gap-x-1.5 text-[11px] tabular text-muted">
          {isLive ? (
            <span className="font-semibold text-live">
              {m.liveStatusAr || (m.minute ? `الدقيقة ${m.minute}'` : "جارية الآن")}
            </span>
          ) : (
            <>
              {relative ? (
                <>
                  <span className="font-medium text-ink">{relative}</span>
                  <span className="text-line" aria-hidden>
                    ·
                  </span>
                </>
              ) : null}
              <span>{longDate}</span>
              {knownTime ? (
                <>
                  <span className="text-line" aria-hidden>
                    ·
                  </span>
                  <time dateTime={m.utcDate} className="font-medium text-ink">
                    {time} {DISPLAY_TZ_LABEL}
                  </time>
                  <span className="text-line" aria-hidden>
                    ·
                  </span>
                  <span>
                    {sameDay ? null : `${iraqDate} · `}
                    {iraqTime} {DATA_TZ_LABEL}
                  </span>
                </>
              ) : null}
              {countdown ? (
                <>
                  <span className="text-line" aria-hidden>
                    ·
                  </span>
                  <span>{countdown}</span>
                </>
              ) : null}
            </>
          )}
        </span>
      </div>

      <div className="motion-colors group-hover:bg-panel">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-4 sm:px-5">
          <TeamLine name={m.homeNameAr} crestUrl={m.homeCrestUrl} side="home" />
          {score ? (
            <span className={`text-xl sm:text-2xl font-mono font-semibold bg-panel border px-3 py-1 rounded-xl shadow-xs tabular ${
              isLive
                ? "text-live border-live/40"
                : "text-ink border-line"
            }`}>
              {score.replace("–", " – ")}
            </span>
          ) : isScheduled ? (
            <span className="text-[11px] text-faint">ضد</span>
          ) : (
            <span className="text-[11px] font-bold text-muted">{label}</span>
          )}
          <TeamLine name={m.awayNameAr} crestUrl={m.awayCrestUrl} side="away" />
        </div>

        <div className="flex flex-col gap-3 border-t border-line px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
          {m.pHome != null && pick ? (
            <>
              <div className="flex shrink-0 items-center gap-2">
                <span className="type-label">الأرجح</span>
                <span
                  className="pick-chip"
                  style={{ background: TONE[pick.key] }}
                >
                  {GLYPH[pick.key]}
                </span>
                <span className="text-sm font-semibold text-ink">
                  {pick.label}
                </span>
                <span
                  className="text-sm font-semibold tabular"
                  style={{ color: TONE[pick.key] }}
                >
                  {pct(pick.p)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <ProbBar
                  pHome={m.pHome}
                  pDraw={m.pDraw!}
                  pAway={m.pAway!}
                  bare
                  showLabels={false}
                />
              </div>
            </>
          ) : (
            <p className="min-w-0 flex-1 text-xs text-muted">
              الإشارة · بانتظار المعايرة
            </p>
          )}
          <span className="motion-colors inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted group-hover:text-ink">
            التحليل
            <ChevronIcon size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}

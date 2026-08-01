import { DayRail } from "./DayRail";
import { MatchListHeader, MatchRow } from "./MatchRow";
import type { MatchCard } from "@/lib/queries";
import { formatLongDate, groupByDay } from "@/lib/format";

function formatMatchCount(count: number): string {
  if (count === 1) return "مباراة واحدة";
  if (count === 2) return "مباراتان";
  if (count >= 3 && count <= 10) return `${count} مباريات`;
  return `${count} مباراة`;
}

export function MatchList({
  matches,
  groupDays = false,
  showLeague = true,
  leagueId,
}: {
  matches: MatchCard[];
  groupDays?: boolean;
  showLeague?: boolean;
  leagueId?: string | null;
}) {
  if (matches.length === 0) return null;

  if (!groupDays) {
    return (
      <div>
        <MatchListHeader leagueId={leagueId} />
        <ul className="divide-y divide-line">
          {matches.map((m) => (
            <li key={m.id}>
              <MatchRow m={m} showLeague={showLeague} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const days = groupByDay(matches);

  return (
    <div>
      <MatchListHeader leagueId={leagueId} />
      <div className="space-y-4 pt-2">
        {days.map((day) => (
          <section key={day.key} aria-label={day.label} className="space-y-1">
            <DayRail>
              <div className="bg-panel rounded-2xl px-4 py-2.5 flex items-center justify-between border border-line">
                <div className="flex items-center gap-2">
                  {day.relative ? (
                    <span className="bg-accent-dim text-accent px-3 py-0.5 rounded-full text-xs font-black border border-accent/20">
                      {day.relative}
                    </span>
                  ) : null}
                  {day.items[0]?.matchday ? (
                    <span className="bg-panel text-ink px-2.5 py-0.5 rounded-md text-[11px] font-black font-mono border border-line">
                      الجولة {day.items[0].matchday}
                    </span>
                  ) : null}
                  <h3 className="text-xs sm:text-sm font-black text-ink tracking-tight">
                    {formatLongDate(day.items[0]!.utcDate)}
                  </h3>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[11px] font-extrabold text-muted bg-surface px-3 py-1 rounded-full border border-line shadow-2xs">
                    {formatMatchCount(day.items.length)}
                  </span>
                </div>
              </div>
            </DayRail>

            <ul className="divide-y divide-line bg-surface rounded-2xl overflow-hidden border border-line">
              {day.items.map((m) => (
                <li key={m.id}>
                  <MatchRow m={m} showLeague={showLeague} hideRelative />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

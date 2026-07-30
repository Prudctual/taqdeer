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
        <ul className="divide-y divide-slate-100">
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
              <div className="bg-slate-100/90 rounded-2xl px-4 py-2.5 flex items-center justify-between border border-slate-200/60 shadow-2xs">
                <div className="flex items-center gap-2">
                  {day.relative ? (
                    <span className="bg-rose-100 text-rose-700 px-3 py-0.5 rounded-full text-xs font-black border border-rose-200/60">
                      {day.relative}
                    </span>
                  ) : null}
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                    {formatLongDate(day.items[0]!.utcDate)}
                  </h3>
                </div>

                <div className="shrink-0">
                  <span className="text-[11px] font-extrabold text-slate-700 bg-white px-3 py-1 rounded-full border border-slate-200/50 shadow-2xs">
                    {formatMatchCount(day.items.length)}
                  </span>
                </div>
              </div>
            </DayRail>

            <ul className="divide-y divide-slate-100 bg-white rounded-2xl overflow-hidden shadow-2xs">
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

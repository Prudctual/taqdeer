import { DayRail } from "./DayRail";
import { MatchListHeader, MatchRow } from "./MatchRow";
import type { MatchCard } from "@/lib/queries";
import { formatLongDate, groupByDay } from "@/lib/format";

export function MatchList({
  matches,
  groupDays = false,
  showLeague = true,
  leagueId,
}: {
  matches: MatchCard[];
  groupDays?: boolean;
  showLeague?: boolean;
  /** لون رأس الجدول عند عرض دوري واحد */
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
      {/* الخط الشعري بين الأيام فقط — آخر مجموعة بلا خط سفلي */}
      <div className="divide-y divide-line">
        {days.map((day) => (
          <section key={day.key} aria-label={day.label}>
            <DayRail>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="day-rail-label min-w-0 truncate">
                  {day.relative ? (
                    <>
                      <span className="text-accent">{day.relative}</span>
                      <span className="mx-1.5 text-faint" aria-hidden>
                        ·
                      </span>
                    </>
                  ) : null}
                  <span>{formatLongDate(day.items[0]!.utcDate)}</span>
                </h3>
                <span className="shrink-0 text-[11px] tabular text-faint">
                  <span className="sr-only">عدد المباريات </span>
                  {day.items.length}
                </span>
              </div>
            </DayRail>
            <ul className="divide-y divide-line">
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

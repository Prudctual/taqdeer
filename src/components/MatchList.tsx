import { DayRail } from "./DayRail";
import { MatchListHeader, MatchRow, rowGrid } from "./MatchRow";
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
              <div className={`grid grid-cols-[minmax(0,1fr)_auto] ${rowGrid} px-4 py-1 items-center`}>
                <div className="hidden sm:block"></div>
                <div className="min-w-0 text-center flex items-center justify-center">
                  <h3 className="day-rail-label truncate font-bold text-yellow-400 text-center">
                    {day.relative ? (
                      <>
                        <span className="text-yellow-400 font-extrabold">{day.relative}</span>
                        <span className="mx-1.5 text-yellow-500/70" aria-hidden>
                          ·
                        </span>
                      </>
                    ) : null}
                    <span className="text-yellow-200">{formatLongDate(day.items[0]!.utcDate)}</span>
                  </h3>
                </div>
                <div className="hidden sm:block col-span-2 text-end">
                  <span className="text-[11px] tabular text-yellow-400/80 font-medium">
                    <span className="sr-only">عدد المباريات </span>
                    {day.items.length} مباراة
                  </span>
                </div>
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

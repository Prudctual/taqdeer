import Link from "next/link";
import { MatchWhen } from "./MatchWhen";
import { ProbBar } from "./ProbBar";
import { TeamNamesInline } from "./TeamMatchup";
import type { MatchCard } from "@/lib/queries";
import { actualOutcome, pct, topOutcome } from "@/lib/format";

/** لون النتيجة يملأ الشارة فقط — النص عليها بلون السطح الداكن */
const pickFill: Record<string, string> = {
  H: "bg-home-fill",
  D: "bg-draw-fill",
  A: "bg-away-fill",
  EQ: "bg-amber-500/20 text-amber-500 border border-amber-500/40",
};

/** الرمز يرافق اللون دائماً — لا معنى يُحمل باللون وحده */
const pickGlyph: Record<string, string> = { H: "1", D: "X", A: "2", EQ: "⚖" };
const pickName: Record<string, string> = {
  H: "فوز المضيف",
  D: "تعادل",
  A: "فوز الضيف",
  EQ: "مواجهة متكافئة",
};

/** شبكة موحّدة للرأس والصف — المحاذاة داخل كل عمود تتبع عنصره */
export const rowGrid =
  "sm:grid-cols-[6rem_minmax(0,1fr)_minmax(8.5rem,10rem)_5rem] sm:items-center sm:gap-x-4";

export function MatchListHeader({
  leagueId,
}: {
  leagueId?: string | null;
}) {
  const tone = leagueId?.toLowerCase() || undefined;
  return (
    <div
      data-league={tone}
      aria-hidden
      className={`type-label hidden border-b border-line bg-panel px-4 py-2 sm:grid ${rowGrid} text-center`}
    >
      <span className="text-center">الموعد</span>

      <span className="grid grid-cols-[1fr_3.5rem_1fr] items-center gap-2 text-center font-bold">
        <span className="text-start">المضيف</span>
        <span className="text-center text-faint">VS</span>
        <span className="text-end">الضيف</span>
      </span>

      <span className="text-center">احتمال 1X2</span>

      <span className="text-center">الأرجح</span>
    </div>
  );
}

export function MatchRow({
  m,
  showLeague = true,
  /** عند التجميع باليوم نخفي التسمية النسبية المكررة */
  hideRelative = false,
}: {
  m: MatchCard;
  showLeague?: boolean;
  hideRelative?: boolean;
}) {
  const hasPred = m.pHome != null;
  const pick = hasPred ? topOutcome(m.pHome!, m.pDraw!, m.pAway!) : null;
  const isLive = ["IN_PLAY", "PAUSED", "LIVE", "1H", "2H", "HT", "ET", "P", "BREAK"].includes(m.status);
  const finished = m.status === "FINISHED" && m.homeGoals != null;
  const hit =
    finished && pick && m.awayGoals != null
      ? actualOutcome(m.homeGoals!, m.awayGoals!) === pick.key
      : null;
  const tone = m.leagueId.toLowerCase();

  const currentScore =
    isLive || finished
      ? `${m.homeGoals ?? 0}–${m.awayGoals ?? 0}`
      : null;

  return (
    <Link
      href={`/match/${encodeURIComponent(m.id)}`}
      data-league={tone}
      className={`match-row ${
        showLeague ? "league-row" : ""
      } grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-4 py-2.5 text-ink no-underline sm:gap-y-0 ${rowGrid} ${
        isLive ? "bg-emerald-500/5 dark:bg-emerald-950/20 border-r-4 border-r-emerald-500" : ""
      }`}
    >
      {/* ١ · الموعد */}
      <div className="min-w-0 text-start sm:col-start-1 sm:row-start-1">
        {showLeague ? (
          <div className="mb-1.5 min-w-0">
            <span className="league-name-chip max-w-full">
              <span className="min-w-0 truncate" title={m.leagueNameAr}>
                {m.leagueNameAr}
              </span>
            </span>
          </div>
        ) : null}
        <MatchWhen
          iso={m.utcDate}
          variant="row"
          finished={finished}
          isLive={isLive}
          liveMinute={m.minute}
          liveStatusAr={m.liveStatusAr}
          hideRelative={hideRelative}
        />
      </div>

      {/* ٢ · المباراة */}
      <div className="col-span-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1">
        <TeamNamesInline
          homeName={m.homeNameAr}
          awayName={m.awayNameAr}
          homeCrestUrl={m.homeCrestUrl}
          awayCrestUrl={m.awayCrestUrl}
          score={currentScore}
        />
      </div>

      {/* ٣ · احتمال 1X2 */}
      <div className="col-span-2 min-w-0 sm:col-span-1 sm:col-start-3 sm:row-start-1">
        {hasPred ? (
          <ProbBar
            pHome={m.pHome!}
            pDraw={m.pDraw!}
            pAway={m.pAway!}
            compact
            showLabels={false}
          />
        ) : (
          <span className="block text-center text-[11px] text-faint">
            لا توقّع بعد
          </span>
        )}
      </div>

      {/* ٤ · الأرجح / أصاب·خالف */}
      <div className="flex items-start justify-end sm:col-start-4 sm:row-start-1 sm:items-center">
        <span className="inline-flex flex-col items-end gap-1">
          {pick ? (
            <span className={`pick-chip ${pickFill[pick.key]}`}>
              <span aria-hidden>{pickGlyph[pick.key]}</span>
              <span className="sr-only">الأرجح {pickName[pick.key]}</span>
              <span>{pct(pick.p)}</span>
            </span>
          ) : (
            <span className="text-xs text-faint" aria-hidden>
              —
            </span>
          )}
          {hit != null ? (
            <span
              className={`verdict-chip ${
                hit ? "verdict-chip-hit" : "verdict-chip-miss"
              }`}
            >
              {hit ? "أصاب" : "خالف"}
            </span>
          ) : null}
        </span>
      </div>
    </Link>
  );
}

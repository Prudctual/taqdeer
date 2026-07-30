import Link from "next/link";
import { Crest } from "./Crest";
import { formatShortDate } from "@/lib/format";
import type { MatchCard } from "@/lib/queries";

export function HeroMatchBanner({ match }: { match: MatchCard | null }) {
  if (!match) return null;

  const pHome = match.pHome ? Math.round(match.pHome * 100) : 48;
  const pDraw = match.pDraw ? Math.round(match.pDraw * 100) : 24;
  const pAway = match.pAway ? Math.round(match.pAway * 100) : 28;

  return (
    <div className="relative overflow-hidden rounded-2xl border-0 bg-surface p-5 sm:p-7 shadow-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left Info & Teams */}
        <div className="space-y-4 flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-accent">
            <span>🏆 {match.leagueNameAr}</span>
            <span className="text-faint">•</span>
            <span className="text-muted">{formatShortDate(match.utcDate)}</span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <Crest src={match.homeCrestUrl} alt={match.homeNameAr} size="md" />
              <span className="text-base sm:text-lg font-black text-ink">{match.homeNameAr}</span>
            </div>
            <span className="text-xs font-bold text-faint">ضد</span>
            <div className="flex items-center gap-3">
              <Crest src={match.awayCrestUrl} alt={match.awayNameAr} size="md" />
              <span className="text-base sm:text-lg font-black text-ink">{match.awayNameAr}</span>
            </div>
          </div>

          {/* Simple Probabilities Bar */}
          <div className="space-y-1.5 max-w-md">
            <div className="flex justify-between text-[11px] font-bold text-muted tabular">
              <span>فوز {match.homeNameAr} ({pHome}٪)</span>
              <span>تعادل ({pDraw}٪)</span>
              <span>فوز {match.awayNameAr} ({pAway}٪)</span>
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-panel">
              <div style={{ width: `${pHome}%` }} className="bg-home" />
              <div style={{ width: `${pDraw}%` }} className="bg-draw" />
              <div style={{ width: `${pAway}%` }} className="bg-away" />
            </div>
          </div>
        </div>

        {/* Right Action */}
        <div className="shrink-0">
          <Link
            href={`/match/${match.id}`}
            className="press-scale inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-xs font-extrabold text-white no-underline shadow-xs hover:bg-accent/90 transition-all"
          >
            <span>تحليل المباراة والتوقعات</span>
            <span>←</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

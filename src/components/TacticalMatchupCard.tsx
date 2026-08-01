import { SectionCard } from "./ui";
import { getTeamTactics } from "@/lib/team-tactics";

interface TacticalMatchupProps {
  homeTeam: string;
  awayTeam: string;
  tactics?: {
    home_formation?: string;
    away_formation?: string;
    home_style?: string;
    away_style?: string;
    matchup_commentary?: string;
  };
}

export function TacticalMatchupCard({
  homeTeam,
  awayTeam,
  tactics,
}: TacticalMatchupProps) {
  const hProf = getTeamTactics(homeTeam, true);
  const aProf = getTeamTactics(awayTeam, false);

  const hForm = tactics?.home_formation || hProf.formation;
  const aForm = tactics?.away_formation || aProf.formation;
  const hStyle = tactics?.home_style || hProf.style;
  const aStyle = tactics?.away_style || aProf.style;

  const commentary =
    tactics?.matchup_commentary ||
    `صراع تكتيكي بين أسلوب ${hForm} لـ ${homeTeam} (${hStyle}) وأسلوب ${aForm} لـ ${awayTeam} (${aStyle}).`;

  return (
    <SectionCard
      title="التحليل التكتيكي والتشكيلات المتوقعة"
      subtitle="مقارنة أنماط اللعب، التشكيلات، والتعارض التكتيكي بين أسلوبي الفريقين"
    >
      <div className="space-y-4 text-xs">
        {/* Formations & Style Comparison Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Home Team Card - Blue Header */}
          <div className="rounded-2xl border border-blue-500/20 bg-surface overflow-hidden space-y-0 shadow-2xs">
            <div className="flex items-center justify-between bg-blue-500/10 border-b border-blue-500/20 px-4 py-3 sm:px-5 sm:py-3.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-home" />
                <span className="font-black text-home text-sm sm:text-base">
                  {homeTeam}
                </span>
              </div>
              <span className="rounded-full bg-home text-on-fill px-2.5 py-0.5 text-[11px] font-extrabold shadow-2xs">
                المضيف
              </span>
            </div>

            <div className="p-4 sm:p-5 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-muted">التشكيلة المتوقعة</span>
                <span className="text-xl font-black text-home tabular font-mono">
                  {hForm}
                </span>
              </div>
              <div className="pt-2 border-t border-line">
                <span className="text-[11px] font-bold text-muted block mb-1">أسلوب اللعب:</span>
                <p className="text-xs font-semibold text-ink leading-relaxed">
                  {hStyle}
                </p>
              </div>
            </div>
          </div>

          {/* Away Team Card - Red Header */}
          <div className="rounded-2xl border border-danger/25 bg-surface overflow-hidden space-y-0 shadow-2xs">
            <div className="flex items-center justify-between bg-danger-dim border-b border-danger/25 px-4 py-3 sm:px-5 sm:py-3.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-danger" />
                <span className="font-black text-danger text-sm sm:text-base">
                  {awayTeam}
                </span>
              </div>
              <span className="rounded-full bg-danger text-on-fill px-2.5 py-0.5 text-[11px] font-extrabold shadow-2xs">
                الضيف
              </span>
            </div>

            <div className="p-4 sm:p-5 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-muted">التشكيلة المتوقعة</span>
                <span className="text-xl font-black text-danger tabular font-mono">
                  {aForm}
                </span>
              </div>
              <div className="pt-2 border-t border-line">
                <span className="text-[11px] font-bold text-muted block mb-1">أسلوب اللعب:</span>
                <p className="text-xs font-semibold text-ink leading-relaxed">
                  {aStyle}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tactical Matchup Commentary Banner */}
        <div className="rounded-2xl border border-line bg-panel/70 p-4 sm:p-5 space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="font-extrabold text-xs text-ink">ملاحظة التوافق التكتيكي:</span>
          </div>
          <p className="text-xs font-semibold text-muted leading-relaxed pe-2">
            {commentary}
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

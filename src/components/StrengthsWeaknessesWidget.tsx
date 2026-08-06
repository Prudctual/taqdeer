import { SectionCard } from "./ui";
import { getTeamTactics } from "@/lib/team-tactics";

interface StrengthsWeaknessesProps {
  homeTeam: string;
  awayTeam: string;
  homeSW?: { strengths: string[]; weaknesses: string[] };
  awaySW?: { strengths: string[]; weaknesses: string[] };
}

export function StrengthsWeaknessesWidget({
  homeTeam,
  awayTeam,
  homeSW,
  awaySW,
}: StrengthsWeaknessesProps) {
  const hProf = getTeamTactics(homeTeam, true);
  const aProf = getTeamTactics(awayTeam, false);

  const hStr = homeSW?.strengths || hProf.strengths;
  const hWeak = homeSW?.weaknesses || hProf.weaknesses;

  const aStr = awaySW?.strengths || aProf.strengths;
  const aWeak = awaySW?.weaknesses || aProf.weaknesses;

  return (
    <SectionCard
      title="مقارنة نقاط القوة ونقاط الضعف"
      subtitle="تفكيك تكتيكي مائل لأهم نقاط المفاضلة والخلل لكل جانب"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Home Team Card - Blue Header Bar */}
        <div className="rounded-2xl border border-blue-500/20 bg-surface overflow-hidden space-y-0 shadow-2xs">
          <div className="flex items-center justify-between bg-blue-500/10 border-b border-blue-500/20 px-4 py-3 sm:px-5 sm:py-3.5">
            <div className="flex items-center gap-2">
              <span className="font-black text-home text-sm sm:text-base">
                {homeTeam}
              </span>
            </div>
            <span className="rounded-full bg-home text-on-fill px-2.5 py-0.5 text-[11px] font-extrabold shadow-2xs">
              المضيف
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-3">
            {/* Strengths */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-ink">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/15 text-home font-mono text-[10px] font-bold">
                  +
                </span>
                <span>نقاط القوة</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {hStr.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-ink"
                  >
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weaknesses */}
            <div className="space-y-2 pt-2 border-t border-line">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-ink">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-draw-fill text-draw font-mono text-[10px] font-bold">
                  −
                </span>
                <span>نقاط الضعف</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {hWeak.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-muted"
                  >
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Away Team Card - Red Header Bar */}
        <div className="rounded-2xl border border-danger/25 bg-surface overflow-hidden space-y-0 shadow-2xs">
          <div className="flex items-center justify-between bg-danger-dim border-b border-danger/25 px-4 py-3 sm:px-5 sm:py-3.5">
            <div className="flex items-center gap-2">
              <span className="font-black text-danger text-sm sm:text-base">
                {awayTeam}
              </span>
            </div>
            <span className="rounded-full bg-danger text-on-fill px-2.5 py-0.5 text-[11px] font-extrabold shadow-2xs">
              الضيف
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-3">
            {/* Strengths */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-ink">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-danger-dim text-danger font-mono text-[10px] font-bold">
                  +
                </span>
                <span>نقاط القوة</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {aStr.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-ink"
                  >
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weaknesses */}
            <div className="space-y-2 pt-2 border-t border-line">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-ink">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-draw-fill text-draw font-mono text-[10px] font-bold">
                  −
                </span>
                <span>نقاط الضعف</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {aWeak.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-muted"
                  >
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

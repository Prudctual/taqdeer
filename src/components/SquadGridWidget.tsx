"use client";

import { SectionCard } from "./ui";
import { getTeamTactics, type PlayerProfile } from "@/lib/team-tactics";

interface PlayerInfo extends PlayerProfile {
  team: string;
  isHome: boolean;
  eloRating: string;
  xgImpact: string;
}

function getPlayersForTeam(teamName: string, isHome: boolean): PlayerInfo[] {
  const profile = getTeamTactics(teamName, isHome);
  return profile.starPlayers.map((p) => ({
    ...p,
    team: teamName,
    isHome,
    eloRating: p.rating,
    xgImpact: p.xg,
  }));
}

export function SquadGridWidget({
  homeTeam = "المضيف",
  awayTeam = "الضيف",
}: {
  homeTeam?: string;
  awayTeam?: string;
}) {
  const homePlayers = getPlayersForTeam(homeTeam, true);
  const awayPlayers = getPlayersForTeam(awayTeam, false);
  const allPlayers = [...homePlayers, ...awayPlayers];

  return (
    <SectionCard
      title={`تشكيلة الفرق ونجوم مباراة ${homeTeam} ضد ${awayTeam}`}
      subtitle="أبرز اللاعبين المؤثرين في تصنيفات الأداء والمساهمة المتوقعة للطرفين"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {allPlayers.map((p, idx) => (
          <div
            key={idx}
            className={`press-scale group relative overflow-hidden rounded-2xl border bg-surface p-4 shadow-2xs transition-all hover:border-line-strong cursor-pointer ${
              p.isHome ? "border-blue-500/25" : "border-rose-500/25"
            }`}
          >
            {/* Header bar blue for home, red for away */}
            <div
              className={`flex items-center justify-between border-b pb-3 ${
                p.isHome ? "border-blue-500/20" : "border-danger/25"
              }`}
            >
              <span className="text-xs font-bold text-muted">{p.position}</span>
              <span
                className={`text-xl font-black tabular font-mono ${
                  p.isHome ? "text-home" : "text-danger"
                }`}
              >
                #{p.number}
              </span>
            </div>

            {/* Official Real Player Portrait Photo Avatar or Clean Position Badge */}
            <div className="my-4 flex justify-center">
              <div
                className={`relative h-20 w-20 rounded-full border overflow-hidden shadow-md group-hover:scale-105 transition-transform ${
                  p.isHome ? "border-home/40 bg-home/15" : "border-danger/40 bg-danger-dim"
                }`}
              >
                {p.photoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={p.photoUrl}
                    alt={p.name}
                    className="h-full w-full object-cover object-center"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  style={{ display: p.photoUrl ? "none" : "flex" }}
                  className={`h-full w-full items-center justify-center font-mono font-black text-lg ${
                    p.isHome ? "text-home" : "text-danger"
                  }`}
                >
                  {p.initials}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="text-center space-y-0.5">
              <h3 className="text-sm font-black text-ink group-hover:text-accent transition-colors">
                {p.name}
              </h3>
              <div className="flex items-center justify-center gap-1.5 pt-0.5">
                <span className={`h-1.5 w-1.5 rounded-full ${p.isHome ? "bg-home" : "bg-danger"}`} />
                <p className="text-xs font-semibold text-muted">{p.team}</p>
              </div>
            </div>

            {/* Stats Footer */}
            <div className="mt-4 pt-3 border-t border-line grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-panel p-2 rounded-xl border border-line">
                <span className="text-[10px] font-bold text-muted block">تصنيف Elo</span>
                <span className="font-mono font-black text-ink text-xs tabular">{p.eloRating}</span>
              </div>
              <div className="bg-panel p-2 rounded-xl border border-line">
                <span className="text-[10px] font-bold text-muted block">تأثير xG</span>
                <span className="font-mono font-black text-success text-xs tabular">
                  {p.xgImpact}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

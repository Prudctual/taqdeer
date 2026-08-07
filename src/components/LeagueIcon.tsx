import Image from "next/image";

export function LeagueIcon({ leagueId, className = "w-8 h-8" }: { leagueId?: string | null; className?: string }) {
  const tone = leagueId?.toLowerCase();

  const LEAGUE_PNGS: Record<string, string> = {
    pl: "/crests/pl-league.png",
    pd: "/crests/pd-league.png",
    bl1: "/crests/bl1-league.png",
    sa: "/crests/sa-league.png",
    fl1: "/crests/fl1-league.png",
  };

  if (tone && LEAGUE_PNGS[tone]) {
    return (
      <Image
        src={LEAGUE_PNGS[tone]}
        alt={tone}
        width={64}
        height={64}
        className={`${className} object-contain filter drop-shadow-md`}
        unoptimized
      />
    );
  }

  // 7. كل المباريات - All Matches
  return (
    <span className="px-1 text-center text-[12px] sm:text-[13px] font-black leading-tight text-zinc-950 tracking-tight select-none">
      كل المباريات
    </span>
  );
}

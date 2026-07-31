import { SectionCard } from "./ui";
import { getMatchDetailedInfo } from "@/lib/match-details";

interface LogisticsWidgetProps {
  matchId?: string;
  leagueId?: string;
  homeTeamId?: string;
  homeTeamNameAr?: string;
  refereeName?: string | null;
  logistics?: {
    travel_distance_km?: number;
    pitch_surface?: string;
    is_european_midweek?: boolean;
    logistics_summary?: string;
  };
}

export function LogisticsWidget({
  matchId = "",
  leagueId = "",
  homeTeamId = "",
  homeTeamNameAr = "المضيف",
  refereeName,
  logistics,
}: LogisticsWidgetProps) {
  const info = getMatchDetailedInfo(
    homeTeamId,
    homeTeamNameAr,
    matchId,
    refereeName,
    leagueId
  );
  const distance = logistics?.travel_distance_km ?? info.travelDistanceKm;
  const summary =
    logistics?.logistics_summary ??
    `ظروف مباراة جديدة في ${info.stadiumName} بقيادة ${info.refereeName}.`;

  return (
    <SectionCard
      title="تفاصيل المباراة والملعب والتحكيم والطقس"
      subtitle={summary}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* 1. Stadium & Pitch Location - Blue Theme */}
        <div className="rounded-2xl border border-blue-500/30 bg-surface overflow-hidden shadow-2xs">
          <div className="bg-blue-500/10 border-b border-blue-500/20 px-3.5 py-2 flex items-center justify-between">
            <span className="text-xs font-black text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <span>🏟️</span>
              <span>الملعب والموقع</span>
            </span>
            <span className="rounded-full bg-blue-600 text-white px-2 py-0.5 text-[10px] font-extrabold">
              مكان المباراة
            </span>
          </div>
          <div className="p-3.5 space-y-1 bg-surface text-start">
            <div className="text-sm font-black text-ink truncate">
              {info.stadiumName}
            </div>
            <p className="text-[11px] font-semibold text-muted">
              مسافة السفر: <strong className="text-ink font-bold">{distance} كم</strong>
            </p>
          </div>
        </div>

        {/* 2. Referee & Strictness - Purple Theme */}
        <div className="rounded-2xl border border-purple-500/30 bg-surface overflow-hidden shadow-2xs">
          <div className="bg-purple-500/10 border-b border-purple-500/20 px-3.5 py-2 flex items-center justify-between">
            <span className="text-xs font-black text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <span>⚖️</span>
              <span>التحكيم وحكم المباراة</span>
            </span>
            <span className="rounded-full bg-purple-600 text-white px-2 py-0.5 text-[10px] font-extrabold">
              الصرامة
            </span>
          </div>
          <div className="p-3.5 space-y-1 bg-surface text-start">
            <div className="text-sm font-black text-ink truncate">
              {info.refereeName}
            </div>
            <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 truncate">
              {info.refereeStrictness}
            </p>
          </div>
        </div>

        {/* 3. Goal Expectation & Market Liquidity - Emerald Theme */}
        <div className="rounded-2xl border border-emerald-500/30 bg-surface overflow-hidden shadow-2xs">
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-3.5 py-2 flex items-center justify-between">
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span>⚽</span>
              <span>توقع الأهداف والسيولة</span>
            </span>
            <span className="rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-extrabold">
              الأهداف
            </span>
          </div>
          <div className="p-3.5 space-y-1 bg-surface text-start">
            <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
              توقع الأهداف: <strong className="text-ink font-black">{info.goalExpectation}</strong>
            </div>
            <p className="text-[11px] font-semibold text-muted">
              اتجاه المراهنات: <strong className="text-ink font-bold">{info.bettingTrend}</strong>
            </p>
          </div>
        </div>

        {/* 4. Weather & Pitch Condition - Amber Theme */}
        <div className="rounded-2xl border border-amber-500/30 bg-surface overflow-hidden shadow-2xs">
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-3.5 py-2 flex items-center justify-between">
            <span className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <span>🌤️</span>
              <span>حالة الطقس والملعب</span>
            </span>
            <span className="rounded-full bg-amber-600 text-white px-2 py-0.5 text-[10px] font-extrabold">
              الطقس
            </span>
          </div>
          <div className="p-3.5 space-y-1 bg-surface text-start">
            <div className="text-xs font-black text-amber-600 dark:text-amber-400">
              الطقس: <strong className="text-ink font-black">{info.weatherCondition}</strong>
            </div>
            <p className="text-[11px] font-semibold text-muted truncate">
              {info.pitchSurface}
            </p>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

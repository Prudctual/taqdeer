import { SectionCard } from "./ui";
import { getMatchDetailedInfo } from "@/lib/match-details";

interface LogisticsWidgetProps {
  homeTeamId?: string;
  homeTeamNameAr?: string;
  refereeName?: string | null;
  logistics?: {
    travel_distance_km?: number;
    rest_days_home?: number;
    rest_days_away?: number;
    is_european_midweek?: boolean;
    logistics_summary?: string;
  };
  weather?: {
    tempC?: number | null;
    precipMm?: number | null;
    windKmh?: number | null;
    summary?: string | null;
    multiplier?: number | null;
  } | null;
  refereeSummary?: string | null;
}

/**
 * تفاصيل واقعية: ملعب، حكم، طقس Open-Meteo، راحة — بلا اختلاق.
 */
export function LogisticsWidget({
  homeTeamId = "",
  homeTeamNameAr = "المضيف",
  refereeName,
  logistics,
  weather,
  refereeSummary,
}: LogisticsWidgetProps) {
  const info = getMatchDetailedInfo(homeTeamId, homeTeamNameAr, refereeName);
  const summary =
    logistics?.logistics_summary ?? `تقام المباراة في ${info.stadiumName}.`;

  return (
    <SectionCard title="تفاصيل الملعب والتحكيم والطقس" subtitle={summary}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="rounded-2xl border border-blue-500/30 bg-surface overflow-hidden shadow-2xs">
          <div className="bg-blue-500/10 border-b border-blue-500/20 px-3.5 py-2">
            <span className="text-xs font-black text-home">الملعب</span>
          </div>
          <div className="p-3.5 space-y-1 text-start">
            <div className="text-sm font-black text-ink truncate">{info.stadiumName}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-accent/30 bg-surface overflow-hidden shadow-2xs">
          <div className="bg-accent-dim border-b border-accent/25 px-3.5 py-2">
            <span className="text-xs font-black text-accent">الحكم</span>
          </div>
          <div className="p-3.5 space-y-1 text-start">
            <div className="text-sm font-black text-ink truncate">
              {info.refereeName ?? "لم يُعلن بعد"}
            </div>
            {refereeSummary ? (
              <p className="text-[11px] font-semibold text-muted">{refereeSummary}</p>
            ) : !info.refereeName ? (
              <p className="text-[11px] font-semibold text-muted">يُحدَّث فور الإعلان</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-sky-500/30 bg-surface overflow-hidden shadow-2xs">
          <div className="bg-sky-500/10 border-b border-sky-500/20 px-3.5 py-2">
            <span className="text-xs font-black text-sky-600 dark:text-sky-400">الطقس</span>
          </div>
          <div className="p-3.5 space-y-1 text-start">
            {weather?.summary || weather?.tempC != null ? (
              <>
                <div className="text-sm font-black text-ink">
                  {weather.summary ??
                    `${weather.tempC?.toFixed?.(0) ?? weather.tempC}°C`}
                </div>
                {weather.multiplier != null ? (
                  <p className="text-[11px] font-semibold text-muted tabular">
                    مضاعف الأهداف ×{Number(weather.multiplier).toFixed(3)}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-xs font-bold text-muted">غير متاح بعد</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-success/30 bg-surface overflow-hidden shadow-2xs">
          <div className="bg-success-dim border-b border-success/25 px-3.5 py-2">
            <span className="text-xs font-black text-success">الراحة</span>
          </div>
          <div className="p-3.5 space-y-1 text-start">
            {logistics?.rest_days_home != null || logistics?.rest_days_away != null ? (
              <div className="text-xs font-black text-ink space-y-0.5">
                {logistics?.rest_days_home != null && (
                  <p>
                    مضيف:{" "}
                    <strong className="tabular">{logistics.rest_days_home} يوم</strong>
                  </p>
                )}
                {logistics?.rest_days_away != null && (
                  <p>
                    ضيف:{" "}
                    <strong className="tabular">{logistics.rest_days_away} يوم</strong>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs font-bold text-muted">لا بيانات راحة</p>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

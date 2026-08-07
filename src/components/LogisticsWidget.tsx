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
}

/**
 * تفاصيل واقعية فقط: الملعب، الحكم المعلن، وملخص اللوجستيات من محرك التوقعات.
 * البيانات غير المتاحة تُعرض كذلك صراحةً — لا طقس ولا مسافات ولا سيولة مخترعة.
 */
export function LogisticsWidget({
  homeTeamId = "",
  homeTeamNameAr = "المضيف",
  refereeName,
  logistics,
}: LogisticsWidgetProps) {
  const info = getMatchDetailedInfo(homeTeamId, homeTeamNameAr, refereeName);
  const summary =
    logistics?.logistics_summary ?? `تقام المباراة في ${info.stadiumName}.`;

  return (
    <SectionCard title="تفاصيل الملعب والتحكيم واللوجستيات" subtitle={summary}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        {/* الملعب */}
        <div className="rounded-2xl border border-blue-500/30 bg-surface overflow-hidden shadow-2xs">
          <div className="bg-blue-500/10 border-b border-blue-500/20 px-3.5 py-2 flex items-center justify-between">
            <span className="text-xs font-black text-home flex items-center gap-1.5">
              <span>🏟️</span>
              <span>الملعب والموقع</span>
            </span>
            <span className="rounded-full bg-home text-on-fill px-2 py-0.5 text-[10px] font-extrabold">
              مكان المباراة
            </span>
          </div>
          <div className="p-3.5 space-y-1 bg-surface text-start">
            <div className="text-sm font-black text-ink truncate">
              {info.stadiumName}
            </div>
            {logistics?.travel_distance_km != null && (
              <p className="text-[11px] font-semibold text-muted">
                مسافة سفر الضيف:{" "}
                <strong className="text-ink font-bold">
                  {logistics.travel_distance_km} كم
                </strong>
              </p>
            )}
          </div>
        </div>

        {/* التحكيم */}
        <div className="rounded-2xl border border-purple-500/30 bg-surface overflow-hidden shadow-2xs">
          <div className="bg-accent-dim border-b border-accent/25 px-3.5 py-2 flex items-center justify-between">
            <span className="text-xs font-black text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <span>⚖️</span>
              <span>حكم المباراة</span>
            </span>
            <span className="rounded-full bg-accent text-on-fill px-2 py-0.5 text-[10px] font-extrabold">
              التحكيم
            </span>
          </div>
          <div className="p-3.5 space-y-1 bg-surface text-start">
            <div className="text-sm font-black text-ink truncate">
              {info.refereeName ?? "لم يُعلن بعد"}
            </div>
            {!info.refereeName && (
              <p className="text-[11px] font-semibold text-muted">
                يُحدَّث تلقائياً فور إعلان طاقم التحكيم
              </p>
            )}
          </div>
        </div>

        {/* الراحة واللوجستيات */}
        <div className="rounded-2xl border border-success/30 bg-surface overflow-hidden shadow-2xs">
          <div className="bg-success-dim border-b border-success/25 px-3.5 py-2 flex items-center justify-between">
            <span className="text-xs font-black text-success flex items-center gap-1.5">
              <span>🧳</span>
              <span>الراحة واللوجستيات</span>
            </span>
            <span className="rounded-full bg-success text-on-fill px-2 py-0.5 text-[10px] font-extrabold">
              الجاهزية
            </span>
          </div>
          <div className="p-3.5 space-y-1 bg-surface text-start">
            {logistics?.rest_days_home != null || logistics?.rest_days_away != null ? (
              <div className="text-xs font-black text-ink space-y-0.5">
                {logistics?.rest_days_home != null && (
                  <p>
                    راحة المضيف:{" "}
                    <strong className="tabular">{logistics.rest_days_home} يوم</strong>
                  </p>
                )}
                {logistics?.rest_days_away != null && (
                  <p>
                    راحة الضيف:{" "}
                    <strong className="tabular">{logistics.rest_days_away} يوم</strong>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs font-bold text-muted">
                {logistics?.is_european_midweek
                  ? "أسبوع مزدحم بمشاركة أوروبية"
                  : "لا عوامل لوجستية مؤثرة مسجلة"}
              </p>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

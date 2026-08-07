"use client";

import { useMemo } from "react";

interface LeagueAccuracyData {
  leagueId: string;
  leagueNameAr: string;
  accuracy: number; // e.g. 0.485 for 48.5%
  brier: number;
  matches: number;
}

export function LeagueAccuracyChart({
  perLeague = [],
}: {
  perLeague?: LeagueAccuracyData[];
}) {
  // بيانات حقيقية فقط من model_metrics — لا أرقام افتراضية مختلقة
  const data = perLeague;

  const maxAcc = useMemo(() => {
    return Math.max(...data.map((d) => d.accuracy), 0.6);
  }, [data]);

  const avgAcc = useMemo(() => {
    if (data.length === 0) return null;
    const totalMatches = data.reduce((n, d) => n + d.matches, 0);
    if (totalMatches === 0) return null;
    return data.reduce((s, d) => s + d.accuracy * d.matches, 0) / totalMatches;
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6 text-center space-y-1 shadow-2xs">
        <h3 className="text-sm font-black text-ink">دقة النموذج حسب الدوري</h3>
        <p className="text-xs font-semibold text-muted">
          لا مقاييس دقة متاحة بعد — تُحسب تلقائياً بعد اكتمال دورة التدريب القادمة.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6 space-y-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-black text-ink">
              دقة النموذج حسب الدوري (Walk-Forward)
            </h3>
          </div>
          <p className="text-xs font-semibold text-muted">
            مقارنة نسبة دقة توقّع الفائز (1X2) لكل دوري في آخر 82 مباراة اختبار مستقِلة
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-home font-extrabold text-xs">
          <span>دقة النموذج الأعلى أفضل</span>
        </div>
      </div>

      {/* Horizontal Bars Chart Container */}
      <div className="space-y-3.5 pt-2">
        {data.map((item) => {
          const pctVal = (item.accuracy * 100).toFixed(1);
          const barWidth = `${(item.accuracy / maxAcc) * 100}%`;

          const barColor =
            item.accuracy >= 0.48
              ? "bg-home"
              : item.accuracy >= 0.44
              ? "bg-accent"
              : "bg-warn";

          return (
            <div key={item.leagueId} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-ink font-black flex items-center gap-2">
                  <span>{item.leagueNameAr}</span>
                  <span className="text-[10px] font-bold text-muted">({item.matches} مباراة)</span>
                </span>
                <span className="font-mono font-black text-ink tabular text-sm">
                  {pctVal}%
                </span>
              </div>

              {/* Bar track */}
              <div className="h-7 w-full rounded-xl bg-surface border border-line p-1 relative overflow-hidden flex items-center">
                <div
                  className={`h-full rounded-lg ${barColor} transition-all duration-500 flex items-center justify-end px-2`}
                  style={{ width: barWidth }}
                >
                  <span className="text-[10px] font-black text-on-fill font-mono opacity-90">
                    {pctVal}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-line flex flex-wrap items-center justify-between text-xs text-muted font-semibold gap-2">
        <span>خط الأساس العشوائي المستهدف: 33.3% لكل نتيجة</span>
        {avgAcc != null && (
          <span className="font-mono font-black text-ink">
            متوسط الدقة العام: {(avgAcc * 100).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

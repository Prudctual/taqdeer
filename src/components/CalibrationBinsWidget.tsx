"use client";

import { useState } from "react";
import { pct, pctCss } from "@/lib/format";
import type { CalibrationSummary } from "@/lib/queries";

export function CalibrationBinsWidget({
  data,
}: {
  data: CalibrationSummary;
}) {
  const [activeTab, setActiveTab] = useState<"table" | "insights">("table");
  const { bins, totalMatches, totalCorrect, overallWinRate, ece } = data;

  if (!bins || bins.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-2xs space-y-0">
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-line bg-panel space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-home font-semibold text-[11px]">
              منحنى الموثوقية والمعايرة الاحتمالية
            </span>
            <span className="text-[11px] font-bold text-muted bg-surface px-2.5 py-0.5 rounded-full border border-line">
              Reliability Curve (ECE: {(ece * 100).toFixed(1)}%)
            </span>
          </div>

          <div className="flex items-center gap-1 bg-surface p-0.5 rounded-lg border border-line">
            <button
              type="button"
              onClick={() => setActiveTab("table")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "table"
                  ? "bg-accent text-on-fill shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              جدول الفئات ({bins.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("insights")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "insights"
                  ? "bg-accent text-on-fill shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              تحليل العتبات والمصائد
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-semibold text-ink tracking-tight">
            معايرة فئات الاحتمالات (Probability Calibration Bins)
          </h2>
          <p className="text-xs font-medium text-muted leading-relaxed max-w-3xl">
            النموذج المُعاير جيداً يفترض أن نسبة النجاح الفعلية تقترب من متوسط الاحتمالات التي يعطيها. نقسم التوقعات هنا إلى شرائح احتمالية صارمة لمراقبة سلوك النموذج واكتشاف العتبات الفاصلة.
          </p>
        </div>

        {/* Aggregate Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-line">
          <div className="rounded-xl border border-line bg-surface p-2.5 space-y-0.5">
            <span className="text-[10px] font-bold text-muted block">عينة المباريات المقيمة</span>
            <span className="text-base font-semibold text-ink font-mono tabular">{totalMatches} مباراة</span>
          </div>
          <div className="rounded-xl border border-line bg-surface p-2.5 space-y-0.5">
            <span className="text-[10px] font-bold text-muted block">التوقعات الصائبة</span>
            <span className="text-base font-semibold text-success font-mono tabular">{totalCorrect} ({pct(overallWinRate, 1)})</span>
          </div>
          <div className="rounded-xl border border-line bg-surface p-2.5 space-y-0.5">
            <span className="text-[10px] font-bold text-muted block">خطأ المعايرة المتوقع (ECE)</span>
            <span className="text-base font-semibold text-home font-mono tabular">{(ece * 100).toFixed(2)}%</span>
          </div>
          <div className="rounded-xl border border-line bg-surface p-2.5 space-y-0.5">
            <span className="text-[10px] font-bold text-muted block">عتبة الأمان الإحصائية</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block pt-0.5">50%–55%+ قفزة دقة</span>
          </div>
        </div>
      </div>

      {activeTab === "table" ? (
        <div className="overflow-x-auto p-4 sm:p-5">
          <table className="w-full text-xs text-start border-collapse">
            <caption className="sr-only">جدول معايرة فئات الاحتمالات لنموذج تقدير</caption>
            <thead>
              <tr className="border-b border-line text-muted text-[11px] font-bold">
                <th scope="col" className="py-2.5 px-3 text-start">شريحة الاحتمال</th>
                <th scope="col" className="py-2.5 px-3 text-center">المباريات (N)</th>
                <th scope="col" className="py-2.5 px-3 text-center">الصحيحة (Hits)</th>
                <th scope="col" className="py-2.5 px-3 text-center">نسبة النجاح الفعلية</th>
                <th scope="col" className="py-2.5 px-3 text-center">متوسط احتمال النموذج</th>
                <th scope="col" className="py-2.5 px-3 text-center">فارق المعايرة (Gap)</th>
                <th scope="col" className="py-2.5 px-4 text-start">محاذاة الاحتمال والواقع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {bins.map((b) => {
                const isTippingPoint = b.label.includes("50–54.9%") || b.label.includes("55–59.9%");
                const isHighConfidence = b.label.includes("60–") || b.label.includes("70–") || b.label.includes("80");
                const gap = b.calibrationError;
                const isWellCalibrated = gap <= 0.06;

                return (
                  <tr
                    key={b.label}
                    className={`hover:bg-panel/50 transition-colors ${
                      isTippingPoint ? "bg-emerald-500/5 font-semibold" : ""
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-ink">{b.label}</span>
                        {isTippingPoint && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
                            عتبة التحول
                          </span>
                        )}
                        {isHighConfidence && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-500/20 text-home font-bold">
                            ثقة عالية
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-ink tabular">
                      {b.nMatches}
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-muted tabular">
                      {b.nCorrect}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-mono font-bold tabular ${
                          b.winRate >= 0.60
                            ? "text-success"
                            : b.winRate >= 0.50
                            ? "text-home"
                            : "text-muted"
                        }`}
                      >
                        {b.nMatches > 0 ? pct(b.winRate, 1) : "—"}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-ink tabular">
                      {b.nMatches > 0 ? pct(b.meanProb, 1) : "—"}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-mono font-bold tabular ${
                          isWellCalibrated ? "text-success" : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {b.nMatches > 0 ? `${(gap * 100).toFixed(1)}%` : "—"}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {b.nMatches > 0 ? (
                        <div className="space-y-1 w-28">
                          <div className="flex items-center justify-between text-[9px] font-mono text-muted">
                            <span>واقع: {(b.winRate * 100).toFixed(0)}%</span>
                            <span>نموذج: {(b.meanProb * 100).toFixed(0)}%</span>
                          </div>
                          <div className="relative h-2 w-full rounded-full bg-panel overflow-hidden border border-line">
                            {/* Mean predicted bar */}
                            <div
                              className="absolute top-0 bottom-0 start-0 bg-blue-500/40 rounded-full"
                              style={{ width: pctCss(b.meanProb) }}
                            />
                            {/* Actual win rate bar */}
                            <div
                              className="absolute top-0 bottom-0 start-0 bg-success rounded-full"
                              style={{ width: pctCss(b.winRate) }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted font-mono text-[10px]">لا توجد مباريات</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 sm:p-5 space-y-4 text-xs font-semibold leading-relaxed">
          <div className="rounded-xl border border-line bg-panel p-4 space-y-2">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5">
              <span>🎯</span>
              <span>عتبة 50%–55%: النقطة الفاصلة في سلوك النموذج</span>
            </h3>
            <p className="text-muted text-[11px] leading-relaxed">
              تُظهر بيانات الاختبار أن الشريحة بين 40–49.9% تعكس مباريات متكافئة لا تتجاوز نسبة نجاحها 40% (وهي تشبه القرعة وتتطلب سعراً مرتفعاً لتحقيق قيمة). بينما تبدأ دقة النموذج بالصعود الحاد والمستقر بمجرد تخطي عتبة 50%، وتصل إلى قمم تجاوزت 70%–100% في الفئات الأعلى.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-panel p-4 space-y-2">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5">
              <span>⚠️</span>
              <span>فحص معايرة الرهانات المفاجئة (مثل فورتونا +240)</span>
            </h3>
            <p className="text-muted text-[11px] leading-relaxed">
              عندما يُعطي النموذج نسبة 50.5% لفريق في حين أن سعر السوق يضعه عند +240 (احتمال ضمني 29.4%)، فإن هذا الفارق الضخم (+21% Edge) قد يبدو كفرصة ذهبية. لكن المعايرة هنا هي الفيصل: إذا كان النموذج يميل تاريخياً لتضخيم احتمالات هذه الفئة، فإن هذا الـEdge قد يكون وهماً إحصائياً. لذلك نربط مؤشر الاختيار دائماً بحجم المعايرة التاريخية قبل اعتماده في الرهانات التجميعية.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-panel p-4 space-y-2">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5">
              <span>🛡️</span>
              <span>الفرق بين «أعلى احتمال» و«أفضل قيمة»</span>
            </h3>
            <p className="text-muted text-[11px] leading-relaxed">
              فريق مثل برشلونة قد يحظى باحتمال فوز مرتفع نسبياً (54.4%)، لكن سعره في السوق (-400) يفرض عليك أن تكون فرصة فوزه 80% لتحقيق ربح متوازن! إدراجه في تجميعة أو رهان فردي يخلق فارقاً سالباً فادحاً (-25.6% Edge). الاستراتيجية المتوازنة تستبعد مثل هذه الخيارات فوراً وتبحث عن التوافق الإيجابي بين الاحتمال والسعر.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

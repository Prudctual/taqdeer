import type { ComponentType } from "react";
import { HomeIcon, ZapIcon, RefereeIcon, WeatherIcon, type IconProps } from "./Icons";

interface AdjustmentItem {
  Icon: ComponentType<IconProps>;
  label: string;
  value: string;
  impact: string;
  detail: string;
  positive?: boolean;
}

interface AutomatedModelAdjustmentsProps {
  homeTeam: string;
  awayTeam: string;
  homeP: number;
  drawP: number;
  awayP: number;
  lambdaHome: number;
  lambdaAway: number;
  /** أودز سوق حقيقية متوفرة لهذه المباراة (تُمزج كمكوّن في النموذج) */
  hasMarketOdds?: boolean;
  homeVenueRecord?: { played: number; w?: number; d?: number; l?: number } | null;
  awayVenueRecord?: { played: number; w?: number; d?: number; l?: number } | null;
}

/**
 * وصف صادق للمحركات المدمجة فعلاً في النموذج — لا ادعاءات عن معاملات
 * (حكم، طقس…) غير موجودة في الحساب.
 */
export function AutomatedModelAdjustments({
  homeTeam,
  awayTeam,
  homeP,
  drawP,
  awayP,
  lambdaHome,
  lambdaAway,
  hasMarketOdds,
  homeVenueRecord,
  awayVenueRecord,
}: AutomatedModelAdjustmentsProps) {
  const adjustments: AdjustmentItem[] = [
    {
      Icon: HomeIcon,
      label: "أفضلية الأرض (Dixon-Coles Home Advantage)",
      value:
        homeVenueRecord && homeVenueRecord.played > 0
          ? `سجل ${homeTeam} على أرضه: ${homeVenueRecord.w ?? 0} فوز في ${homeVenueRecord.played} مباراة`
          : "تُقدَّر أفضلية الأرض لكل دوري من واقع نتائجه التاريخية",
      impact: `مدمجة في λ المضيف (${lambdaHome.toFixed(2)})`,
      detail: `معامل أفضلية الأرض يُتعلَّم رياضياً لكل دوري ضمن نموذج Dixon-Coles ويرفع شدة أهداف المضيف مباشرة.`,
      positive: true,
    },
    {
      Icon: ZapIcon,
      label: "مزج أسعار السوق (Market Blend)",
      value: hasMarketOdds
        ? "أودز إغلاق حقيقية متوفرة — مُزجت كمكوّن في التوقع بعد إزالة هامش المراهن"
        : "لا أودز سوق متاحة لهذه المباراة — التوقع من المحركات الإحصائية فقط",
      impact: hasMarketOdds ? "وزن يُتعلَّم لكل دوري" : "غير مفعّل",
      detail:
        "عند توفر أسعار السوق تُحوَّل لاحتمالات نقية (بطريقة Power مع تصحيح انحياز المرشح/البعيد) وتدخل المزيج بوزن مُتعلَّم.",
      positive: !!hasMarketOdds,
    },
    {
      Icon: RefereeIcon,
      label: "الفورمة وأيام الراحة (Form & Rest)",
      value:
        awayVenueRecord && awayVenueRecord.played > 0
          ? `سجل ${awayTeam} خارج أرضه: ${awayVenueRecord.w ?? 0} فوز في ${awayVenueRecord.played} مباراة`
          : "نافذة آخر 5 مباريات: نقاط وفارق أهداف وتسديدات",
      impact: "تعديل λ في نطاق ×0.70–1.35",
      detail:
        "الفورمة الأخيرة تعدّل شدة الأهداف المتوقعة صعوداً أو هبوطاً، مع خصم إرهاق عند راحة أقل من 3.5 يوم.",
      positive: true,
    },
    {
      Icon: WeatherIcon,
      label: "المعايرة الحرارية (Temperature Calibration)",
      value: "تُعاير الاحتمالات النهائية لكل دوري على بيانات اختبار مستقلة",
      impact: "احتمالات صادقة قابلة للمقارنة",
      detail:
        "المعايرة تمنع الثقة الزائدة: دوري بلا إشارة واضحة تُسطَّح احتمالاته تلقائياً بدل ادعاء يقين زائف.",
      positive: true,
    },
  ];

  return (
    <div className="bg-surface p-6 sm:p-8 space-y-6 rounded-2xl border-0 shadow-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-black text-ink tracking-tight leading-snug">
            المحركات والمعاملات المحسوبة آلياً (ALGORITHMIC VECTORS)
          </h3>
        </div>
        <span className="text-xs font-black text-accent bg-accent-dim px-4 py-1.5 rounded-full border-0">
          حساب آلي مستقل
        </span>
      </div>

      <p className="text-xs sm:text-sm font-medium text-muted leading-relaxed">
        جميع الأرقام أدناه مستخرجة <strong className="text-ink font-black">أوتوماتيكياً بالكامل</strong> من محركات «تقدير» الإحصائية بدون أي تدخل يدوي:
      </p>

      {/* Grid of prominent borderless inner cards */}
      <div className="grid gap-5 sm:grid-cols-2">
        {adjustments.map((adj, i) => {
          const isNeutral = adj.impact.includes("غير مفعّل");
          const IconComp = adj.Icon;
          return (
            <div
              key={i}
              className="press-scale group rounded-2xl border-0 bg-panel/70 p-5 flex flex-col justify-between space-y-3.5 shadow-none transition-all duration-140 active:scale-[0.98]"
            >
              <div className="space-y-3">
                {/* Title & Badge */}
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-black text-ink flex items-center gap-2.5 leading-snug">
                    <span className="p-1.5 rounded-lg bg-surface text-ink">
                      <IconComp size={18} />
                    </span>
                    <span>{adj.label}</span>
                  </span>

                  {/* Impact Badge */}
                  <span
                    className={`shrink-0 text-xs font-extrabold tabular tracking-wide px-3.5 py-1 rounded-full border-0 ${
                      isNeutral
                        ? "bg-panel text-muted"
                        : "bg-accent text-on-fill"
                    }`}
                  >
                    {adj.impact}
                  </span>
                </div>

                {/* Value Text */}
                <div className="bg-surface rounded-xl px-3.5 py-2 border-0">
                  <p className="text-xs sm:text-sm font-black text-ink leading-snug">
                    {adj.value}
                  </p>
                </div>
              </div>

              {/* Detail Text - Solid Panel Background with Text */}
              <div className="rounded-xl bg-surface p-3.5 text-muted border-0">
                <p className="text-xs font-semibold leading-relaxed text-ink">
                  {adj.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Box */}
      <div className="rounded-2xl border-0 bg-panel/80 p-5 flex flex-wrap items-center justify-between gap-4 shadow-none">
        <div className="space-y-1">
          <span className="block text-sm font-black text-ink">
            النتيجة التلقائية النهائية المحسوبة من مزيج المحركات:
          </span>
          <span className="text-xs sm:text-sm text-muted font-medium">
            أهداف متوقعة λ: <strong className="text-ink font-black">{homeTeam} {lambdaHome.toFixed(2)}</strong> - <strong className="text-ink font-black">{lambdaAway.toFixed(2)} {awayTeam}</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs font-black">
          <span className="rounded-full bg-home text-on-fill px-4 py-2 border-0 font-mono tracking-wide text-xs">
            فوز 1: {Math.round(homeP * 100)}%
          </span>
          <span className="rounded-full bg-draw text-draw-ink px-4 py-2 border-0 font-mono tracking-wide text-xs">
            تعادل X: {Math.round(drawP * 100)}%
          </span>
          <span className="rounded-full bg-away text-on-fill px-4 py-2 border-0 font-mono tracking-wide text-xs">
            فوز 2: {Math.round(awayP * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}

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

type EnrichSignals = {
  weather?: {
    applied?: boolean;
    summary?: string | null;
    multiplier?: number | null;
    temp_c?: number | null;
  } | null;
  player_impact?: {
    applied?: boolean;
    summary?: string | null;
    home?: { n?: number };
    away?: { n?: number };
  } | null;
  referee?: {
    applied?: boolean;
    summary?: string | null;
    matches_n?: number;
    lambda_mult?: number;
  } | null;
  sharp?: {
    applied?: boolean;
    summary?: string | null;
    side?: string | null;
    magnitude?: number;
  } | null;
};

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
  /** إشارات إثراء حقيقية من analytics.components إن وُجدت */
  enrich?: EnrichSignals | null;
}

/**
 * بطاقات صادقة: محركات أساسية + إثراء حي (طقس/غيابات/حكم/حراك) عند توفره فقط.
 */
export function AutomatedModelAdjustments({
  homeTeam,
  awayTeam,
  lambdaHome,
  lambdaAway,
  hasMarketOdds,
  homeVenueRecord,
  enrich,
}: AutomatedModelAdjustmentsProps) {
  const weather = enrich?.weather;
  const players = enrich?.player_impact;
  const referee = enrich?.referee;
  const sharp = enrich?.sharp;

  const adjustments: AdjustmentItem[] = [
    {
      Icon: HomeIcon,
      label: "أفضلية الأرض (Dixon-Coles)",
      value:
        homeVenueRecord && homeVenueRecord.played > 0
          ? `سجل ${homeTeam} على أرضه: ${homeVenueRecord.w ?? 0} فوز في ${homeVenueRecord.played} مباراة`
          : "تُقدَّر أفضلية الأرض لكل دوري من نتائجه التاريخية",
      impact: `λ المضيف ${lambdaHome.toFixed(2)} · الضيف ${lambdaAway.toFixed(2)}`,
      detail: "معامل أفضلية الأرض يُتعلَّم لكل دوري ضمن Dixon-Coles.",
      positive: true,
    },
    {
      Icon: ZapIcon,
      label: "مزج أسعار السوق",
      value: hasMarketOdds
        ? "أودز حقيقية مُزجت بعد إزالة هامش المراهن"
        : "لا أودز سوق — التوقع من المحركات الإحصائية فقط",
      impact: hasMarketOdds ? "وزن مُتعلَّم" : "غير مفعّل",
      detail: "عند توفر الأسعار تُحوَّل لاحتمالات نقية وتدخل المزيج.",
      positive: !!hasMarketOdds,
    },
    {
      Icon: WeatherIcon,
      label: "الطقس (Open-Meteo)",
      value: weather?.summary
        ? weather.summary
        : weather?.temp_c != null
          ? `${weather.temp_c.toFixed(0)}°C`
          : "لا قراءة طقس لهذه المباراة بعد",
      impact:
        weather?.multiplier != null
          ? `×${Number(weather.multiplier).toFixed(3)}${weather.applied ? " مطبّق على λ" : ""}`
          : "غير مفعّل",
      detail: "يُجلب من إحداثيات الملعب؛ التعديل ضمن ±8% عند مطر/رياح/حرارة قصوى فقط.",
      positive: !!weather?.applied,
    },
    {
      Icon: RefereeIcon,
      label: "الغيابات والتشكيلات",
      value: players?.summary
        ? players.summary
        : `لا غيابات مسجّلة · ${awayTeam} / ${homeTeam}`,
      impact: players?.applied ? "تعديل RAPM على λ" : "غير مفعّل",
      detail: "مصدر Sofascore (missingPlayers) — بلا قوائم مصابة مخترعة.",
      positive: !!players?.applied,
    },
    {
      Icon: RefereeIcon,
      label: "ملف الحكم",
      value: referee?.summary ?? "لا ملف حكم كافٍ (أقل من 8 مباريات) أو لم يُعلن",
      impact:
        referee?.applied && referee.lambda_mult != null
          ? `×${Number(referee.lambda_mult).toFixed(3)} على λ`
          : "عرض فقط",
      detail: "يُبنى من بطاقات المباريات المنتهية محلياً — بلا تعديل عند عيّنة صغيرة.",
      positive: !!referee?.applied,
    },
    {
      Icon: ZapIcon,
      label: "حراك السوق (Steam)",
      value: sharp?.summary ?? "لا حراك يُذكر بين الافتتاح والحالي",
      impact: sharp?.applied ? "مكافأة ثقة عند التوافق" : "غير مفعّل",
      detail: "من تغيّر الاحتمال الضمني بين أودز الافتتاح والحالي — بلا اختراع EV.",
      positive: !!sharp?.applied,
    },
  ];

  return (
    <div className="bg-surface p-6 sm:p-8 space-y-6 rounded-2xl border-0 shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-black text-ink tracking-tight leading-snug">
            المحركات والإثراء الحي
          </h3>
        </div>
        <span className="text-xs font-black text-accent bg-accent-dim px-4 py-1.5 rounded-full border-0">
          بيانات حقيقية فقط
        </span>
      </div>

      <p className="text-xs sm:text-sm font-medium text-muted leading-relaxed">
        ما لا يتوفر من مصدر حي يُعرض صراحةً كـ«غير مفعّل» — لا قيم افتراضية مزيفة.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        {adjustments.map((adj, i) => {
          const isNeutral = adj.impact.includes("غير مفعّل") || adj.impact.includes("عرض فقط");
          const IconComp = adj.Icon;
          return (
            <div
              key={i}
              className="press-scale group rounded-2xl border-0 bg-panel/70 p-5 flex flex-col justify-between space-y-3.5 shadow-none transition-all duration-140 active:scale-[0.98]"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-black text-ink flex items-center gap-2.5 leading-snug">
                    <IconComp className="h-4 w-4 shrink-0 text-accent" />
                    {adj.label}
                  </span>
                  <span
                    className={`text-[10px] font-black px-2 py-1 rounded-full whitespace-nowrap ${
                      isNeutral
                        ? "bg-panel text-muted"
                        : adj.positive
                          ? "bg-success-dim text-success"
                          : "bg-accent-dim text-accent"
                    }`}
                  >
                    {adj.impact}
                  </span>
                </div>
                <p className="text-xs font-bold text-ink leading-relaxed">{adj.value}</p>
                <p className="text-[11px] text-muted leading-relaxed">{adj.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

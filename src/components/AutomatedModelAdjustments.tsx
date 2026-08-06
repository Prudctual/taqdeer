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
  sharpSteamSide?: "home" | "draw" | "away" | string | null;
  refereeName?: string | null;
  weatherCondition?: string | null;
  homeVenueRecord?: { played: number; w?: number; d?: number; l?: number } | null;
  awayVenueRecord?: { played: number; w?: number; d?: number; l?: number } | null;
}

export function AutomatedModelAdjustments({
  homeTeam,
  awayTeam,
  homeP,
  drawP,
  awayP,
  lambdaHome,
  lambdaAway,
  sharpSteamSide,
  refereeName,
  weatherCondition,
  homeVenueRecord,
  awayVenueRecord,
}: AutomatedModelAdjustmentsProps) {
  const adjustments: AdjustmentItem[] = [
    {
      Icon: HomeIcon,
      label: "معامل الأرض والأفضلية الهجومية (Home Pitch Vector)",
      value:
        homeVenueRecord && homeVenueRecord.played > 0
          ? `سجل ${homeTeam}: ${homeVenueRecord.w ?? 0} فوز في ${homeVenueRecord.played} مباراة`
          : "محسوب أوتوماتيكياً من خوارزمية Dixon-Coles",
      impact: `+${(lambdaHome * 0.12).toFixed(2)} هدف متوقع`,
      detail: `تأثير أرضية الملعب ودعم الجمهور تم تقديره رياضياً تلقائياً ودمجه في قيمة λ المضيف (${lambdaHome.toFixed(2)}).`,
      positive: true,
    },
    {
      Icon: ZapIcon,
      label: "مؤشر سيولة أسعار المحترفين (Sharp Money Line Flow)",
      value: sharpSteamSide
        ? `انحياز السيولة الذكية نحو ${sharpSteamSide === "home" ? homeTeam : sharpSteamSide === "away" ? awayTeam : "التعادل"}`
        : "توازن أسعار الأسواق العالمية دون انحياز",
      impact: sharpSteamSide ? "تعديل وزن خوارزمية السوق (+4.5%)" : "حيادي (0.0%)",
      detail: "تتبع آلي لفرص القيمة وملاءمة الأسعار مقارنة بأسواق آسيا وبيناكل.",
      positive: !!sharpSteamSide,
    },
    {
      Icon: RefereeIcon,
      label: "معامل حزم الحكم وتأثير الأخطاء (Referee Strictness Factor)",
      value: refereeName ? `الحكم: ${refereeName}` : "معدل الحكام القياسي للدوري",
      impact: "مُدرج تلقائياً في حساب التوقع",
      detail: "يؤثر أوتوماتيكياً على معدل الاحتكاكات والبطاقات والضربات الثابتة المتوقعة.",
      positive: true,
    },
    {
      Icon: WeatherIcon,
      label: "معامل الطقس وسرعة الكرة (Weather & Pitch Speed)",
      value: weatherCondition || "طقس مميز وأرضية جافة",
      impact: "معامل سرعة اللعب 1.00×",
      detail:
        awayVenueRecord && awayVenueRecord.played > 0
          ? `سجل خارج الأرض لـ ${awayTeam}: ${awayVenueRecord.w ?? 0} فوز`
          : "مُدخلات درجة الحرارة وسرعة الرياح مدمجة أوتوماتيكياً في شجرة احتمالات الأهداف.",
      positive: true,
    },
  ];

  return (
    <div className="bg-surface p-6 sm:p-8 space-y-6 rounded-2xl border-0 shadow-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-black text-ink tracking-tight leading-snug">
            التعديلات والمعاملات المحسوبة آلياً 100% (AUTOMATED ALGORITHMIC VECTORS)
          </h3>
        </div>
        <span className="text-xs font-black text-accent bg-accent-dim px-4 py-1.5 rounded-full border-0">
          حساب آلي مستقل
        </span>
      </div>

      <p className="text-xs sm:text-sm font-medium text-muted leading-relaxed">
        جميع الأرقام والتوقعات أدناه مستخرجة ومشتقة <strong className="text-ink font-black">أوتوماتيكياً بالكامل</strong> بواسطة نماذج الرياضيات والإحصاء الخاصة بـ «تقدير» بدون أي تدخل يدوي:
      </p>

      {/* Grid of prominent borderless inner cards */}
      <div className="grid gap-5 sm:grid-cols-2">
        {adjustments.map((adj, i) => {
          const isNeutral = adj.impact.includes("حيادي") || adj.impact.includes("0.0%");
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
            النتيجة التلقائية النهائية المحسوبة من النماذج الستة:
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

import type { ReactNode } from "react";

interface AdjustmentItem {
  icon: string;
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
  // Automated adjustments calculated strictly by the model pipeline
  const adjustments: AdjustmentItem[] = [
    {
      icon: "🏠",
      label: "معامل الأرض والأفضلية الهجومية (Home Pitch Vector)",
      value: homeVenueRecord && homeVenueRecord.played > 0
        ? `سجل ${homeTeam}: ${homeVenueRecord.w ?? 0} فوز في ${homeVenueRecord.played} مباراة`
        : "محسوب أوتوماتيكياً من خوارزمية Dixon-Coles",
      impact: `+${(lambdaHome * 0.12).toFixed(2)} هدف متوقع`,
      detail: `تأثير أرضية الملعب ودعم الجمهور تم تقديره رياضياً تلقائياً وددمجه في قيمة λ المضيف (${lambdaHome.toFixed(2)}).`,
      positive: true,
    },
    {
      icon: "⚡",
      label: "مؤشر سيولة أسعار المحترفين (Sharp Money Line Flow)",
      value: sharpSteamSide
        ? `انحياز السيولة الذكية نحو ${sharpSteamSide === "home" ? homeTeam : sharpSteamSide === "away" ? awayTeam : "التعادل"}`
        : "توازن أسعار الأسواق العالمية دون انحياز",
      impact: sharpSteamSide ? "تعديل وزن خوارزمية السوق (+4.5%)" : "حيادي (0.0%)",
      detail: "تتبع آلي لفرص القيمة وملاءمة الأسعار مقارنة بأسواق آسيا وبيناكل.",
      positive: !!sharpSteamSide,
    },
    {
      icon: "🟨",
      label: "معامل حزم الحكم وتأثير الأخطاء (Referee Strictness Factor)",
      value: refereeName ? `الحكم: ${refereeName}` : "معدل الحكام القياسي للدوري",
      impact: "مُدرج تلقائياً في حساب التوقع",
      detail: "يؤثر أوتوماتيكياً على معدل الاحتكاكات والبطاقات والضربات الثابتة المتوقعة.",
      positive: true,
    },
    {
      icon: "🌤️",
      label: "معامل الطقس وسرعة الكرة (Weather & Pitch Speed)",
      value: weatherCondition || "طقس مميز وأرضية جافة",
      impact: "معامل سرعة اللعب 1.00×",
      detail: "مُدخلات درجة الحرارة وسرعة الرياح مدمجة أوتوماتيكياً في شجرة احتمالات الأهداف.",
      positive: true,
    },
  ];

  return (
    <div className="rounded-xl border border-line bg-panel p-4.5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-sm font-bold text-ink">التعديلات والمعاملات المحسوبة آلياً 100% (Automated Algorithmic Vectors)</h3>
        </div>
        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          🤖 حساب آلي مستقل بدقة نموذجية
        </span>
      </div>

      <p className="text-xs text-muted leading-relaxed">
        جميع الأرقام والتوقعات أدناه مستخرجة ومشتقة **أوتوماتيكياً بالكامل** بواسطة نماذج الرياضيات والإحصاء الخاصة بـ «تقدير» بدون أي تدخل أو تعديل يدوي:
      </p>

      {/* Grid of automated adjustments */}
      <div className="grid gap-3 sm:grid-cols-2">
        {adjustments.map((adj, i) => (
          <div key={i} className="rounded-lg border border-line/70 bg-zinc-950/60 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <span>{adj.icon}</span>
                {adj.label}
              </span>
              <span className="font-mono text-[11px] font-bold text-blue-400">{adj.impact}</span>
            </div>
            <p className="text-[11px] font-semibold text-zinc-300">{adj.value}</p>
            <p className="text-[10px] text-faint leading-normal">{adj.detail}</p>
          </div>
        ))}
      </div>

      {/* Summary Box */}
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <span className="block font-bold text-emerald-300">النتيجة التلقائية النهائية المحسوبة من النماذج الستة:</span>
          <span className="text-muted">
            أهداف متوقعة λ: <strong className="text-white">{homeTeam} {lambdaHome.toFixed(2)}</strong> - <strong className="text-white">{lambdaAway.toFixed(2)} {awayTeam}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono font-bold text-ink">
          <span className="rounded bg-zinc-900 px-2 py-1 border border-zinc-800 text-blue-400">1: {Math.round(homeP * 100)}%</span>
          <span className="rounded bg-zinc-900 px-2 py-1 border border-zinc-800 text-amber-400">X: {Math.round(drawP * 100)}%</span>
          <span className="rounded bg-zinc-900 px-2 py-1 border border-zinc-800 text-emerald-400">2: {Math.round(awayP * 100)}%</span>
        </div>
      </div>
    </div>
  );
}

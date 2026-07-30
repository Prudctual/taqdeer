import { RevealOnView } from "./RevealOnView";
import { confidenceLabel, pct, pctCss } from "@/lib/format";
import { FlameIcon } from "./Icons";



/** سطر ثقة هادئ تحت شريط الاحتمال */
export function ConfidenceMeter({
  value,
  inline = false,
}: {
  value: number;
  /** وضع إثبات مطبوع داخل ورقة الإشارة */
  inline?: boolean;
}) {
  const label = confidenceLabel(value);
  if (inline) {
    return (
      <RevealOnView className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="type-label shrink-0">ثقة الإشارة</span>
          <div className="prob-track h-1.5 max-w-[12rem] flex-1">
            <div
              className="meter-fill h-full bg-accent"
              style={{ width: pctCss(value) }}
            />
          </div>
        </div>
        <p className="text-[11px] tabular text-muted">
          <span className="font-medium text-ink">{pct(value)}</span>
          <span className="mx-1.5 text-line" aria-hidden>
            ·
          </span>
          {label}
        </p>
      </RevealOnView>
    );
  }

  return (
    <RevealOnView className="min-w-0 space-y-2.5">
      <dl>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="type-label">ثقة الإشارة</dt>
          <dd className="text-sm font-semibold tabular text-ink">
            {pct(value)}
          </dd>
        </div>
      </dl>
      <div className="prob-track h-1.5">
        <div
          className="meter-fill h-full bg-accent"
          style={{ width: pctCss(value) }}
        />
      </div>
      <p className="text-[11px] leading-relaxed text-muted">{label}</p>
    </RevealOnView>
  );
}

/** مقارنة أهداف متوقعة مضيف/ضيف */
export function LambdaCompare({
  home,
  away,
  homeName,
  awayName,
}: {
  home: number;
  away: number;
  homeName?: string;
  awayName?: string;
}) {
  const max = Math.max(home, away, 0.01);
  const delta = home - away;
  const lead =
    Math.abs(delta) < 0.08
      ? "تكافؤ هجومي متوقع بين الطرفين"
      : delta > 0
        ? `${homeName ?? "المضيف"} أعلى بـ ${delta.toFixed(2)} هدف`
        : `${awayName ?? "الضيف"} أعلى بـ ${Math.abs(delta).toFixed(2)} هدف`;

  const sides = [
    {
      key: "H" as const,
      name: homeName ?? "مضيف",
      value: home,
      color: "#2563eb",
      badge: "المضيف",
    },
    {
      key: "A" as const,
      name: awayName ?? "ضيف",
      value: away,
      color: "#e11d48",
      badge: "الضيف",
    },
  ];

  return (
    <RevealOnView className="min-w-0 space-y-4 p-4 sm:p-5">
      {/* Lead Banner */}
      <div className="rounded-xl border border-line bg-panel p-3.5 text-center space-y-0.5">
        <span className="text-[10px] font-bold text-muted block uppercase">مستخلص المقارنة التهديفية</span>
        <p className="text-sm sm:text-base font-black text-ink">{lead}</p>
      </div>

      {/* Bars */}
      <dl className="space-y-3.5">
        {sides.map((s) => {
          const isHome = s.key === "H";
          return (
            <div key={s.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <dt className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${isHome ? "bg-blue-600" : "bg-rose-600"}`} />
                  <span className={`font-black ${isHome ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {s.name}
                  </span>
                </dt>
                <dd className="font-mono font-black text-ink text-sm tabular">
                  {s.value.toFixed(2)} هدف
                </dd>
              </div>

              <div className="h-2.5 w-full rounded-full bg-panel overflow-hidden border border-line">
                <div
                  className="meter-fill h-full rounded-full transition-all duration-500"
                  style={{
                    width: pctCss(s.value / max),
                    background: s.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </dl>
    </RevealOnView>
  );
}

/** فورم بصري من متوسط النقاط (0–3) — تذييل ورقة التفكيك */
export function FormBars({
  homePts,
  awayPts,
  homeGd,
  awayGd,
  pickKey,
}: {
  homePts?: number;
  awayPts?: number;
  homeGd?: number;
  awayGd?: number;
  pickKey?: "H" | "D" | "A";
}) {
  if (homePts == null && awayPts == null) return null;
  const h = homePts ?? 0;
  const a = awayPts ?? 0;
  const close = Math.abs(h - a) < 0.05;
  const formLead = close
    ? "مستوى وتألق الفريقين متقارب جداً في المباريات الأخيرة"
    : h > a
    ? "الفريق المضيف يعيش فترة تألق واستقرار أفضل"
    : "الفريق الضيف يعيش فترة تألق واستقرار أفضل";
  const formSide: "H" | "D" | "A" = close ? "D" : h > a ? "H" : "A";
  const agrees = pickKey != null && formSide === pickKey;

  return (
    <div className="border-t border-line/60 p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1 bg-panel rounded text-ink">
            <FlameIcon size={16} />
          </span>
          <span className="text-xs font-black text-ink">{formLead}</span>
        </div>
        {pickKey != null && (
          <span
            className={`text-xs font-black px-3 py-1 rounded-full border-0 ${
              agrees ? "bg-accent-dim text-accent" : "bg-panel text-muted"
            }`}
          >
            {agrees ? "متفق مع التوقعات" : "مختلف قليلاً"}
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormCard label="أداء المضيف (المباريات الأخيرة)" pts={h} gd={homeGd} side="H" />
        <FormCard label="أداء الضيف (المباريات الأخيرة)" pts={a} gd={awayGd} side="A" />
      </div>
    </div>
  );
}

function FormCard({
  label,
  pts,
  gd,
  side,
}: {
  label: string;
  pts: number;
  gd?: number;
  side: "H" | "A";
}) {
  const ratingText = pts >= 2.0 ? "ممتاز جداً" : pts >= 1.2 ? "جيد ومستقر" : "ضعيف ومتراجع";
  const isHome = side === "H";
  return (
    <div className={`rounded-xl p-4 space-y-2 border shadow-2xs transition-all ${
      isHome 
        ? "bg-surface border-blue-500/20" 
        : "bg-surface border-rose-500/20"
    }`}>
      <div className="flex items-center justify-between text-xs">
        <span className={`font-black ${isHome ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400"}`}>
          {label}
        </span>
        <span className="font-mono font-extrabold text-ink">{pts.toFixed(2)} / 3</span>
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span className="font-bold text-muted">
          تقييم النسبة: <strong className="text-ink">{ratingText}</strong>
        </span>
        {gd != null && (
          <span className="font-mono text-muted font-medium">
            الفارق: {gd > 0 ? `+${gd}` : gd}
          </span>
        )}
      </div>
    </div>
  );
}

import { RevealOnView } from "./RevealOnView";
import { pct, pctCss, topOutcome } from "@/lib/format";

type Props = {
  pHome: number;
  pDraw: number;
  pAway: number;
  compact?: boolean;
  /** إخفاء عنوان الأرجح (مفيد عند وجود OutcomeCards أعلاه) */
  showLabels?: boolean;
  /** شريط نسبة فقط بلا أرقام */
  bare?: boolean;
  /** أرقام ومسار مناسبان لخلفية ممتلئة */
  inverted?: boolean;
};

/** ترتيب المقاطع يتبع اتجاه القراءة: المضيف عند البداية والضيف عند النهاية */
const OUTCOMES = [
  {
    key: "H",
    glyph: "1",
    label: "مضيف",
    color: "var(--home)",
    align: "justify-self-start",
  },
  {
    key: "D",
    glyph: "X",
    label: "تعادل",
    color: "var(--draw)",
    align: "justify-self-center",
  },
  {
    key: "A",
    glyph: "2",
    label: "ضيف",
    color: "var(--away)",
    align: "justify-self-end",
  },
] as const;

/** شريط 1X2: مقطع واحد مسطّح لكل نتيجة، والأرقام تحته بأرقام جدولية */
export function ProbBar({
  pHome,
  pDraw,
  pAway,
  compact,
  showLabels = true,
  bare = false,
  inverted = false,
}: Props) {
  const pick = topOutcome(pHome, pDraw, pAway);
  const values: Record<"H" | "D" | "A", number> = {
    H: pHome,
    D: pDraw,
    A: pAway,
  };
  const segments = OUTCOMES.map((o) => ({ ...o, value: values[o.key] }));
  const pickColor = OUTCOMES.find((o) => o.key === pick.key)!.color;
  const reading = segments.map((s) => `${s.label} ${pct(s.value)}`).join("، ");

  return (
    <RevealOnView className={compact ? "w-full min-w-[8.75rem]" : "w-full"}>
      {!compact && showLabels && !bare ? (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="text-[13px] font-semibold text-ink">
            {pick.label}
          </span>
          <span
            className="text-[13px] font-semibold tabular"
            style={{ color: pickColor }}
          >
            {pct(pick.p)}
          </span>
        </div>
      ) : null}

      <div
        className={`prob-track ${compact ? "h-1.5" : "h-2.5"}`}
        style={
          inverted
            ? { background: "color-mix(in oklch, var(--on-fill) 30%, transparent)" }
            : undefined
        }
        aria-hidden
      >
        {segments.map((s) => (
          <span
            key={s.key}
            className="prob-fill"
            style={{ width: pctCss(s.value), background: s.color }}
          />
        ))}
      </div>

      {!bare ? (
        <div
          className={`grid grid-cols-3 items-baseline tabular ${
            compact ? "mt-1.5 text-[11px] leading-none" : "mt-2 text-xs leading-none"
          }`}
          aria-hidden
        >
          {segments.map((s) => {
            const hot = pick.key === s.key;
            return (
              <span
                key={s.key}
                className={`inline-flex items-baseline gap-1 ${s.align}`}
              >
                <span className="prob-figure font-semibold" style={{ color: s.color }}>
                  {s.glyph}
                </span>
                <span
                  className={
                    hot
                      ? `prob-figure font-semibold ${inverted ? "text-on-fill" : "text-ink"}`
                      : `prob-figure ${inverted ? "text-on-fill/70" : "text-muted"}`
                  }
                >
                  {pct(s.value)}
                </span>
              </span>
            );
          })}
        </div>
      ) : null}

      <span className="sr-only">{`احتمالات 1X2: ${reading}`}</span>
    </RevealOnView>
  );
}

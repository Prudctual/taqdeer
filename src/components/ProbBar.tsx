"use client";

import { useEffect, useRef, useState } from "react";
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
    fullLabel: "فوز المضيف",
    color: "var(--home)",
    align: "justify-self-start",
  },
  {
    key: "D",
    glyph: "X",
    label: "تعادل",
    fullLabel: "التعادل",
    color: "var(--draw)",
    align: "justify-self-center",
  },
  {
    key: "A",
    glyph: "2",
    label: "ضيف",
    fullLabel: "فوز الضيف",
    color: "var(--away)",
    align: "justify-self-end",
  },
] as const;

function useCountUp(target: number, duration = 260, active = false): number {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (!active) { setVal(0); return; }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(target * eased);
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration, active]);
  return val;
}

/** شريط 1X2: مقاطع متحركة تنمو عند الظهور مع تلميحات تفاعلية وأرقام عدّادة */
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
  const pickColor = OUTCOMES.find((o) => o.key === pick.key)?.color ?? "oklch(0.75 0.16 75)";
  const reading = segments.map((s) => `${s.label} ${pct(s.value)}`).join("، ");

  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const animH = useCountUp(pHome * 100, 260, inView);
  const animD = useCountUp(pDraw * 100, 260, inView);
  const animA = useCountUp(pAway * 100, 260, inView);
  const animValues: Record<"H" | "D" | "A", number> = {
    H: animH,
    D: animD,
    A: animA,
  };

  return (
    <div ref={ref} className={compact ? "w-full min-w-[8.75rem]" : "w-full"}>
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
        className={`prob-track ${compact ? "h-1.5" : "h-3"}`}
        style={
          inverted
            ? { background: "color-mix(in oklch, var(--on-fill) 30%, transparent)" }
            : undefined
        }
        aria-hidden
      >
        {segments.map((s, i) => (
          <div
            key={s.key}
            className="prob-segment"
            data-tooltip={`${s.fullLabel} ${pct(s.value)}`}
            style={{
              width: pctCss(s.value),
              background: s.color,
              transform: inView ? "scaleX(1)" : "scaleX(0)",
              transitionDelay: `${i * 30}ms`,
            }}
          />
        ))}
      </div>

      {!bare ? (
        <div
          className={`grid grid-cols-3 items-baseline tabular ${
            compact ? "mt-1.5 text-[11px] leading-none" : "mt-2.5 text-xs leading-none"
          }`}
          aria-hidden
        >
          {segments.map((s) => {
            const hot = pick.key === s.key;
            const displayVal = inView ? `${Math.round(animValues[s.key])}٪` : "0٪";
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
                  {displayVal}
                </span>
              </span>
            );
          })}
        </div>
      ) : null}

      <span className="sr-only">{`احتمالات 1X2: ${reading}`}</span>
    </div>
  );
}

import { buildDoubleChance } from "@/lib/double-chance";
import { pct } from "@/lib/format";

type Props = {
  homeName: string;
  awayName: string;
  pHome: number;
  pDraw: number;
  pAway: number;
  /** عرض مضغوط لقائمة المباريات */
  compact?: boolean;
};

/**
 * كتلة مستقلة وواضحة للفرصة المزدوجة — تظهر دائماً مع وجود نسب 1X2.
 */
export function DoubleChancePanel({
  homeName,
  awayName,
  pHome,
  pDraw,
  pAway,
  compact = false,
}: Props) {
  const dc = buildDoubleChance(pHome, pDraw, pAway, homeName, awayName);
  const best = dc.best;

  if (compact) {
    return (
      <div className="rounded-xl border border-accent/25 bg-accent-dim/15 px-3 py-2.5 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-accent">الفرصة المزدوجة</span>
          <span className="text-[10px] font-semibold text-ink bg-surface px-2 py-0.5 rounded-md border border-line tabular">
            {best.code} · {pct(best.p)}
          </span>
        </div>
        <p className="text-xs font-semibold text-ink leading-snug">{best.explain}</p>
      </div>
    );
  }

  return (
    <div
      id="double-chance"
      className="rounded-2xl border border-accent/30 bg-accent-dim/15 p-5 space-y-4 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <span className="text-xs font-semibold text-accent">الفرصة المزدوجة</span>
          <p className="text-[11px] text-muted font-semibold leading-relaxed">
            تغطية نتيجتين من ثلاث — مستقلة عن التوقع الأرجح (1X2).
          </p>
        </div>
        <span className="text-[11px] font-bold text-on-fill bg-accent px-3 py-1 rounded-full tabular">
          التوصية: {best.code}
        </span>
      </div>

      <div className="rounded-xl border border-accent/35 bg-surface p-4 space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base sm:text-lg font-semibold text-ink">
            {best.title}{" "}
            <span className="text-accent font-mono text-sm">({best.code})</span>
          </h3>
          <span className="text-sm font-semibold text-ink tabular">{pct(best.p)}</span>
        </div>
        <p className="text-xs text-muted font-semibold leading-relaxed">{best.winsIf}</p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-panel">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${Math.min(100, best.p * 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {(["1X", "X2", "12"] as const).map((code) => {
          const opt = dc.options.find((o) => o.code === code)!;
          const isBest = opt.code === best.code;
          return (
            <div
              key={code}
              className={`rounded-xl border p-3 space-y-1.5 ${
                isBest
                  ? "border-accent/50 bg-accent-dim/25 ring-1 ring-accent/20"
                  : "border-line bg-surface"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`text-[11px] font-bold font-mono ${
                    isBest ? "text-accent" : "text-muted"
                  }`}
                >
                  {opt.code}
                </span>
                {isBest ? (
                  <span className="text-[9px] font-bold text-accent">موصى</span>
                ) : null}
              </div>
              <p className="text-xs font-semibold text-ink leading-snug">{opt.title}</p>
              <p className="text-sm font-semibold text-ink tabular">{pct(opt.p)}</p>
              <p className="text-[10px] text-muted font-semibold leading-relaxed">{opt.explain}</p>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-faint font-semibold leading-relaxed border-t border-line pt-3">
        1X = مضيف أو تعادل · X2 = تعادل أو ضيف · 12 = فوز أحد الطرفين (بدون تعادل)
      </p>
    </div>
  );
}

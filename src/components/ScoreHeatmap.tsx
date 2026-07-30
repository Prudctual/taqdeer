import { pct } from "@/lib/format";

type Props = {
  matrix: number[][];
  homeLabel: string;
  awayLabel: string;
};

/** سلّم لون أحادي مشتق من اللهجة — أغمق = أقل احتمالاً */
function ramp(t: number): string {
  const mix = Math.max(0, Math.min(1, t)) * 58;
  return `color-mix(in oklch, var(--accent) ${mix.toFixed(1)}%, var(--surface))`;
}

export function ScoreHeatmap({ matrix, homeLabel, awayLabel }: Props) {
  const rows = Array.isArray(matrix) ? matrix : [];
  const flat = rows.flat().filter((v) => typeof v === "number");
  const max = Math.max(...(flat.length ? flat : [0]), 1e-9);
  const n = Math.min(rows.length, 6);
  const axis = Array.from({ length: n }, (_, k) => k);

  let topI = 0;
  let topJ = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if ((rows[i]?.[j] ?? 0) > (rows[topI]?.[topJ] ?? 0)) {
        topI = i;
        topJ = j;
      }
    }
  }

  const topP = rows[topI]?.[topJ] ?? 0;

  /** أعلى نتيجتين بعد الأرجح — سياق سريع */
  const runners: { i: number; j: number; p: number }[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === topI && j === topJ) continue;
      runners.push({ i, j, p: rows[i]?.[j] ?? 0 });
    }
  }
  runners.sort((a, b) => b.p - a.p);
  const nextTwo = runners.slice(0, 2);

  return (
    <div className="space-y-4 p-4 sm:p-5">
      {/* النتيجة الأرجح وما يليها */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel p-3.5 sm:p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted">النتيجة الأرجح:</span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface border border-line px-3 py-1 font-mono font-black text-sm text-ink tabular">
            <span className="text-blue-600 dark:text-blue-400">{topI}</span>
            <span className="text-muted">–</span>
            <span className="text-rose-600 dark:text-rose-400">{topJ}</span>
          </span>
          <span className="text-sm font-black tabular text-accent">
            ({pct(topP, 1)})
          </span>
        </div>

        {nextTwo.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-muted">بعدها:</span>
            <div className="flex items-center gap-2 font-mono font-bold tabular">
              {nextTwo.map((s) => (
                <span
                  key={`${s.i}-${s.j}`}
                  className="inline-flex items-center gap-1 rounded-md bg-surface border border-line px-2 py-0.5 text-xs text-ink"
                >
                  <span className="text-blue-600 dark:text-blue-400">{s.i}</span>
                  <span className="text-muted">–</span>
                  <span className="text-rose-600 dark:text-rose-400">{s.j}</span>
                  <span className="text-muted font-normal text-[10px]">({pct(s.p, 1)})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* تسمية المحورين بوضوح وألوان المضيف والضيف */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 space-y-0.5">
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block">
            أهداف المضيف (الصفوف ↓)
          </span>
          <span className="font-black text-ink truncate block">{homeLabel}</span>
        </div>

        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-end space-y-0.5">
          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block">
            أهداف الضيف (الأعمدة →)
          </span>
          <span className="font-black text-ink truncate block">{awayLabel}</span>
        </div>
      </div>

      {/* المصفوفة — LTR لقراءة الأرقام بوضوح داخل واجهة RTL */}
      <div dir="ltr" className="overflow-x-auto rounded-xl border border-line bg-surface p-2">
        <table className="w-full border-collapse">
          <caption className="sr-only" dir="rtl">
            {`احتمال كل نتيجة أهداف — الصفوف أهداف ${homeLabel}، الأعمدة أهداف ${awayLabel}. الأرجح ${topI}–${topJ}.`}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-9 h-9 border border-line bg-panel rounded-tl-lg text-center text-[10px] font-bold text-muted">
                H \ A
              </th>
              {axis.map((j) => (
                <th
                  key={`col-${j}`}
                  scope="col"
                  className={`h-9 border border-line bg-panel text-center text-xs font-black tabular ${
                    j === topJ ? "text-rose-600 dark:text-rose-400" : "text-muted"
                  }`}
                >
                  {j}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {axis.map((i) => (
              <tr key={`row-${i}`}>
                <th
                  scope="row"
                  className={`w-9 h-9 border border-line bg-panel text-center text-xs font-black tabular ${
                    i === topI ? "text-blue-600 dark:text-blue-400" : "text-muted"
                  }`}
                >
                  {i}
                </th>
                {axis.map((j) => {
                  const p = rows[i]?.[j] ?? 0;
                  const t = Math.pow(p / max, 0.62);
                  const isTop = i === topI && j === topJ;
                  const isRunner = nextTwo.some((s) => s.i === i && s.j === j);
                  const precise = isTop || isRunner || t > 0.55;
                  const readout = `${i}–${j}: ${pct(p, 1)}${
                    isTop ? " · الأرجح" : ""
                  }`;
                  return (
                    <td
                      key={`${i}-${j}`}
                      className={`h-9 border border-line text-center text-xs font-mono font-bold tabular transition-all duration-150 select-none ${
                        isTop
                          ? "font-black text-white bg-accent ring-2 ring-accent shadow-md rounded-sm scale-105"
                          : isRunner
                            ? "font-extrabold text-ink border-accent/40 bg-accent-dim/30"
                            : t > 0.2
                              ? "text-ink"
                              : "text-muted"
                      }`}
                      style={{ background: isTop ? undefined : ramp(t) }}
                      title={readout}
                      aria-label={readout}
                    >
                      {precise ? (p * 100).toFixed(1) : (p * 100).toFixed(0)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* مفتاح السلّم */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-[11px] text-muted">
        <p>الأرقام داخل الجدول تعبر عن النسبة المئوية لاحتمال كل نتيجة تهدفية (٪)</p>
        <span className="flex items-center gap-2" aria-hidden>
          <span className="font-semibold">أقل</span>
          <span
            className="h-2.5 w-20 border border-line rounded-full overflow-hidden"
            style={{
              background: `linear-gradient(to left, ${ramp(0)}, ${ramp(1)})`,
            }}
          />
          <span className="font-semibold text-accent">أعلى</span>
        </span>
      </div>
    </div>
  );
}

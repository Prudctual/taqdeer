import { pct } from "@/lib/format";

type Props = {
  matrix: number[][];
  homeLabel: string;
  awayLabel: string;
};

/** سلّم لون أحادي مشتق من اللهجة — أغمق = أقل احتمالاً */
function ramp(t: number): string {
  const mix = Math.max(0, Math.min(1, t)) * 58;
  return `color-mix(in oklch, var(--accent) ${mix.toFixed(1)}%, var(--bg))`;
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
    <div className="space-y-4">
      {/* النتيجة الأرجح وما يليها */}
      <dl className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3 border-b border-line pb-4">
        <div className="min-w-0">
          <dt className="type-label">النتيجة الأرجح</dt>
          <dd className="mt-1 flex items-baseline gap-2">
            <span className="score-chip text-lg text-ink">
              <span>{topI}</span>
              <span className="text-faint">–</span>
              <span>{topJ}</span>
            </span>
            <span className="text-sm font-semibold tabular text-accent">
              {pct(topP, 1)}
            </span>
          </dd>
        </div>
        {nextTwo.length > 0 ? (
          <div className="min-w-0 text-end">
            <dt className="type-label">بعدها</dt>
            <dd className="mt-1 flex flex-wrap items-baseline justify-end gap-x-3 gap-y-1 text-xs tabular text-muted">
              {nextTwo.map((s) => (
                <span
                  key={`${s.i}-${s.j}`}
                  className="inline-flex items-baseline gap-1.5"
                >
                  <span className="score-chip text-ink">
                    <span>{s.i}</span>
                    <span className="text-faint">–</span>
                    <span>{s.j}</span>
                  </span>
                  <span>{pct(s.p, 1)}</span>
                </span>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>

      {/* تسمية المحورين */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        <div className="min-w-0">
          <dt className="type-label">صفوف · أهداف المضيف</dt>
          <dd className="mt-0.5 truncate font-medium text-ink" title={homeLabel}>
            {homeLabel}
          </dd>
        </div>
        <div className="min-w-0 text-end">
          <dt className="type-label">أعمدة · أهداف الضيف</dt>
          <dd className="mt-0.5 truncate font-medium text-ink" title={awayLabel}>
            {awayLabel}
          </dd>
        </div>
      </dl>

      {/* المصفوفة — LTR لقراءة الأرقام بوضوح داخل واجهة RTL */}
      <div dir="ltr" className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse">
          <caption className="sr-only" dir="rtl">
            {`احتمال كل نتيجة أهداف — الصفوف أهداف ${homeLabel}، الأعمدة أهداف ${awayLabel}. الأرجح ${topI}–${topJ}.`}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-8 border border-line bg-panel">
                <span className="sr-only" dir="rtl">
                  أهداف المضيف
                </span>
              </th>
              {axis.map((j) => (
                <th
                  key={`col-${j}`}
                  scope="col"
                  className={`border border-line bg-panel py-1.5 text-center text-[10px] tabular ${
                    j === topJ ? "font-semibold text-ink" : "font-medium text-muted"
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
                  className={`border border-line bg-panel text-center text-[10px] tabular ${
                    i === topI ? "font-semibold text-ink" : "font-medium text-muted"
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
                      className={`heatmap-cell h-8.5 border border-line text-center text-[11px] tabular transition-all duration-150 select-none hover:scale-110 hover:z-10 hover:shadow-lg ${
                        isTop
                          ? "heatmap-cell-top font-bold text-ink ring-2 ring-accent shadow-md scale-105"
                          : isRunner
                            ? "font-semibold text-ink border-accent/40"
                            : t > 0.2
                              ? "text-ink"
                              : "text-muted"
                      }`}
                      style={{ background: ramp(t) }}
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
        <p>أعمدة = أهداف الضيف · صفوف = أهداف المضيف · الرقم = احتمال النتيجة (٪)</p>
        <span className="flex items-center gap-2" aria-hidden>
          <span>أضعف</span>
          <span
            className="h-2 w-20 border border-line"
            style={{
              background: `linear-gradient(to left, ${ramp(0)}, ${ramp(1)})`,
            }}
          />
          <span>أقوى</span>
        </span>
      </div>
    </div>
  );
}

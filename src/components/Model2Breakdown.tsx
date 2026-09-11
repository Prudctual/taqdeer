import type { Model2Report } from "@/lib/queries";

export function Model2Breakdown({
  model2,
  compact = false,
}: {
  model2?: Model2Report | null;
  compact?: boolean;
}) {
  if (!model2) {
    return (
      <div className="rounded-xl border border-line bg-panel p-4 text-xs text-muted">
        لم يُحسب نموذج التصفية الثاني لهذه المباراة بعد.
      </div>
    );
  }

  const rel = model2.reliability;
  const reason = model2.excludeReason;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <p className="type-label text-muted">موثوقية الفوز المباشر</p>
          <p className="type-figure tabular text-ink">
            {rel != null ? rel.toFixed(1) : "—"}
            <span className="ms-1 text-xs font-medium text-muted">/ 100</span>
          </p>
        </div>
        <div className="text-xs text-muted space-y-0.5 text-end">
          {model2.candidate && model2.rank != null ? (
            <p>
              ترتيب المرشحين{" "}
              <strong className="tabular text-ink">{model2.rank}</strong>
              {model2.slateN != null ? ` من ${model2.slateN}` : ""}
            </p>
          ) : (
            <p>{reason || "خارج بوابة الفوز المباشر"}</p>
          )}
          <p>
            تغطية{" "}
            <strong className="tabular text-ink">{model2.coverage}</strong> / 30
            {model2.coverageWarning ? " · تغطية ناقصة" : ""}
          </p>
        </div>
      </div>

      {model2.groups.map((group) => (
        <section key={group.id} className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="type-label text-ink">
              {group.id}. {group.title}
            </h3>
            <span className="tabular text-xs font-semibold text-muted">
              {group.score != null ? group.score.toFixed(1) : "—"}
            </span>
          </div>
          <div className={compact ? "space-y-1" : "overflow-x-auto"}>
            <table className="w-full text-xs text-start border-collapse">
              <tbody className="divide-y divide-line">
                {group.factors.map((f) => (
                  <tr key={f.id}>
                    <td className="py-1.5 pe-2 tabular text-muted w-8">{f.id}</td>
                    <td className="py-1.5 pe-2 text-ink">{f.title}</td>
                    <td className="py-1.5 pe-2 tabular font-semibold text-ink w-14">
                      {f.available && f.score != null ? f.score.toFixed(0) : "—"}
                    </td>
                    <td className="py-1.5 text-muted">
                      {f.available ? f.label || "—" : "غير متاح"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

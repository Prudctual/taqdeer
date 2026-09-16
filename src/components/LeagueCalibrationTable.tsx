import { SectionCard } from "@/components/ui";
import { pct } from "@/lib/format";
import type { LeagueCalibrationRow } from "@/lib/queries";
import { LEAGUE_STATUS_LABELS } from "@/lib/sieve-labels";

function fmt(v: number | null, digits = 3): string {
  return v == null || Number.isNaN(v) ? "—" : v.toFixed(digits);
}

/** معايرة كل دوري كما أثبتها الحزام التاريخي (walk-forward منذ 2022): θ وα والحالة وشريحة المحسوم */
export function LeagueCalibrationTable({ rows }: { rows: LeagueCalibrationRow[] }) {
  if (rows.length === 0) return null;
  const updated = rows.map((r) => r.updatedAt).filter(Boolean).sort().at(-1);

  return (
    <SectionCard
      title="معايرة الدوريات من الحزام التاريخي"
      subtitle={`walk-forward موسمي منذ 2022 مقابل إغلاق بيناكل${updated ? ` · آخر تطبيق ${updated.slice(0, 10)}` : ""}`}
    >
      <div className="overflow-x-auto p-4 sm:p-5">
        <table className="w-full text-xs border-collapse">
          <caption className="sr-only">
            لكل دوري: حالة التفعيل، عتبة المحسوم θ، وزن النموذج α عند الإعلان والإغلاق، نصف عمر الاندثار، طريقة نزع الهامش، ونتائج شريحة المحسوم والتغطية مقابل الإغلاق.
          </caption>
          <thead>
            <tr className="border-b border-line text-muted text-[11px] font-bold">
              <th scope="col" className="py-2.5 px-3 text-start">الدوري</th>
              <th scope="col" className="py-2.5 px-3 text-center">الحالة</th>
              <th scope="col" className="py-2.5 px-3 text-center">θ</th>
              <th scope="col" className="py-2.5 px-3 text-center">α إعلان / إغلاق</th>
              <th scope="col" className="py-2.5 px-3 text-center">نصف العمر</th>
              <th scope="col" className="py-2.5 px-3 text-center">نزع الهامش</th>
              <th scope="col" className="py-2.5 px-3 text-center">المحسوم: إصابة / مُعلَن (n)</th>
              <th scope="col" className="py-2.5 px-3 text-center">Brier تغطية / إغلاق</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const active = r.status === "active";
              const hitGap = r.sliceHit != null && r.sliceStated != null ? r.sliceHit - r.sliceStated : null;
              return (
                <tr key={r.leagueId} className="hover:bg-panel/50 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-ink">{r.leagueNameAr}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      title={r.statusReason ?? undefined}
                      className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${
                        active
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {LEAGUE_STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono tabular text-ink">{r.theta.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-center font-mono tabular text-ink">
                    {fmt(r.alphaAnnounce, 2)} / {fmt(r.alphaClose, 2)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono tabular text-muted">
                    {r.dcHalfLife != null ? `${Math.round(r.dcHalfLife)} يوم` : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-muted">{r.demarginMethod ?? "—"}</td>
                  <td className="py-2.5 px-3 text-center font-mono tabular text-ink">
                    {r.sliceN ? (
                      <>
                        {r.sliceHit != null ? pct(r.sliceHit, 1) : "—"} / {r.sliceStated != null ? pct(r.sliceStated, 1) : "—"}
                        <span className="text-muted"> ({r.sliceN})</span>
                        {hitGap != null && hitGap < -0.05 ? (
                          <span className="ms-1 text-amber-600 dark:text-amber-400" title="الإصابة دون المُعلَن بأكثر من 5 نقاط">
                            ▼
                          </span>
                        ) : null}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono tabular text-muted">
                    {fmt(r.coverageBrier)} / {fmt(r.coverageCloseBrier)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 text-[11px] text-muted leading-relaxed">
          α = 0 يعني أن اللبّ لم يتفوّق على الإغلاق في هذا الدوري فيُنشر السوق منزوع الهامش وحده، ويبقى دور النموذج في
          λ الأهداف والأسواق البديلة وقواعد الغربال. θ تُرفع فقط ولا تُخفَّض آلياً.
        </p>
      </div>
    </SectionCard>
  );
}

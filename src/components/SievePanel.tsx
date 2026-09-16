import type { SieveSlateSummary, SieveTier } from "@/lib/queries";
import { pct } from "@/lib/format";
import { LEAGUE_STATUS_LABELS, SIEVE_TIER_HINTS, sieveRuleLabel, sieveTierLabel } from "@/lib/sieve-labels";

const TIER_ORDER: SieveTier[] = ["banker", "alt-market", "weak", "excluded"];

/**
 * لوحة غربال «المحسوم»: ما الذي يمرّ وما الذي يسقط ولماذا — حالة كل دوري وعتبته
 * وα، وتوزيع الشرائح على النافذة القريبة، وأكثر القواعد إسقاطاً.
 */
export function SievePanel({ summary }: { summary: SieveSlateSummary }) {
  const { tiers, total, failedRules, leagues, horizonDays } = summary;
  const activeCount = leagues.filter((l) => l.status === "active").length;
  const topFails = failedRules.slice(0, 5);

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5 space-y-4" aria-labelledby="sieve-panel-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 id="sieve-panel-title" className="text-base sm:text-lg font-semibold text-ink">
            غربال المحسوم — ما يمرّ وما يسقط
          </h2>
          <p className="text-xs text-muted leading-relaxed max-w-2xl">
            لا تُوصف مباراة بـ«محسومة» إلا إذا اتفق لبّ النموذج مع إغلاق السوق الحاد منزوع الهامش على الجهة، وبلغ
            الاحتمال النهائي عتبة θ المعايرة لكل دوري (تُرفع فقط)، وخلت من الديربي والغياب المؤثر وصدمات بداية
            الموسم. كل ما عدا ذلك أرشيف «إشارة ضعيفة» بلا ادعاء.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-muted">
          <span className="bg-panel px-3 py-1 rounded-full border border-line">
            {activeCount}/{leagues.length} دوريات مُفعَّلة
          </span>
          <span className="bg-panel px-3 py-1 rounded-full border border-line">
            {total} مباراة خلال {horizonDays} أيام
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {TIER_ORDER.map((tier) => (
          <div key={tier} className="rounded-xl border border-line bg-panel/60 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink">{sieveTierLabel(tier)}</span>
              <span className="font-mono font-bold text-ink tabular text-sm">{tiers[tier]}</span>
            </div>
            <p className="text-[10px] text-muted leading-relaxed">{SIEVE_TIER_HINTS[tier]}</p>
          </div>
        ))}
      </div>

      {leagues.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <caption className="sr-only">حالة كل دوري في الغربال: العتبة θ ووزن النموذج α ونتائج شريحة المحسوم في الحزام التاريخي</caption>
            <thead>
              <tr className="border-b border-line text-muted text-[11px] font-bold">
                <th scope="col" className="py-2 px-2 text-start">الدوري</th>
                <th scope="col" className="py-2 px-2 text-center">الحالة</th>
                <th scope="col" className="py-2 px-2 text-center">θ</th>
                <th scope="col" className="py-2 px-2 text-center">α النموذج</th>
                <th scope="col" className="py-2 px-2 text-center">شريحة المحسوم تاريخياً</th>
                <th scope="col" className="py-2 px-2 text-center">نزع الهامش</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {leagues.map((l) => (
                <tr key={l.leagueId}>
                  <td className="py-2 px-2 font-semibold text-ink">{l.leagueNameAr}</td>
                  <td className="py-2 px-2 text-center">
                    <span
                      className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${
                        l.status === "active"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      }`}
                      title={l.statusReason ?? undefined}
                    >
                      {LEAGUE_STATUS_LABELS[l.status] ?? l.status}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center font-mono tabular text-ink">{l.theta.toFixed(2)}</td>
                  <td className="py-2 px-2 text-center font-mono tabular text-ink">
                    {l.alphaAnnounce != null ? l.alphaAnnounce.toFixed(2) : "—"}
                  </td>
                  <td className="py-2 px-2 text-center font-mono tabular text-muted">
                    {l.sliceN ? (
                      <>
                        إصابة {l.sliceHit != null ? pct(l.sliceHit, 0) : "—"} · مُعلَن{" "}
                        {l.sliceStated != null ? pct(l.sliceStated, 0) : "—"} · n={l.sliceN}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 px-2 text-center font-mono text-muted">{l.demarginMethod ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {topFails.length > 0 ? (
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-muted">أكثر القواعد إسقاطاً في هذه النافذة</span>
          <ul className="flex flex-wrap gap-1.5">
            {topFails.map((f) => (
              <li
                key={f.name}
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-2 py-1 text-[11px] text-ink"
              >
                <span>{sieveRuleLabel(f.name)}</span>
                <span className="font-mono font-bold tabular text-muted">{f.count}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

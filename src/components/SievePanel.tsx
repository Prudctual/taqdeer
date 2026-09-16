import type { SieveSlateSummary } from "@/lib/queries";
import { sieveRuleLabel } from "@/lib/sieve-labels";

/**
 * لوحة غربال «المحسوم»: تعريف الحسم وأكثر القواعد إسقاطاً في النافذة القريبة.
 * تفاصيل θ/α لكل دوري تبقى في المحرك وصفحة الدقة، لا في واجهة الحصر.
 */
export function SievePanel({ summary }: { summary: SieveSlateSummary }) {
  const { total, failedRules, leagues, horizonDays } = summary;
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

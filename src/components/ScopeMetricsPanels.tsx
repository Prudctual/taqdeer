import { SectionCard } from "@/components/ui";
import { pct } from "@/lib/format";
import type { DailyMetricsSummary, ScopeMetrics } from "@/lib/queries";

function fmt(v: number | null, digits = 3): string {
  return v == null || Number.isNaN(v) ? "—" : v.toFixed(digits);
}

function signed(v: number | null, digits = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  const s = (v * 100).toFixed(digits);
  return `${v >= 0 ? "+" : ""}${s}٪`;
}

function ScopePanel({
  title,
  hint,
  m,
  emphasizeHit,
}: {
  title: string;
  hint: string;
  m: ScopeMetrics | null;
  emphasizeHit: boolean;
}) {
  const skill = m?.skillVsClose ?? null;
  const skillTone = skill == null ? "text-ink" : skill >= 0 ? "text-success" : "text-amber-600 dark:text-amber-400";
  const hitGap = m?.hitRate != null && m.statedMean != null ? m.hitRate - m.statedMean : null;

  return (
    <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="text-[11px] text-muted leading-relaxed">{hint}</p>
        </div>
        <span className="shrink-0 rounded-full border border-line bg-panel px-2.5 py-0.5 text-[10px] font-bold text-muted tabular">
          n={m?.n ?? 0}
        </span>
      </div>

      {m == null || m.n === 0 ? (
        <p className="text-xs text-muted">لا مباريات مُقيَّمة في هذا النطاق بعد — تتراكم يومياً مع انتهاء المباريات المنشورة.</p>
      ) : (
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div className={`rounded-lg border border-line bg-panel/60 p-2.5 ${emphasizeHit ? "sm:col-span-1" : ""}`}>
            <dt className="text-[10px] text-muted">نسبة الإصابة</dt>
            <dd className="font-mono font-bold text-ink tabular text-base">{m.hitRate != null ? pct(m.hitRate, 1) : "—"}</dd>
            <dd className="text-[10px] text-muted">
              مُعلَن {m.statedMean != null ? pct(m.statedMean, 1) : "—"}
              {hitGap != null ? ` · فرق ${signed(hitGap)}` : ""}
            </dd>
          </div>
          <div className="rounded-lg border border-line bg-panel/60 p-2.5">
            <dt className="text-[10px] text-muted">Brier (النموذج / الإغلاق)</dt>
            <dd className="font-mono font-bold text-ink tabular text-base">{fmt(m.brier)}</dd>
            <dd className="text-[10px] text-muted">إغلاق {fmt(m.closeBrier)}</dd>
          </div>
          <div className="rounded-lg border border-line bg-panel/60 p-2.5">
            <dt className="text-[10px] text-muted">مهارة مقابل الإغلاق</dt>
            <dd className={`font-mono font-bold tabular text-base ${skillTone}`}>{signed(skill)}</dd>
            <dd className="text-[10px] text-muted">1 − Brier/Brier الإغلاق</dd>
          </div>
          <div className="rounded-lg border border-line bg-panel/60 p-2.5">
            <dt className="text-[10px] text-muted">Log-loss (النموذج / الإغلاق)</dt>
            <dd className="font-mono font-bold text-ink tabular">{fmt(m.logLoss)}</dd>
            <dd className="text-[10px] text-muted">إغلاق {fmt(m.closeLogLoss)}</dd>
          </div>
          <div className="rounded-lg border border-line bg-panel/60 p-2.5">
            <dt className="text-[10px] text-muted">التعادل كأعلى نتيجة</dt>
            <dd className="font-mono font-bold text-ink tabular">{m.drawTopShare != null ? pct(m.drawTopShare, 1) : "—"}</dd>
            <dd className="text-[10px] text-muted">وقع فعلاً {m.drawActualShare != null ? pct(m.drawActualShare, 1) : "—"}</dd>
          </div>
          <div className="rounded-lg border border-line bg-panel/60 p-2.5">
            <dt className="text-[10px] text-muted">أيام التقييم</dt>
            <dd className="font-mono font-bold text-ink tabular">{m.days}</dd>
            <dd className="text-[10px] text-muted">لقطة الإعلان</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

/** لوحتان منفصلتان (خطة 006 §د): تغطية كل المباريات مقابل شريحة «المحسوم» — لا تُخلطان في رقم واحد */
export function ScopeMetricsPanels({ summary }: { summary: DailyMetricsSummary }) {
  return (
    <SectionCard
      title="مقياسان منفصلان: التغطية مقابل المحسوم"
      subtitle={`تقييم يومي مقابل إغلاق بيناكل منزوع الهامش · آخر ${summary.windowDays} يوماً منذ ${summary.since}`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-4 sm:p-5">
        <ScopePanel
          title="التغطية — كل المباريات المنشورة"
          hint="الاحتمال النهائي (النموذج مدموجاً بالسوق بوزن α) على كل مباراة نُشر لها توقع."
          m={summary.coverage}
          emphasizeHit={false}
        />
        <ScopePanel
          title="المحسوم — ما اجتاز الغربال فقط"
          hint="نسبة الإصابة تُقارن بالاحتمال المُعلَن للشريحة؛ تراجع دون المُعلَن بأكثر من 5 نقاط يرفع θ تلقائياً."
          m={summary.banker}
          emphasizeHit
        />
      </div>
    </SectionCard>
  );
}

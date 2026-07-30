import type { Metadata } from "next";
import Link from "next/link";
import { getValueMatches } from "@/lib/queries";
import { formatShortDate } from "@/lib/format";
import { PageNav, SectionCard, EmptyState, BackBar } from "@/components/ui";

export const metadata: Metadata = {
  title: "المباريات ذات القيمة (+EV Value Bets)",
  description: "ترشيح المباريات القادمة التي تحتوي على عائد متوقع موجب (+EV) وحصة كيلي الموصى بها.",
};

export const revalidate = 300;

export default function ValueMatchesPage() {
  const matches = getValueMatches();

  // Summary Metrics
  const evValues = matches.map((m) => {
    try {
      const a = m.analytics_json ? JSON.parse(m.analytics_json) : null;
      return a?.value?.ev || 0;
    } catch {
      return 0;
    }
  });

  const maxEv = evValues.length > 0 ? Math.max(...evValues) : 0;
  const avgEv = evValues.length > 0 ? evValues.reduce((a, b) => a + b, 0) / evValues.length : 0;

  return (
    <div className="space-y-8">
      <div>
        <PageNav backHref="/" backLabel="المباريات" crumbs={[{ href: "/", label: "المباريات" }, { label: "فرص القيمة (+EV)" }]} />

        {/* Hero Header Card */}
        <div className="rounded-2xl border border-emerald-500/30 bg-panel p-6 sm:p-8 space-y-4 shadow-2xs mt-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
              تحليل فرص القيمة والسيولة (+EV)
            </span>

            <span className="text-[11px] font-bold text-muted bg-surface px-3 py-1 rounded-full border border-line">
              حاسبة كيلي الربع (Quarter Kelly 25%)
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-black text-ink tracking-tight leading-tight">
              المباريات ذات القيمة (+EV Value Bets)
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-muted leading-relaxed max-w-3xl">
              يستعرض هذا القسم جميع المباريات التي يُظهر فيها نموذج التحليل انحرافاً إيجابياً ومزايا رياضية (+EV ≥ 3%) مقارنة بأسعار إغلاق سوق المراهنين، مع حساب حصة رهان كيلي الربع الموصى بها.
            </p>
          </div>

          {/* Quick Metrics Cards */}
          {matches.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-line">
              <div className="rounded-xl border border-line bg-surface p-3.5 space-y-1">
                <span className="text-[11px] font-bold text-muted block">عدد الفرص المتاحة</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular">{matches.length}</span>
              </div>
              <div className="rounded-xl border border-line bg-surface p-3.5 space-y-1">
                <span className="text-[11px] font-bold text-muted block">أعلى عائد (+EV)</span>
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono tabular">+{(maxEv * 100).toFixed(1)}%</span>
              </div>
              <div className="rounded-xl border border-line bg-surface p-3.5 space-y-1">
                <span className="text-[11px] font-bold text-muted block">متوسط الفائدة</span>
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono tabular">+{(avgEv * 100).toFixed(1)}%</span>
              </div>
              <div className="rounded-xl border border-line bg-surface p-3.5 space-y-1">
                <span className="text-[11px] font-bold text-muted block">مخاطرة المحفظة</span>
                <span className="text-sm font-black text-ink block pt-1.5">تحفّظ منضبط</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {matches.length === 0 ? (
        <SectionCard quiet>
          <EmptyState
            title="لا توجد فرص قيمة مرشحة حالياً"
            body="جميع الأسعار المعروضة حالياً تتطابق مع تقديرات السوق المحايدة. يُعاد تقييم الفرص أوتوماتيكياً مع تحديث البيانات والجولات القادمة."
          />
        </SectionCard>
      ) : (
        <SectionCard
          title={`فرص القيمة المرشحة (${matches.length} مواجهة)`}
          subtitle="مفروزة بحسب الفائدة الإيجابية وتوصيات المحفظة"
        >
          <div className="grid grid-cols-1 gap-4 p-4 sm:p-5">
            {matches.map((m) => {
              const analytics = m.analytics_json ? JSON.parse(m.analytics_json) : null;
              const val = analytics?.value;
              const sideLabel =
                val?.side === "home"
                  ? `فوز ${m.home_name_ar}`
                  : val?.side === "away"
                  ? `فوز ${m.away_name_ar}`
                  : "التعادل";

              const sideTextColor =
                val?.side === "home"
                  ? "text-blue-600 dark:text-blue-400"
                  : val?.side === "away"
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-ink";

              return (
                <div
                  key={m.id}
                  className="rounded-2xl border border-emerald-500/30 bg-surface p-4 sm:p-5 space-y-4 shadow-2xs hover:border-emerald-500/50 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">
                        {m.league_name_ar}
                      </span>
                      <span className="text-xs font-bold text-muted">
                        {formatShortDate(m.utc_date)}
                      </span>
                    </div>

                    <Link
                      href={`/match/${encodeURIComponent(m.id)}`}
                      className="press-scale inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-panel border border-line hover:border-emerald-500 text-ink hover:text-emerald-600 dark:hover:text-emerald-400 font-black text-xs no-underline transition-all shadow-2xs"
                    >
                      <span>تحليل المباراة بالكامل</span>
                      <span>←</span>
                    </Link>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
                    {/* Match Title */}
                    <div className="space-y-1">
                      <h3 className="text-base sm:text-lg font-black text-ink">
                        {m.home_name_ar} <span className="text-muted font-normal me-1 ms-1">ضد</span> {m.away_name_ar}
                      </h3>
                      <p className="text-xs font-semibold text-muted">
                        احتمال النموذج: <strong className="text-ink font-bold">{(m.p_home * 100).toFixed(0)}%</strong> للمضيف • <strong className="text-ink font-bold">{(m.p_draw * 100).toFixed(0)}%</strong> تعادل • <strong className="text-ink font-bold">{(m.p_away * 100).toFixed(0)}%</strong> للضيف
                      </p>
                    </div>

                    {/* Value Analytics Cards */}
                    {val && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        <div className="rounded-xl border border-line bg-panel p-2.5 text-center space-y-0.5 shadow-2xs">
                          <span className="text-[10px] font-bold text-muted block">الجانب المرشح</span>
                          <div className={`font-black truncate ${sideTextColor}`}>{sideLabel}</div>
                        </div>

                        <div className="rounded-xl border border-line bg-panel p-2.5 text-center space-y-0.5 shadow-2xs">
                          <span className="text-[10px] font-bold text-muted block">السعر المتاح</span>
                          <div className="font-mono font-black text-ink text-sm tabular">{val.odds}</div>
                        </div>

                        <div className="rounded-xl border border-line bg-panel p-2.5 text-center space-y-0.5 shadow-2xs">
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">الفائدة (+EV)</span>
                          <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm tabular">+{(val.ev * 100).toFixed(1)}%</div>
                        </div>

                        <div className="rounded-xl border border-line bg-panel p-2.5 text-center space-y-0.5 shadow-2xs">
                          <span className="text-[10px] font-bold text-muted block">رهان كيلي الربع</span>
                          <div className="font-mono font-black text-ink text-sm tabular">{(val.stake * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      <BackBar links={[{ href: "/", label: "الرئيسية" }]} />
    </div>
  );
}

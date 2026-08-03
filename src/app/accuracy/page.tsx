import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  BackBar,
  EmptyState,
  PageNav,
  SectionCard,
} from "@/components/ui";
import { LeagueAccuracyChart } from "@/components/LeagueAccuracyChart";
import { PredictionArchiveLog } from "@/components/PredictionArchiveLog";
import { formatMetaStamp, pct, pctCss } from "@/lib/format";
import { getModelMetrics, getMeta, getFinishedPredictionsHistory } from "@/lib/queries";

export const metadata: Metadata = {
  title: "دقة النماذج والمعايرة",
  description:
    "مقاييس الدقة وBrier وRPS لنماذج تقدير على شريحة walk-forward — مقارنة شفافة مع خط السوق.",
};

export const revalidate = 300;

/** شرح المقاييس بلغة عادية — لا رياضيات إلا عند الحاجة */
const GLOSSARY: { term: string; body: string }[] = [
  {
    term: "الدقة",
    body: "نسبة المباريات التي كانت فيها النتيجة الأعلى احتمالاً هي ما وقع فعلاً. مقياس خشن: يسجّل إصابة أو خطأ ولا يرى مقدار الثقة خلفها.",
  },
  {
    term: "Brier",
    body: "متوسط مربّع الفارق بين الاحتمال المعروض وما وقع، على النتائج الثلاث معاً. الأقل أفضل. يجيب عن سؤال المعايرة: حين نقول 60٪، هل تقع النتيجة في ست مباريات من عشر؟",
  },
  {
    term: "Log-loss",
    body: "قريب من Brier لكنه يعاقب الثقة الخاطئة بقسوة أكبر؛ إعطاء 5٪ لنتيجة وقعت يكلّف كثيراً. الأقل أفضل.",
  },
  {
    term: "walk-forward",
    body: "التقييم يجري بالترتيب الزمني: النموذج يتدرّب على ما قبل المباراة فقط ثم يُسأل عنها. لا يرى نتيجتها ولا ما بعدها، فلا يوجد تسرّب من المستقبل يضخّم الأرقام.",
  },
  {
    term: "RPS",
    body: "Ranked Probability Score — المقياس المرجعي في أدبيات توقع كرة القدم. يعامل النتائج كسلّم مرتّب (فوز، تعادل، خسارة) فيعاقب من توقّع الفوز وجاءت الخسارة أشد مما لو جاء التعادل.",
  },
  {
    term: "خط السوق",
    body: "احتمالات أسعار المراهنات بعد خصم هامش الشركة، مقيّمة على نفس شريحة المباريات تماماً — المقارنة التي تفحص إضافة النموذج فوق السوق.",
  },
];

type ValueBacktest = {
  policy: string;
  total: { n_bets: number; hits: number; staked: number; pnl: number };
};

export default function AccuracyPage() {
  const allMetrics = getModelMetrics();
  const lastFit = getMeta("last_fit");
  const historyItems = getFinishedPredictionsHistory("all", 150);

  let vb: ValueBacktest | null = null;
  try {
    const raw = getMeta("value_backtest");
    vb = raw ? (JSON.parse(raw) as ValueBacktest) : null;
  } catch {
    vb = null;
  }

  // صفوف خط أساس السوق تعيش في نفس الجدول بعلامة model_version='market'
  const isMarketRow = (m: (typeof allMetrics)[0]) =>
    m.model_version === "market";
  const metrics = allMetrics.filter((m) => !isMarketRow(m));
  const marketByLeague = new Map(
    allMetrics
      .filter((m) => isMarketRow(m) && m.league_id != null)
      .map((m) => [m.league_id, m]),
  );

  const perLeague = metrics.filter((m) => m.league_id != null);
  const mean = (pick: (m: (typeof metrics)[0]) => number) =>
    perLeague.length > 0
      ? perLeague.reduce((s, m) => s + pick(m), 0) / perLeague.length
      : null;

  const avgAcc = mean((m) => m.accuracy);
  const avgBrier = mean((m) => m.brier);
  const avgLogLoss = mean((m) => m.log_loss);
  const totalMatches = perLeague.reduce((s, m) => s + m.n_matches, 0);
  const best = perLeague.reduce(
    (a, m) => (!a || m.accuracy > a.accuracy ? m : a),
    null as (typeof metrics)[0] | null,
  );
  const maxAcc = best?.accuracy ?? 1;
  const windowSize = perLeague.length > 0 ? perLeague[0]!.n_matches : null;

  return (
    <div className="space-y-8">
      <div>
        <PageNav
          backHref="/"
          backLabel="المباريات"
          crumbs={[{ href: "/", label: "المباريات" }, { label: "الدقة والسجل" }]}
        />

        {/* Hero Header Banner */}
        <div className="rounded-2xl border border-line bg-panel p-6 sm:p-8 space-y-4 shadow-2xs mt-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-home font-black text-xs">
              <span className="h-2 w-2 rounded-full bg-home animate-pulse" />
              سجل المعايرة واختبار النماذج
            </span>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-muted">
              {lastFit && (
                <span className="bg-surface px-3 py-1 rounded-full border border-line">
                  آخر تحديث: {formatMetaStamp(lastFit)}
                </span>
              )}
              {perLeague.length > 0 && (
                <>
                  <span className="bg-surface px-3 py-1 rounded-full border border-line">
                    {perLeague.length} دوريات
                  </span>
                  <span className="bg-surface px-3 py-1 rounded-full border border-line">
                    {totalMatches} مباراة تقييم
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-black text-ink tracking-tight leading-tight">
              دقة النموذج وسجل الاختبار المباشر
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-muted leading-relaxed max-w-3xl">
              تقييم زمني مستقل (Walk-Forward): يتم تدريب النماذج على التاريخ السابق فقط دون تسريب بيانات المستقبَل، وتُقاس الدقة والمعايرة على{windowSize ? ` آخر ${windowSize} مباراة` : " آخر نافذة اختبار"} لكل دوري.
            </p>
          </div>

          {/* Key Metric Tags */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line">
            <span className="text-[11px] font-bold text-muted me-1">ركائز التقييم:</span>
            <span className="px-2.5 py-1 rounded-lg bg-surface border border-blue-500/30 text-home font-mono font-bold text-xs">
              دقة نتائج 1X2
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-surface border border-success/30 text-success font-mono font-bold text-xs">
              معيار Brier Score
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-surface border border-purple-500/30 text-purple-600 dark:text-purple-400 font-mono font-bold text-xs">
              عقوبة Log-Loss
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-surface border border-amber-500/30 text-amber-600 dark:text-amber-400 font-mono font-bold text-xs">
              تقييم Walk-Forward
            </span>
          </div>
        </div>
      </div>

      {metrics.length === 0 ? (
        <SectionCard>
          <EmptyState
            title="لا توجد مقاييس محسبة بعد"
            body="قم بتشغيل الأمر fit لحساب وتحديث دقة النماذج على الدوريات المتاحة."
          />
        </SectionCard>
      ) : (
        <>
          {/* ملخص الأداء المجمع عبر الدوريات */}
          <SectionCard
            title="ملخص أداء النماذج عبر الدوريات"
            subtitle="متوسط نتائج التقييم في آخر نافذة اختبار زمني مستقلة"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 sm:p-5">
              <div className="rounded-2xl border border-blue-500/30 bg-surface p-4 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-home">متوسط دقة 1X2</span>
                  <span className="text-[10px] font-extrabold bg-home text-on-fill px-2 py-0.5 rounded-full">الأعلى أفضل</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-home font-mono tabular">
                  {avgAcc != null ? pct(avgAcc, 1) : "—"}
                </div>
                <p className="text-[11px] font-bold text-muted">نسبة التوقع الصحيح للنتيجة النهائية</p>
              </div>

              <div className="rounded-2xl border border-line bg-surface p-4 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-ink">متوسط Brier Score</span>
                  <span className="text-[10px] font-bold text-muted bg-panel border border-line px-2 py-0.5 rounded-full">الأقل أفضل</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-ink font-mono tabular">
                  {avgBrier != null ? avgBrier.toFixed(3) : "—"}
                </div>
                <p className="text-[11px] font-bold text-muted font-mono">معايير الدقة والاحتمال الثلاثي</p>
              </div>

              <div className="rounded-2xl border border-line bg-surface p-4 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-ink">متوسط Log-loss</span>
                  <span className="text-[10px] font-bold text-muted bg-panel border border-line px-2 py-0.5 rounded-full">الأقل أفضل</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-ink font-mono tabular">
                  {avgLogLoss != null ? avgLogLoss.toFixed(3) : "—"}
                </div>
                <p className="text-[11px] font-bold text-muted">مقياس الثقة والمجازفة بالاحتمال</p>
              </div>
            </div>
          </SectionCard>

          {/* نتائج محاكاة الاستراتيجية والقيمة Backtest */}
          {vb && vb.total.n_bets > 0 && vb.total.staked > 0 ? (
            <SectionCard
              title="سجل أداء القيمة المستهدفة (+EV Backtest)"
              subtitle={`سياسة ${vb.policy} على نافذة القياس النظيفة · نتائج للاسترشاد العلمي`}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 sm:p-5">
                <div className="rounded-xl border border-line bg-panel p-3.5 space-y-1">
                  <span className="text-xs font-bold text-muted">إجمالي الرهانات</span>
                  <div className="text-xl font-black text-ink font-mono tabular">{vb.total.n_bets}</div>
                </div>

                <div className="rounded-xl border border-line bg-panel p-3.5 space-y-1">
                  <span className="text-xs font-bold text-muted">نسبة النجاح</span>
                  <div className="text-xl font-black text-ink font-mono tabular">{pct(vb.total.hits / vb.total.n_bets, 0)}</div>
                </div>

                <div className="rounded-xl border border-line bg-panel p-3.5 space-y-1">
                  <span className="text-xs font-bold text-muted">عائد الاستثمار (ROI)</span>
                  <div className={`text-xl font-black font-mono tabular ${vb.total.pnl >= 0 ? "text-success" : "text-danger"}`}>
                    {vb.total.pnl >= 0 ? "+" : ""}
                    {((vb.total.pnl / vb.total.staked) * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-panel p-3.5 space-y-1">
                  <span className="text-xs font-bold text-muted">الصافي الإجمالي</span>
                  <div className={`text-xl font-black font-mono tabular ${vb.total.pnl >= 0 ? "text-success" : "text-danger"}`}>
                    {vb.total.pnl >= 0 ? "+" : ""}
                    {vb.total.pnl.toFixed(2)} وحدة
                  </div>
                </div>
              </div>
            </SectionCard>
          ) : null}

          {/* الرسم البياني الأفقي لدقة النماذج حسب الدوري */}
          <LeagueAccuracyChart
            perLeague={perLeague.map((m) => ({
              leagueId: m.league_id || "LEAGUE",
              leagueNameAr: m.leagueNameAr || m.league_id || "الدوري",
              accuracy: m.accuracy ?? 0,
              brier: m.brier ?? 0,
              matches: m.n_matches ?? 82,
            }))}
          />

          {/* جدول أداء الدوريات المفضل */}
          <SectionCard
            title="سجل دقة النماذج بحسب الدوري"
            subtitle={
              best
                ? `الدوري الأكثر دقة: ${best.leagueNameAr ?? "—"} بنسبة ${pct(best.accuracy, 1)}`
                : "نافذة الاختبار الأخيرة"
            }
          >
            <div className="overflow-x-auto p-4 sm:p-5">
              <table className="w-full text-xs text-start border-collapse">
                <caption className="sr-only">
                  دقة النموذج ومقاييس المعايرة لكل دوري في نافذة الاختبار الأخيرة، مع خط أساس السوق على النافذة نفسها.
                </caption>
                <thead>
                  <tr className="border-b border-line text-muted text-[11px] font-bold">
                    <th scope="col" className="py-3 px-4 text-start">الدوري والنموذج</th>
                    <th scope="col" className="py-3 px-3 text-start">نافذة التقييم</th>
                    <th scope="col" className="py-3 px-3 text-center">المباريات</th>
                    <th scope="col" className="py-3 px-3 text-start">دقة (1X2)</th>
                    <th scope="col" className="py-3 px-3 text-center">Brier</th>
                    <th scope="col" className="py-3 px-3 text-center">Log-loss</th>
                    <th scope="col" className="py-3 px-3 text-center">RPS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {metrics.map((m) => {
                    const isBest = best != null && m.id === best.id;
                    const name = m.leagueNameAr ?? "—";
                    const mkt = m.league_id
                      ? marketByLeague.get(m.league_id)
                      : undefined;
                    return (
                      <Fragment key={m.id}>
                        <tr className="hover:bg-panel/50 transition-colors">
                          <td className="py-3.5 px-4 font-black text-ink">
                            <div className="flex items-center gap-2">
                              <span>{name}</span>
                              {isBest && (
                                <span className="bg-home text-on-fill font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                                  الأعلى دقة
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-muted font-mono">{m.window_label}</td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-ink tabular">{m.n_matches}</td>
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <span className={`w-12 shrink-0 font-mono font-black ${isBest ? "text-home" : "text-ink"}`}>
                                {pct(m.accuracy, 1)}
                              </span>
                              <div className="h-2 w-20 rounded-full bg-panel overflow-hidden border border-line">
                                <div
                                  className="h-full rounded-full bg-home transition-all duration-500"
                                  style={{ width: pctCss(m.accuracy / maxAcc) }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-ink tabular">{m.brier.toFixed(3)}</td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-ink tabular">{m.log_loss.toFixed(3)}</td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-ink tabular">
                            {m.rps != null ? m.rps.toFixed(4) : "—"}
                          </td>
                        </tr>

                        {mkt && (
                          <tr className="bg-panel/40 hover:bg-panel/70 transition-colors text-[11px]">
                            <td className="py-2.5 px-4 ps-8 text-muted font-bold">
                              ← خط أساس السوق (Market Odds)
                            </td>
                            <td className="py-2.5 px-3 text-muted font-mono">{mkt.window_label}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-muted tabular">{mkt.n_matches}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-muted">{pct(mkt.accuracy, 1)}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-muted tabular">{mkt.brier.toFixed(3)}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-muted tabular">{mkt.log_loss.toFixed(3)}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-muted tabular">
                              {mkt.rps != null ? mkt.rps.toFixed(4) : "—"}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* دليل المصطلحات */}
          <SectionCard title="دليل قراءة المقاييس والمعايير" subtitle="توضيح مبسط للمفاهيم الإحصائية المستخدمة">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-5">
              {GLOSSARY.map((g) => (
                <div key={g.term} className="rounded-xl border border-line bg-panel p-4 space-y-1.5">
                  <span className="font-black text-ink text-sm sm:text-base block">{g.term}</span>
                  <p className="text-xs font-semibold text-muted leading-relaxed">{g.body}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* قسم سجل حفظ ومراجعة التوقعات الكامل */}
          <SectionCard
            title="سجل حفظ ومراجعة التوقعات الكامل (Predictions History Archive)"
            subtitle="توثيق كامل للنتائج الفعلية مقارنة بالتوقعات المسبقة المسجلة قبل انطلاق المباريات"
          >
            <div className="p-4 sm:p-5">
              <PredictionArchiveLog items={historyItems} />
            </div>
          </SectionCard>

          {/* تفسير النسبة الطبيعية */}
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 sm:p-6 space-y-2">
            <h3 className="font-black text-home text-base">لماذا تُعتبر دقة 47٪ رقم طبيعي وقوي في كرة القدم؟</h3>
            <div className="text-xs sm:text-sm font-semibold text-ink leading-relaxed space-y-2">
              <p>
                في رياضة يتنافس فيها طرفان على 3 نتائج محتملة (فوز، تعادل، خسارة)، فإن التوقع العشوائي يصيب نحو 33٪ فقط. ترجيح المضيف في كافة المباريات لا يتجاوز 44٪.
              </p>
              <p>
                لذلك تستقر معظم النماذج الرياضية في نطاق 45–55٪. الفارق الحقيقي بين النماذج لا يكمن فقط في عدد المباريات المصابة بل في صدق احتمالات Brier وLog-loss. لمزيد من التفاصيل المعمقة،{" "}
                <Link href="/methodology" className="font-black text-accent underline">
                  إطلع على المنهجية الحسابية
                </Link>.
              </p>
            </div>
          </div>
        </>
      )}

      <BackBar
        links={[
          { href: "/", label: "المباريات" },
          { href: "/methodology", label: "المنهجية" },
        ]}
      />
    </div>
  );
}

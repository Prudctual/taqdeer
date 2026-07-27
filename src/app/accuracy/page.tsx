import { Fragment } from "react";
import Link from "next/link";
import {
  BackBar,
  EmptyState,
  MetaItem,
  PageHeader,
  PageNav,
  SectionCard,
  StatTile,
} from "@/components/ui";
import { formatMetaStamp, pct, pctCss } from "@/lib/format";
import { getModelMetrics, getMeta } from "@/lib/queries";

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
    body: "التقييم يجري بالترتيب الزمني: النموذج يتدرّب على ما قبل المباراة فقط ثم يُسأل عنها. لا يرى نتيجتها ولا ما بعدها، فلا يوجد تسرّب من المستقبل يضخّم الأرقام. حتى معايرة الحرارة تُقدَّر على شريحة سابقة منفصلة عن شريحة القياس.",
  },
  {
    term: "RPS",
    body: "Ranked Probability Score — المقياس المرجعي في أدبيات توقع كرة القدم. يعامل النتائج كسلّم مرتّب (فوز، تعادل، خسارة) فيعاقب من توقّع الفوز وجاءت الخسارة أشد ممن توقّعه وجاء التعادل. الأقل أفضل.",
  },
  {
    term: "خط السوق",
    body: "احتمالات أسعار المراهنات بعد خصم هامش الشركة، مقيّمة على نفس شريحة المباريات تماماً — المقارنة التي يطلبها أي متشكك: هل يضيف النموذج شيئاً فوق السوق؟ الدوري الكوري بلا أسعار مخزّنة فلا خط له.",
  },
];

type ValueBacktest = {
  policy: string;
  total: { n_bets: number; hits: number; staked: number; pnl: number };
};

export default function AccuracyPage() {
  const allMetrics = getModelMetrics();
  const lastFit = getMeta("last_fit");

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

  // صف «كل الدوريات» تجميعي: عدّه كدوري يضخّم العدد ويحسب مبارياته مرتين
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
  // حجم النافذة من البيانات نفسها — لا رقم مكتوب باليد يتقادم مع تغيّر الإعداد
  const windowSize = perLeague.length > 0 ? perLeague[0]!.n_matches : null;

  return (
    <div className="space-y-6">
      <div>
        <PageNav
          backHref="/"
          backLabel="المباريات"
          crumbs={[{ href: "/", label: "المباريات" }, { label: "الدقة" }]}
        />
        <PageHeader
          eyebrow="المعايرة"
          title="دقة النموذج"
          description={`تقييم walk-forward: التدريب على الماضي فقط، ثم الاختبار على${
            windowSize ? ` آخر ${windowSize} مباراة` : " نافذة أخيرة"
          } لكل دوري. الدقة الأعلى أفضل؛ Brier وLog-loss وRPS الأقل أفضل.`}
          meta={
            lastFit || metrics.length > 0 ? (
              <>
                {lastFit ? (
                  <MetaItem label="آخر تدريب" value={formatMetaStamp(lastFit)} />
                ) : null}
                {perLeague.length > 0 ? (
                  <>
                    <MetaItem label="دوريات" value={perLeague.length} />
                    <MetaItem label="مباريات الاختبار" value={totalMatches} />
                  </>
                ) : null}
              </>
            ) : null
          }
        />
      </div>

      {metrics.length === 0 ? (
        <SectionCard>
          <EmptyState
            title="لا مقاييس بعد"
            body="شغّل bun run fit لحساب دقة النموذج على كل دوري."
          />
        </SectionCard>
      ) : (
        <>
          <SectionCard
            title="ملخص عبر الدوريات"
            subtitle="متوسط بسيط على الدوريات المقيّمة في آخر نافذة اختبار."
          >
            <div className="grid grid-cols-3">
              <StatTile
                label="متوسط دقة 1X2"
                value={avgAcc != null ? pct(avgAcc, 1) : "—"}
                hint="الأعلى أفضل"
              />
              <StatTile
                label="متوسط Brier"
                value={avgBrier != null ? avgBrier.toFixed(3) : "—"}
                hint="الأقل أفضل"
              />
              <StatTile
                label="متوسط Log-loss"
                value={avgLogLoss != null ? avgLogLoss.toFixed(3) : "—"}
                hint="الأقل أفضل"
              />
            </div>
          </SectionCard>

          {vb && vb.total.n_bets > 0 && vb.total.staked > 0 ? (
            <SectionCard
              title="طبقة القيمة — backtest"
              subtitle={`سياسة ${vb.policy} على شريحة القياس النظيفة · عينة صغيرة، للاسترشاد لا للحكم`}
            >
              <div className="grid grid-cols-4">
                <StatTile label="رهانات" value={vb.total.n_bets} />
                <StatTile
                  label="إصابة"
                  value={pct(vb.total.hits / vb.total.n_bets, 0)}
                />
                <StatTile
                  label="ROI"
                  value={
                    <span dir="ltr" className="inline-block tabular">
                      {vb.total.pnl >= 0 ? "+" : ""}
                      {((vb.total.pnl / vb.total.staked) * 100).toFixed(1)}%
                    </span>
                  }
                  hint="على المبلغ المُخاطَر"
                />
                <StatTile
                  label="الصافي"
                  value={
                    <>
                      <span dir="ltr" className="inline-block tabular">
                        {vb.total.pnl >= 0 ? "+" : ""}
                        {vb.total.pnl.toFixed(3)}
                      </span>{" "}
                      وحدة
                    </>
                  }
                />
              </div>
            </SectionCard>
          ) : null}

          <SectionCard
            title="حسب الدوري"
            subtitle={
              best
                ? `الأفضل: ${best.leagueNameAr ?? "—"} · ${pct(best.accuracy, 1)}`
                : "نافذة الاختبار الأخيرة"
            }
            flush
          >
            <div className="overflow-x-auto">
              <table className="table-clean min-w-[38rem]">
                <caption className="sr-only">
                  دقة النموذج ومقاييس المعايرة لكل دوري في نافذة الاختبار
                  الأخيرة، مع خط أساس السوق على النافذة نفسها حيث تتوفر الأسعار
                </caption>
                <thead>
                  <tr>
                    <th scope="col">الدوري</th>
                    <th scope="col">النافذة</th>
                    <th scope="col">مباريات</th>
                    <th scope="col">دقة 1X2</th>
                    <th scope="col">Brier</th>
                    <th scope="col">Log-loss</th>
                    <th scope="col">RPS</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m) => {
                    const isBest = best != null && m.id === best.id;
                    const name = m.leagueNameAr ?? "—";
                    const mkt = m.league_id
                      ? marketByLeague.get(m.league_id)
                      : undefined;
                    return (
                      <Fragment key={m.id}>
                        <tr data-league={m.league_id ?? undefined}>
                          <td>
                            <span className="inline-flex items-center gap-2">
                              {m.league_id ? (
                                <span className="chip-dot" aria-hidden />
                              ) : null}
                              <span className="font-medium text-ink">
                                {name}
                              </span>
                              {isBest ? (
                                <span className="text-[10px] font-medium text-accent">
                                  الأفضل
                                </span>
                              ) : null}
                            </span>
                          </td>
                          <td className="text-muted">{m.window_label}</td>
                          <td className="tabular text-muted">{m.n_matches}</td>
                          <td>
                            <span className="flex items-center gap-2">
                              <span
                                className={`w-12 shrink-0 tabular font-medium ${
                                  isBest ? "text-accent" : "text-ink"
                                }`}
                              >
                                {pct(m.accuracy, 1)}
                              </span>
                              <span
                                className="h-1.5 w-16 overflow-hidden rounded-[2px] bg-panel sm:w-24"
                                aria-hidden
                              >
                                <span
                                  className="meter-fill block h-full bg-accent"
                                  style={{ width: pctCss(m.accuracy / maxAcc) }}
                                />
                              </span>
                            </span>
                          </td>
                          <td className="tabular">{m.brier.toFixed(3)}</td>
                          <td className="tabular">{m.log_loss.toFixed(3)}</td>
                          <td className="tabular">
                            {m.rps != null ? m.rps.toFixed(4) : "—"}
                          </td>
                        </tr>
                        {mkt ? (
                          <tr data-league={m.league_id ?? undefined}>
                            <td className="ps-6 text-muted">
                              السوق على نفس النافذة
                            </td>
                            <td className="text-faint">{mkt.window_label}</td>
                            <td className="tabular text-faint">
                              {mkt.n_matches}
                            </td>
                            <td className="tabular text-muted">
                              {pct(mkt.accuracy, 1)}
                            </td>
                            <td className="tabular text-muted">
                              {mkt.brier.toFixed(3)}
                            </td>
                            <td className="tabular text-muted">
                              {mkt.log_loss.toFixed(3)}
                            </td>
                            <td className="tabular text-muted">
                              {mkt.rps != null ? mkt.rps.toFixed(4) : "—"}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="ماذا تعني هذه الأرقام">
            <dl className="divide-y divide-line">
              {GLOSSARY.map((g) => (
                <div
                  key={g.term}
                  className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[8rem_1fr] sm:gap-4"
                >
                  <dt className="type-section text-ink">{g.term}</dt>
                  <dd className="max-w-[62ch] text-sm leading-relaxed text-muted text-pretty">
                    {g.body}
                  </dd>
                </div>
              ))}
            </dl>
          </SectionCard>

          <SectionCard title="لماذا 47٪ رقم طبيعي">
            <div className="max-w-[62ch] space-y-3 text-sm leading-relaxed text-muted text-pretty">
              <p>
                في سوق بثلاث نتائج، الاختيار العشوائي يصيب نحو 33٪، وترجيح
                المضيف في كل مباراة يصيب أقل من نصف المباريات. التعادل نادراً ما
                يكون الاحتمال الأعلى رغم أنه يقع كثيراً، وهدف واحد يقلب المباراة
                بالكامل.
              </p>
              <p>
                لذلك تستقر النماذج الجادة في نطاق 45–55٪، والفارق بينها لا يظهر
                في عدد الإصابات بل في Brier وLog-loss: أي في صدق الاحتمال نفسه.{" "}
                <Link
                  href="/methodology"
                  className="motion-colors font-medium text-accent no-underline hover:underline"
                >
                  راجع المنهجية
                </Link>{" "}
                لفهم حدود النموذج.
              </p>
            </div>
          </SectionCard>
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

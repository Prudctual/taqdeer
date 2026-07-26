import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ChevronIcon } from "@/components/ChevronIcon";
import {
  ConfidenceMeter,
  FormBars,
  LambdaCompare,
  VerdictBanner,
} from "@/components/InsightBits";
import { MatchWhen } from "@/components/MatchWhen";
import { ProbBar } from "@/components/ProbBar";
import { RevealOnView } from "@/components/RevealOnView";
import { ScoreHeatmap } from "@/components/ScoreHeatmap";
import { SignalBreakdown } from "@/components/SignalBreakdown";
import { TeamMatchup } from "@/components/TeamMatchup";
import {
  BackBar,
  EmptyState,
  OutcomeCards,
  OutcomeLegend,
  PageNav,
  SectionCard,
} from "@/components/ui";
import { formatMetaStamp, pct, pctCss, topOutcome } from "@/lib/format";
import { getColdTeamIds, getMatchById, getMeta } from "@/lib/queries";

export const revalidate = 300;

/** مشترك بين generateMetadata والصفحة داخل الطلب نفسه */
const loadMatch = cache((id: string) => getMatchById(id));

type Analytics = {
  components?: Record<string, { p?: [number, number, number] | null }>;
  edge?: { home: number; draw: number; away: number } | null;
  weights?: Record<string, number>;
  version?: string;
};

const OUTCOME_COLOR = {
  H: "var(--home)",
  D: "var(--draw)",
  A: "var(--away)",
} as const;

const OUTCOME_GLYPH = { H: "1", D: "X", A: "2" } as const;

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** شريط قياس رفيع — علامة بيانات لا زينة */
function Meter({
  value,
  color = "var(--accent)",
  className = "",
}: {
  value: number;
  color?: string;
  className?: string;
}) {
  const w = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  return (
    <div className={`prob-track h-1.5 ${className}`} aria-hidden>
      <div className="meter-fill" style={{ width: pctCss(w), background: color }} />
    </div>
  );
}

/** سطر سوق: تسمية · شريط · رقم */
function MarketRow({
  label,
  gloss,
  meter,
  value,
  color = "var(--accent)",
}: {
  label: string;
  gloss?: string;
  meter: number;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
      <dt className="w-28 shrink-0 text-[13px] text-ink sm:w-32">
        {label}
        {gloss ? (
          <span className="ms-1.5 text-[11px] text-faint">
            <span dir="ltr">{gloss}</span>
          </span>
        ) : null}
      </dt>
      <dd className="flex min-w-0 flex-1 items-center gap-3">
        <Meter value={meter} color={color} className="min-w-0 flex-1" />
        <span className="w-12 shrink-0 text-end text-[13px] font-medium tabular text-ink">
          {value}
        </span>
      </dd>
    </div>
  );
}

/** سطر إسناد: مفتاح وقيمة */
function ProvenanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-2.5 last:border-b-0">
      <dt className="shrink-0 text-xs text-muted">{label}</dt>
      <dd className="min-w-0 truncate text-[13px] font-medium tabular text-ink" dir="auto">
        {value}
      </dd>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const match = loadMatch(decodeURIComponent(id));
  if (!match) return { title: "مباراة غير موجودة" };

  const title = `${match.home_name_ar} ضد ${match.away_name_ar}`;
  const description =
    match.p_home != null && match.p_draw != null && match.p_away != null
      ? `${match.league_name_ar} — احتمالات 1X2: مضيف ${pct(match.p_home)}، تعادل ${pct(match.p_draw)}، ضيف ${pct(match.p_away)}.`
      : `${match.league_name_ar} — تحليل المواجهة وتوزيع النتائج.`;

  return { title, description };
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = loadMatch(decodeURIComponent(id));
  if (!match) notFound();

  const league = match.leagueId?.toLowerCase() || undefined;

  const matrixRaw = parseJson<number[][]>(match.score_matrix_json, []);
  const matrix = Array.isArray(matrixRaw) ? matrixRaw : [];
  const topsRaw = parseJson<Array<{ hg: number; ag: number; p: number }>>(
    match.top_scores_json,
    [],
  );
  const tops = Array.isArray(topsRaw) ? topsRaw : [];
  const analytics = parseJson<Analytics | null>(match.analytics_json, null);

  const hasPred =
    match.p_home != null && match.p_draw != null && match.p_away != null;
  const pick = hasPred
    ? topOutcome(match.p_home!, match.p_draw!, match.p_away!)
    : null;
  const finished =
    match.status === "FINISHED" &&
    match.home_goals != null &&
    match.away_goals != null;
  const upcoming = match.status !== "FINISHED";
  // فريق صاعد بلا تاريخ نتائج: الرقم مبني على أولويات فقط، ويجب أن يُقال
  const cold = getColdTeamIds();
  const coldNames = [
    cold.has(match.home_id) ? match.home_name_ar : null,
    cold.has(match.away_id) ? match.away_name_ar : null,
  ].filter((n): n is string => n != null);
  const form = analytics?.components?.form as
    | {
        home_pts?: number;
        away_pts?: number;
        home_gd?: number;
        away_gd?: number;
      }
    | undefined;

  const lastFit = getMeta("last_fit");
  const lastSync = getMeta("last_sync");

  const markets: {
    label: string;
    gloss?: string;
    meter: number;
    value: string;
    raw: number;
  }[] = [];
  if (match.p_btts_yes != null) {
    markets.push({
      label: "الفريقان يسجلان",
      gloss: "BTTS",
      meter: match.p_btts_yes,
      value: pct(match.p_btts_yes),
      raw: match.p_btts_yes,
    });
  }
  if (match.p_over25 != null) {
    markets.push({
      label: "فوق 2.5",
      meter: match.p_over25,
      value: pct(match.p_over25),
      raw: match.p_over25,
    });
    markets.push({
      label: "تحت 2.5",
      meter: 1 - match.p_over25,
      value: pct(1 - match.p_over25),
      raw: 1 - match.p_over25,
    });
  }
  const topMarket = markets.length
    ? markets.reduce((a, b) => (b.raw > a.raw ? b : a))
    : null;
  const hasXpts = match.xpts_home != null && match.xpts_away != null;

  const marketRows =
    match.market_home != null &&
    match.market_draw != null &&
    match.market_away != null &&
    hasPred
      ? ([
          {
            key: "H" as const,
            label: "مضيف",
            model: match.p_home!,
            market: match.market_home,
            edge: analytics?.edge?.home ?? null,
          },
          {
            key: "D" as const,
            label: "تعادل",
            model: match.p_draw!,
            market: match.market_draw,
            edge: analytics?.edge?.draw ?? null,
          },
          {
            key: "A" as const,
            label: "ضيف",
            model: match.p_away!,
            market: match.market_away,
            edge: analytics?.edge?.away ?? null,
          },
        ])
      : null;
  const bestEdge = marketRows
    ? marketRows.reduce((a, b) =>
        (b.edge ?? -Infinity) > (a.edge ?? -Infinity) ? b : a,
      )
    : null;

  return (
    <div className="space-y-6">
      {/* 1 — المواجهة وسياقها */}
      <div className="space-y-4">
        <PageNav
          backHref={`/leagues/${match.leagueId}`}
          backLabel={match.league_name_ar}
          crumbs={[
            { href: "/", label: "المباريات" },
            { href: `/leagues/${match.leagueId}`, label: match.league_name_ar },
            { label: "تحليل المباراة" },
          ]}
        />

        <header
          className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8"
          data-league={league}
        >
          <div className="min-w-0 space-y-2">
            <p className="type-label flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="chip-dot" aria-hidden />
                <Link
                  href={`/leagues/${match.leagueId}`}
                  className="motion-colors rounded-sm no-underline hover:text-ink"
                >
                  {match.league_name_ar}
                </Link>
              </span>
              {match.matchday != null ? (
                <span className="text-faint">
                  <span aria-hidden>·</span> الجولة{" "}
                  <span className="tabular">{match.matchday}</span>
                </span>
              ) : null}
              {match.season ? (
                <span className="text-faint">
                  <span aria-hidden>·</span> موسم{" "}
                  <span className="tabular">{match.season}</span>
                </span>
              ) : null}
            </p>
            <h1 className="type-page text-balance text-ink">
              {match.home_name_ar}
              <span className="mx-2 font-normal text-faint">ضد</span>
              {match.away_name_ar}
            </h1>
            <MatchWhen
              iso={match.utc_date}
              variant="detail"
              finished={finished}
              showCountdown={upcoming}
            />
            {!finished && !upcoming ? (
              <p className="text-xs text-muted">لم تُلعب بعد</p>
            ) : null}
          </div>
          {pick ? (
            <div className="shrink-0 sm:pb-1">
              <OutcomeLegend />
            </div>
          ) : null}
        </header>

        <TeamMatchup
          homeName={match.home_name_ar}
          awayName={match.away_name_ar}
          homeHref={`/team/${match.home_id}`}
          awayHref={`/team/${match.away_id}`}
          homeCrestUrl={match.home_crest_url}
          awayCrestUrl={match.away_crest_url}
          homeMeta={
            match.elo_home != null
              ? `Elo ${Math.round(match.elo_home)}`
              : undefined
          }
          awayMeta={
            match.elo_away != null
              ? `Elo ${Math.round(match.elo_away)}`
              : undefined
          }
          score={finished ? `${match.home_goals}–${match.away_goals}` : null}
        />
      </div>

      {!hasPred || !pick ? (
        <SectionCard leagueId={match.leagueId} flush>
          <EmptyState
            title="لا يتوفر توقع بعد"
            body="درّب النماذج لإظهار احتمالات 1X2 وتفكيك الإشارة لهذه المباراة."
            action={
              <pre
                className="inline-block rounded-md border border-line bg-panel px-3.5 py-2 text-[13px] tabular text-ink"
                dir="ltr"
              >
                bun run fit
              </pre>
            }
          />
        </SectionCard>
      ) : (
        <>
          {/* 2 — إشارة 1X2 */}
          <SectionCard
            leagueId={match.leagueId}
            title="احتمال النتيجة النهائي"
            subtitle="Dixon–Coles · Pi · Elo · فورم · السوق"
            flush
          >
            <div className="divide-y divide-line">
              {match.confidence != null ? (
                <VerdictBanner
                  pickLabel={pick.label}
                  pickPct={pick.p}
                  pickKey={pick.key}
                  confidence={match.confidence}
                  homeName={match.home_name_ar}
                  awayName={match.away_name_ar}
                />
              ) : null}
              {coldNames.length > 0 ? (
                <p className="px-4 py-3 text-xs leading-relaxed text-muted sm:px-5">
                  <span className="font-semibold text-ink">
                    {coldNames.join(" و")}
                  </span>{" "}
                  بلا نتائج سابقة في القاعدة، فالتقدير يقوم على قيم بَدئية
                  (Elo ‏1500) لا على
                  أداء مرصود. اقرأ هذا الاحتمال كأولويّة أوّلية لا كقراءة
                  معايَرة.
                </p>
              ) : null}
              <OutcomeCards
                pHome={match.p_home!}
                pDraw={match.p_draw!}
                pAway={match.p_away!}
                pickKey={pick.key}
              />
              <div className="space-y-3 p-4 sm:p-5">
                <ProbBar
                  pHome={match.p_home!}
                  pDraw={match.p_draw!}
                  pAway={match.p_away!}
                  bare
                  showLabels={false}
                />
                {match.confidence != null ? (
                  <ConfidenceMeter value={match.confidence} inline />
                ) : null}
              </div>
            </div>
          </SectionCard>

          {/* 3 — لماذا: تفكيك الإشارات */}
          {analytics?.components ? (
            <SectionCard
              leagueId={match.leagueId}
              title="تفكيك الإشارات"
              subtitle="محركات فردية قبل المزج · متفق / خالف مع القراءة"
              flush
              quiet
            >
              <SignalBreakdown
                components={analytics.components}
                pickKey={pick.key}
              />
              <FormBars
                homePts={form?.home_pts}
                awayPts={form?.away_pts}
                homeGd={form?.home_gd}
                awayGd={form?.away_gd}
                pickKey={pick.key}
              />
            </SectionCard>
          ) : null}

          {/* 3ب — النموذج مقابل السوق */}
          {marketRows ? (
            <SectionCard
              leagueId={match.leagueId}
              title="النموذج مقابل السوق"
              subtitle="بعد إزالة هامش المراهنين · الفرق بالنقاط المئوية"
              flush
              quiet
            >
              <RevealOnView>
                {bestEdge?.edge != null ? (
                  <p className="border-b border-line bg-panel px-4 py-2 text-[11px] text-muted sm:px-5">
                    أكبر فرق:{" "}
                    <span className="font-medium text-ink">
                      {bestEdge.label}
                    </span>
                    <span className="mx-1.5 text-faint" aria-hidden>
                      ·
                    </span>
                    <span
                      className={
                        bestEdge.edge > 0 ? "text-accent" : "text-muted"
                      }
                    >
                      <span className="inline-block tabular" dir="ltr">
                        {bestEdge.edge > 0 ? "+" : ""}
                        {(bestEdge.edge * 100).toFixed(1)}
                      </span>{" "}
                      نقطة
                    </span>
                  </p>
                ) : null}
                <ul className="divide-y divide-line">
                  {marketRows.map((row) => (
                    <li key={row.key} className="space-y-2 px-4 py-3 sm:px-5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[13px] text-ink">
                          <span
                            className="tabular font-semibold"
                            style={{ color: OUTCOME_COLOR[row.key] }}
                          >
                            {OUTCOME_GLYPH[row.key]}
                          </span>{" "}
                          {row.label}
                        </span>
                        {row.edge != null ? (
                          <span
                            className={`text-xs ${
                              row.edge > 0.02
                                ? "text-accent"
                                : row.edge < -0.02
                                  ? "text-muted"
                                  : "text-faint"
                            }`}
                          >
                            <span className="inline-block tabular" dir="ltr">
                              {row.edge > 0 ? "+" : ""}
                              {(row.edge * 100).toFixed(1)}
                            </span>{" "}
                            نقطة
                          </span>
                        ) : null}
                      </div>
                      <dl className="space-y-1.5">
                        <div className="flex items-center gap-2.5 text-[11px] text-muted">
                          <dt className="w-10 shrink-0">نموذج</dt>
                          <dd className="flex min-w-0 flex-1 items-center gap-2.5">
                            <Meter
                              value={row.model}
                              color={OUTCOME_COLOR[row.key]}
                              className="min-w-0 flex-1"
                            />
                            <span className="w-10 shrink-0 text-end tabular text-ink">
                              {pct(row.model)}
                            </span>
                          </dd>
                        </div>
                        <div className="flex items-center gap-2.5 text-[11px] text-muted">
                          <dt className="w-10 shrink-0">سوق</dt>
                          <dd className="flex min-w-0 flex-1 items-center gap-2.5">
                            <Meter
                              value={row.market}
                              color="var(--faint)"
                              className="min-w-0 flex-1"
                            />
                            <span className="w-10 shrink-0 text-end tabular">
                              {pct(row.market)}
                            </span>
                          </dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ul>
              </RevealOnView>
            </SectionCard>
          ) : null}

          {/* 4 — توزيع النتائج */}
          {matrix.length > 0 || tops.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {matrix.length > 0 ? (
                <SectionCard
                  leagueId={match.leagueId}
                  title="توزيع النتائج"
                  subtitle="احتمال كل نتيجة أهداف · بعد تعديل الفورم وPi"
                  quiet
                >
                  <ScoreHeatmap
                    matrix={matrix}
                    homeLabel={match.home_name_ar}
                    awayLabel={match.away_name_ar}
                  />
                </SectionCard>
              ) : null}

              {tops.length > 0 ? (
                <SectionCard
                  leagueId={match.leagueId}
                  title="أرجح النتائج"
                  subtitle={
                    tops[0]
                      ? `الأرجح ${tops[0].hg}–${tops[0].ag} · ${pct(tops[0].p, 1)} ثم ما يليها`
                      : "تفصيل ثانوي من مصفوفة الأهداف"
                  }
                  flush
                  quiet
                >
                  <RevealOnView>
                    <table className="table-clean">
                      <caption className="sr-only">
                        {`أرجح ست نتائج لمباراة ${match.home_name_ar} ضد ${match.away_name_ar}`}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col" className="w-8">
                            #
                          </th>
                          <th scope="col" className="w-16">
                            النتيجة
                          </th>
                          <th scope="col" className="table-num w-16">
                            احتمال
                          </th>
                          <th scope="col">نسبةً للأرجح</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tops.slice(0, 6).map((s, i) => (
                          <tr key={`${s.hg}-${s.ag}`}>
                            <td className="tabular text-faint">{i + 1}</td>
                            <td>
                              <span className="score-chip text-[13px] text-ink">
                                <span>{s.hg}</span>
                                <span className="text-faint">–</span>
                                <span>{s.ag}</span>
                              </span>
                            </td>
                            <td
                              className={`table-num ${
                                i === 0 ? "font-semibold text-ink" : "text-muted"
                              }`}
                            >
                              {pct(s.p, 1)}
                            </td>
                            <td>
                              <Meter
                                value={s.p / (tops[0]?.p || s.p || 1)}
                                color={
                                  i === 0 ? "var(--accent)" : "var(--faint)"
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </RevealOnView>
                </SectionCard>
              ) : null}
            </div>
          ) : null}

          {/* 5 — أسواق أخرى وأهداف متوقعة */}
          <div
            className={`grid gap-6 ${
              match.lambda_home != null && match.lambda_away != null
                ? "lg:grid-cols-2"
                : ""
            }`}
          >
            {markets.length > 0 || hasXpts ? (
              <SectionCard
                leagueId={match.leagueId}
                title="أسواق مشتقة"
                subtitle={
                  topMarket
                    ? `الأرجح ${topMarket.label} ${topMarket.value}`
                    : "من مصفوفة الأهداف"
                }
                flush
                quiet
              >
                <RevealOnView>
                  {markets.length > 0 ? (
                    <dl className="divide-y divide-line">
                      {markets.map((m) => (
                        <MarketRow
                          key={m.label}
                          label={m.label}
                          gloss={m.gloss}
                          meter={m.meter}
                          value={m.value}
                          color={
                            topMarket && m.label === topMarket.label
                              ? "var(--accent)"
                              : "var(--faint)"
                          }
                        />
                      ))}
                    </dl>
                  ) : null}
                  {hasXpts ? (
                    <div className="border-t border-line">
                      <p className="px-4 pt-3 type-label sm:px-5">
                        نقاط متوقعة{" "}
                        <span className="text-faint" dir="ltr">
                          xPts
                        </span>{" "}
                        · من 3
                      </p>
                      <dl className="divide-y divide-line">
                        <MarketRow
                          label={match.home_name_ar}
                          meter={match.xpts_home! / 3}
                          value={match.xpts_home!.toFixed(2)}
                          color="var(--home)"
                        />
                        <MarketRow
                          label={match.away_name_ar}
                          meter={match.xpts_away! / 3}
                          value={match.xpts_away!.toFixed(2)}
                          color="var(--away)"
                        />
                      </dl>
                    </div>
                  ) : null}
                </RevealOnView>
              </SectionCard>
            ) : null}

            {match.lambda_home != null && match.lambda_away != null ? (
              <SectionCard
                title="أهداف متوقعة"
                subtitle="λ لكل فريق قبل احتساب التوزيع"
                leagueId={match.leagueId}
                quiet
              >
                <LambdaCompare
                  home={match.lambda_home}
                  away={match.lambda_away}
                  homeName={match.home_name_ar}
                  awayName={match.away_name_ar}
                />
              </SectionCard>
            ) : null}
          </div>

          {/* 6 — إسناد الأرقام */}
          <SectionCard
            leagueId={match.leagueId}
            title="مصدر الأرقام"
            subtitle="نسخة النموذج وتاريخ التدريب والمصادر"
            quiet
          >
            <div className="space-y-5">
              <dl>
                <ProvenanceRow
                  label="نسخة النموذج"
                  value={match.model_version ?? "—"}
                />
                <ProvenanceRow
                  label="آخر تدريب"
                  value={lastFit ? formatMetaStamp(lastFit) : "—"}
                />
                <ProvenanceRow
                  label="آخر مزامنة"
                  value={lastSync ? formatMetaStamp(lastSync) : "—"}
                />
                <ProvenanceRow
                  label="مصدر البيانات"
                  value="football-data.co.uk · football-data.org"
                />
              </dl>
              <div className="space-y-3 border-t border-line pt-4">
                <h3 className="type-label">كيف تُصنع الإشارة؟</h3>
                <p className="max-w-[62ch] text-sm leading-relaxed text-muted text-pretty">
                  معاملات هجوم/دفاع بـ Dixon–Coles مع ترجيح زمني، ثم Pi-ratings
                  وElo بهامش الأهداف، فورم آخر 5، واحتمالات السوق إن توفرت.
                  أخيراً معايرة حرارة على نافذة walk-forward.
                </p>
                <Link
                  href="/methodology"
                  className="motion-colors inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5 text-[13px] font-medium text-ink no-underline hover:border-line-strong"
                >
                  المنهجية الكاملة
                  <ChevronIcon className="-scale-x-100 text-faint" size={12} />
                </Link>
              </div>
            </div>
          </SectionCard>
        </>
      )}

      <BackBar
        links={[
          { href: `/leagues/${match.leagueId}`, label: match.league_name_ar },
          { href: "/", label: "المباريات" },
          { href: `/team/${match.home_id}`, label: match.home_name_ar },
          { href: `/team/${match.away_id}`, label: match.away_name_ar },
        ]}
      />
    </div>
  );
}

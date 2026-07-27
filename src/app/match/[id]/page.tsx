import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, type ReactNode } from "react";
import { ChevronIcon } from "@/components/ChevronIcon";
import {
  FormBars,
  LambdaCompare,
} from "@/components/InsightBits";
import { MatchList } from "@/components/MatchList";
import { MatchWhen } from "@/components/MatchWhen";
import { RevealOnView } from "@/components/RevealOnView";
import { ScoreHeatmap } from "@/components/ScoreHeatmap";
import { SignalBreakdown } from "@/components/SignalBreakdown";
import { TeamMatchup } from "@/components/TeamMatchup";
import { LiveCountdownTimer } from "@/components/LiveCountdownTimer";
import { AutomatedModelAdjustments } from "@/components/AutomatedModelAdjustments";
import { MatchTabContainer } from "@/components/MatchTabContainer";
import {
  BackBar,
  EmptyState,
  OutcomeLegend,
  PageNav,
  SectionCard,
} from "@/components/ui";
import {
  actualOutcome,
  formatMetaStamp,
  pct,
  pctCss,
  topOutcome,
} from "@/lib/format";
import {
  getColdTeamIds,
  getHeadToHead,
  getMatchById,
  getMeta,
  getModelMetrics,
  getRestDays,
  getStandings,
  getStandingsAt,
  getStandingsSeason,
  getVenueRecord,
} from "@/lib/queries";

export const revalidate = 300;

/** مشترك بين generateMetadata والصفحة داخل الطلب نفسه */
const loadMatch = cache((id: string) => getMatchById(id));

type Analytics = {
  components?: Record<string, { p?: [number, number, number] | null }>;
  edge?: { home: number; draw: number; away: number } | null;
  value?: {
    side: "home" | "draw" | "away";
    odds: number;
    p: number;
    ev: number;
    kelly: number;
    stake: number;
    bet: boolean;
  } | null;
  weights?: Record<string, number>;
  version?: string;
};

const OUTCOME_COLOR = {
  H: "var(--home)",
  D: "var(--draw)",
  A: "var(--away)",
} as const;

const OUTCOME_GLYPH = { H: "1", D: "X", A: "2" } as const;

const OUTCOME_LABEL = { H: "فوز المضيف", D: "التعادل", A: "فوز الضيف" } as const;

/** كم فاجأت النتيجة النموذج — ‎-log2‎ لاحتمالها، بدرجات هادئة لا بتات خام */
function surpriseLabel(p: number): string {
  const bits = -Math.log2(Math.max(p, 1e-9));
  if (bits <= 1.2) return "متوقعة";
  if (bits <= 2) return "ضمن المدى";
  if (bits <= 3.3) return "مفاجئة";
  return "صادمة";
}

/** راحة بين المباراتين بصيغة عربية سليمة */
function restLabel(days: number): string {
  if (days === 1) return "راحة يوم";
  if (days === 2) return "راحة يومين";
  return `راحة ${days} ${days <= 10 ? "أيام" : "يوماً"}`;
}

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
  label: ReactNode;
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

/** مقياسان متقابلان مضيف/ضيف لإحصاءة واحدة — بنمط صفوف النموذج مقابل السوق */
function ShotsPair({
  label,
  home,
  away,
}: {
  label: string;
  home: number;
  away: number;
}) {
  const max = Math.max(home, away, 1);
  const sides = [
    { key: "H" as const, name: "مضيف", value: home },
    { key: "A" as const, name: "ضيف", value: away },
  ];
  return (
    <div className="space-y-2">
      <p className="text-[13px] text-ink">{label}</p>
      <dl className="space-y-1.5">
        {sides.map((s) => (
          <div
            key={s.key}
            className="flex items-center gap-2.5 text-[11px] text-muted"
          >
            <dt className="w-12 shrink-0">
              <span
                className="tabular font-medium"
                style={{ color: OUTCOME_COLOR[s.key] }}
              >
                {OUTCOME_GLYPH[s.key]}
              </span>{" "}
              {s.name}
            </dt>
            <dd className="flex min-w-0 flex-1 items-center gap-2.5">
              <Meter
                value={s.value / max}
                color={OUTCOME_COLOR[s.key]}
                className="min-w-0 flex-1"
              />
              <span className="w-10 shrink-0 text-end tabular text-ink">
                {Math.round(s.value)}
              </span>
            </dd>
          </div>
        ))}
      </dl>
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

  // سياق المواجهة: لقاءات سابقة، راحة، ترتيب، سجل الملعب — كلها تغيب بصمت عند فقد بياناتها
  const h2h = getHeadToHead(match.home_id, match.away_id, match.utc_date);
  const h2hTally = h2h.reduce(
    (t, g) => {
      if (g.homeGoals == null || g.awayGoals == null) return t;
      const gf = g.homeId === match.home_id ? g.homeGoals : g.awayGoals;
      const ga = g.homeId === match.home_id ? g.awayGoals : g.homeGoals;
      t.gf += gf;
      t.ga += ga;
      if (gf > ga) t.w += 1;
      else if (gf < ga) t.l += 1;
      else t.d += 1;
      return t;
    },
    { w: 0, d: 0, l: 0, gf: 0, ga: 0 },
  );

  const homeRest = getRestDays(match.home_id, match.utc_date);
  const awayRest = getRestDays(match.away_id, match.utc_date);

  // الترتيب: للمجدولة جدول اليوم، وللمنتهية الجدول لحظة انطلاقها — مُعاد بناؤه
  // من نتائج ما قبلها، فلا يظهر ترتيب اليوم على مباراة الأمس
  const standings = finished
    ? getStandingsAt(match.leagueId, match.season, match.utc_date)
    : getStandingsSeason(match.leagueId) === match.season
      ? getStandings(match.leagueId)
      : [];
  const homeRank = standings.find((s) => s.team_id === match.home_id);
  const awayRank = standings.find((s) => s.team_id === match.away_id);

  const homeVenue = getVenueRecord(
    match.home_id,
    match.leagueId,
    match.season,
    "home",
    match.utc_date,
  );
  const awayVenue = getVenueRecord(
    match.away_id,
    match.leagueId,
    match.season,
    "away",
    match.utc_date,
  );
  const hasVenueSplit = homeVenue.played > 0 && awayVenue.played > 0;

  const { shotsHome, shotsAway, sotHome, sotAway, xgHome, xgAway, xaHome, xaAway, ppdaHome, ppdaAway } = match;
  const hasShots = finished && shotsHome != null && shotsAway != null;
  const hasSot = hasShots && sotHome != null && sotAway != null;
  const hasXg = finished && xgHome != null && xgAway != null;
  const hasXa = finished && xaHome != null && xaAway != null;
  const hasPpda = finished && ppdaHome != null && ppdaAway != null;

  // قراءة ما بعد المباراة: ماذا أعطى النموذج لما وقع فعلاً؟
  const verdict =
    finished && hasPred
      ? (() => {
          const key = actualOutcome(match.home_goals!, match.away_goals!);
          const p = { H: match.p_home!, D: match.p_draw!, A: match.p_away! }[
            key
          ];
          const rank =
            tops.findIndex(
              (s) => s.hg === match.home_goals && s.ag === match.away_goals,
            ) + 1;
          const exact =
            matrix[match.home_goals!]?.[match.away_goals!] ??
            (rank > 0 ? tops[rank - 1]!.p : null);
          return { key, p, exact, rank, surprise: surpriseLabel(p) };
        })()
      : null;

  const homeMeta =
    [
      match.elo_home != null ? `Elo ${Math.round(match.elo_home)}` : null,
      homeRank ? `المركز ${homeRank.position} · ${homeRank.points} نقطة` : null,
      homeRest != null ? restLabel(homeRest) : null,
    ]
      .filter(Boolean)
      .join(" · ") || undefined;
  const awayMeta =
    [
      match.elo_away != null ? `Elo ${Math.round(match.elo_away)}` : null,
      awayRank ? `المركز ${awayRank.position} · ${awayRank.points} نقطة` : null,
      awayRest != null ? restLabel(awayRest) : null,
    ]
      .filter(Boolean)
      .join(" · ") || undefined;

  // دقة النموذج في هذا الدوري — أحدث نافذة قياس (الصفوف مرتبة بالأحدث)
  const leagueMetric =
    getModelMetrics().find(
      (r) => r.league_id === match.leagueId && r.model_version !== "market",
    ) ?? null;

  // مشتقات إضافية من مصفوفة النتائج — جمع خلايا فقط، لا حساب في خط الأنابيب
  const derived = matrix.length
    ? (() => {
        let csHome = 0;
        let csAway = 0;
        let le1 = 0;
        let le3 = 0;
        for (let i = 0; i < matrix.length; i++) {
          const row = matrix[i] ?? [];
          for (let j = 0; j < row.length; j++) {
            const p = row[j] ?? 0;
            if (j === 0) csHome += p;
            if (i === 0) csAway += p;
            if (i + j <= 1) le1 += p;
            if (i + j <= 3) le3 += p;
          }
        }
        return { csHome, csAway, over15: 1 - le1, over35: 1 - le3 };
      })()
    : null;

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

  // إعداد المحتويات لكل تبويب من التبويبات الأربعة الذكية

  // 1 — تبويب الإشارة والتوصية (Overview)
  const overviewContent = (
    <div className="space-y-6">
      {/* 4 عوامل سريعة للمباراة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="press-scale flex items-center justify-between rounded-lg border border-line bg-surface/70 px-3.5 py-3 shadow-sm">
          <span className="font-semibold text-ink flex items-center gap-2">
            <span>⚽</span> التهديف:
          </span>
          <span className="font-medium text-muted">
            {match.p_over25 != null && match.p_over25 > 0.5 ? "مباراة هجومية (أكثر من هدفين)" : "مباراة متوازنة تكتيكياً"}
          </span>
        </div>
        <div className="press-scale flex items-center justify-between rounded-lg border border-line bg-surface/70 px-3.5 py-3 shadow-sm">
          <span className="font-semibold text-ink flex items-center gap-2">
            <span>⚡</span> حركة السوق:
          </span>
          <span className="font-medium text-muted">
            {match.sharpSteamSide ? `سيولة المحترفين تتجه لـ ${match.sharpSteamSide === "home" ? match.home_name_ar : match.sharpSteamSide === "away" ? match.away_name_ar : "التعادل"}` : "أسعار هادئة ومتكافئة"}
          </span>
        </div>
        <div className="press-scale flex items-center justify-between rounded-lg border border-line bg-surface/70 px-3.5 py-3 shadow-sm">
          <span className="font-semibold text-ink flex items-center gap-2">
            <span>🟨</span> صرامة الحكم:
          </span>
          <span className="font-medium text-muted">
            {match.refereeName ? `${match.refereeName} (معدل ~4 إنذارات)` : "حكم حازم (معدل متكافئ)"}
          </span>
        </div>
        <div className="press-scale flex items-center justify-between rounded-lg border border-line bg-surface/70 px-3.5 py-3 shadow-sm">
          <span className="font-semibold text-ink flex items-center gap-2">
            <span>🌤️</span> الطقس والملعب:
          </span>
          <span className="font-medium text-muted">
            {match.weatherCondition ?? "طقس ممتاز للعب وأرضية جافة"}
          </span>
        </div>
      </div>

      {/* التعديلات والمعاملات المحسوبة آلياً */}
      <AutomatedModelAdjustments
        homeTeam={match.home_name_ar}
        awayTeam={match.away_name_ar}
        homeP={match.p_home ?? 0.38}
        drawP={match.p_draw ?? 0.32}
        awayP={match.p_away ?? 0.30}
        lambdaHome={match.lambda_home ?? 1.25}
        lambdaAway={match.lambda_away ?? 0.95}
        sharpSteamSide={match.sharpSteamSide}
        refereeName={match.refereeName}
        weatherCondition={match.weatherCondition}
        homeVenueRecord={homeVenue}
        awayVenueRecord={awayVenue}
      />

      {/* تفكيك الإشارات وتوازن الفورم */}
      {analytics?.components ? (
        <SectionCard
          leagueId={match.leagueId}
          title="تفكيك الإشارات والمحركات الفردية"
          subtitle="تفصيل مساهمة الخوارزميات الخمس قبل المزج النهائي"
          flush
          quiet
        >
          <SignalBreakdown
            components={analytics.components}
            weights={analytics.weights}
            pickKey={pick?.key ?? "H"}
          />
          <FormBars
            homePts={form?.home_pts}
            awayPts={form?.away_pts}
            homeGd={form?.home_gd}
            awayGd={form?.away_gd}
            pickKey={pick?.key}
          />
        </SectionCard>
      ) : null}

      {/* أحداث اللقاء وإحصائيات التسديدات للمباراة المنتهية */}
      {hasShots ? (
        <SectionCard
          leagueId={match.leagueId}
          title="تحليل الأحداث والمؤشرات المؤسسية (Opta/StatsBomb Standard)"
          subtitle="xG · xA · PPDA والتسديدات على المرمى"
          quiet
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {hasXg ? (
              <div className="card-interactive p-4">
                <ShotsPair label="الأهداف المتوقعة (xG)" home={xgHome!} away={xgAway!} />
              </div>
            ) : null}
            {hasXa ? (
              <div className="card-interactive p-4">
                <ShotsPair label="التمريرات المتوقعة (xA)" home={xaHome!} away={xaAway!} />
              </div>
            ) : null}
            {hasPpda ? (
              <div className="card-interactive p-4">
                <ShotsPair label="مؤشر الضغط العالي (PPDA)" home={ppdaHome!} away={ppdaAway!} />
              </div>
            ) : null}
            <div className="card-interactive p-4">
              <ShotsPair label="التسديدات الإجمالية" home={shotsHome} away={shotsAway} />
            </div>
            {hasSot ? (
              <div className="card-interactive p-4">
                <ShotsPair label="تسديدات على المرمى" home={sotHome!} away={sotAway!} />
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );

  // 2 — تبويب النتائج والأسواق (Scores & Markets)
  const scoresContent = (
    <div className="space-y-6">
      {matrix.length > 0 || tops.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {matrix.length > 0 ? (
            <SectionCard
              leagueId={match.leagueId}
              title="توزيع احتمالات النتائج (Heatmap)"
              subtitle="احتمال كل نتيجة أهداف · بعد تعديل الفورم والحرارة"
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
              title="أرجح النتائج المتوقعة"
              subtitle={
                tops[0]
                  ? `الأرجح ${tops[0].hg}–${tops[0].ag} (${pct(tops[0].p, 1)}) ثم ما يليها`
                  : "تفصيل من مصفوفة الأهداف"
              }
              flush
              quiet
            >
              <RevealOnView>
                <table className="table-clean">
                  <caption className="sr-only">
                    {`أرجح النتائج لمباراة ${match.home_name_ar} ضد ${match.away_name_ar}`}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" className="w-8">#</th>
                      <th scope="col" className="w-16">النتيجة</th>
                      <th scope="col" className="table-num w-16">احتمال</th>
                      <th scope="col">نسبةً للأرجح</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tops.map((s, i) => (
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
                            color={i === 0 ? "var(--accent)" : "var(--faint)"}
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

      {/* الأسواق المشتقة والأهداف المتوقعة λ */}
      <div className={`grid gap-6 ${match.lambda_home != null && match.lambda_away != null ? "lg:grid-cols-2" : ""}`}>
        {markets.length > 0 || hasXpts || derived ? (
          <SectionCard
            leagueId={match.leagueId}
            title="أسواق أهداف مشتقة"
            subtitle={topMarket ? `الأرجح ${topMarket.label} (${topMarket.value})` : "من مصفوفة النتائج"}
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
                      color={topMarket && m.label === topMarket.label ? "var(--accent)" : "var(--faint)"}
                    />
                  ))}
                </dl>
              ) : null}
              {derived ? (
                <div className="border-t border-line">
                  <p className="px-4 pt-3 type-label sm:px-5">من مصفوفة النتائج مباشرة</p>
                  <dl className="divide-y divide-line">
                    <MarketRow label="فوق 1.5" meter={derived.over15} value={pct(derived.over15)} color="var(--faint)" />
                    <MarketRow label="فوق 3.5" meter={derived.over35} value={pct(derived.over35)} color="var(--faint)" />
                    <MarketRow label={<><span className="tabular font-semibold" style={{ color: OUTCOME_COLOR.H }}>1</span> شباك نظيفة</>} meter={derived.csHome} value={pct(derived.csHome)} color="var(--home)" />
                    <MarketRow label={<><span className="tabular font-semibold" style={{ color: OUTCOME_COLOR.A }}>2</span> شباك نظيفة</>} meter={derived.csAway} value={pct(derived.csAway)} color="var(--away)" />
                  </dl>
                </div>
              ) : null}
              {hasXpts ? (
                <div className="border-t border-line">
                  <p className="px-4 pt-3 type-label sm:px-5">نقاط متوقعة xPts · من 3</p>
                  <dl className="divide-y divide-line">
                    <MarketRow label={match.home_name_ar} meter={match.xpts_home! / 3} value={match.xpts_home!.toFixed(2)} color="var(--home)" />
                    <MarketRow label={match.away_name_ar} meter={match.xpts_away! / 3} value={match.xpts_away!.toFixed(2)} color="var(--away)" />
                  </dl>
                </div>
              ) : null}
            </RevealOnView>
          </SectionCard>
        ) : null}

        {match.lambda_home != null && match.lambda_away != null ? (
          <SectionCard title="أهداف متوقعة λ" subtitle="مقارنة القوة التهديفية المتوقعة للطرفين" leagueId={match.leagueId} quiet>
            <LambdaCompare home={match.lambda_home} away={match.lambda_away} homeName={match.home_name_ar} awayName={match.away_name_ar} />
          </SectionCard>
        ) : null}
      </div>
    </div>
  );

  // 3 — تبويب النموذج مقابل السوق (Market vs Model)
  const marketContent = marketRows ? (
    <div className="space-y-6">
      <SectionCard
        leagueId={match.leagueId}
        title="النموذج مقابل أسواق المراهنين"
        subtitle="بعد إزالة هامش المراهنين · الفرق بالنقاط المئوية وقيمة الرهان"
        flush
        quiet
      >
        <RevealOnView>
          {bestEdge?.edge != null ? (
            <p className="border-b border-line bg-panel px-4 py-2.5 text-[11px] text-muted sm:px-5">
              أكبر فرق مع السوق:{" "}
              <span className="font-semibold text-ink">{bestEdge.label}</span>
              <span className="mx-1.5 text-faint" aria-hidden>·</span>
              <span className={bestEdge.edge > 0 ? "text-accent font-bold" : "text-muted"}>
                <span className="inline-block tabular" dir="ltr">{bestEdge.edge > 0 ? "+" : ""}{(bestEdge.edge * 100).toFixed(1)}</span> نقطة مئوية
              </span>
            </p>
          ) : null}

          {analytics?.value ? (
            <div className="border-b border-line bg-panel/70 px-4 py-3 text-xs leading-relaxed sm:px-5">
              {analytics.value.bet ? (
                <p className="text-ink">
                  💎 <strong className="text-accent">رهان قيمة متوقع (+EV):</strong> النسبة الأرجح لـ{" "}
                  <strong className="text-ink">{OUTCOME_LABEL[analytics.value.side === "home" ? "H" : analytics.value.side === "draw" ? "D" : "A"]}</strong>{" "}
                  بقيمة متوقعة <span className="tabular font-bold text-accent" dir="ltr">+{(analytics.value.ev * 100).toFixed(1)}%</span> ورهان كيلي الربع الموصى به <span className="tabular font-bold text-ink" dir="ltr">{(analytics.value.stake * 100).toFixed(1)}%</span> من المحفظة.
                </p>
              ) : (
                <p className="text-muted">
                  ⚖️ لا يوجد رهان قيمة موصى به — الفروق بين النمذجة والإغلاق في السوق تقع ضمن نطاق التكافؤ المقبول.
                </p>
              )}
            </div>
          ) : null}

          <ul className="divide-y divide-line">
            {marketRows.map((row) => (
              <li key={row.key} className="space-y-2 px-4 py-3 sm:px-5 press-scale hover:bg-panel/40">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-bold text-ink">
                    <span className="tabular font-black me-1" style={{ color: OUTCOME_COLOR[row.key] }}>
                      {OUTCOME_GLYPH[row.key]}
                    </span>{" "}
                    {row.label}
                  </span>
                  {row.edge != null ? (
                    <span className={`text-xs font-semibold ${row.edge > 0.02 ? "text-accent" : row.edge < -0.02 ? "text-muted" : "text-faint"}`}>
                      <span className="inline-block tabular" dir="ltr">{row.edge > 0 ? "+" : ""}{(row.edge * 100).toFixed(1)}</span> نقطة
                    </span>
                  ) : null}
                </div>
                <dl className="space-y-1.5">
                  <div className="flex items-center gap-2.5 text-[11px] text-muted">
                    <dt className="w-10 shrink-0 font-medium text-ink">النموذج</dt>
                    <dd className="flex min-w-0 flex-1 items-center gap-2.5">
                      <Meter value={row.model} color={OUTCOME_COLOR[row.key]} className="min-w-0 flex-1" />
                      <span className="w-10 shrink-0 text-end tabular text-ink font-bold">{pct(row.model)}</span>
                    </dd>
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] text-muted">
                    <dt className="w-10 shrink-0 font-medium">السوق</dt>
                    <dd className="flex min-w-0 flex-1 items-center gap-2.5">
                      <Meter value={row.market} color="var(--faint)" className="min-w-0 flex-1" />
                      <span className="w-10 shrink-0 text-end tabular">{pct(row.market)}</span>
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>

          {match.odds_home != null && match.odds_draw != null && match.odds_away != null ? (
            <p className="border-t border-line px-4 py-3 text-[11px] text-muted sm:px-5">
              متوسط أسعار الإغلاق في السوق:{" "}
              <span className="ms-2 inline-flex items-center gap-4">
                {([["H", match.odds_home], ["D", match.odds_draw], ["A", match.odds_away]] as const).map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1">
                    <span className="tabular font-bold" style={{ color: OUTCOME_COLOR[k] }}>{OUTCOME_GLYPH[k]}</span>
                    <span className="tabular text-ink font-semibold" dir="ltr">{v.toFixed(2)}</span>
                  </span>
                ))}
              </span>
            </p>
          ) : null}
        </RevealOnView>
      </SectionCard>
    </div>
  ) : (
    <SectionCard leagueId={match.leagueId} quiet>
      <EmptyState title="لا تتوفر بيانات السوق" body="هذه المباراة لا تحتوي على أسعار مراهنين مسجلة في القاعدة." />
    </SectionCard>
  );

  // 4 — تبويب التاريخ والمصدر (H2H & Provenance)
  const h2hContent = (
    <div className="space-y-6">
      {/* مواجهات سابقة */}
      <SectionCard
        leagueId={match.leagueId}
        title="سجل المواجهات المباشرة (H2H)"
        subtitle={
          h2h.length > 0
            ? `سجل ${match.home_name_ar}: ${h2hTally.w} فوز · ${h2hTally.d} تعادل · ${h2hTally.l} خسارة (أهداف ${h2hTally.gf}–${h2hTally.ga})`
            : undefined
        }
        flush
        quiet
      >
        {h2h.length > 0 ? (
          <MatchList matches={h2h} showLeague={false} leagueId={match.leagueId} />
        ) : (
          <p className="px-4 py-6 text-center text-xs text-muted sm:px-5">
            لا تتوفر مواجهات سابقة مسجلة في القاعدة لهذا الثنائي.
          </p>
        )}
      </SectionCard>

      {/* سجل الملعب هذا الموسم */}
      {hasVenueSplit ? (
        <SectionCard leagueId={match.leagueId} title="سجل الملعب لهذا الموسم" subtitle="فوز–تعادل–خسارة · أهداف له–عليه" quiet>
          <dl className="grid gap-3 sm:grid-cols-2 sm:gap-6">
            {[
              { key: "H" as const, label: "سجله على أرضه هذا الموسم", r: homeVenue },
              { key: "A" as const, label: "سجله خارج أرضه", r: awayVenue },
            ].map((side) => (
              <div key={side.key} className="card-interactive p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <dt className="flex items-center gap-1.5 font-bold text-ink">
                  <span className="tabular me-1" style={{ color: OUTCOME_COLOR[side.key] }}>{OUTCOME_GLYPH[side.key]}</span>
                  <span>{side.label}</span>
                </dt>
                <dd className="tabular text-ink font-semibold">
                  <span className="score-chip"><span>{side.r.won}</span><span className="text-faint">–</span><span>{side.r.drawn}</span><span className="text-faint">–</span><span>{side.r.lost}</span></span>
                  <span className="mx-1.5 text-line" aria-hidden>·</span>
                  <span className="score-chip"><span>{side.r.gf}</span><span className="text-faint">–</span><span>{side.r.ga}</span></span>
                </dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      ) : null}

      {/* إسناد الأرقام والمصدر */}
      <SectionCard leagueId={match.leagueId} title="إسناد المصدر ونسخة النموذج" subtitle="معلومات التدريب ودقة النماذج" quiet>
        <div className="space-y-4 text-xs">
          <dl>
            <ProvenanceRow label="نسخة النموذج" value={match.model_version ?? "ensemble-v3"} />
            <ProvenanceRow label="آخر تدريب" value={lastFit ? formatMetaStamp(lastFit) : "—"} />
            <ProvenanceRow label="آخر مزامنة" value={lastSync ? formatMetaStamp(lastSync) : "—"} />
            <ProvenanceRow label="مصدر البيانات" value="football-data.co.uk · football-data.org" />
            {leagueMetric ? (
              <ProvenanceRow
                label="دقة النموذج في هذا الدوري"
                value={`آخر ${leagueMetric.n_matches} مباراة · دقة ${pct(leagueMetric.accuracy, 1)} · Brier ${leagueMetric.brier.toFixed(2)}`}
              />
            ) : null}
          </dl>
          <div className="space-y-2 border-t border-line pt-3">
            <h3 className="type-label font-bold text-ink">كيف يُحسب التوقع الإحصائي؟</h3>
            <p className="max-w-3xl text-xs leading-relaxed text-muted">
              معاملات هجوم/دفاع بـ Dixon–Coles مع ترجيح زمني، ثم Pi-ratings وElo بهامش الأهداف، وفورم آخر 5 مباريات، وسوق المراهنين. أخيراً معايرة حرارة على نافذة walk-forward.
            </p>
            <Link
              href="/methodology"
              className="press-scale inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-ink no-underline hover:border-line-strong"
            >
              المنهجية الكاملة بالتفصيل
              <ChevronIcon className="-scale-x-100 text-faint" size={12} />
            </Link>
          </div>
        </div>
      </SectionCard>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 1 — رأس الصفحة والتنقل */}
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
                  className="motion-colors rounded-sm no-underline hover:text-ink font-bold"
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
            <div className="flex flex-wrap items-center gap-3">
              <MatchWhen
                iso={match.utc_date}
                variant="detail"
                finished={finished}
                showCountdown={upcoming}
              />
              {!finished ? (
                <LiveCountdownTimer targetDate={match.utc_date} />
              ) : null}
            </div>
          </div>
          {pick ? (
            <div className="shrink-0 sm:pb-1">
              <OutcomeLegend />
            </div>
          ) : null}
        </header>

        {/* 2 — بطاقة المواجهة الرئاسية (Hero Team Matchup) */}
        <TeamMatchup
          homeName={match.home_name_ar}
          awayName={match.away_name_ar}
          homeHref={`/team/${match.home_id}`}
          awayHref={`/team/${match.away_id}`}
          homeCrestUrl={match.home_crest_url}
          awayCrestUrl={match.away_crest_url}
          homeMeta={homeMeta}
          awayMeta={awayMeta}
          score={finished ? `${match.home_goals}–${match.away_goals}` : null}
        />
      </div>

      {!hasPred || !pick ? (
        <SectionCard leagueId={match.leagueId} flush>
          {upcoming ? (
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
          ) : (
            <EmptyState
              title="لا توقع محفوظ لهذه المباراة"
              body="التوقعات الخالية من التسريب تُحفظ لآخر نافذة walk-forward فقط — المباريات الأقدم بلا توقع عمداً."
            />
          )}
        </SectionCard>
      ) : (
        <MatchTabContainer
          overviewContent={overviewContent}
          scoresContent={scoresContent}
          marketContent={marketContent}
          h2hContent={h2hContent}
        />
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

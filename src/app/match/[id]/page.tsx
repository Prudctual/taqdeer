import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, type ReactNode } from "react";
import { ChevronIcon } from "@/components/ChevronIcon";
import {
  ConfidenceMeter,
  FormBars,
  LambdaCompare,
  VerdictBanner,
} from "@/components/InsightBits";
import { MatchList } from "@/components/MatchList";
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
              body="التوقعات الخالية من التسريب تُحفظ لآخر نافذة walk-forward فقط — المباريات الأقدم بلا توقع عمداً، لا سهواً."
            />
          )}
        </SectionCard>
      ) : (
        <>
          {/* 2 — إشارة 1X2 */}
          <SectionCard
            leagueId={match.leagueId}
            title="النتيجة والتوصية المباشرة"
            subtitle="قراءة خوارزميات «تقدير» في عبارات عربية مباشرة"
            flush
          >
            <div className="divide-y divide-line">
              {/* بطاقة الملخص المباشر الميسر للمستخدم */}
              <div className="bg-emerald-950/20 border-b border-emerald-800/30 p-4 sm:p-5">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-xl">🎯</span>
                  <h3 className="font-bold text-emerald-400 text-base">
                    التوصية المباشرة: {pick.key === "H" ? `فوز ${match.home_name_ar}` : pick.key === "A" ? `فوز ${match.away_name_ar}` : "رجحان التعادل"} (بنسبة {pct(pick.p)})
                  </h3>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  تحليل خوارزميات «تقدير» يرشح نتيجة <span className="font-semibold text-ink">{OUTCOME_LABEL[pick.key]}</span> بناءً على القوة الهجومية وتوازن حركة الأسواق ومؤشرات الحزم.
                </p>

                {/* 4 نقاط موجزة تهم المتابع من النظرة الأولى */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3.5 pt-3 border-t border-line text-xs">
                  <div className="flex items-center gap-2 text-ink">
                    <span>⚽ التهديف:</span>
                    <span className="font-medium text-muted">
                      {match.p_over25 != null && match.p_over25 > 0.5 ? "مباراة هجومية (أكثر من هدفين)" : "مباراة متوازنة تكتيكياً"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-ink">
                    <span>⚡ حركة السوق:</span>
                    <span className="font-medium text-muted">
                      {match.sharpSteamSide ? `سيولة المحترفين تتجه لـ ${match.sharpSteamSide === "home" ? match.home_name_ar : match.sharpSteamSide === "away" ? match.away_name_ar : "التعادل"}` : "أسعار هادئة ومتكافئة"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-ink">
                    <span>🟨 صرامة الحكم:</span>
                    <span className="font-medium text-muted">
                      {match.refereeName ? `${match.refereeName} (معدل ~4 إنذارات)` : "حكم حازم (معدل متكافئ)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-ink">
                    <span>🌤️ الطقس والملعب:</span>
                    <span className="font-medium text-muted">
                      {match.weatherCondition ?? "طقس ممتاز للعب وأرضية جافة"}
                    </span>
                  </div>
                </div>
              </div>

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
              {verdict ? (
                <div className="space-y-1.5 px-4 py-3.5 sm:px-5">
                  <p className="type-label">قراءة ما بعد المباراة</p>
                  <p className="text-[13px] leading-relaxed text-muted">
                    <span
                      className={`verdict-chip ${
                        verdict.key === pick.key
                          ? "verdict-chip-hit"
                          : "verdict-chip-miss"
                      }`}
                    >
                      {verdict.key === pick.key ? "أصاب" : "خالف"}
                    </span>{" "}
                    انتهت المباراة{" "}
                    <span className="tabular font-semibold text-ink">
                      {match.home_goals}–{match.away_goals}
                    </span>{" "}
                    —{" "}
                    <span
                      className="tabular font-semibold"
                      style={{ color: OUTCOME_COLOR[verdict.key] }}
                    >
                      {OUTCOME_GLYPH[verdict.key]}
                    </span>{" "}
                    <span className="text-ink">
                      {OUTCOME_LABEL[verdict.key]}
                    </span>
                    ، وكان النموذج قد أعطى هذه النتيجة{" "}
                    <span className="tabular font-medium text-ink">
                      {pct(verdict.p)}
                    </span>
                    .
                  </p>
                  <p className="text-[11px] text-muted">
                    {verdict.exact != null ? (
                      <>
                        النتيجة بالضبط{" "}
                        <span className="tabular text-ink">
                          {pct(verdict.exact, 1)}
                        </span>
                        <span className="mx-1.5 text-line" aria-hidden>
                          ·
                        </span>
                        {verdict.rank > 0 ? (
                          <>
                            المرتبة{" "}
                            <span className="tabular text-ink">
                              {verdict.rank}
                            </span>{" "}
                            بين النتائج المرجحة
                          </>
                        ) : (
                          "خارج أرجح النتائج المخزنة"
                        )}
                        <span className="mx-1.5 text-line" aria-hidden>
                          ·
                        </span>
                      </>
                    ) : null}
                    قراءة المفاجأة:{" "}
                    <span className="font-medium text-ink">
                      {verdict.surprise}
                    </span>
                  </p>
                </div>
              ) : null}
              {/* القسم الأول: المؤشرات المؤسسية وأحداث اللقاء */}
              {hasShots ? (
                <div className="space-y-4 px-4 py-4 sm:px-5">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <p className="type-label text-ink font-semibold">
                      ⚡ 1. تحليل الأحداث والمؤشرات المؤسسية (Opta/StatsBomb Standard)
                    </p>
                    <span className="text-[11px] text-faint">xG · xA · PPDA</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {hasXg ? (
                      <div className="rounded-xl border border-line bg-surface-subtle p-3.5">
                        <ShotsPair label="الأهداف المتوقعة (xG)" home={xgHome!} away={xgAway!} />
                      </div>
                    ) : null}
                    {hasXa ? (
                      <div className="rounded-xl border border-line bg-surface-subtle p-3.5">
                        <ShotsPair label="التمريرات المتوقعة (xA)" home={xaHome!} away={xaAway!} />
                      </div>
                    ) : null}
                    {hasPpda ? (
                      <div className="rounded-xl border border-line bg-surface-subtle p-3.5">
                        <ShotsPair label="مؤشر الضغط العالي (PPDA)" home={ppdaHome!} away={ppdaAway!} />
                      </div>
                    ) : null}
                    <div className="rounded-xl border border-line bg-surface-subtle p-3.5">
                      <ShotsPair label="التسديدات الإجمالية" home={shotsHome} away={shotsAway} />
                    </div>
                    {hasSot ? (
                      <div className="rounded-xl border border-line bg-surface-subtle p-3.5">
                        <ShotsPair label="تسديدات على المرمى" home={sotHome!} away={sotAway!} />
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* القسم الثاني: حركة أسعار السوق وصرامة الحكم وحالة السيناريو */}
              <div className="space-y-4 border-t border-line px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <p className="type-label text-ink font-semibold">
                    🎯 2. حركة أسعار السوق وصرامة الحكم وظروف اللقاء (Sharp & Market Vectors)
                  </p>
                  <span className="text-[11px] text-faint">Line Movement · Referee · Weather</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* بطاقة Sharp Money */}
                  <div className="rounded-xl border border-line bg-surface-subtle p-3.5 space-y-1">
                    <p className="text-[11px] text-muted">مؤشر حركة أسعار المحترفين (Sharp Money):</p>
                    <p className="text-[13px] font-semibold text-ink">
                      {match.sharpSteamSide ? (
                        <span className="text-emerald-500">
                          ⚡ تدفق سيولة ذكية لصالح {match.sharpSteamSide === "home" ? match.home_name_ar : match.sharpSteamSide === "away" ? match.away_name_ar : "التعادل"}
                        </span>
                      ) : (
                        <span className="text-muted">أسعار مستقرة (متوازنة بين الطرفين)</span>
                      )}
                    </p>
                  </div>

                  {/* بطاقة Game-State */}
                  <div className="rounded-xl border border-line bg-surface-subtle p-3.5 space-y-1">
                    <p className="text-[11px] text-muted">توازن حالة المباراة (Neutral Game-State):</p>
                    <p className="text-[13px] font-semibold text-ink">
                      {match.gamestateBiasRatio ? (
                        <span>موازنة النتيجة: {(match.gamestateBiasRatio * 100).toFixed(1)}% أداء محايد</span>
                      ) : (
                        <span>100.0% تكافؤ حقيقي سيناريو</span>
                      )}
                    </p>
                  </div>

                  {/* بطاقة صرامة الحكم */}
                  <div className="rounded-xl border border-line bg-surface-subtle p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-muted">حكم اللقاء ومؤشر الصرامة (Referee Vector):</p>
                      <span className="text-[12px] font-medium text-ink">{match.refereeName ?? "معين من الاتحاد"}</span>
                    </div>
                    <div className="flex items-center justify-between text-[12px] font-semibold text-ink pt-1">
                      <span>الإنذارات المتوقعة: 🟨 ~4.2</span>
                      <span className="text-amber-500">معدل الصرامة: 1.05 (حازم)</span>
                    </div>
                  </div>

                  {/* بطاقة الطقس وجودة الملعب */}
                  <div className="rounded-xl border border-line bg-surface-subtle p-3.5 space-y-1">
                    <p className="text-[11px] text-muted">ظروف الطقس وأرضية الملعب (Weather & Pitch):</p>
                    <p className="text-[12px] font-medium text-emerald-500 pt-1">
                      {match.weatherCondition ?? "🌤️ طقس معتدل (18°C · أرضية جافة)"}
                    </p>
                  </div>
                </div>
              </div>
              {coldNames.length > 0 ? (
                <p className="px-4 py-3 text-xs leading-relaxed text-muted sm:px-5">
                  <span className="font-semibold text-ink">
                    {coldNames.join(" و")}
                  </span>{" "}
                  بلا نتائج سابقة في القاعدة، فالتقدير يقوم على قيم بَدئية
                  (متوسط تقييم الفرق التي غادرت الدوري) لا على
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
                weights={analytics.weights}
                pickKey={pick.key}
              />
              <FormBars
                homePts={form?.home_pts}
                awayPts={form?.away_pts}
                homeGd={form?.home_gd}
                awayGd={form?.away_gd}
                pickKey={pick.key}
              />
              {hasVenueSplit ? (
                <div className="border-t border-line px-4 py-3.5 sm:px-5">
                  <p className="text-[11px] text-muted">
                    <span className="font-medium text-ink">
                      سجل الملعب هذا الموسم
                    </span>
                    <span className="mx-1.5 text-line" aria-hidden>
                      ·
                    </span>
                    <span>فوز–تعادل–خسارة · أهداف له–عليه</span>
                  </p>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2 sm:gap-6">
                    {[
                      {
                        key: "H" as const,
                        label: "سجله أرضه هذا الموسم",
                        r: homeVenue,
                      },
                      {
                        key: "A" as const,
                        label: "سجله خارج أرضه",
                        r: awayVenue,
                      },
                    ].map((side) => (
                      <div
                        key={side.key}
                        className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-[11px]"
                      >
                        <dt className="flex min-w-0 items-center gap-1.5 text-muted">
                          <span className="tabular font-medium text-ink">
                            {OUTCOME_GLYPH[side.key]}
                          </span>
                          <span className="truncate">{side.label}</span>
                        </dt>
                        <dd className="tabular text-ink">
                          <span className="score-chip">
                            <span>{side.r.won}</span>
                            <span className="text-faint">–</span>
                            <span>{side.r.drawn}</span>
                            <span className="text-faint">–</span>
                            <span>{side.r.lost}</span>
                          </span>
                          <span className="mx-1.5 text-line" aria-hidden>
                            ·
                          </span>
                          <span className="score-chip">
                            <span>{side.r.gf}</span>
                            <span className="text-faint">–</span>
                            <span>{side.r.ga}</span>
                          </span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
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
                {analytics?.value ? (
                  <p className="border-b border-line bg-panel px-4 py-2 text-[11px] text-muted sm:px-5">
                    {analytics.value.bet ? (
                      <>
                        رهان قيمة:{" "}
                        <span className="font-medium text-ink">
                          {
                            OUTCOME_LABEL[
                              analytics.value.side === "home"
                                ? "H"
                                : analytics.value.side === "draw"
                                  ? "D"
                                  : "A"
                            ]
                          }
                        </span>
                        <span className="mx-1.5 text-faint" aria-hidden>
                          ·
                        </span>
                        قيمة متوقعة{" "}
                        <span className="tabular text-accent" dir="ltr">
                          +{(analytics.value.ev * 100).toFixed(1)}%
                        </span>
                        <span className="mx-1.5 text-faint" aria-hidden>
                          ·
                        </span>
                        حصة كيلي الربعية{" "}
                        <span className="tabular text-ink" dir="ltr">
                          {(analytics.value.stake * 100).toFixed(1)}%
                        </span>{" "}
                        من المحفظة
                      </>
                    ) : (
                      <>
                        لا رهان موصى به — الفرق مع السوق خارج النطاق الموثوق{" "}
                        <span className="tabular" dir="ltr">
                          (3–15%)
                        </span>
                      </>
                    )}
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
                {match.odds_home != null &&
                match.odds_draw != null &&
                match.odds_away != null ? (
                  <p className="border-t border-line px-4 py-2.5 text-[11px] text-muted sm:px-5">
                    أسعار السوق (متوسط):{" "}
                    <span className="ms-1 inline-flex items-center gap-3">
                      {(
                        [
                          ["H", match.odds_home],
                          ["D", match.odds_draw],
                          ["A", match.odds_away],
                        ] as const
                      ).map(([k, v]) => (
                        <span key={k} className="inline-flex items-center gap-1">
                          <span
                            className="tabular font-semibold"
                            style={{ color: OUTCOME_COLOR[k] }}
                          >
                            {OUTCOME_GLYPH[k]}
                          </span>
                          <span className="tabular text-ink" dir="ltr">
                            {v.toFixed(2)}
                          </span>
                        </span>
                      ))}
                    </span>
                  </p>
                ) : null}
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
                        {`أرجح النتائج لمباراة ${match.home_name_ar} ضد ${match.away_name_ar}`}
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
            {markets.length > 0 || hasXpts || derived ? (
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
                  {derived ? (
                    <div className="border-t border-line">
                      <p className="px-4 pt-3 type-label sm:px-5">
                        من مصفوفة النتائج مباشرة
                      </p>
                      <dl className="divide-y divide-line">
                        <MarketRow
                          label="فوق 1.5"
                          meter={derived.over15}
                          value={pct(derived.over15)}
                          color="var(--faint)"
                        />
                        <MarketRow
                          label="فوق 3.5"
                          meter={derived.over35}
                          value={pct(derived.over35)}
                          color="var(--faint)"
                        />
                        <MarketRow
                          label={
                            <>
                              <span
                                className="tabular font-semibold"
                                style={{ color: OUTCOME_COLOR.H }}
                              >
                                1
                              </span>{" "}
                              شباك نظيفة
                            </>
                          }
                          meter={derived.csHome}
                          value={pct(derived.csHome)}
                          color="var(--home)"
                        />
                        <MarketRow
                          label={
                            <>
                              <span
                                className="tabular font-semibold"
                                style={{ color: OUTCOME_COLOR.A }}
                              >
                                2
                              </span>{" "}
                              شباك نظيفة
                            </>
                          }
                          meter={derived.csAway}
                          value={pct(derived.csAway)}
                          color="var(--away)"
                        />
                      </dl>
                    </div>
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

          {/* 5ب — مواجهات سابقة */}
          <SectionCard
            leagueId={match.leagueId}
            title="مواجهات سابقة"
            subtitle={
              h2h.length > 0
                ? `من منظور ${match.home_name_ar}: ${h2hTally.w} فوز · ${h2hTally.d} تعادل · ${h2hTally.l} خسارة · الأهداف ${h2hTally.gf}–${h2hTally.ga}`
                : undefined
            }
            flush
            quiet
          >
            {h2h.length > 0 ? (
              <MatchList
                matches={h2h}
                showLeague={false}
                leagueId={match.leagueId}
              />
            ) : (
              <p className="px-4 py-6 text-center text-sm text-muted sm:px-5">
                لا مواجهات سابقة بين الفريقين في القاعدة.
              </p>
            )}
          </SectionCard>

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
                {leagueMetric ? (
                  <ProvenanceRow
                    label="دقة النموذج في هذا الدوري"
                    value={`آخر ${leagueMetric.n_matches} مباراة · دقة ${pct(leagueMetric.accuracy, 1)} · Brier ${leagueMetric.brier.toFixed(2)}`}
                  />
                ) : null}
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

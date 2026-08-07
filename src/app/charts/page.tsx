import type { Metadata } from "next";
import { PageNav, BackBar, EmptyState } from "@/components/ui";
import { getUpcomingByLeague, getValueMatches, getMeta, type MatchCard } from "@/lib/queries";
import { formatMetaStamp } from "@/lib/format";
import { MatchChartsInteractiveContainer } from "@/components/MatchChartsInteractiveContainer";

export const metadata: Metadata = {
  title: "الرسوم البيانية والمؤشرات التفاعلية للمباريات (Charts Hub)",
  description: "مركز المخططات والرسوم البيانية التفاعلية المربوطة مباشرة ببيانات وحالة كل مباراة في قاعدة البيانات.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function valueRowToMatchCard(v: ReturnType<typeof getValueMatches>[number]): MatchCard {
  return {
    id: v.id,
    leagueId: v.league_id,
    leagueNameAr: v.league_name_ar,
    utcDate: v.utc_date,
    status: "SCHEDULED",
    homeNameAr: v.home_name_ar,
    awayNameAr: v.away_name_ar,
    homeNameEn: "",
    awayNameEn: "",
    homeCrestUrl: null,
    awayCrestUrl: null,
    homeId: "",
    awayId: "",
    homeGoals: null,
    awayGoals: null,
    pHome: v.p_home,
    pDraw: v.p_draw,
    pAway: v.p_away,
    pBttsYes: null,
    pOver25: null,
    confidence: null,
    lambdaHome: null,
    lambdaAway: null,
    topScoresJson: null,
    scoreMatrixJson: null,
    eloHome: null,
    eloAway: null,
    season: "",
    analyticsJson: v.analytics_json,
    xptsHome: null,
    xptsAway: null,
    marketHome: null,
    marketDraw: null,
    marketAway: null,
    modelVersion: null,
    oddsHome: v.odds_home,
    oddsDraw: v.odds_draw,
    oddsAway: v.odds_away,
    shotsHome: null,
    shotsAway: null,
    sotHome: null,
    sotAway: null,
  };
}

export default function ChartsPage() {
  const lastFit = getMeta("last_fit");
  const upcomingGroups = getUpcomingByLeague(9);
  const valueMatches = getValueMatches();

  const combinedMap = new Map<string, MatchCard>();

  // MatchCard أولاً حتى لا تُستبدل بصفوف snake_case من فرص القيمة
  for (const m of upcomingGroups.flatMap((g) => g.matches || [])) {
    if (m?.id) combinedMap.set(m.id, m);
  }
  for (const v of valueMatches) {
    if (v?.id && !combinedMap.has(v.id)) {
      combinedMap.set(v.id, valueRowToMatchCard(v));
    }
  }

  // DTO نحيف: مخططات الصفحة لا تستهلك سلاسل JSON الثقيلة — تُزال قبل تمريرها للعميل
  const allMatches = Array.from(combinedMap.values()).map((m) => ({
    ...m,
    topScoresJson: null,
    scoreMatrixJson: null,
    analyticsJson: null,
    liveEventsJson: null,
    liveStatsJson: null,
  }));

  return (
    <div className="space-y-8">
      <div>
        <PageNav
          backHref="/"
          backLabel="المباريات"
          crumbs={[{ href: "/", label: "المباريات" }, { label: "الرسوم البيانية والتحليلات" }]}
        />

        {/* Hero Header Banner */}
        <div className="rounded-2xl border border-line bg-panel p-6 sm:p-8 space-y-4 shadow-2xs mt-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-dim border border-line text-accent font-black text-xs">
              مركز المخططات والرسوم البيانية للمباريات
            </span>

            {lastFit && (
              <span className="text-[11px] font-bold text-muted bg-surface px-3 py-1 rounded-full border border-line">
                تاريخ المعايرة: {formatMetaStamp(lastFit)}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-black text-ink tracking-tight leading-tight">
              الرسوم البيانية المباشرة المرتبطة بالمباريات
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-muted leading-relaxed max-w-3xl">
              حدد أي مباراة من القائمة أدناه لعرض وتحليل مخططاتها التفاعلية المباشرة (المقارنة التكتيكية السداسية، توزيع احتمالات الفوز 1X2، أسواق التهديف، والقيمة المتوقعة +EV).
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Match Charts Selector & Container */}
      {allMatches.length > 0 ? (
        <MatchChartsInteractiveContainer matches={allMatches} />
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-8">
          <EmptyState
            title="لا توجد مباريات للرسوم حالياً"
            body="عند توفر مباريات مجدولة أو فرص قيمة ستظهر هنا مخططاتها التفاعلية."
          />
        </div>
      )}

      <BackBar links={[{ href: "/", label: "الرئيسية" }]} />
    </div>
  );
}

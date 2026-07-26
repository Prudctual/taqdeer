import Link from "next/link";
import { MatchList } from "@/components/MatchList";
import { NextKickoff } from "@/components/NextKickoff";
import {
  Chip,
  EmptyState,
  MetaItem,
  PageHeader,
  SectionCard,
} from "@/components/ui";
import { formatMetaStamp } from "@/lib/format";
import {
  getUpcomingByLeague,
  getRecentFinishedByLeague,
  getMeta,
  matchCount,
  getLeagues,
} from "@/lib/queries";

export const revalidate = 300;

export default function HomePage() {
  const count = matchCount();
  const upcomingByLeague = getUpcomingByLeague(6);
  const recentByLeague = getRecentFinishedByLeague(3);
  const lastFit = getMeta("last_fit");
  const leagues = getLeagues();
  // الأقرب زمنياً عبر الدوريات كلها يتصدّر، ولا يتكرر داخل جدول دوريه
  const next = upcomingByLeague[0]?.matches[0] ?? null;
  const groups = upcomingByLeague
    .map((g) => ({ ...g, matches: g.matches.filter((m) => m.id !== next?.id) }))
    .filter((g) => g.matches.length > 0);
  const upcomingCount = groups.reduce((n, g) => n + g.matches.length, 0);

  if (count === 0) {
    return (
      <SectionCard>
        <EmptyState
          title="شغّل خط الأنابيب أولاً"
          body="حمّل نتائج الدوريات الخمس ودرّب النماذج حتى تظهر التوقعات هنا."
          action={
            <pre
              className="inline-block rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink"
              dir="ltr"
            >
              bun run pipeline
            </pre>
          }
        />
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <PageHeader
          eyebrow="طاولة تحليل"
          title={upcomingCount > 0 ? "المباريات القادمة" : "تحليلات النتائج"}
          description="احتمالات 1X2 من نماذج معايرة. اختر مباراة لتفكيك الإشارة."
          meta={
            <>
              {lastFit ? (
                <MetaItem
                  label="آخر تدريب"
                  value={
                    <span className="tabular">{formatMetaStamp(lastFit)}</span>
                  }
                />
              ) : null}
              <MetaItem
                label="مباريات في القاعدة"
                value={
                  <span className="tabular">{count.toLocaleString("ar")}</span>
                }
              />
            </>
          }
        />

        {leagues.length > 0 ? (
          <nav
            aria-label="الدوريات"
            className="flex flex-wrap items-center gap-2"
          >
            {leagues.map((l) => (
              <Chip
                key={l.id}
                href={`/leagues/${l.id}`}
                leagueId={l.id}
                hint={l.country_ar}
              >
                {l.name_ar}
              </Chip>
            ))}
            <Chip href="/leagues">كل الدوريات</Chip>
          </nav>
        ) : null}
      </div>

      {next ? <NextKickoff m={next} /> : null}

      {upcomingCount > 0 ? (
        <SectionCard
          title="الجولة القادمة"
          subtitle={`${upcomingCount} مباراة · أقرب المواعيد في كل دوري`}
          flush
          headerRight={
            <Link
              href="/accuracy"
              className="motion-colors rounded-sm text-xs text-muted no-underline hover:text-ink"
            >
              الدقة
            </Link>
          }
        >
          <div className="divide-y divide-line">
            {groups.map((group) => (
              <div key={group.leagueId} data-league={group.leagueId}>
                <div className="league-band">
                  <Link
                    href={`/leagues/${group.leagueId}`}
                    className="league-name-chip motion-colors rounded-sm font-semibold no-underline hover:text-ink"
                  >
                    {group.leagueNameAr}
                  </Link>
                  <span className="type-label tabular text-faint">
                    <span className="sr-only">عدد المباريات </span>
                    {group.matches.length}
                  </span>
                </div>
                <MatchList
                  matches={group.matches}
                  showLeague={false}
                  leagueId={group.leagueId}
                />
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {upcomingCount === 0 ? (
        <SectionCard>
          <EmptyState
            title="لا جولة قادمة منشورة الآن"
            body="الموسم الحالي منتهٍ أو لا يوجد مفتاح API. التوقعات أدناه على آخر نتائج حقيقية. لجدول قادم حي: أضف FOOTBALL_DATA_API_KEY في .env ثم bun run pipeline."
            action={
              <Link
                href="/accuracy"
                className="motion-colors text-sm font-medium text-accent no-underline hover:underline"
              >
                راجع دقة النموذج
              </Link>
            }
          />
        </SectionCard>
      ) : null}

      {recentByLeague.length > 0 ? (
        <SectionCard
          title="آخر النتائج"
          subtitle="3 مباريات لكل دوري · أصاب أو خالف قراءة النموذج"
          flush
          headerRight={
            <Link
              href="/leagues"
              className="motion-colors rounded-sm text-xs text-muted no-underline hover:text-ink"
            >
              كل الدوريات
            </Link>
          }
        >
          <div className="divide-y divide-line">
            {recentByLeague.map((group) => (
              <div key={group.leagueId} data-league={group.leagueId}>
                <div className="league-band">
                  <Link
                    href={`/leagues/${group.leagueId}`}
                    className="league-name-chip motion-colors rounded-sm font-semibold no-underline hover:text-ink"
                  >
                    {group.leagueNameAr}
                  </Link>
                  <span className="type-label tabular text-faint">
                    <span className="sr-only">عدد النتائج </span>
                    {group.matches.length}
                  </span>
                </div>
                <MatchList
                  matches={group.matches}
                  showLeague={false}
                  leagueId={group.leagueId}
                />
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

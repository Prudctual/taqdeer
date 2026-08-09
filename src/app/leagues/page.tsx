import { ChevronIcon } from "@/components/ChevronIcon";
import { Crest } from "@/components/Crest";
import { TrophyIcon } from "@/components/Icons";
import {
  BackBar,
  EmptyState,
  PageNav,
} from "@/components/ui";
import { leagueEmblemUrl } from "@/lib/leagues";
import { dbReady, getLeaguesOverview } from "@/lib/queries";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LeaguesPage() {
  if (!dbReady()) {
    return (
      <div className="space-y-6">
        <PageNav backHref="/" backLabel="المباريات" />
        <div className="card bg-surface p-8 rounded-2xl border border-line shadow-xs">
          <EmptyState
            title="لا توجد بيانات دوريات"
            body="قم بتشغيل البيانات الأساسية أولاً لتحميل قائمة الدوريات العالمية."
          />
        </div>
        <BackBar links={[{ href: "/", label: "المباريات" }]} />
      </div>
    );
  }

  const leagues = getLeaguesOverview();

  if (leagues.length === 0) {
    return (
      <div className="space-y-6">
        <PageNav backHref="/" backLabel="المباريات" />
        <div className="card bg-surface p-8 rounded-2xl border border-line">
          <EmptyState
            title="لا توجد دوريات بعد"
            body="شغّل مزامنة البيانات لتحميل الدوريات المدعومة."
          />
        </div>
        <BackBar links={[{ href: "/", label: "المباريات" }]} />
      </div>
    );
  }

  const started = leagues.filter((l) => l.seasonStarted).length;
  const totalTeams = leagues.reduce((a, l) => a + l.teams, 0);

  return (
    <div className="space-y-6">
      <div>
        <PageNav
          backHref="/"
          backLabel="المباريات"
          crumbs={[{ href: "/", label: "المباريات" }, { label: "الدوريات والجداول" }]}
        />

        <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-line shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-accent bg-accent-dim/40 px-3.5 py-1 rounded-full w-fit border border-accent/20">
            <TrophyIcon size={14} />
            <span>الجداول الرسمية · الموسم الجاري</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-semibold text-ink tracking-tight">
            الدوريات والجداول
          </h1>

          <p className="text-xs sm:text-sm text-muted font-medium leading-relaxed max-w-2xl">
            ترتيب حي يُحسب من نتائج الموسم في القاعدة — مع الصدارة وعدد الفرق والمباريات المكتملة لكل دوري.
          </p>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink pt-2 border-t border-line">
            <span className="bg-panel text-ink px-3 py-1 rounded-full border border-line">
              {leagues.length} دوريات
            </span>
            <span className="bg-panel text-ink px-3 py-1 rounded-full border border-line">
              {totalTeams} فريقاً في الجداول
            </span>
            <span className="bg-success-dim text-success px-3 py-1 rounded-full border border-success/25">
              {started} موسم منطلق
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {leagues.map((l) => {
          const seasonLabel = `${l.season}/${Number(l.season) + 1}`;
          return (
            <Link
              key={l.id}
              href={`/leagues/${l.id}`}
              data-league={l.id}
              className="press-scale group relative flex flex-col rounded-2xl bg-surface p-5 sm:p-6 no-underline border border-line shadow-xs hover:shadow-md hover:border-accent transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-panel border border-line group-hover:bg-surface transition-all shrink-0">
                    <Crest
                      src={leagueEmblemUrl(l.code)}
                      alt={l.name_ar}
                      size="md"
                      shape="soft"
                      fallback={l.name_ar.slice(0, 1)}
                    />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <h2 className="text-base sm:text-lg font-semibold text-ink group-hover:text-accent transition-colors truncate">
                      {l.name_ar}
                    </h2>
                    <p className="text-[11px] font-semibold text-faint font-mono truncate" dir="ltr">
                      {l.name_en}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-semibold text-muted bg-panel px-2.5 py-1 rounded-full border border-line">
                  {l.country_ar}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="text-[10px] font-semibold tabular bg-accent-dim/50 text-accent border border-accent/20 px-2.5 py-1 rounded-full">
                  موسم {seasonLabel}
                </span>
                <span className="text-[10px] font-semibold tabular bg-panel text-ink border border-line px-2.5 py-1 rounded-full">
                  {l.teams} فريقاً
                </span>
                {l.live > 0 ? (
                  <span className="text-[10px] font-semibold bg-danger-dim text-danger border border-danger/25 px-2.5 py-1 rounded-full">
                    {l.live} مباشرة
                  </span>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-semibold">
                <div className="rounded-xl border border-line bg-panel/60 px-3 py-2.5">
                  <p className="text-muted font-bold text-[10px]">مكتملة</p>
                  <p className="mt-0.5 font-mono tabular text-ink text-sm">{l.finished}</p>
                </div>
                <div className="rounded-xl border border-line bg-panel/60 px-3 py-2.5">
                  <p className="text-muted font-bold text-[10px]">قادمة</p>
                  <p className="mt-0.5 font-mono tabular text-ink text-sm">{l.upcoming}</p>
                </div>
              </div>

              {l.top3.length > 0 ? (
                <div className="mt-4 rounded-xl border border-line bg-panel/40 overflow-hidden">
                  <div className="px-3 py-2 border-b border-line flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-muted">صدارة الجدول</span>
                    {l.seasonStarted ? (
                      <span className="text-[10px] font-bold text-success">مباشر</span>
                    ) : (
                      <span className="text-[10px] font-bold text-muted">قبل الانطلاق</span>
                    )}
                  </div>
                  <ol className="divide-y divide-line">
                    {l.top3.map((t) => (
                      <li
                        key={t.team_id}
                        className="flex items-center gap-2.5 px-3 py-2 text-[11px]"
                      >
                        <span className="w-5 font-mono font-semibold text-muted tabular text-center">
                          {t.position}
                        </span>
                        <Crest
                          src={t.crest_url}
                          alt={t.name_ar}
                          size="xs"
                          fallback={t.name_ar.slice(0, 1)}
                        />
                        <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                          {t.name_ar || t.name_en}
                        </span>
                        <span className="font-mono font-semibold tabular text-ink">
                          {t.points}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-line bg-panel/30 px-3 py-4 text-center text-[11px] font-bold text-muted">
                  بانتظار بناء جدول الموسم من النتائج
                </div>
              )}

              <div className="pt-4 mt-auto flex items-center justify-between text-xs font-semibold">
                <span className="text-muted group-hover:text-ink transition-colors">
                  فتح الجدول الكامل
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-panel text-muted group-hover:bg-accent group-hover:text-on-fill transition-all">
                  <ChevronIcon className="-scale-x-100" size={14} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <BackBar links={[{ href: "/", label: "المباريات" }]} />
    </div>
  );
}

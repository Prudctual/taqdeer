import { ChevronIcon } from "@/components/ChevronIcon";
import { Crest } from "@/components/Crest";
import { TrophyIcon } from "@/components/Icons";
import {
  BackBar,
  EmptyState,
  PageNav,
} from "@/components/ui";
import { leagueEmblemUrl } from "@/lib/leagues";
import { dbReady, getLeagues } from "@/lib/queries";
import Link from "next/link";

export const revalidate = 300;

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

  const leagues = getLeagues();

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <PageNav
          backHref="/"
          backLabel="المباريات"
          crumbs={[{ href: "/", label: "المباريات" }, { label: "الدوريات المدعومة" }]}
        />
        
        <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-line shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-accent bg-accent-dim/40 px-3.5 py-1 rounded-full w-fit border border-accent/20">
            <TrophyIcon size={14} />
            <span>الدوريات المدعومة وتحليلات النماذج</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-ink tracking-tight">
            الدوريات الكبرى والبطولات
          </h1>

          <p className="text-xs sm:text-sm text-muted font-medium leading-relaxed max-w-2xl">
            تغطية شاملة لأقوى الدوريات العالمية بمصفوفة الأهداف المتوقعة، قوة النماذج، والترتيب التراكمي المباشر.
          </p>

          <div className="flex items-center gap-2 text-xs font-extrabold text-ink pt-2 border-t border-line">
            <span className="bg-panel text-ink px-3 py-1 rounded-full">{leagues.length} دوريات رئيسية</span>
            <span>·</span>
            <span className="text-muted font-medium">محدثة أوتوماتيكياً بعد كل جولة</span>
          </div>
        </div>
      </div>

      {/* Grid of Leagues Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {leagues.map((l) => (
          <Link
            key={l.id}
            href={`/leagues/${l.id}`}
            data-league={l.id}
            className="press-scale group relative flex flex-col justify-between rounded-2xl bg-surface p-6 no-underline border border-line shadow-xs hover:shadow-md hover:border-accent transition-all duration-200"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-panel group-hover:bg-surface group-hover:shadow-xs transition-all">
                  <Crest
                    src={leagueEmblemUrl(l.code)}
                    alt={l.name_ar}
                    size="md"
                    shape="soft"
                    fallback={l.name_ar.slice(0, 1)}
                  />
                </div>
                <span className="text-xs font-black text-muted bg-panel px-3 py-1 rounded-full">
                  {l.country_ar}
                </span>
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-black text-ink group-hover:text-accent transition-colors">
                  {l.name_ar}
                </h2>
                <p className="text-xs font-semibold text-faint font-mono" dir="ltr">
                  {l.name_en}
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-line flex items-center justify-between text-xs font-extrabold">
              <span className="text-muted group-hover:text-ink">جدول الترتيب وقوة النموذج</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-panel text-muted group-hover:bg-accent group-hover:text-on-fill transition-all">
                <ChevronIcon className="-scale-x-100" size={14} />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <BackBar links={[{ href: "/", label: "المباريات" }]} />
    </div>
  );
}

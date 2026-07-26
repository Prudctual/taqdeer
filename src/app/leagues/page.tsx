import { ChevronIcon } from "@/components/ChevronIcon";
import { Crest } from "@/components/Crest";
import {
  BackBar,
  EmptyState,
  MetaItem,
  PageHeader,
  PageNav,
  SectionCard,
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
        <SectionCard>
          <EmptyState
            title="لا بيانات"
            body="شغّل bun run pipeline أولاً لتحميل الدوريات."
          />
        </SectionCard>
        <BackBar links={[{ href: "/", label: "المباريات" }]} />
      </div>
    );
  }

  const leagues = getLeagues();

  return (
    <div className="space-y-6">
      <div>
        <PageNav
          backHref="/"
          backLabel="المباريات"
          crumbs={[{ href: "/", label: "المباريات" }, { label: "الدوريات" }]}
        />
        <PageHeader
          eyebrow="الدوريات"
          title="الدوريات المدعومة"
          description="الخمس الأوروبية الكبرى والدوري الكوري — جدول، قوة النموذج، وتوقعات المباريات."
          meta={
            leagues.length > 0 ? (
              <>
                <MetaItem label="دوريات" value={leagues.length} />
                <span>جدول وقوة وتوقعات</span>
              </>
            ) : null
          }
        />
      </div>

      <SectionCard flush>
        <ul className="divide-y divide-line">
          {leagues.map((l) => (
            <li key={l.id}>
              <Link
                href={`/leagues/${l.id}`}
                data-league={l.id}
                className="league-row flex items-center gap-3 px-4 py-3 no-underline sm:px-5"
              >
                <Crest
                  src={leagueEmblemUrl(l.code)}
                  alt={l.name_ar}
                  size="sm"
                  shape="soft"
                  fallback={l.name_ar.slice(0, 1)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {l.name_ar}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {l.country_ar}
                    <span className="mx-1.5 text-faint" aria-hidden>
                      ·
                    </span>
                    <span dir="ltr">{l.name_en}</span>
                  </span>
                </span>
                <span className="shrink-0 text-faint" aria-hidden>
                  <ChevronIcon className="-scale-x-100" size={12} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </SectionCard>

      <BackBar links={[{ href: "/", label: "المباريات" }]} />
    </div>
  );
}

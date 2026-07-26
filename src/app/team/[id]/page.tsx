import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Crest } from "@/components/Crest";
import { MatchList } from "@/components/MatchList";
import { RevealOnView } from "@/components/RevealOnView";
import {
  BackBar,
  EmptyState,
  MetaStat,
  PageNav,
  SectionCard,
} from "@/components/ui";
import { formatShortDate, pctCss } from "@/lib/format";
import {
  getEloHistory,
  getLeagueMatches,
  getTeam,
  getTeamMatches,
} from "@/lib/queries";

export const revalidate = 300;

/** مشترك بين generateMetadata والصفحة داخل الطلب نفسه */
const loadTeam = cache((id: string) => getTeam(id));

const RESULT = {
  W: { glyph: "ف", label: "فوز", color: "var(--success)" },
  D: { glyph: "ت", label: "تعادل", color: "var(--draw)" },
  L: { glyph: "خ", label: "خسارة", color: "var(--danger)" },
} as const;

type ResultKey = keyof typeof RESULT;

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const team = loadTeam(decodeURIComponent(id));
  if (!team) return { title: "فريق غير موجود" };

  return {
    title: team.name_ar,
    description: `${team.name_ar} · ${team.league_name_ar} — تقييم Elo ${Math.round(
      team.elo,
    )}، معاملات الهجوم والدفاع، وآخر المباريات.`,
  };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = loadTeam(decodeURIComponent(id));
  if (!team) notFound();

  const league = team.league_id?.toLowerCase() || undefined;

  const matches = getTeamMatches(team.id, 12);
  const eloHist = getEloHistory(team.id, 40).reverse();
  const minElo = Math.min(...eloHist.map((e) => e.elo), team.elo);
  const maxElo = Math.max(...eloHist.map((e) => e.elo), team.elo);
  const span = Math.max(maxElo - minElo, 1);

  /** مباريات الفريق القادمة من جدول الدوري */
  const upcoming = getLeagueMatches(team.league_id, 250, 0)
    .filter(
      (m) =>
        m.status !== "FINISHED" &&
        (m.homeId === team.id || m.awayId === team.id),
    )
    .slice(0, 6);

  /** فورم آخر خمس — الأحدث أولاً */
  const form = matches
    .filter((m) => m.homeGoals != null && m.awayGoals != null)
    .slice(0, 5)
    .map((m) => {
      const home = m.homeId === team.id;
      const gf = (home ? m.homeGoals : m.awayGoals) as number;
      const ga = (home ? m.awayGoals : m.homeGoals) as number;
      const key: ResultKey = gf > ga ? "W" : gf < ga ? "L" : "D";
      return {
        id: m.id,
        key,
        gf,
        ga,
        opponent: home ? m.awayNameAr : m.homeNameAr,
        date: m.utcDate,
      };
    });
  const tally = {
    W: form.filter((f) => f.key === "W").length,
    D: form.filter((f) => f.key === "D").length,
    L: form.filter((f) => f.key === "L").length,
  };

  const eloPoints = eloHist.map((e, i) => {
    const x = eloHist.length > 1 ? (i / (eloHist.length - 1)) * 100 : 50;
    const y = 32 - ((e.elo - minElo) / span) * 30 - 1;
    return { x, y, ...e };
  });
  const eloPath = eloPoints
    .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");

  return (
    <div className="space-y-6">
      <div>
        <PageNav
          backHref={`/leagues/${team.league_id}`}
          backLabel={team.league_name_ar}
          crumbs={[
            { href: "/", label: "المباريات" },
            { href: "/leagues", label: "الدوريات" },
            { href: `/leagues/${team.league_id}`, label: team.league_name_ar },
            { label: team.name_ar },
          ]}
        />
        <header
          className="flex items-center gap-4 border-b border-line pb-5"
          data-league={league}
        >
          <Crest
            src={team.crest_url}
            alt={team.name_ar}
            size="lg"
            fallback={team.name_ar.slice(0, 1)}
          />
          <div className="min-w-0">
            <p className="type-label flex items-center gap-1.5">
              <span className="chip-dot" aria-hidden />
              <Link
                href={`/leagues/${team.league_id}`}
                className="motion-colors rounded-sm no-underline hover:text-ink"
              >
                {team.league_name_ar}
              </Link>
            </p>
            <h1 className="type-display mt-1 text-balance text-ink">
              {team.name_ar}
            </h1>
            <p className="mt-0.5 text-sm text-muted" dir="ltr">
              {team.name_en}
            </p>
          </div>
        </header>
      </div>

      {/* 1 — قوة الفريق وفورمه */}
      <SectionCard
        title="مؤشرات القوة"
        leagueId={team.league_id}
        subtitle={`الآن ${Math.round(team.elo)} Elo · من ${Math.round(minElo)} إلى ${Math.round(maxElo)} في النافذة`}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-5">
            <MetaStat label="Elo الحالي" value={Math.round(team.elo)} />
            <MetaStat
              label="معامل الهجوم"
              value={team.attack?.toFixed(2) ?? "—"}
              hint="أعلى = أخطر"
            />
            <MetaStat
              label="معامل الدفاع"
              value={team.defense?.toFixed(2) ?? "—"}
              hint="أقل = أصلب"
            />
          </div>

          {team.attack != null || team.defense != null ? (
            <RevealOnView className="space-y-2.5 border-t border-line pt-4">
              {team.attack != null ? (
                <div className="flex items-center gap-3">
                  <span className="w-12 shrink-0 text-[11px] text-muted">
                    هجوم
                  </span>
                  <Meter
                    value={team.attack / 2.2}
                    color="var(--home)"
                    className="min-w-0 flex-1"
                  />
                  <span className="w-10 shrink-0 text-end text-xs tabular text-ink">
                    {team.attack.toFixed(2)}
                  </span>
                </div>
              ) : null}
              {team.defense != null ? (
                <div className="flex items-center gap-3">
                  <span className="w-12 shrink-0 text-[11px] text-muted">
                    دفاع
                  </span>
                  <Meter
                    value={Math.abs(team.defense) / 2.2}
                    color="var(--away)"
                    className="min-w-0 flex-1"
                  />
                  <span className="w-10 shrink-0 text-end text-xs tabular text-ink">
                    {team.defense.toFixed(2)}
                  </span>
                </div>
              ) : null}
            </RevealOnView>
          ) : null}

          {form.length > 0 ? (
            <div className="space-y-2 border-t border-line pt-4">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <span className="type-label">الفورم · الأحدث أولاً</span>
                <span className="text-[11px] tabular text-muted">
                  <span className="text-ink">{tally.W}</span> ف
                  <span className="mx-1.5 text-faint" aria-hidden>
                    ·
                  </span>
                  <span className="text-ink">{tally.D}</span> ت
                  <span className="mx-1.5 text-faint" aria-hidden>
                    ·
                  </span>
                  <span className="text-ink">{tally.L}</span> خ
                </span>
              </div>
              <ul className="flex flex-wrap items-center gap-1.5">
                {form.map((f) => (
                  <li key={f.id}>
                    <Link
                      href={`/match/${encodeURIComponent(f.id)}`}
                      className="motion-colors grid h-7 w-7 place-items-center rounded-[3px] border border-line bg-panel text-[11px] font-semibold no-underline hover:border-line-strong"
                      style={{ color: RESULT[f.key].color }}
                      title={`${RESULT[f.key].label} ${f.gf}–${f.ga} · ${f.opponent} · ${formatShortDate(f.date)}`}
                    >
                      <span aria-hidden>{RESULT[f.key].glyph}</span>
                      <span className="sr-only">
                        {`${RESULT[f.key].label} ${f.gf}–${f.ga} أمام ${f.opponent}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </SectionCard>

      {/* 2 — منحنى Elo */}
      {eloHist.length > 1 ? (
        <SectionCard
          title="منحنى Elo"
          leagueId={team.league_id}
          subtitle={`آخر ${eloHist.length} تحديث · أدنى ${Math.round(minElo)} · أعلى ${Math.round(maxElo)}`}
        >
          <RevealOnView>
            <div className="flex items-baseline justify-between gap-3 text-[11px] tabular text-muted">
              <span>أدنى {Math.round(minElo)}</span>
              <span>أعلى {Math.round(maxElo)}</span>
            </div>
            <div dir="ltr" className="mt-2">
              <svg
                viewBox="0 0 100 32"
                preserveAspectRatio="none"
                className="h-28 w-full"
                role="img"
                aria-label={`منحنى Elo عبر ${eloHist.length} تحديثاً، من ${Math.round(minElo)} إلى ${Math.round(maxElo)}، الحالي ${Math.round(team.elo)}`}
              >
                <line
                  x1="0"
                  y1="31"
                  x2="100"
                  y2="31"
                  stroke="var(--line-strong)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <polyline
                  points={eloPath}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
                {eloPoints.map((p, i) => (
                  <rect
                    key={`${p.date}-${i}`}
                    x={Math.max(0, p.x - 50 / eloPoints.length)}
                    y="0"
                    width={100 / eloPoints.length}
                    height="32"
                    fill="transparent"
                  >
                    <title>{`${p.date.slice(0, 10)} · ${Math.round(p.elo)}`}</title>
                  </rect>
                ))}
              </svg>
              <div className="mt-1.5 flex items-baseline justify-between gap-3 text-[11px] tabular text-faint">
                <span>{eloHist[0]!.date.slice(0, 10)}</span>
                <span>{eloHist[eloHist.length - 1]!.date.slice(0, 10)}</span>
              </div>
            </div>
          </RevealOnView>
        </SectionCard>
      ) : null}

      {/* 3 — المباريات القادمة */}
      {upcoming.length > 0 ? (
        <SectionCard
          title="المباريات القادمة"
          subtitle={`${upcoming.length} مباراة · اضغط أي صف لفتح التوقّع`}
          leagueId={team.league_id}
          flush
        >
          <MatchList
            matches={upcoming}
            showLeague={false}
            leagueId={team.league_id}
          />
        </SectionCard>
      ) : null}

      {/* 4 — آخر المباريات */}
      <SectionCard
        title="آخر المباريات"
        subtitle="اضغط أي صف لفتح التوقّع"
        leagueId={team.league_id}
        flush
        headerRight={
          <Link
            href={`/leagues/${team.league_id}`}
            className="motion-colors rounded-sm text-xs text-muted no-underline hover:text-ink"
          >
            جدول الدوري
          </Link>
        }
      >
        {matches.length === 0 ? (
          <EmptyState
            title="لا مباريات مسجّلة"
            body="بعد مزامنة النتائج تظهر آخر مباريات هذا الفريق هنا."
          />
        ) : (
          <MatchList
            matches={matches}
            showLeague={false}
            leagueId={team.league_id}
          />
        )}
      </SectionCard>

      <BackBar
        links={[
          { href: `/leagues/${team.league_id}`, label: team.league_name_ar },
          { href: "/leagues", label: "الدوريات" },
          { href: "/", label: "المباريات" },
        ]}
      />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Crest } from "@/components/Crest";
import { MatchList } from "@/components/MatchList";
import { RevealOnView } from "@/components/RevealOnView";
import { TrophyIcon } from "@/components/Icons";
import { TeamTacticalSpotlight } from "@/components/TeamTacticalSpotlight";
import { SquadGridWidget } from "@/components/SquadGridWidget";
import {
  BackBar,
  EmptyState,
  PageNav,
} from "@/components/ui";

import { formatShortDate } from "@/lib/format";
import {
  getEloHistory,
  getLeagueMatches,
  getTeam,
  getTeamMatches,
  getTeamPlayers,
} from "@/lib/queries";
import { toSquadStars } from "@/lib/players";

export const revalidate = 300;

const loadTeam = cache((id: string) => getTeam(id));

const RESULT = {
  W: { glyph: "ف", label: "فوز", bg: "bg-success text-on-fill" },
  D: { glyph: "ت", label: "تعادل", bg: "bg-warn text-on-fill" },
  L: { glyph: "خ", label: "خسارة", bg: "bg-danger text-on-fill" },
} as const;

type ResultKey = keyof typeof RESULT;

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

  const matches = getTeamMatches(team.id, 20);
  const eloHist = getEloHistory(team.id, 40).reverse();
  const minElo = Math.min(...eloHist.map((e) => e.elo), team.elo);
  const maxElo = Math.max(...eloHist.map((e) => e.elo), team.elo);
  const span = Math.max(maxElo - minElo, 1);

  const upcoming = getLeagueMatches(team.league_id, 250, 0)
    .filter(
      (m) =>
        m.status !== "FINISHED" &&
        (m.homeId === team.id || m.awayId === team.id),
    )
    .slice(0, 6);

  const squadStars = toSquadStars(
    getTeamPlayers(team.id, 16),
    team.name_ar,
    true,
    8,
  );

  const form = matches
    .filter((m) => m.homeGoals != null && m.awayGoals != null)
    .slice(0, 20)
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
      {/* Header & Nav */}
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
        
        {/* Team Banner Hero Card */}
        <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-line shadow-xs flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-3 rounded-xl bg-panel border border-line">
              <Crest
                src={team.crest_url}
                alt={team.name_ar}
                size="lg"
                fallback={team.name_ar.slice(0, 1)}
              />
            </div>
            <div className="space-y-1">
              <Link
                href={`/leagues/${team.league_id}`}
                className="inline-flex items-center gap-1.5 text-xs font-black text-accent bg-accent-dim/40 px-3 py-0.5 rounded-full border border-accent/20 no-underline hover:bg-accent-dim transition-colors"
              >
                <TrophyIcon size={13} />
                <span>{team.league_name_ar}</span>
              </Link>
              <h1 className="text-2xl sm:text-4xl font-black text-ink tracking-tight">
                {team.name_ar}
              </h1>
              <p className="text-xs font-semibold text-faint font-mono" dir="ltr">
                {team.name_en}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs font-black">
            <span className="bg-panel text-ink px-4 py-1.5 rounded-full shadow-2xs font-mono border border-line">
              Elo {Math.round(team.elo)}
            </span>
            <span className="bg-panel text-ink px-4 py-1.5 rounded-full shadow-2xs border border-line">
              {team.league_name_ar}
            </span>
          </div>
        </div>
      </div>

      {/* 1 — Power Indicators Card */}
      <div className="card bg-surface p-6 sm:p-8 rounded-2xl border border-line shadow-xs space-y-6">
        <div className="border-b border-line pb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-xl font-black text-ink tracking-tight">
              مؤشرات القوة والتصنيف
            </h2>
            <p className="text-xs text-muted font-medium">
              مستوى Elo الحالي: <strong className="text-ink font-mono font-black">{Math.round(team.elo)}</strong> · التراوح في النافذة ({Math.round(minElo)} إلى {Math.round(maxElo)})
            </p>
          </div>
          <span className="text-xs font-black text-accent bg-accent-dim/40 px-3.5 py-1 rounded-full border border-accent/20">
            تحليل النماذج
          </span>
        </div>

        {/* 3 Metric Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-panel p-4 rounded-xl border border-line text-center space-y-1">
            <span className="text-xs font-black text-muted block">Elo الحالي</span>
            <span className="text-2xl sm:text-3xl font-black text-ink font-mono block">
              {Math.round(team.elo)}
            </span>
            <span className="text-[11px] font-bold text-faint block">تصنيف القوة التراكمي</span>
          </div>

          <div className="bg-panel p-4 rounded-xl border border-line text-center space-y-1">
            <span className="text-xs font-black text-muted block">معامل الهجوم</span>
            <span className="text-2xl sm:text-3xl font-black text-ink font-mono block">
              {team.attack?.toFixed(2) ?? "—"}
            </span>
            <span className="text-[11px] font-bold text-muted block">أعلى = أكثر خطورة</span>
          </div>

          <div className="bg-panel p-4 rounded-xl border border-line text-center space-y-1">
            <span className="text-xs font-black text-muted block">معامل الدفاع</span>
            <span className="text-2xl sm:text-3xl font-black text-ink font-mono block">
              {team.defense?.toFixed(2) ?? "—"}
            </span>
            <span className="text-[11px] font-bold text-muted block">أقل = أكثر صلابة</span>
          </div>
        </div>

        {/* Attack & Defense Meters */}
        {(team.attack != null || team.defense != null) && (
          <RevealOnView className="space-y-3 border-t border-line pt-5">
            {team.attack != null && (
              <div className="flex items-center gap-3 text-xs">
                <span className="w-16 font-black text-ink shrink-0">القوة الهجومية</span>
                <div className="h-3 flex-1 rounded-full bg-panel overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full transition-all"
                    style={{ width: `${Math.min(100, (team.attack / 2.2) * 100)}%` }}
                  />
                </div>
                <span className="w-12 text-end font-mono font-black text-ink shrink-0">
                  {team.attack.toFixed(2)}
                </span>
              </div>
            )}

            {team.defense != null && (
              <div className="flex items-center gap-3 text-xs">
                <span className="w-16 font-black text-ink shrink-0">الصلابة الدفاعية</span>
                <div className="h-3 flex-1 rounded-full bg-panel overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (Math.abs(team.defense) / 2.2) * 100)}%` }}
                  />
                </div>
                <span className="w-12 text-end font-mono font-black text-ink shrink-0">
                  {team.defense.toFixed(2)}
                </span>
              </div>
            )}
          </RevealOnView>
        )}

        {/* Form Badges */}
        {form.length > 0 && (
          <div className="space-y-3 border-t border-line pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black text-ink">
                الفورم · نتائج المباريات الأخيرة (الأحدث أولاً)
              </span>
              <span className="text-xs font-extrabold text-muted bg-panel px-3 py-1 rounded-full border border-line">
                <span className="text-success font-mono font-black me-1">{tally.W}</span> فوز ·{" "}
                <span className="text-amber-500 font-mono font-black me-1">{tally.D}</span> تعادل ·{" "}
                <span className="text-rose-500 font-mono font-black me-1">{tally.L}</span> خسارة
              </span>
            </div>

            <ul className="flex flex-wrap items-center gap-2">
              {form.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/match/${encodeURIComponent(f.id)}`}
                    className={`press-scale flex h-9 w-9 items-center justify-center rounded-xl font-mono text-xs font-black no-underline shadow-2xs transition-all hover:scale-110 ${RESULT[f.key].bg}`}
                    title={`${RESULT[f.key].label} ${f.gf}–${f.ga} · أمام ${f.opponent} · ${formatShortDate(f.date)}`}
                  >
                    <span>{RESULT[f.key].glyph}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 2 — Elo Curve Chart Card */}
      {eloHist.length > 1 && (
        <div className="card bg-surface p-6 sm:p-8 rounded-2xl border border-line shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="text-base sm:text-xl font-black text-ink tracking-tight">
                مسار وتطور تصنيف Elo
              </h2>
              <p className="text-xs text-muted font-medium">
                تطور الأداء عبر آخر {eloHist.length} مباراة (أدنى {Math.round(minElo)} - أعلى {Math.round(maxElo)})
              </p>
            </div>
            <span className="text-xs font-black text-muted bg-panel px-3 py-1 rounded-full border border-line">
              منحنى حركي
            </span>
          </div>

          <RevealOnView>
            <div className="bg-panel p-4 sm:p-5 rounded-2xl border border-line">
              <div className="flex items-baseline justify-between gap-3 text-xs font-mono font-bold text-muted pb-2">
                <span>أدنى {Math.round(minElo)}</span>
                <span>أعلى {Math.round(maxElo)}</span>
              </div>
              <div dir="ltr" className="pt-2">
                <svg
                  viewBox="0 0 100 32"
                  preserveAspectRatio="none"
                  className="h-28 w-full overflow-visible"
                  role="img"
                  aria-label={`منحنى Elo عبر ${eloHist.length} تحديثاً`}
                >
                  <line
                    x1="0"
                    y1="31"
                    x2="100"
                    y2="31"
                    stroke="var(--line)"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                  <polyline
                    points={eloPath}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2.5"
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
                <div className="mt-3 flex items-baseline justify-between gap-3 text-[11px] font-mono font-bold text-faint border-t border-line pt-2">
                  <span>{eloHist[0]!.date.slice(0, 10)}</span>
                  <span>{eloHist[eloHist.length - 1]!.date.slice(0, 10)}</span>
                </div>
              </div>
            </div>
          </RevealOnView>
        </div>
      )}

      {/* 3 — Comprehensive Tactical & Manager Analysis */}
      <TeamTacticalSpotlight
        teamName={team.name_ar}
        leagueName={team.league_name_ar}
        elo={team.elo}
        attackRating={team.attack}
        defenseRating={team.defense}
        crestUrl={team.crest_url}
      />

      <SquadGridWidget homeTeam={team.name_ar} awayTeam="" players={squadStars} />

      {/* 4 — Upcoming Matches */}
      {upcoming.length > 0 ? (
        <div className="card bg-surface p-6 sm:p-8 rounded-2xl border border-line space-y-4">
          <div className="border-b border-line pb-3">
            <h2 className="text-base sm:text-xl font-black text-ink tracking-tight">
              المباريات القادمة للفريق
            </h2>
            <p className="text-xs text-muted font-medium">
              أقرب {upcoming.length} مواعيد مجدولة
            </p>
          </div>
          <MatchList
            matches={upcoming}
            showLeague={false}
            leagueId={team.league_id}
          />
        </div>
      ) : (
        <div className="card bg-surface p-6 rounded-2xl border border-line">
          <EmptyState
            title="لا مباريات قادمة مسجّلة"
            body="عند إدراج الجولة القادمة لهذا الفريق ستظهر مواعيدها هنا."
          />
        </div>
      )}

      {/* 5 — Last Matches */}
      <div className="card bg-surface p-6 sm:p-8 rounded-2xl border border-line shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h2 className="text-base sm:text-xl font-black text-ink tracking-tight">
              سجل ونتائج المباريات الأخيرة
            </h2>
            <p className="text-xs text-muted font-medium">
              آخر النتائج المكتملة في القاعدة
            </p>
          </div>
          <Link
            href={`/leagues/${team.league_id}`}
            className="text-xs font-black text-accent bg-accent-dim/40 px-3 py-1 rounded-full border border-accent/20 no-underline hover:bg-accent-dim transition-colors"
          >
            جدول الدوري
          </Link>
        </div>

        {matches.length === 0 ? (
          <EmptyState
            title="لا توجد مباريات مسجلة"
            body="بعد مزامنة النتائج تظهر آخر مباريات هذا الفريق هنا."
          />
        ) : (
          <MatchList
            matches={matches}
            showLeague={false}
            leagueId={team.league_id}
          />
        )}
      </div>

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

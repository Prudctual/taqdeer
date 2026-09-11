import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Crest } from "@/components/Crest";
import { MatchList } from "@/components/MatchList";
import { RevealOnView } from "@/components/RevealOnView";
import { BankerPicksWidget } from "@/components/BankerPicksWidget";
import {
  BackBar,
  EmptyState,
  PageNav,
} from "@/components/ui";

import {
  getLeagueMatches,
  getLeagueMatchCounts,
  getLeagues,
  getAvailableSeasons,
  getStandings,
  getStrengthTable,
  getBankerPicks,
} from "@/lib/queries";
import {
  latestSeasonStartYear,
  leagueEmblemUrl,
  tournamentEmblemUrl,
  getLeagueZone as zoneOf,
} from "@/lib/leagues";

export const revalidate = 20;

function formatPoints(pts: number): string {
  if (pts === 0) return "0 نقطة";
  if (pts === 1) return "نقطة واحدة";
  if (pts === 2) return "نقطتان";
  if (pts >= 3 && pts <= 10) return `${pts} نقاط`;
  return `${pts} نقطة`;
}

function NumTh({ children, full }: { children: ReactNode; full?: string }) {
  return (
    <th scope="col" className="px-3 py-3 text-center text-xs font-semibold text-ink uppercase">
      {full ? (
        <abbr title={full} className="no-underline">
          {children}
        </abbr>
      ) : (
        children
      )}
    </th>
  );
}

function MeterRow({
  rank,
  teamId,
  name,
  value,
  pct,
}: {
  rank: number;
  teamId: string;
  name: string;
  value: string;
  pct: number;
}) {
  return (
    <li className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
      <span className="w-5 shrink-0 text-center font-mono font-semibold text-xs text-faint">
        {rank}
      </span>
      <Link
        href={`/team/${teamId}`}
        className="min-w-0 flex-1 truncate text-xs font-semibold text-ink no-underline hover:text-accent transition-colors"
      >
        {name}
      </Link>
      <div className="h-2 w-16 sm:w-20 shrink-0 overflow-hidden rounded-full bg-panel" aria-hidden>
        <div
          className="h-full bg-accent rounded-full transition-all"
          style={{ width: `${Math.max(5, pct)}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-end font-mono font-semibold text-xs text-muted">
        {value}
      </span>
    </li>
  );
}

function RankedList({
  title,
  hint,
  icon,
  children,
}: {
  title: string;
  hint: string;
  icon: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-panel/50 p-4 rounded-2xl border border-line min-w-0 space-y-2">
      <div className="flex items-center justify-between border-b border-line pb-2">
        <h3 className="text-xs font-semibold text-ink flex items-center gap-1.5">
          <span>{icon}</span>
          <span>{title}</span>
        </h3>
        <span className="text-[10px] font-semibold text-muted bg-surface px-2 py-0.5 rounded-md border border-line">
          {hint}
        </span>
      </div>
      <ol>{children}</ol>
    </div>
  );
}

function cmpDesc(a: number, b: number) {
  return a < b ? 1 : a > b ? -1 : 0;
}

export default async function LeaguePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const { id } = await params;
  const { season: selectedSeasonParam } = await searchParams;
  const leagues = getLeagues();
  const league = leagues.find((l) => l.id === id);
  if (!league) notFound();

  const availableSeasons = getAvailableSeasons(id);
  const currentSeasonYear = String(latestSeasonStartYear());
  const currentStandings = getStandings(id, currentSeasonYear);
  // فضّل الموسم الجاري إن وُجد ترتيب أو مباريات؛ وإلا أحدث موسم فيه ترتيب كامل
  const defaultSeason =
    currentStandings.length > 0 || availableSeasons[0] === currentSeasonYear
      ? currentSeasonYear
      : availableSeasons.find((s) => getStandings(id, s).length > 0) ||
        availableSeasons[0] ||
        currentSeasonYear;
  const activeSeason =
    selectedSeasonParam && availableSeasons.includes(selectedSeasonParam)
      ? selectedSeasonParam
      : defaultSeason;

  const standings = getStandings(id, activeSeason);
  const strengths = getStrengthTable(id, activeSeason);
  // الجدول القادم للمواجهات المجدولة
  const matches = getLeagueMatches(id, 400);
  const counts = getLeagueMatchCounts(id);
  const n = standings.length;
  const isCurrentSeason = activeSeason === currentSeasonYear;
  const anyPlayed = standings.some((r) => r.played > 0);
  const seasonPrep = n === 0 && isCurrentSeason;
  const seasonLabel = `${activeSeason}/${Number(activeSeason) + 1}`;

  const totalFinishedMatchesInSeason =
    standings.reduce((acc, r) => acc + r.played, 0) / 2;

  const attackStrengths = strengths.filter((t) => t.attack != null);
  const defenseStrengths = strengths.filter((t) => t.defense != null);

  const minAttack = attackStrengths.length ? Math.min(...attackStrengths.map((t) => t.attack!)) : 0;
  const maxAttack = attackStrengths.length ? Math.max(...attackStrengths.map((t) => t.attack!)) : 1;
  const attackSpan = Math.max(maxAttack - minAttack, 0.01);

  const minDefense = defenseStrengths.length ? Math.min(...defenseStrengths.map((t) => t.defense!)) : 0;
  const maxDefense = defenseStrengths.length ? Math.max(...defenseStrengths.map((t) => t.defense!)) : 1;
  const defenseSpan = Math.max(maxDefense - minDefense, 0.01);

  const eloValues = strengths.map((t) => t.elo);
  const minElo = eloValues.length ? Math.min(...eloValues) : 0;
  const eloSpan = Math.max((eloValues.length ? Math.max(...eloValues) : 0) - minElo, 1);

  const byElo = [...strengths].sort((a, b) => cmpDesc(a.elo, b.elo));
  const byAttack = [...attackStrengths].sort((a, b) =>
    cmpDesc(a.attack!, b.attack!),
  );
  const byDefense = [...defenseStrengths].sort((a, b) =>
    cmpDesc(a.defense!, b.defense!),
  );

  const leader = standings[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Header & Nav */}
      <div>
        <PageNav
          backHref="/leagues"
          backLabel="الدوريات"
          crumbs={[
            { href: "/", label: "المباريات" },
            { href: "/leagues", label: "الدوريات" },
            { label: league.name_ar },
          ]}
        />

        {/* Hero Card for League */}
        <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-line shadow-xs flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-panel border border-line">
              <Crest
                src={leagueEmblemUrl(league.code)}
                alt={league.name_ar}
                size="md"
                shape="soft"
                fallback={league.name_ar.slice(0, 1)}
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-accent bg-accent-dim/40 px-3 py-0.5 rounded-full border border-accent/20">
                {league.country_ar}
              </span>
              <h1 className="text-2xl sm:text-4xl font-semibold text-ink tracking-tight">
                {league.name_ar}
              </h1>
              <p className="text-xs font-semibold text-faint font-mono" dir="ltr">
                {league.name_en}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="bg-panel text-ink px-3.5 py-1.5 rounded-full shadow-2xs border border-line">
              موسم {activeSeason}
            </span>
            {n > 0 && (
              <span className="bg-panel text-ink px-3.5 py-1.5 rounded-full shadow-2xs border border-line">
                {n} فريقاً
              </span>
            )}
            <span className="bg-panel text-ink px-3.5 py-1.5 rounded-full shadow-2xs border border-line">
              {totalFinishedMatchesInSeason > 0
                ? `${totalFinishedMatchesInSeason} مباراة مكتملة`
                : `${counts.finished} مباراة`}
            </span>
          </div>
        </div>
      </div>

      {/* Top Leagues Selector Pills */}
      <nav aria-label="تبديل الدوري" className="flex flex-wrap items-center justify-center gap-2.5 py-1">
        {leagues.map((l) => {
          const isActive = l.id === id;
          return (
            <Link
              key={l.id}
              href={`/leagues/${l.id}`}
              className={`press-scale px-4 py-2 rounded-full text-xs font-semibold no-underline transition-all duration-200 ${
                isActive
                  ? "bg-accent text-on-fill shadow-sm scale-105"
                  : "bg-surface text-ink hover:bg-panel hover:text-accent border border-line shadow-2xs"
              }`}
            >
              {l.name_ar}
            </Link>
          );
        })}
      </nav>

      {/* Seasons Selector */}
      {availableSeasons.length > 0 && (
        <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-line shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-ink">المواسم المتاحة:</span>
            <span className="text-xs font-semibold text-accent bg-accent-dim/40 px-3 py-1 rounded-full border border-accent/20">
              {seasonPrep
                ? `بداية الموسم ${seasonLabel} — بانتظار جدول الترتيب`
                : `جدول الترتيب الرسمي — موسم ${activeSeason}`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {availableSeasons.map((s) => {
              const isActive = s === activeSeason;
              const isLatest = s === currentSeasonYear;
              return (
                <Link
                  key={s}
                  href={`/leagues/${id}?season=${s}`}
                  className={`px-4 py-2 rounded-full text-xs font-mono font-semibold no-underline transition-all ${
                    isActive
                      ? "bg-accent !text-on-fill shadow-sm border-0 scale-105"
                      : isLatest
                      ? "bg-success-dim text-success border border-success/30 hover:bg-success-dim"
                      : "bg-panel text-ink hover:bg-panel/80 border border-line"
                  }`}
                >
                  {isLatest ? `الموسم الجاري ${s}` : `موسم ${s}`}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Standings Table Section */}
      <div className="card bg-surface p-5 sm:p-7 rounded-2xl border border-line shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div className="space-y-0.5">
            <h2 className="text-base sm:text-lg font-semibold text-ink tracking-tight">
              {seasonPrep ? `موسم ${seasonLabel}` : "جدول ترتيب الفرق"}
            </h2>
            <p className="text-xs text-muted font-medium">
              {seasonPrep
                ? counts.scheduled > 0
                  ? `${counts.scheduled} مباراة مجدولة — الترتيب يظهر بعد انطلاق الموسم`
                  : "تصنيفات القوة الأولية والمباريات المجدولة"
                : leader
                  ? anyPlayed
                    ? `الصدارة: ${leader.name_ar} برصيد ${formatPoints(leader.points)} · ${n} فريقاً`
                    : `جدول الموسم الجاري · ${n} فريقاً · بانتظار أول النتائج`
                  : `المواسم الرسمية وتقييم Elo النماذج`}
            </p>
          </div>
          <span className="text-xs font-semibold text-muted bg-panel px-3 py-1 rounded-full border border-line">
            {seasonPrep
              ? "قبل انطلاق الترتيب"
              : anyPlayed
                ? "محدث من النتائج"
                : "جدول الموسم · 0 مباريات"}
          </span>
        </div>

        {n === 0 ? (
          <div className="bg-panel/50 p-6 sm:p-8 rounded-2xl border border-line space-y-6 text-center">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-success-dim text-success font-semibold text-2xl shadow-2xs">
              ⏳
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-lg font-semibold text-ink">
                {seasonPrep
                  ? `لا يوجد ترتيب رسمي بعد لموسم ${seasonLabel}`
                  : `لا يتوفر ترتيب لموسم ${activeSeason}`}
              </h3>
              <p className="text-xs font-semibold text-muted leading-relaxed">
                {counts.scheduled > 0
                  ? "المباريات المجدولة وتصنيفات Elo متاحة بالأسفل؛ جدول النقاط يُبنى بعد اكتمال الجولات."
                  : "جرّب موسماً سابقاً من الشريط أعلاه، أو انتظر مزامنة الترتيب."}
              </p>
            </div>

            {/* Strengths Preview Grid */}
            {strengths.length > 0 && (
              <div className="space-y-3 text-start border-t border-line pt-6">
                <h4 className="text-xs font-semibold text-ink">
                  تصنيفات القوة الأولية المتوقعة للأندية ({strengths.length} نادياً):
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {strengths.slice(0, 12).map((t) => (
                    <div
                      key={t.id}
                      className="bg-surface p-3 rounded-xl border border-line flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Crest alt={t.name_ar} size="xs" />
                        <span className="font-semibold text-ink">{t.name_ar}</span>
                      </div>
                      <span className="font-mono font-semibold text-ink bg-panel px-2 py-0.5 rounded-md border border-line">
                        {Math.round(t.elo)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-panel border-b border-line">
                    <NumTh full="المركز">#</NumTh>
                    <th scope="col" className="px-4 py-3 text-start text-xs font-semibold text-ink min-w-[10rem]">
                      الفريق
                    </th>
                    <NumTh full="لعب">ل</NumTh>
                    <NumTh full="فوز">ف</NumTh>
                    <NumTh full="تعادل">ت</NumTh>
                    <NumTh full="خسارة">خ</NumTh>
                    <NumTh full="أهداف له">له</NumTh>
                    <NumTh full="أهداف عليه">عليه</NumTh>
                    <NumTh full="فارق الأهداف">+/-</NumTh>
                    <NumTh full="النقاط">نقاط</NumTh>
                    <NumTh full="تقييم Elo">Elo</NumTh>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {standings.map((r) => {
                    const zone = zoneOf(r.position, n, id);
                    const isRelegation = zone?.label === "منطقة الهبوط" || zone?.label === "منطقة الهبوط المباشر" || zone?.label === "مرحلة الهبوط / التصفيات";
                    const isQualified = !!zone && !isRelegation;

                    return (
                      <tr
                        key={r.team_id}
                        className={`transition-colors font-semibold ${
                          zone
                            ? zone.bgColor
                            : "hover:bg-panel/50 text-ink"
                        }`}
                      >
                        <td
                          className={`px-3 py-3 text-center font-mono font-semibold ${
                            zone
                              ? `${zone.positionTextColor} ${zone.positionBgColor}`
                              : "text-muted"
                          }`}
                          style={
                            zone
                              ? { borderInlineStart: `4px solid ${zone.color}` }
                              : undefined
                          }
                        >
                          {r.position}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          <Link
                            href={`/team/${r.team_id}`}
                            className="flex items-center gap-2.5 no-underline transition-colors text-ink hover:text-accent"
                          >
                            <Crest
                              src={r.crest_url}
                              alt={r.name_ar}
                              size="xs"
                            />
                            <span className="truncate">{r.name_ar}</span>

                            {isQualified && zone?.tournamentType && (
                              <div className="ms-auto shrink-0" title={zone.label}>
                                <Crest
                                  src={tournamentEmblemUrl(zone.tournamentType)}
                                  alt={zone.label}
                                  size="xs"
                                  shape="circle"
                                />
                              </div>
                            )}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-muted">{r.played}</td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-ink">{r.won}</td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-muted">{r.drawn}</td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-muted">{r.lost}</td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-ink">{r.goals_for}</td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-muted">{r.goals_against}</td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-muted">
                          {r.goal_difference > 0 ? `+${r.goal_difference}` : r.goal_difference}
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-semibold text-sm text-accent">
                          {r.points}
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-semibold text-ink">
                          {Math.round(r.elo)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-muted pt-1">
              {(() => {
                const seen = new Map<string, string>();
                standings.forEach((r) => {
                  const z = zoneOf(r.position, n, id);
                  if (z && !seen.has(z.label)) seen.set(z.label, z.color);
                });
                return Array.from(seen.entries()).map(([label, color]) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <span className="h-3.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                    <span>{label}</span>
                  </span>
                ));
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Model Strengths Section */}
      <div className="card bg-surface p-5 sm:p-7 rounded-2xl border border-line shadow-xs space-y-4">
        <div className="border-b border-line pb-3">
          <h2 className="text-base sm:text-lg font-semibold text-ink tracking-tight">
            معاملات قوة النماذج الأوتوماتيكية
          </h2>
          <p className="text-xs text-muted font-medium">
            مقارنة النماذج لقوة التصنيف التراكمي Elo، الأداء الهجومي، والصلابة الدفاعية.
          </p>
        </div>

        {strengths.length === 0 ? (
          <p className="text-xs text-muted">
            لا تتوفر معاملات قوة كافية لهذا الدوري بعد.
          </p>
        ) : (
          <RevealOnView className="grid gap-4 sm:grid-cols-3">
            <RankedList title="تقييم Elo التراكمي" hint="الأعلى أولاً" icon="📈">
              {byElo.map((t, i) => (
                <MeterRow
                  key={t.id}
                  rank={i + 1}
                  teamId={t.id}
                  name={t.name_ar}
                  value={String(Math.round(t.elo))}
                  pct={Math.min(100, ((t.elo - minElo) / eloSpan) * 100)}
                />
              ))}
            </RankedList>

            <RankedList title="القوة الهجومية" hint="الأعلى غزارة أولاً" icon="⚔️">
              {byAttack.map((t, i) => (
                <MeterRow
                  key={t.id}
                  rank={i + 1}
                  teamId={t.id}
                  name={t.name_ar}
                  value={t.attack != null ? (t.attack > 0 ? `+${t.attack.toFixed(2)}` : t.attack.toFixed(2)) : "—"}
                  pct={Math.min(
                    100,
                    Math.max(8, (((t.attack ?? 0) - minAttack) / attackSpan) * 100),
                  )}
                />
              ))}
            </RankedList>

            <RankedList title="الصلابة الدفاعية" hint="الأصلب دفاعياً أولاً" icon="🛡️">
              {byDefense.map((t, i) => (
                <MeterRow
                  key={t.id}
                  rank={i + 1}
                  teamId={t.id}
                  name={t.name_ar}
                  value={t.defense != null ? (t.defense > 0 ? `+${t.defense.toFixed(2)}` : t.defense.toFixed(2)) : "—"}
                  pct={Math.min(
                    100,
                    Math.max(8, (((t.defense ?? 0) - minDefense) / defenseSpan) * 100),
                  )}
                />
              ))}
            </RankedList>
          </RevealOnView>
        )}
      </div>

      {/* Banker Picks Section */}
      <BankerPicksWidget picks={getBankerPicks(4, league.id)} title={`أأمن 4 توقعات لـ ${league.name_ar}`} />

      {/* League Matches Section */}
      <div className="card bg-surface p-5 sm:p-7 rounded-2xl border border-line shadow-xs space-y-4">

        <div className="border-b border-line pb-3">
          <h2 className="text-base sm:text-lg font-semibold text-ink tracking-tight">
            جدول ومواعيد مباريات الدوري
          </h2>
          <p className="text-xs text-muted font-medium">
            المواجهات القادمة والمجدولة للدوري (تتحول المباريات المنتهية تلقائياً لسجل حفظ التوقعات وترتيب الفرق)
          </p>
        </div>

        {matches.length === 0 ? (
          <EmptyState
            title="لا توجد مباريات مسجلة"
            body="عند نشر جدول الجولة القادمة يظهر هنا تلقائياً."
          />
        ) : (
          <MatchList
            matches={matches}
            showLeague={false}
            leagueId={league.id}
            groupDays
          />
        )}
      </div>

      <BackBar
        links={[
          { href: "/leagues", label: "الدوريات" },
          { href: "/", label: "المباريات" },
        ]}
      />
    </div>
  );
}

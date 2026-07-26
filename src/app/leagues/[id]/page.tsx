import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Crest } from "@/components/Crest";
import { MatchList } from "@/components/MatchList";
import { RevealOnView } from "@/components/RevealOnView";
import {
  BackBar,
  Chip,
  EmptyState,
  MetaItem,
  PageHeader,
  PageNav,
  SectionCard,
} from "@/components/ui";
import {
  getLeagueMatches,
  getLeagueMatchCounts,
  getLeagues,
  getStandings,
  getStandingsSeason,
  getStrengthTable,
} from "@/lib/queries";

export const revalidate = 300;

type Zone = { color: string; label: string };

/** نطاق الترتيب — خط بدء 2px فقط، لا خلفية ملوّنة */
function zoneOf(position: number, total: number): Zone | null {
  if (position <= 4) return { color: "var(--success)", label: "المراكز 1–4" };
  if (total >= 8 && position >= total - 2)
    return { color: "var(--danger)", label: "منطقة الهبوط" };
  return null;
}

/** ترويسة عمود رقمي — وسط ومختصر */
function NumTh({ children, full }: { children: ReactNode; full?: string }) {
  return (
    <th scope="col" className="table-num" style={{ textAlign: "center" }}>
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

/** صف في قائمة مرتّبة — رتبة، فريق، مقياس صغير، قيمة */
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
    <li className="flex items-center gap-2.5 border-b border-line py-1.5 last:border-b-0">
      <span className="w-4 shrink-0 tabular text-[11px] text-faint">{rank}</span>
      <Link
        href={`/team/${teamId}`}
        className="motion-colors min-w-0 flex-1 truncate rounded-sm text-xs text-ink no-underline hover:text-accent"
      >
        {name}
      </Link>
      <span
        className="h-1 w-10 shrink-0 overflow-hidden rounded-[1px] bg-panel sm:w-12"
        aria-hidden
      >
        <span
          className="meter-fill block h-full bg-accent"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="w-10 shrink-0 text-end tabular text-[11px] text-muted">
        {value}
      </span>
    </li>
  );
}

function RankedList({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 border-b border-line-strong pb-1.5">
        <h3 className="text-xs font-semibold text-ink">{title}</h3>
        <span className="text-[11px] text-faint">{hint}</span>
      </div>
      <ol className="mt-1">{children}</ol>
    </div>
  );
}

function cmpDesc(a: number, b: number) {
  return a < b ? 1 : a > b ? -1 : 0;
}

function cmpAsc(a: number, b: number) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leagues = getLeagues();
  const league = leagues.find((l) => l.id === id);
  if (!league) notFound();

  const standings = getStandings(id);
  const season = getStandingsSeason(id);
  const strengths = getStrengthTable(id);
  // نافذة قابلة للمسح: الموسم كامل (≈300 صف) كان يشحن ملايين البايتات لكل زائر
  const matches = getLeagueMatches(id, 40, 20);
  const counts = getLeagueMatchCounts(id);
  const n = standings.length;
  const maxAttack = Math.max(...strengths.map((t) => t.attack ?? 0), 0.01);
  const maxDefenseAbs = Math.max(
    ...strengths.map((t) => Math.abs(t.defense ?? 0)),
    0.01,
  );
  const eloValues = strengths.map((t) => t.elo);
  const minElo = eloValues.length ? Math.min(...eloValues) : 0;
  const eloSpan = Math.max((eloValues.length ? Math.max(...eloValues) : 0) - minElo, 1);

  const byElo = [...strengths].sort((a, b) => cmpDesc(a.elo, b.elo));
  const byAttack = [...strengths].sort((a, b) =>
    cmpDesc(a.attack ?? Number.NEGATIVE_INFINITY, b.attack ?? Number.NEGATIVE_INFINITY),
  );
  const byDefense = [...strengths].sort((a, b) =>
    cmpAsc(
      Math.abs(a.defense ?? Number.POSITIVE_INFINITY),
      Math.abs(b.defense ?? Number.POSITIVE_INFINITY),
    ),
  );

  const leader = standings[0] ?? null;
  const eloLeader = standings.reduce(
    (best, r) => (!best || r.elo > best.elo ? r : best),
    null as (typeof standings)[0] | null,
  );
  const sharpestAtk = strengths.reduce(
    (best, t) =>
      !best || (t.attack ?? -Infinity) > (best.attack ?? -Infinity) ? t : best,
    null as (typeof strengths)[0] | null,
  );
  const firmestDef = strengths.reduce(
    (best, t) =>
      !best ||
      Math.abs(t.defense ?? Infinity) < Math.abs(best.defense ?? Infinity)
        ? t
        : best,
    null as (typeof strengths)[0] | null,
  );

  return (
    <div className="space-y-6">
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
        <PageHeader
          title={league.name_ar}
          description={`${league.country_ar} · ${league.name_en}`}
          leagueId={league.id}
          meta={
            season || n > 0 ? (
              <>
                {season ? <MetaItem label="الموسم" value={season} /> : null}
                {n > 0 ? <MetaItem label="فرق" value={n} /> : null}
                {counts.finished > 0 ? (
                  <MetaItem label="نتائج" value={counts.finished} />
                ) : null}
                {counts.scheduled > 0 ? (
                  <MetaItem label="مجدولة" value={counts.scheduled} />
                ) : null}
              </>
            ) : null
          }
        />
      </div>

      <nav aria-label="تبديل الدوري" className="flex flex-wrap gap-2">
        {leagues.map((l) => (
          <Chip
            key={l.id}
            href={`/leagues/${l.id}`}
            active={l.id === id}
            leagueId={l.id}
            hint={l.name_en}
          >
            {l.name_ar}
          </Chip>
        ))}
      </nav>

      <SectionCard
        title="جدول الترتيب"
        leagueId={league.id}
        subtitle={
          leader
            ? `الصدارة: ${leader.name_ar} · ${leader.points} نقطة${
                eloLeader ? ` · Elo الأقوى: ${eloLeader.name_ar}` : ""
              }`
            : season
              ? `موسم ${season} · النقاط الرسمية + Elo الحالي`
              : "النقاط الرسمية + Elo الحالي"
        }
        flush
      >
        {n === 0 ? (
          <EmptyState
            title="لا ترتيب بعد"
            body="عند توفّر ترتيب الموسم من المصدر يظهر الجدول هنا."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-clean min-w-[34rem]">
                <caption className="sr-only">
                  {`ترتيب ${league.name_ar}${season ? ` — موسم ${season}` : ""}`}
                </caption>
                <thead>
                  <tr>
                    <NumTh full="المركز">#</NumTh>
                    <th
                      scope="col"
                      className="min-w-[8.5rem] sm:min-w-[11rem]"
                    >
                      الفريق
                    </th>
                    <NumTh full="لعب">ل</NumTh>
                    <NumTh full="فوز">ف</NumTh>
                    <NumTh full="تعادل">ت</NumTh>
                    <NumTh full="خسارة">خ</NumTh>
                    <NumTh full="فارق الأهداف">+/-</NumTh>
                    <NumTh full="النقاط">نقاط</NumTh>
                    <NumTh full="تقييم Elo">Elo</NumTh>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((r) => {
                    const zone = zoneOf(r.position, n);
                    return (
                      <tr key={r.team_id}>
                        <td
                          className="table-num text-muted"
                          style={
                            zone
                              ? { borderInlineStart: `2px solid ${zone.color}` }
                              : undefined
                          }
                        >
                          {r.position}
                          {zone ? (
                            <span className="sr-only"> — {zone.label}</span>
                          ) : null}
                        </td>
                        <td>
                          <Link
                            href={`/team/${r.team_id}`}
                            className="motion-colors flex min-w-0 items-center gap-2 rounded-sm font-medium no-underline hover:text-accent"
                          >
                            <Crest
                              src={r.crest_url}
                              alt={r.name_ar}
                              size="xs"
                              fallback={String(r.position)}
                            />
                            <span className="truncate">{r.name_ar}</span>
                          </Link>
                        </td>
                        <td className="table-num">{r.played}</td>
                        <td className="table-num">{r.won}</td>
                        <td className="table-num">{r.drawn}</td>
                        <td className="table-num">{r.lost}</td>
                        <td className="table-num text-muted">
                          {r.goal_difference > 0
                            ? `+${r.goal_difference}`
                            : r.goal_difference}
                        </td>
                        <td className="table-num font-semibold text-ink">
                          {r.points}
                        </td>
                        <td className="table-num text-muted">
                          {Math.round(r.elo)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line px-4 py-2.5 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-3 w-0.5 shrink-0"
                  style={{ background: "var(--success)" }}
                  aria-hidden
                />
                <span className="tabular">المراكز 1–4</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-3 w-0.5 shrink-0"
                  style={{ background: "var(--danger)" }}
                  aria-hidden
                />
                منطقة الهبوط
              </span>
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard
        title="قوة النموذج"
        leagueId={league.id}
        subtitle={
          sharpestAtk && firmestDef
            ? `أخطر هجوم: ${sharpestAtk.name_ar} · أصلب دفاع: ${firmestDef.name_ar} · هجوم أعلى = أخطر · دفاع أقرب للصفر = أصلب`
            : "هجوم أعلى = أخطر · دفاع أقرب للصفر = أصلب"
        }
      >
        {strengths.length === 0 ? (
          <p className="text-sm text-muted">
            لا معاملات قوة لهذا الدوري بعد — تظهر بعد أول جولة مكتملة.
          </p>
        ) : (
          <RevealOnView className="grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <RankedList title="تقييم Elo" hint="الأعلى أولاً">
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

            <RankedList title="الهجوم" hint="الأخطر أولاً">
              {byAttack.map((t, i) => (
                <MeterRow
                  key={t.id}
                  rank={i + 1}
                  teamId={t.id}
                  name={t.name_ar}
                  value={t.attack?.toFixed(2) ?? "—"}
                  pct={Math.min(
                    100,
                    (Math.max(0, t.attack ?? 0) / maxAttack) * 100,
                  )}
                />
              ))}
            </RankedList>

            <RankedList title="الدفاع" hint="الأقرب للصفر أولاً">
              {byDefense.map((t, i) => (
                <MeterRow
                  key={t.id}
                  rank={i + 1}
                  teamId={t.id}
                  name={t.name_ar}
                  value={t.defense?.toFixed(2) ?? "—"}
                  pct={Math.min(
                    100,
                    (Math.abs(t.defense ?? 0) / maxDefenseAbs) * 100,
                  )}
                />
              ))}
            </RankedList>
          </RevealOnView>
        )}
      </SectionCard>

      <SectionCard
        title="مباريات الدوري"
        subtitle="أقرب 40 موعداً ثم آخر 20 نتيجة"
        leagueId={league.id}
        flush
      >
        {matches.length === 0 ? (
          <EmptyState
            title="لا مباريات بعد"
            body="عند نشر جدول الجولة القادمة أو نتائج حديثة تظهر هنا."
          />
        ) : (
          <MatchList
            matches={matches}
            showLeague={false}
            leagueId={league.id}
            groupDays
          />
        )}
      </SectionCard>

      <BackBar
        links={[
          { href: "/leagues", label: "الدوريات" },
          { href: "/", label: "المباريات" },
        ]}
      />
    </div>
  );
}

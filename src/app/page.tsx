import { StudioHomeView } from "@/components/StudioHomeView";
import { MatchTableRow } from "@/components/ShadcnDataTable";
import { StandingTeam } from "@/components/LeagueTableWidget";
import { SectionCard, EmptyState } from "@/components/ui";
import { LatestArticlesWidget } from "@/components/LatestArticlesWidget";
import { LatestNewsWidget } from "@/components/LatestNewsWidget";
import {
  getUpcomingByLeague,
  getRecentFinishedByLeague,
  getMeta,
  matchCount,
  getLeagues,
  getStandings,
  getBankerPicks,
  type MatchCard,
} from "@/lib/queries";
import { resolveMatchPhase } from "@/lib/match-status";

export const revalidate = 300;

function toTableStatus(m: MatchCard): MatchTableRow["status"] {
  const phase = resolveMatchPhase({
    status: m.status,
    utcDate: m.utcDate,
    homeGoals: m.homeGoals,
    awayGoals: m.awayGoals,
    minute: m.minute,
    liveStatusAr: m.liveStatusAr,
  });
  if (phase === "finished") return "FINISHED";
  if (phase === "live") return "IN_PLAY";
  return "SCHEDULED";
}

export default function HomePage() {
  const count = matchCount();
  const upcomingByLeague = getUpcomingByLeague(10);
  const recentByLeague = getRecentFinishedByLeague(8);
  const lastFit = getMeta("last_fit");
  const leagues = getLeagues();
  const bankerPicks = getBankerPicks(4);

  const standingsByLeague: Record<string, StandingTeam[]> = {};
  leagues.forEach((l) => {
    const raw = getStandings(l.id);
    if (raw && raw.length > 0) {
      standingsByLeague[l.id] = raw.map((s) => ({
        team_id: s.team_id,
        name_ar: s.name_ar,
        crest_url: s.crest_url,
        played: s.played,
        won: s.won,
        drawn: s.drawn,
        lost: s.lost,
        goal_difference: s.goal_difference,
        points: s.points,
      }));
    }
  });

  const nextMatch = upcomingByLeague[0]?.matches[0] ?? null;
  const groups = upcomingByLeague.filter((g) => g.matches.length > 0);
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

  // Format matches into ShadcnDataTable rows
  const allMatchesList: MatchTableRow[] = [];

  // Add upcoming matches
  groups.forEach((g) => {
    g.matches.forEach((m) => {
      const matchStatus = toTableStatus(m);

      allMatchesList.push({
        id: m.id,
        utcDate: m.utcDate,
        status: matchStatus,
        leagueId: m.leagueId,
        leagueNameAr: m.leagueNameAr,
        homeTeam: m.homeNameEn,
        homeTeamAr: m.homeNameAr,
        awayTeam: m.awayNameEn,
        awayTeamAr: m.awayNameAr,
        homeScore: m.homeGoals,
        awayScore: m.awayGoals,
        pHome: m.pHome ?? 0.33,
        pDraw: m.pDraw ?? 0.34,
        pAway: m.pAway ?? 0.33,
        homeElo: m.eloHome ?? undefined,
        awayElo: m.eloAway ?? undefined,
      });
    });
  });

  // Add recent finished matches
  recentByLeague.forEach((g) => {
    g.matches.forEach((m) => {
      const matchStatus = toTableStatus(m);

      allMatchesList.push({
        id: m.id,
        utcDate: m.utcDate,
        status: matchStatus,
        leagueId: m.leagueId,
        leagueNameAr: m.leagueNameAr,
        homeTeam: m.homeNameEn,
        homeTeamAr: m.homeNameAr,
        awayTeam: m.awayNameEn,
        awayTeamAr: m.awayNameAr,
        homeScore: m.homeGoals,
        awayScore: m.awayGoals,
        pHome: m.pHome ?? 0.33,
        pDraw: m.pDraw ?? 0.34,
        pAway: m.pAway ?? 0.33,
        homeElo: m.eloHome ?? undefined,
        awayElo: m.eloAway ?? undefined,
      });
    });
  });

  return (
    <div className="space-y-8">
      <StudioHomeView
        matchCount={count}
        upcomingCount={upcomingCount}
        lastFit={lastFit}
        leagues={leagues}
        tableMatches={allMatchesList}
        groups={groups}
        recentGroups={recentByLeague}
        nextMatch={nextMatch}
        standingsByLeague={standingsByLeague}
        bankerPicks={bankerPicks}
      />
      <LatestNewsWidget />
      <LatestArticlesWidget />
    </div>
  );
}

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getLiveMatches, getUpcomingByLeague } from "@/lib/queries";
import { syncRealLiveMatches } from "@/lib/live-sync";
import {
  calculateInPlayProbs,
  countRedCards,
  parseLiveEvents,
} from "@/lib/in-play-probs";
import { isLiveStatus, resolveMatchPhase } from "@/lib/match-status";
import {
  checkRateLimit,
  createRateLimitErrorResponse,
  getSecureApiHeaders,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const rl = checkRateLimit(request);
  if (!rl.allowed) {
    return createRateLimitErrorResponse(rl);
  }

  try {
    await syncRealLiveMatches();

    const now = new Date();

    const rawLiveMatches = getLiveMatches().filter(
      (m) =>
        resolveMatchPhase({
          status: m.status,
          utcDate: m.utcDate,
          homeGoals: m.homeGoals,
          awayGoals: m.awayGoals,
          minute: m.minute,
          liveStatusAr: m.liveStatusAr,
          now,
        }) === "live",
    );

    const liveMatches = rawLiveMatches.map((m) => {
      let minute = m.minute;
      let liveStatusAr = m.liveStatusAr;

      if (minute == null && isLiveStatus(m.status)) {
        const elapsedMins = Math.floor(
          (now.getTime() - Date.parse(m.utcDate)) / 60000,
        );
        if (elapsedMins >= 0 && elapsedMins <= 120) {
          if (elapsedMins <= 45) {
            minute = elapsedMins;
            liveStatusAr = liveStatusAr || `الشوط الأول · د ${minute}`;
          } else if (elapsedMins <= 60) {
            minute = 45;
            liveStatusAr = liveStatusAr || "استراحة الشوطين";
          } else {
            minute = Math.min(90, elapsedMins - 15);
            liveStatusAr = liveStatusAr || `الشوط الثاني · د ${minute}`;
          }
        }
      }

      const homeGoals = m.homeGoals ?? 0;
      const awayGoals = m.awayGoals ?? 0;
      const events = parseLiveEvents(m.liveEventsJson);
      const reds = countRedCards(events, m.homeNameAr, m.awayNameAr);

      let liveProbs: {
        pHome: number | null;
        pDraw: number | null;
        pAway: number | null;
        pBttsYes: number | null;
        pOver25: number | null;
      } = {
        pHome: m.pHome ?? null,
        pDraw: m.pDraw ?? null,
        pAway: m.pAway ?? null,
        pBttsYes: m.pBttsYes ?? null,
        pOver25: m.pOver25 ?? null,
      };

      if (minute != null && minute > 0 && m.lambdaHome && m.lambdaAway) {
        liveProbs = calculateInPlayProbs(
          m.lambdaHome,
          m.lambdaAway,
          minute,
          homeGoals,
          awayGoals,
          { homeReds: reds.homeReds, awayReds: reds.awayReds },
        );
      }

      return {
        ...m,
        status: "IN_PLAY",
        minute: minute ?? null,
        liveStatusAr: liveStatusAr || "مباشر الآن",
        homeGoals,
        awayGoals,
        homeReds: reds.homeReds,
        awayReds: reds.awayReds,
        ...liveProbs,
      };
    });

    const upcomingGroups = getUpcomingByLeague(4);

    return NextResponse.json(
      {
        success: true,
        count: liveMatches.length,
        liveMatches,
        upcomingGroups,
        timestamp: new Date().toISOString(),
      },
      { headers: getSecureApiHeaders(rl) },
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500, headers: getSecureApiHeaders(rl) },
    );
  }
}

export async function POST(request: Request) {
  const rl = checkRateLimit(request);
  if (!rl.allowed) {
    return createRateLimitErrorResponse(rl);
  }

  try {
    const body = await request.json();
    const {
      match_id,
      home_goals,
      away_goals,
      status,
      minute,
      live_status_ar,
      live_events_json,
    } = body;

    if (!match_id) {
      return NextResponse.json(
        { success: false, error: "match_id required" },
        { status: 400, headers: getSecureApiHeaders(rl) },
      );
    }

    const db = getDb();
    db.prepare(
      `UPDATE matches SET
         home_goals = COALESCE(?, home_goals),
         away_goals = COALESCE(?, away_goals),
         status = COALESCE(?, status),
         minute = COALESCE(?, minute),
         live_status_ar = COALESCE(?, live_status_ar),
         live_events_json = COALESCE(?, live_events_json)
       WHERE id = ?`,
    ).run(
      home_goals ?? null,
      away_goals ?? null,
      status ?? null,
      minute ?? null,
      live_status_ar ?? null,
      live_events_json ?? null,
      match_id,
    );

    return NextResponse.json(
      { success: true },
      { headers: getSecureApiHeaders(rl) },
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500, headers: getSecureApiHeaders(rl) },
    );
  }
}

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getLiveMatches, getUpcomingByLeague } from "@/lib/queries";
import { syncRealLiveMatches } from "@/lib/live-sync";
import { isLiveStatus, resolveMatchPhase } from "@/lib/match-status";
import {
  checkRateLimit,
  createRateLimitErrorResponse,
  getSecureApiHeaders,
} from "@/lib/rate-limit";

function calculateInPlayProbs(
  lambdaHome: number,
  lambdaAway: number,
  minute: number,
  homeScore: number,
  awayScore: number,
) {
  const remMin = Math.max(0, 90 - Math.min(minute, 90));
  const r = remMin / 90.0;
  const remLamHome = Math.max(0.01, lambdaHome * r);
  const remLamAway = Math.max(0.01, lambdaAway * r);

  function poisson(k: number, lam: number): number {
    let fact = 1;
    for (let i = 1; i <= k; i++) fact *= i;
    return (Math.pow(lam, k) * Math.exp(-lam)) / fact;
  }

  const MAX_GOALS = 5;
  let pHomeWin = 0;
  let pDraw = 0;
  let pAwayWin = 0;
  let pBtts = 0;
  let pOver25 = 0;

  for (let i = 0; i <= MAX_GOALS; i++) {
    for (let j = 0; j <= MAX_GOALS; j++) {
      const pCell = poisson(i, remLamHome) * poisson(j, remLamAway);
      const finalHome = homeScore + i;
      const finalAway = awayScore + j;

      if (finalHome > finalAway) pHomeWin += pCell;
      else if (finalHome === finalAway) pDraw += pCell;
      else pAwayWin += pCell;

      if (finalHome >= 1 && finalAway >= 1) pBtts += pCell;
      if (finalHome + finalAway >= 3) pOver25 += pCell;
    }
  }

  const total = pHomeWin + pDraw + pAwayWin || 1;
  return {
    pHome: parseFloat((pHomeWin / total).toFixed(4)),
    pDraw: parseFloat((pDraw / total).toFixed(4)),
    pAway: parseFloat((pAwayWin / total).toFixed(4)),
    pBttsYes: parseFloat((pBtts / total).toFixed(4)),
    pOver25: parseFloat((pOver25 / total).toFixed(4)),
  };
}

export async function GET(request: Request) {
  const rl = checkRateLimit(request);
  if (!rl.allowed) {
    return createRateLimitErrorResponse(rl);
  }

  try {
    // Sync real active live matches currently playing right now
    await syncRealLiveMatches();

    const now = new Date();

    // لا تُعرض إلا المباريات التي تثبت مرحلتها أنها جارية فعلاً،
    // فحالة قديمة لم يحدّثها المصدر لا تُحوّل إلى بث مباشر.
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

    // Map and enrich live matches
    const liveMatches = rawLiveMatches.map((m) => {
      let minute = m.minute;
      let liveStatusAr = m.liveStatusAr;

      // تقدير الدقيقة للمباريات ذات الحالة المباشرة التي لم يرسل مصدرها الدقيقة
      if (minute == null && isLiveStatus(m.status)) {
        const elapsedMins = Math.floor((now.getTime() - Date.parse(m.utcDate)) / 60000);
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

      // إعادة حساب الاحتمالات اللحظية — وعند غياب توقع النموذج تبقى null بلا اختلاق
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
        );
      }

      return {
        ...m,
        status: "IN_PLAY",
        minute: minute ?? null,
        liveStatusAr: liveStatusAr || "مباشر الآن",
        homeGoals,
        awayGoals,
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
    const { match_id, home_goals, away_goals, status, minute, live_status_ar, live_events_json } = body;

    if (!match_id) {
      return NextResponse.json({ success: false, error: "match_id required" }, { status: 400 });
    }

    const db = getDb();
    db.prepare(
      `UPDATE matches
       SET home_goals = COALESCE(?, home_goals),
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
      live_events_json ? JSON.stringify(live_events_json) : null,
      match_id,
    );

    return NextResponse.json(
      { success: true, message: `Match ${match_id} updated live` },
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

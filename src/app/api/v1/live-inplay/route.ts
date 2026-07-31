import { NextResponse } from "next/server";
import {
  checkRateLimit,
  createRateLimitErrorResponse,
  getSecureApiHeaders,
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rl = checkRateLimit(request);
  if (!rl.allowed) {
    return createRateLimitErrorResponse(rl);
  }

  try {
    const body = await request.json();
    const {
      lambda_home = 1.45,
      lambda_away = 1.15,
      minute = 0,
      home_score = 0,
      away_score = 0,
      home_red_cards = 0,
      away_red_cards = 0,
    } = body;

    // Remaining time fraction
    const remainingMinutes = Math.max(0, 90 - Math.min(minute, 90));
    const r = remainingMinutes / 90.0;

    // Red card penalty
    const redHomeFactor = Math.pow(0.75, Math.max(0, home_red_cards));
    const redAwayFactor = Math.pow(0.75, Math.max(0, away_red_cards));

    // Opponent advantage boost
    const oppHomeBoost = Math.pow(1.15, Math.max(0, away_red_cards));
    const oppAwayBoost = Math.pow(1.15, Math.max(0, home_red_cards));

    const remLamHome = Math.max(0.01, lambda_home * r * redHomeFactor * oppHomeBoost);
    const remLamAway = Math.max(0.01, lambda_away * r * redAwayFactor * oppAwayBoost);

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

    const matrix: { homeGoals: number; awayGoals: number; prob: number }[] = [];

    for (let i = 0; i <= MAX_GOALS; i++) {
      for (let j = 0; j <= MAX_GOALS; j++) {
        const pI = poisson(i, remLamHome);
        const pJ = poisson(j, remLamAway);
        const pCell = pI * pJ;

        const finalHome = home_score + i;
        const finalAway = away_score + j;

        if (finalHome > finalAway) pHomeWin += pCell;
        else if (finalHome === finalAway) pDraw += pCell;
        else pAwayWin += pCell;

        if (finalHome >= 1 && finalAway >= 1) pBtts += pCell;
        if (finalHome + finalAway >= 3) pOver25 += pCell;

        matrix.push({
          homeGoals: finalHome,
          awayGoals: finalAway,
          prob: parseFloat(pCell.toFixed(4)),
        });
      }
    }

    const total = pHomeWin + pDraw + pAwayWin;
    const pH = pHomeWin / total;
    const pD = pDraw / total;
    const pA = pAwayWin / total;

    return NextResponse.json(
      {
        success: true,
        input: {
          minute,
          home_score,
          away_score,
          home_red_cards,
          away_red_cards,
          remaining_lambda_home: parseFloat(remLamHome.toFixed(3)),
          remaining_lambda_away: parseFloat(remLamAway.toFixed(3)),
        },
        probabilities: {
          p_home: parseFloat(pH.toFixed(4)),
          p_draw: parseFloat(pD.toFixed(4)),
          p_away: parseFloat(pA.toFixed(4)),
          p_btts_yes: parseFloat(pBtts.toFixed(4)),
          p_over25: parseFloat(pOver25.toFixed(4)),
        },
        top_scores: matrix
          .sort((a, b) => b.prob - a.prob)
          .slice(0, 5)
          .map((s) => ({
            score: `${s.homeGoals}-${s.awayGoals}`,
            probability: s.prob,
          })),
        timestamp: new Date().toISOString(),
      },
      {
        headers: getSecureApiHeaders(rl),
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500, headers: getSecureApiHeaders(rl) }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    },
  });
}

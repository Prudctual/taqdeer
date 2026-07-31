import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  checkRateLimit,
  createRateLimitErrorResponse,
  getSecureApiHeaders,
} from "@/lib/rate-limit";

export const revalidate = 60;

export async function GET(request: Request) {
  const rl = checkRateLimit(request);
  if (!rl.allowed) {
    return createRateLimitErrorResponse(rl);
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10)),
      50
    );

    const db = getDb();

    const query = `
      SELECT m.id,
             m.league_id,
             l.name_ar as league_name_ar,
             l.name_en as league_name_en,
             m.utc_date,
             m.status,
             ht.name_ar as home_name_ar, at.name_ar as away_name_ar,
             ht.name_en as home_name_en, at.name_en as away_name_en,
             p.p_home, p.p_draw, p.p_away,
             p.confidence,
             p.market_home, p.market_draw, p.market_away,
             m.odds_home, m.odds_draw, m.odds_away,
             p.analytics_json
      FROM matches m
      JOIN leagues l ON l.id = m.league_id
      JOIN teams ht ON ht.id = m.home_team_id
      JOIN teams at ON at.id = m.away_team_id
      JOIN predictions p ON p.match_id = m.id
      WHERE m.status IN ('SCHEDULED', 'TIMED')
        AND m.utc_date >= datetime('now')
        AND m.odds_home IS NOT NULL
      ORDER BY p.confidence DESC
      LIMIT ?
    `;

    const rows = db.prepare(query).all(limit) as Array<{
      id: string;
      league_id: string;
      league_name_ar: string;
      league_name_en: string;
      utc_date: string;
      status: string;
      home_name_ar: string;
      away_name_ar: string;
      home_name_en: string;
      away_name_en: string;
      p_home: number;
      p_draw: number;
      p_away: number;
      confidence: number;
      market_home: number | null;
      market_draw: number | null;
      market_away: number | null;
      odds_home: number | null;
      odds_draw: number | null;
      odds_away: number | null;
      analytics_json: string | null;
    }>;

    const valueBets = rows
      .map((r) => {
        let valueSignal = null;
        if (r.analytics_json) {
          try {
            const parsed = JSON.parse(r.analytics_json);
            if (parsed.value) valueSignal = parsed.value;
          } catch {
            // fallback
          }
        }

        if (!valueSignal && r.odds_home && r.odds_draw && r.odds_away) {
          const outcomes = [
            { side: "home", p: r.p_home, odds: r.odds_home },
            { side: "draw", p: r.p_draw, odds: r.odds_draw },
            { side: "away", p: r.p_away, odds: r.odds_away },
          ];

          let best = null;
          for (const o of outcomes) {
            const b = o.odds - 1.0;
            if (b <= 0) continue;
            const ev = o.p * o.odds - 1.0;
            const kelly = Math.max(0.0, (o.p * b - (1.0 - o.p)) / b);
            const cand = {
              side: o.side,
              odds: o.odds,
              p: o.p,
              ev: parseFloat(ev.toFixed(4)),
              kelly: parseFloat(kelly.toFixed(4)),
              stake: parseFloat((0.25 * kelly).toFixed(4)),
              bet: ev >= 0.03 && ev <= 0.15 && kelly > 0,
            };
            if (!best || cand.kelly > best.kelly) best = cand;
          }
          valueSignal = best;
        }

        return {
          id: r.id,
          league_id: r.league_id,
          league_name_ar: r.league_name_ar,
          utc_date: r.utc_date,
          home_team: r.home_name_ar,
          away_team: r.away_name_ar,
          probabilities: { home: r.p_home, draw: r.p_draw, away: r.p_away },
          confidence: r.confidence,
          odds: { home: r.odds_home, draw: r.odds_draw, away: r.odds_away },
          value_signal: valueSignal,
        };
      })
      .filter((b) => b.value_signal && b.value_signal.bet);

    return NextResponse.json(
      {
        success: true,
        count: valueBets.length,
        timestamp: new Date().toISOString(),
        data: valueBets,
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
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    },
  });
}

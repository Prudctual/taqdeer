import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const revalidate = 60; // Cache for 60 seconds

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const league = searchParams.get("league");
    const status = searchParams.get("status") || "SCHEDULED";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

    const db = getDb();

    let query = `
      SELECT m.id,
             m.league_id as league_id,
             l.name_ar as league_name_ar,
             l.name_en as league_name_en,
             m.utc_date,
             m.status,
             m.season,
             m.matchday,
             ht.name_ar as home_name_ar, at.name_ar as away_name_ar,
             ht.name_en as home_name_en, at.name_en as away_name_en,
             ht.crest_url as home_crest_url, at.crest_url as away_crest_url,
             m.home_goals, m.away_goals,
             p.p_home, p.p_draw, p.p_away,
             p.p_btts_yes, p.p_over25,
             p.confidence, p.lambda_home, p.lambda_away,
             p.elo_home, p.elo_away,
             p.xpts_home, p.xpts_away,
             p.market_home, p.market_draw, p.market_away,
             p.model_version,
             m.odds_home, m.odds_draw, m.odds_away,
             m.sharp_steam_side, m.referee_name, m.weather_condition
      FROM matches m
      JOIN leagues l ON l.id = m.league_id
      JOIN teams ht ON ht.id = m.home_team_id
      JOIN teams at ON at.id = m.away_team_id
      JOIN predictions p ON p.match_id = m.id
    `;

    const params: (string | number)[] = [];
    const conditions: string[] = [];

    if (league) {
      conditions.push("m.league_id = ?");
      params.push(league.toLowerCase());
    }

    if (status !== "ALL") {
      conditions.push("m.status = ?");
      params.push(status);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY m.utc_date ASC LIMIT ?";
    params.push(limit);

    const rows = db.prepare(query).all(...params);

    return NextResponse.json(
      {
        success: true,
        count: rows.length,
        timestamp: new Date().toISOString(),
        data: rows,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

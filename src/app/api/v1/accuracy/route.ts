import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const revalidate = 300; // Cache for 5 minutes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const league = searchParams.get("league");

    const db = getDb();

    let query = `
      SELECT m.id,
             m.league_id,
             m.window_label,
             m.n_matches,
             m.accuracy,
             m.brier,
             m.log_loss,
             m.rps,
             m.model_version,
             m.created_at
      FROM model_metrics m
    `;

    const params: string[] = [];
    if (league) {
      query += " WHERE m.league_id = ?";
      params.push(league.toLowerCase());
    }

    query += " ORDER BY m.created_at DESC";

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

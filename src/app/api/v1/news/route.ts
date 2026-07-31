import { NextRequest, NextResponse } from "next/server";
import { getLatestNews } from "@/lib/queries";
import { checkRateLimit, createRateLimitErrorResponse, getSecureApiHeaders } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rl = checkRateLimit(request);
  if (!rl.allowed) return createRateLimitErrorResponse(rl);

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
    const category = searchParams.get("category") || undefined;

    const news = getLatestNews(limit, category);

    return NextResponse.json(
      {
        success: true,
        count: news.length,
        data: news,
      },
      {
        headers: {
          ...getSecureApiHeaders(rl),
          "Cache-Control": "public, s-maxage=180, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch live news",
      },
      { status: 500 }
    );
  }
}

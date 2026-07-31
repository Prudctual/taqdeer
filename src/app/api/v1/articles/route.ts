import { NextRequest, NextResponse } from "next/server";
import { getArticles } from "@/lib/queries";
import { checkRateLimit, createRateLimitErrorResponse, getSecureApiHeaders } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rl = checkRateLimit(request);
  if (!rl.allowed) return createRateLimitErrorResponse(rl);

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || 12), 50);
    const category = searchParams.get("category") || undefined;

    const articles = getArticles(limit, category);

    return NextResponse.json(
      {
        success: true,
        count: articles.length,
        data: articles,
      },
      {
        headers: {
          ...getSecureApiHeaders(rl),
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch articles",
      },
      { status: 500 }
    );
  }
}

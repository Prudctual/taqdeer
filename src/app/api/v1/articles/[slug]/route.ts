import { NextRequest, NextResponse } from "next/server";
import { getArticleBySlug } from "@/lib/queries";
import { checkRateLimit, createRateLimitErrorResponse, getSecureApiHeaders } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ slug: string }> }
) {
  const rl = checkRateLimit(request);
  if (!rl.allowed) return createRateLimitErrorResponse(rl);

  try {
    const params = await props.params;
    const article = getArticleBySlug(params.slug);

    if (!article) {
      return NextResponse.json(
        { success: false, error: "Article not found" },
        { status: 404, headers: getSecureApiHeaders(rl) }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: article,
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
        error: error instanceof Error ? error.message : "Failed to fetch article",
      },
      { status: 500 }
    );
  }
}

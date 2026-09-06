import { NextRequest, NextResponse } from "next/server";
import { getConfinedPlatformData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const league = searchParams.get("league") || undefined;

    const data = getConfinedPlatformData(league);

    return NextResponse.json({
      status: "ok",
      subdomain: "hasr",
      updated_at: new Date().toISOString(),
      ...data,
    });
  } catch (error) {
    console.error("Error in /api/v1/hasr route:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to load confined platform data" },
      { status: 500 }
    );
  }
}

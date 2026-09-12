import { gzipSync } from "node:zlib";
import { NextRequest, NextResponse } from "next/server";
import { getConfinedPlatformData } from "@/lib/queries";
import { HEAVY_TTL_MS, withTtl } from "@/lib/ttl-cache";

export const revalidate = 20;

/**
 * لائحة الحصر لكامل الجدول القادم.
 *
 * الحمولة تتجاوز الميغابايت لأن النطاق موسم كامل، ومعالِجات المسارات في Next
 * لا تضغط تلقائياً — فنضغطها هنا. الجسم المضغوط يُخزَّن بعمر الكاش نفسه كي لا
 * يُعاد ضغطه لكل استعلام دوري.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const league = searchParams.get("league") || undefined;

    const body = withTtl(`hasr:body:${league || "all"}`, HEAVY_TTL_MS, () => {
      const data = getConfinedPlatformData(league);
      const json = JSON.stringify({
        status: "ok",
        subdomain: "hasr",
        updated_at: new Date().toISOString(),
        ...data,
      });
      return { json, gzip: gzipSync(json) };
    });

    const acceptsGzip = (request.headers.get("accept-encoding") || "").includes("gzip");

    if (!acceptsGzip) {
      return new NextResponse(body.json, {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    return new NextResponse(body.gzip as unknown as BodyInit, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-encoding": "gzip",
        vary: "accept-encoding",
      },
    });
  } catch (error) {
    console.error("Error in /api/v1/hasr route:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to load confined platform data" },
      { status: 500 }
    );
  }
}

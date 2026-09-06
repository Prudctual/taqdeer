import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";

  // استخراج البادئة الفرعية
  // يدعم نطاقات الإنتاج مثل: hasr.taqdeer.app أو banker.taqdeer.com
  // ويدعم البيئة المحلية مثل: hasr.localhost:3000 أو باراميتر ?subdomain=hasr
  const hostParts = hostname.split(":")[0]?.toLowerCase().split(".") ?? [];
  const subdomain = hostParts.length > 2 ? hostParts[0] : null;

  const isHasrSubdomain =
    subdomain === "hasr" ||
    subdomain === "banker" ||
    subdomain === "picks" ||
    subdomain === "select" ||
    hostname.startsWith("hasr.") ||
    hostname.startsWith("banker.") ||
    hostname.startsWith("picks.") ||
    url.searchParams.get("subdomain") === "hasr" ||
    request.headers.get("x-subdomain") === "hasr";

  const requestHeaders = new Headers(request.headers);

  if (isHasrSubdomain) {
    requestHeaders.set("x-is-hasr-subdomain", "1");
    requestHeaders.set("x-hasr-host", hostname);

    // إذا كان الطلب إلى الصفحة الرئيسية للدومين الفرعي، يتم التحويل الداخلي إلى /hasr
    if (url.pathname === "/") {
      url.pathname = "/hasr";
      return NextResponse.rewrite(url, {
        request: {
          headers: requestHeaders,
        },
      });
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * تطبيق الـ Middleware على كافة المسارات باستثناء:
     * - _next/static (الملفات الثابتة)
     * - _next/image (صور Next)
     * - الملفات الثابتة في public (الأيقونات وروبوتات البحث)
     */
    "/((?!_next/static|_next/image|favicon.svg|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

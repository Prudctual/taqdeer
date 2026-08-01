import { NextResponse } from "next/server";

interface RateLimitStore {
  timestamps: number[];
}

const ipMap = new Map<string, RateLimitStore>();
const CLEANUP_INTERVAL_MS = 60 * 1000; // Clean stale IPs every 60 seconds

// Periodic cleanup of stale IPs to prevent memory leaks
let lastCleanup = Date.now();
function cleanupStaleIPs() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [ip, store] of ipMap.entries()) {
    store.timestamps = store.timestamps.filter((ts) => now - ts < 60000);
    if (store.timestamps.length === 0) {
      ipMap.delete(ip);
    }
  }
}

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
};

/**
 * Enforce Sliding-Window Rate Limiting per IP address.
 * Public Limit: 60 requests/minute.
 * B2B Authenticated Limit (with X-API-Key): 1,000 requests/minute.
 */
export function checkRateLimit(request: Request): RateLimitResult {
  cleanupStaleIPs();

  const now = Date.now();
  
  // Extract client IP address from proxy headers
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor
    ? forwardedFor.split(",")[0]!.trim()
    : request.headers.get("x-real-ip") || "127.0.0.1";

  // Check API Key
  const apiKeyHeader = request.headers.get("x-api-key");
  const url = new URL(request.url);
  const apiKeyQuery = url.searchParams.get("api_key");
  const apiKey = apiKeyHeader || apiKeyQuery;

  const validB2BKey = process.env.TAQDEER_B2B_API_KEY || "";
  const isAuthenticated = validB2BKey !== "" && apiKey === validB2BKey;

  const limit = isAuthenticated ? 1000 : 60;
  const windowMs = 60 * 1000; // 1 minute

  const store = ipMap.get(ip) || { timestamps: [] };
  store.timestamps = store.timestamps.filter((ts) => now - ts < windowMs);

  if (store.timestamps.length >= limit) {
    ipMap.set(ip, store);
    const oldest = store.timestamps[0] || now;
    const resetSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetSeconds: Math.max(1, resetSeconds),
    };
  }

  store.timestamps.push(now);
  ipMap.set(ip, store);

  return {
    allowed: true,
    limit,
    remaining: limit - store.timestamps.length,
    resetSeconds: 60,
  };
}

/**
 * Helper to build secure HTTP headers for B2B REST API responses.
 */
export function getSecureApiHeaders(rateLimit: RateLimitResult): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-RateLimit-Limit": String(rateLimit.limit),
    "X-RateLimit-Remaining": String(rateLimit.remaining),
    "X-RateLimit-Reset": String(rateLimit.resetSeconds),
  };
}

export function createRateLimitErrorResponse(rateLimit: RateLimitResult) {
  return NextResponse.json(
    {
      success: false,
      error: "Too Many Requests",
      message: `تم تجاوز حد الطلبات المسموح به (${rateLimit.limit} طلب/دقيقة). يرجى الانتظار ${rateLimit.resetSeconds} ثانية.`,
    },
    {
      status: 429,
      headers: {
        ...getSecureApiHeaders(rateLimit),
        "Retry-After": String(rateLimit.resetSeconds),
      },
    }
  );
}

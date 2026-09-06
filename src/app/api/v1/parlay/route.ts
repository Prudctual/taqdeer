import { NextResponse } from "next/server";
import { getParlayCandidates } from "@/lib/queries";
import { calculateParlay, type ParlayLeg } from "@/lib/format";
import {
  checkRateLimit,
  createRateLimitErrorResponse,
  getSecureApiHeaders,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const rl = checkRateLimit(request);
  if (!rl.allowed) {
    return createRateLimitErrorResponse(rl);
  }

  try {
    const { searchParams } = new URL(request.url);
    const league = searchParams.get("league") || undefined;
    const limit = Math.min(
      Math.max(2, parseInt(searchParams.get("limit") || "12", 10)),
      30
    );

    const candidates = getParlayCandidates(league, limit);

    // 1. Safety Combo: Top 2 by model win probability
    const sortedByProb = [...candidates].sort((a, b) => b.probability - a.probability);
    const safetyLegs: ParlayLeg[] = sortedByProb.slice(0, 2).map((c) => ({
      id: c.matchId,
      matchName: `${c.homeTeam} × ${c.awayTeam}`,
      pickLabel: c.recommendedSideLabel,
      prob: c.probability,
      odds: c.odds,
    }));
    const safetyParlay = calculateParlay(safetyLegs);

    // 2. Value Combo: Top 2 by model positive edge
    const sortedByEdge = [...candidates].sort((a, b) => b.edge - a.edge);
    const valueLegs: ParlayLeg[] = sortedByEdge.slice(0, 2).map((c) => ({
      id: c.matchId,
      matchName: `${c.homeTeam} × ${c.awayTeam}`,
      pickLabel: c.recommendedSideLabel,
      prob: c.probability,
      odds: c.odds,
    }));
    const valueParlay = calculateParlay(valueLegs);

    // 3. Balanced Combo: High prob, positive edge, strictly no value trap
    const sortedBalanced = [...candidates]
      .filter((c) => !c.isTrap && c.edge >= -0.01)
      .sort((a, b) => b.selectionScore - a.selectionScore);
    const balancedLegs: ParlayLeg[] = sortedBalanced.slice(0, 2).map((c) => ({
      id: c.matchId,
      matchName: `${c.homeTeam} × ${c.awayTeam}`,
      pickLabel: c.recommendedSideLabel,
      prob: c.probability,
      odds: c.odds,
    }));
    const balancedParlay = calculateParlay(balancedLegs);

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        count: candidates.length,
        candidates,
        strategies: {
          safety: safetyParlay,
          value: valueParlay,
          balanced: balancedParlay,
        },
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

export async function POST(request: Request) {
  const rl = checkRateLimit(request);
  if (!rl.allowed) {
    return createRateLimitErrorResponse(rl);
  }

  try {
    const body = await request.json();
    const legs = body?.legs;

    if (!Array.isArray(legs) || legs.length === 0) {
      return NextResponse.json(
        { success: false, error: "يجب تقديم مصفوفة صالحة تحتوي على ساق واحدة على الأقل." },
        { status: 400, headers: getSecureApiHeaders(rl) }
      );
    }

    if (legs.length > 10) {
      return NextResponse.json(
        { success: false, error: "الحد الأقصى لعدد اختيارات البارلي هو 10 مباريات." },
        { status: 400, headers: getSecureApiHeaders(rl) }
      );
    }

    const sanitizedLegs: ParlayLeg[] = [];
    for (let i = 0; i < legs.length; i++) {
      const l = legs[i];
      if (!l || typeof l !== "object") {
        return NextResponse.json(
          { success: false, error: `بيانات الساق رقم ${i + 1} غير صالحة.` },
          { status: 400, headers: getSecureApiHeaders(rl) }
        );
      }
      const p = Number(l.prob);
      const o = Number(l.odds);
      if (isNaN(p) || p <= 0 || p >= 1) {
        return NextResponse.json(
          { success: false, error: `احتمالية الساق رقم ${i + 1} يجب أن تكون رقماً بين 0 و 1.` },
          { status: 400, headers: getSecureApiHeaders(rl) }
        );
      }
      if (isNaN(o) || o <= 1.0) {
        return NextResponse.json(
          { success: false, error: `سعر الساق رقم ${i + 1} يجب أن يكون أكبر من 1.0.` },
          { status: 400, headers: getSecureApiHeaders(rl) }
        );
      }
      sanitizedLegs.push({
        id: l.id ? String(l.id) : undefined,
        matchName: l.matchName ? String(l.matchName) : `المباراة ${i + 1}`,
        pickLabel: l.pickLabel ? String(l.pickLabel) : "ترشيح",
        prob: p,
        odds: o,
      });
    }

    const result = calculateParlay(sanitizedLegs);

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        parlay: result,
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
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    },
  });
}

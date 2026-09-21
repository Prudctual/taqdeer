/** بيئة نتائج 2025/26 للدوريات السبعة، وفلتر X2 مقابلها.

X2 = التعادل + فوز الضيف. الرقم يصف الدوري، لا مباراة واحدة.
الأعداد هنا تطابق python/engine/league_profiles.py.
*/

export type X2Band = "green" | "yellow" | "red";

export type X2Reason =
  | "above_and_value"
  | "above_no_market"
  | "above_no_edge"
  | "near_baseline"
  | "below_baseline"
  | "market_richer"
  | "below_and_market_richer";

export type X2Sides = {
  home: number;
  draw: number;
  away: number;
  x2: number;
};

export type X2Assessment = {
  season: string;
  leagueId: string;
  matches: number;
  source: "core" | "published";
  baseline: X2Sides;
  model: X2Sides;
  market: X2Sides | null;
  /** X2 النموذج − X2 الدوري، كنسبة (0.03 = 3 نقاط مئوية) */
  delta: number;
  /** X2 النموذج − X2 السوق، أو null إن لم يوجد سعر */
  value: number | null;
  band: X2Band;
  reason: X2Reason;
};

const SEASON = "2025/26";
const CLEAR_GAP = 0.05;
const VALUE_GAP = 0.005;

type Counts = { matches: number; home: number; draw: number; away: number };

const COUNTS: Record<string, Counts> = {
  pd: { matches: 380, home: 186, draw: 93, away: 101 },
  sa: { matches: 380, home: 148, draw: 99, away: 133 },
  pl: { matches: 380, home: 162, draw: 104, away: 114 },
  bl1: { matches: 306, home: 134, draw: 75, away: 97 },
  fl1: { matches: 306, home: 141, draw: 75, away: 90 },
  ppd: { matches: 306, home: 126, draw: 83, away: 97 },
  ded: { matches: 306, home: 136, draw: 80, away: 90 },
};

function sidesFromCounts(c: Counts): X2Sides {
  return {
    home: c.home / c.matches,
    draw: c.draw / c.matches,
    away: c.away / c.matches,
    x2: (c.draw + c.away) / c.matches,
  };
}

const POOLED: Counts = Object.values(COUNTS).reduce(
  (acc, c) => ({
    matches: acc.matches + c.matches,
    home: acc.home + c.home,
    draw: acc.draw + c.draw,
    away: acc.away + c.away,
  }),
  { matches: 0, home: 0, draw: 0, away: 0 },
);

function baselineFor(leagueId: string | null | undefined): { leagueId: string; counts: Counts } {
  const id = (leagueId ?? "").toLowerCase().trim();
  const counts = COUNTS[id];
  if (!counts) return { leagueId: "default", counts: POOLED };
  return { leagueId: id, counts };
}

function trio(h: number, d: number, a: number): X2Sides {
  const s = h + d + a;
  if (s <= 0) return { home: 0, draw: 0, away: 0, x2: 0 };
  const home = h / s;
  const draw = d / s;
  const away = a / s;
  return { home, draw, away, x2: draw + away };
}

export function assessX2(input: {
  leagueId: string | null | undefined;
  pHome: number;
  pDraw: number;
  pAway: number;
  marketHome?: number | null;
  marketDraw?: number | null;
  marketAway?: number | null;
  source?: "core" | "published";
}): X2Assessment {
  const { leagueId, counts } = baselineFor(input.leagueId);
  const baseline = sidesFromCounts(counts);
  const model = trio(input.pHome, input.pDraw, input.pAway);
  const delta = model.x2 - baseline.x2;

  const hasMarket =
    input.marketHome != null &&
    input.marketDraw != null &&
    input.marketAway != null &&
    input.marketHome + input.marketDraw + input.marketAway > 0;
  const market = hasMarket
    ? trio(input.marketHome!, input.marketDraw!, input.marketAway!)
    : null;
  const value = market ? model.x2 - market.x2 : null;

  const below = delta <= -CLEAR_GAP;
  const marketRicher = value != null && value <= -VALUE_GAP;
  const above = delta >= CLEAR_GAP;
  const hasValue = value != null && value > VALUE_GAP;

  let band: X2Band;
  let reason: X2Reason;
  if (below && marketRicher) {
    band = "red";
    reason = "below_and_market_richer";
  } else if (marketRicher) {
    band = "red";
    reason = "market_richer";
  } else if (below) {
    band = "red";
    reason = "below_baseline";
  } else if (above && hasValue) {
    band = "green";
    reason = "above_and_value";
  } else if (above && market == null) {
    band = "yellow";
    reason = "above_no_market";
  } else if (above) {
    band = "yellow";
    reason = "above_no_edge";
  } else {
    band = "yellow";
    reason = "near_baseline";
  }

  return {
    season: SEASON,
    leagueId,
    matches: counts.matches,
    source: input.source ?? "published",
    baseline,
    model,
    market,
    delta,
    value,
    band,
    reason,
  };
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function sides(raw: unknown): X2Sides | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const home = num(o.home);
  const draw = num(o.draw);
  const away = num(o.away);
  const x2 = num(o.x2);
  if (home == null || draw == null || away == null || x2 == null) return null;
  return { home, draw, away, x2 };
}

const REASONS: readonly X2Reason[] = [
  "above_and_value",
  "above_no_market",
  "above_no_edge",
  "near_baseline",
  "below_baseline",
  "market_richer",
  "below_and_market_richer",
];

function isReason(v: unknown): v is X2Reason {
  return typeof v === "string" && (REASONS as readonly string[]).includes(v);
}

function isBand(v: unknown): v is X2Band {
  return v === "green" || v === "yellow" || v === "red";
}

/** يقرأ كتلة x2_baseline كما حفظها المحرك. */
export function parseX2Baseline(raw: unknown): X2Assessment | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const baseline = sides(o.baseline);
  const model = sides(o.model);
  const delta = num(o.delta);
  if (!baseline || !model || delta == null || !isBand(o.band) || !isReason(o.reason)) return null;
  const market = o.market == null ? null : sides(o.market);
  const matches = num(o.matches);
  return {
    season: typeof o.season === "string" ? o.season : SEASON,
    leagueId: typeof o.league_id === "string" ? o.league_id : "default",
    matches: matches ?? 0,
    source: o.source === "core" ? "core" : "published",
    baseline,
    model,
    market,
    delta,
    value: num(o.value),
    band: o.band,
    reason: o.reason,
  };
}

export function x2ChipLabel(reason: X2Reason): string {
  switch (reason) {
    case "above_and_value":
      return "أعلى من البيئة والسعر أضعف";
    case "above_no_market":
      return "أعلى من البيئة بلا سعر";
    case "above_no_edge":
      return "أعلى من البيئة بلا قيمة";
    case "near_baseline":
      return "قريب من البيئة";
    case "below_baseline":
      return "أدنى من البيئة";
    case "market_richer":
      return "السعر أغلى من النموذج";
    case "below_and_market_richer":
      return "أدنى من البيئة والسعر أغلى";
    default: {
      const exhaustive: never = reason;
      return exhaustive;
    }
  }
}

export function x2ReasonText(reason: X2Reason): string {
  switch (reason) {
    case "above_and_value":
      return "X2 النموذج أعلى بوضوح من بيئة الدوري، والسوق يسعّر هذا الاحتمال بأقل مما يقدّره النموذج.";
    case "above_no_market":
      return "X2 النموذج أعلى من بيئة الدوري، ولا يوجد سعر سوق للمقارنة. البيئة وحدها لا تكفي للاختيار.";
    case "above_no_edge":
      return "X2 النموذج أعلى من بيئة الدوري، لكن السعر قريب من تقدير النموذج فلا توجد قيمة موجبة واضحة.";
    case "near_baseline":
      return "X2 النموذج قريب من معدل الدوري. المعدل مرجع إحصائي، وليس سبباً لاختيار الرهان.";
    case "below_baseline":
      return "X2 النموذج أدنى بوضوح من بيئة الدوري: النموذج يرى فوز صاحب الأرض أقرب من المعتاد.";
    case "market_richer":
      return "السوق يعكس احتمالاً أعلى من النموذج، فلا توجد قيمة موجبة وفق تقدير النموذج.";
    case "below_and_market_richer":
      return "X2 النموذج أدنى من بيئة الدوري، والسوق أعلى من تقدير النموذج.";
    default: {
      const exhaustive: never = reason;
      return exhaustive;
    }
  }
}

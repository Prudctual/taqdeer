/**
 * احتمالات لحظية أثناء المباراة — شدة زمنية + حالة نتيجة + ρ خفيف + بدل ضائع.
 * قاعدة الطرد: الفريق المطرود يفقد ~35٪ من قوته الهجومية، والخصم يكتسب ~15٪.
 */

import { buildDoubleChance } from "./double-chance";

export type LiveEventLike = {
  time?: { elapsed?: number };
  team?: { name?: string };
  type?: string;
  detail?: string;
};

export function parseLiveEvents(raw: string | null | undefined): LiveEventLike[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    return Array.isArray(data) ? (data as LiveEventLike[]) : [];
  } catch {
    return [];
  }
}

function namesLoose(a: string, b: string): boolean {
  const na = a.toLowerCase();
  const nb = b.toLowerCase();
  if (!na || !nb) return false;
  return (
    na.includes(nb.slice(0, Math.min(4, nb.length))) ||
    nb.includes(na.slice(0, Math.min(4, na.length)))
  );
}

export function countRedCards(
  events: LiveEventLike[],
  homeName: string,
  awayName: string,
): { homeReds: number; awayReds: number; firstRedMinute: number | null } {
  let homeReds = 0;
  let awayReds = 0;
  let firstRedMinute: number | null = null;

  for (const e of events) {
    const type = `${e.type || ""} ${e.detail || ""}`.toLowerCase();
    const isRed =
      type.includes("red") ||
      (type.includes("card") && type.includes("أحمر")) ||
      type.includes("red card");
    if (!isRed) continue;

    const team = e.team?.name || "";
    const minute = e.time?.elapsed ?? null;
    if (firstRedMinute == null && minute != null) firstRedMinute = minute;

    if (namesLoose(team, homeName)) homeReds++;
    else if (namesLoose(team, awayName)) awayReds++;
  }

  return { homeReds, awayReds, firstRedMinute };
}

/** مضاعفات λ بعد الطرد (لكل بطاقة حمراء، سقف بطاقتين) */
export function redCardLambdaMult(
  homeReds: number,
  awayReds: number,
): {
  homeAtk: number;
  awayAtk: number;
} {
  const h = Math.min(2, Math.max(0, homeReds));
  const a = Math.min(2, Math.max(0, awayReds));
  const homeAtk = Math.pow(0.65, h) * Math.pow(1.15, a);
  const awayAtk = Math.pow(0.65, a) * Math.pow(1.15, h);
  return { homeAtk, awayAtk };
}

/** جزء الشدة المتبقية من الدقيقة الحالية حتى النهاية (مع بدل ضائع تقريبي). */
export function remainingIntensityFraction(minute: number): number {
  const m = Math.max(0, minute);
  // شوط أول أهدأ قليلاً؛ الشوط الثاني + بدل ضائع بعد 90
  const injuryPad = m >= 90 ? Math.min(8, 3 + (m - 90) * 0.35) : m >= 45 ? 2 : 0;
  const total = 90 + injuryPad;
  const elapsedEff =
    m <= 45
      ? m * 0.92 // الشوط الأول أبطأ نسبياً
      : 45 * 0.92 + (Math.min(m, 90) - 45) * 1.08 + Math.max(0, m - 90) * 0.7;
  const rem = Math.max(0, total - elapsedEff);
  return rem / total;
}

/** مضاعف حالة النتيجة على هجوم/دفاع المتبقي. */
export function scoreStateMult(
  homeScore: number,
  awayScore: number,
): { homeAtk: number; awayAtk: number } {
  const gd = homeScore - awayScore;
  if (gd === 0) return { homeAtk: 1.0, awayAtk: 1.0 };
  // المتأخر يضغط أكثر؛ المتقدم يحافظ قليلاً
  if (gd > 0) {
    return {
      homeAtk: Math.max(0.88, 1.0 - 0.04 * Math.min(gd, 3)),
      awayAtk: Math.min(1.18, 1.0 + 0.06 * Math.min(gd, 3)),
    };
  }
  return {
    homeAtk: Math.min(1.18, 1.0 + 0.06 * Math.min(-gd, 3)),
    awayAtk: Math.max(0.88, 1.0 - 0.04 * Math.min(-gd, 3)),
  };
}

/** تصحيح Dixon–Coles الخفيف للنتائج المنخفضة 0-0 / 1-0 / 0-1 / 1-1 */
export function dixonColesTau(
  i: number,
  j: number,
  lam: number,
  mu: number,
  rho = -0.08,
): number {
  if (i === 0 && j === 0) return Math.max(1e-9, 1 - lam * mu * rho);
  if (i === 0 && j === 1) return Math.max(1e-9, 1 + lam * rho);
  if (i === 1 && j === 0) return Math.max(1e-9, 1 + mu * rho);
  if (i === 1 && j === 1) return Math.max(1e-9, 1 - rho);
  return 1;
}

function poisson(k: number, lam: number): number {
  let fact = 1;
  for (let i = 1; i <= k; i++) fact *= i;
  return (Math.pow(lam, k) * Math.exp(-lam)) / fact;
}

export function calculateInPlayProbs(
  lambdaHome: number,
  lambdaAway: number,
  minute: number,
  homeScore: number,
  awayScore: number,
  opts?: { homeReds?: number; awayReds?: number; rho?: number },
) {
  const r = remainingIntensityFraction(minute);
  const { homeAtk: redH, awayAtk: redA } = redCardLambdaMult(
    opts?.homeReds ?? 0,
    opts?.awayReds ?? 0,
  );
  const { homeAtk: stH, awayAtk: stA } = scoreStateMult(homeScore, awayScore);
  const remLamHome = Math.max(0.01, lambdaHome * r * redH * stH);
  const remLamAway = Math.max(0.01, lambdaAway * r * redA * stA);
  const rho = opts?.rho ?? -0.08;

  const MAX_GOALS = 6;
  let pHomeWin = 0;
  let pDraw = 0;
  let pAwayWin = 0;
  let pBtts = 0;
  let pOver25 = 0;
  let mass = 0;

  for (let i = 0; i <= MAX_GOALS; i++) {
    for (let j = 0; j <= MAX_GOALS; j++) {
      const tau = dixonColesTau(i, j, remLamHome, remLamAway, rho);
      const pCell = tau * poisson(i, remLamHome) * poisson(j, remLamAway);
      mass += pCell;
      const finalHome = homeScore + i;
      const finalAway = awayScore + j;
      if (finalHome > finalAway) pHomeWin += pCell;
      else if (finalHome === finalAway) pDraw += pCell;
      else pAwayWin += pCell;
      if (finalHome >= 1 && finalAway >= 1) pBtts += pCell;
      if (finalHome + finalAway >= 3) pOver25 += pCell;
    }
  }

  const total = mass || pHomeWin + pDraw + pAwayWin || 1;
  return {
    pHome: parseFloat((pHomeWin / total).toFixed(4)),
    pDraw: parseFloat((pDraw / total).toFixed(4)),
    pAway: parseFloat((pAwayWin / total).toFixed(4)),
    pBttsYes: parseFloat((pBtts / total).toFixed(4)),
    pOver25: parseFloat((pOver25 / total).toFixed(4)),
  };
}

/** توصية فرصة مزدوجة من نسب 1X2 */
export function bestDoubleChance(
  pHome: number,
  pDraw: number,
  pAway: number,
  homeName = "المضيف",
  awayName = "الضيف",
): { code: "1X" | "X2" | "12"; p: number; label: string } {
  const best = buildDoubleChance(pHome, pDraw, pAway, homeName, awayName).best;
  return {
    code: best.code,
    p: best.p,
    label: `${best.title} (${best.code})`,
  };
}

import type { SieveTier } from "@/lib/queries";

/** أسماء قواعد غربال «المحسوم» (python/engine/sieve.py) بصياغة عربية للعرض */
export const SIEVE_RULE_LABELS: Record<string, string> = {
  league_active: "الدوري مُفعَّل بدليل الحزام التاريخي",
  same_side: "النموذج والسوق متفقان على الجهة (لا تعادل)",
  p_final_ge_theta: "الاحتمال النهائي ≥ العتبة θ",
  gap_bounded: "فجوة النموذج عن السوق ≤ 8 نقاط",
  market_favourite: "السوق الحاد يرجّح بوضوح (≥ 55٪)",
  not_coin_flip: "فارق ≥ 20 نقطة عن ثاني نتيجة",
  draw_head_low: "رأس التعادل المستقل < 30٪",
  not_derby: "ليست ديربي",
  pillars_available: "ركائز المرشح متاحة (لا غياب مؤثر)",
  not_promoted_early: "المرشح ليس صاعداً في أول 8 جولات",
  season_sample_ok: "عينة الموسم ≥ 6 مباريات للطرفين",
};

export const SIEVE_TIER_LABELS: Record<SieveTier, string> = {
  banker: "محسوم",
  "alt-market": "سوق بديل",
  weak: "إشارة ضعيفة",
  excluded: "مستبعد",
};

export const SIEVE_TIER_HINTS: Record<SieveTier, string> = {
  banker: "اجتاز كل القواعد: يُنشر بوصفه «محسوماً» ويُقاس على شريحة المحسوم.",
  "alt-market": "الجهة متفق عليها لكن الفوز غير حاسم — الأنسب فرصة مزدوجة أو آسيوي أو أهداف.",
  weak: "إشارة موجودة لكنها لا تكفي للحسم — أرشيف بلا ادعاء.",
  excluded: "الدوري غير مُفعَّل أو النموذج والسوق مختلفان — لا يُنشر.",
};

export function sieveRuleLabel(name: string): string {
  return SIEVE_RULE_LABELS[name] ?? name;
}

export function sieveTierLabel(tier: SieveTier): string {
  switch (tier) {
    case "banker":
      return SIEVE_TIER_LABELS.banker;
    case "alt-market":
      return SIEVE_TIER_LABELS["alt-market"];
    case "weak":
      return SIEVE_TIER_LABELS.weak;
    case "excluded":
      return SIEVE_TIER_LABELS.excluded;
    default: {
      const exhaustive: never = tier;
      return exhaustive;
    }
  }
}

export const LEAGUE_STATUS_LABELS: Record<string, string> = {
  active: "مُفعَّل",
  watch: "مراقبة",
  off: "متوقف",
};

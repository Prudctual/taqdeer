import type { SieveRule, SieveTier } from "@/lib/queries";
import { sieveRuleLabel, sieveTierLabel } from "@/lib/sieve-labels";

export function SieveTierBadge({ tier, className = "" }: { tier: SieveTier | null | undefined; className?: string }) {
  if (!tier) return null;
  const tone =
    tier === "banker"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
      : tier === "alt-market"
        ? "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30"
        : tier === "weak"
          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
          : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30";
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${tone} ${className}`}>
      {sieveTierLabel(tier)}
    </span>
  );
}

/** قواعد الغربال كرقائق نجاح/إخفاق — القواعد المُخفِقة أولاً كي يظهر سبب عدم الحسم فوراً */
export function SieveRulesChips({
  rules,
  compact = false,
  className = "",
}: {
  rules: SieveRule[];
  compact?: boolean;
  className?: string;
}) {
  if (rules.length === 0) return null;
  const ordered = [...rules].sort((a, b) => Number(a.ok) - Number(b.ok));
  return (
    <ul className={`flex flex-wrap gap-1 ${className}`} aria-label="قواعد غربال المحسوم">
      {ordered.map((r) => (
        <li
          key={r.name}
          title={sieveRuleLabel(r.name)}
          className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-semibold ${
            compact ? "text-[9px]" : "text-[10px]"
          } ${
            r.ok
              ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
          }`}
        >
          <span aria-hidden="true">{r.ok ? "✓" : "✕"}</span>
          <span className="sr-only">{r.ok ? "اجتاز:" : "أخفق:"}</span>
          <span>{compact ? shortLabel(r.name) : sieveRuleLabel(r.name)}</span>
        </li>
      ))}
    </ul>
  );
}

const SHORT: Record<string, string> = {
  league_active: "دوري مُفعَّل",
  same_side: "اتفاق الجهة",
  p_final_ge_theta: "≥ θ",
  gap_bounded: "فجوة ≤ 8",
  market_favourite: "سوق ≥ 55٪",
  not_coin_flip: "ليست 50–50",
  draw_head_low: "تعادل منخفض",
  not_derby: "ليست ديربي",
  pillars_available: "الركائز متاحة",
  not_promoted_early: "ليس صاعداً مبكراً",
  season_sample_ok: "عينة ≥ 6",
};

function shortLabel(name: string): string {
  return SHORT[name] ?? name;
}

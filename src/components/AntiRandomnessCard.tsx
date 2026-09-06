"use client";

import { useId } from "react";
import { pct } from "@/lib/format";

export interface RandomnessReport {
  match_randomness_index: number;
  stability_score: number;
  verdict: "SAFE_STABLE" | "MODERATE_UNCERTAINTY" | "RANDOMNESS_CAUTION" | "STRICT_EXCLUDE";
  verdict_ar: string;
  is_strictly_excluded: boolean;
  recommended_action_ar: string;
  goal_recommendation_ar?: string;
  multipliers: {
    temperature_mult: number;
    confidence_mult: number;
    draw_boost: number;
  };
  pillars: {
    draw_trap: {
      active: boolean;
      severity: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | string;
      score: number;
      home_draw_rate: number;
      away_draw_rate: number;
      avg_draw_rate: number;
      is_chronic_drawer_home: boolean;
      is_chronic_drawer_away: boolean;
      reason_ar: string;
    };
    second_half_fragility: {
      active: boolean;
      severity: "LOW" | "MODERATE" | "HIGH" | string;
      score: number;
      home_fragile: boolean;
      away_fragile: boolean;
      home_sh_ga_avg: number;
      away_sh_ga_avg: number;
      home_sh_ratio: number;
      away_sh_ratio: number;
      asymmetry_warning: boolean;
      reason_ar: string;
    };
    disciplinary_risk: {
      active: boolean;
      severity: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | string;
      score: number;
      combined_dri: number;
      referee_strictness: number;
      home_red_rate: number;
      away_red_rate: number;
      home_card_prone: boolean;
      away_card_prone: boolean;
      reason_ar: string;
    };
    volatility_risk: {
      score: number;
      home_variance: number;
      away_variance: number;
      reason_ar: string;
    };
    low_goal_entropy?: {
      score: number;
      total_expected_goals: number;
      is_tight_match: boolean;
    };
  };
}

interface AntiRandomnessCardProps {
  homeName: string;
  awayName: string;
  report?: RandomnessReport | null;
}

export function AntiRandomnessCard({
  homeName,
  awayName,
  report,
}: AntiRandomnessCardProps) {
  const meterId = useId();

  if (!report) return null;

  const mri = report.match_randomness_index;
  const stability = report.stability_score;
  const { draw_trap, second_half_fragility, disciplinary_risk, volatility_risk } =
    report.pillars;

  // Visual status configuration
  const statusConfig = {
    SAFE_STABLE: {
      badgeBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      meterColor: "bg-emerald-500",
      icon: "🛡️",
      title: "مستقرة إحصائياً (أمان مرتفع)",
    },
    MODERATE_UNCERTAINTY: {
      badgeBg: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
      meterColor: "bg-sky-500",
      icon: "⚖️",
      title: "توازن معتدل",
    },
    RANDOMNESS_CAUTION: {
      badgeBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
      meterColor: "bg-amber-500",
      icon: "⚠️",
      title: "تنبيه عشوائية (احذر فخ التعادل أو تقلب الشوط 2)",
    },
    STRICT_EXCLUDE: {
      badgeBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
      meterColor: "bg-rose-500",
      icon: "🚫",
      title: "استبعاد صارم (عالية العشوائية)",
    },
  }[report.verdict] || {
    badgeBg: "bg-panel text-muted border-line",
    meterColor: "bg-accent",
    icon: "📊",
    title: report.verdict_ar,
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 sm:p-7 space-y-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden>{statusConfig.icon}</span>
            <h3 className="text-base font-bold text-ink">
              مؤشر استبعاد العشوائية والاستقرار
            </h3>
          </div>
          <p className="text-xs text-muted font-medium">
            تفكيك شامل لفخاخ التعادل، انهيار الشوط الثاني، مخاطر الطرد، وتذبذب الأداء
          </p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-bold border ${statusConfig.badgeBg}`}
        >
          {statusConfig.title}
        </div>
      </div>

      {/* Main Score & Stability Meter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-panel/60 border border-line/60">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-muted">
              مؤشر العشوائية الكلي (MRI)
            </span>
            <span className="text-2xl font-black tabular text-ink">
              {mri}
              <span className="text-xs font-normal text-muted"> / 100</span>
            </span>
          </div>
          <div className="h-2.5 w-full bg-surface rounded-full overflow-hidden border border-line/80">
            <div
              className={`h-full transition-all duration-500 ${statusConfig.meterColor}`}
              style={{ width: `${mri}%` }}
              aria-labelledby={meterId}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted font-semibold tabular pt-0.5">
            <span>0 (أمان مطلق)</span>
            <span>40 (مقبول)</span>
            <span>60 (حذر)</span>
            <span>75 (استبعاد)</span>
          </div>
        </div>

        <div className="flex flex-col justify-center space-y-1 border-t md:border-t-0 md:border-r border-line/60 pt-3 md:pt-0 md:pe-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-muted">
              درجة الأمان الإحصائي للمباراة
            </span>
            <span className="text-xl font-bold tabular text-ink">
              {stability}%
            </span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed font-medium">
            {stability >= 60
              ? "مباراة ذات قابلية تنبؤ جيدة ومحمية من تقلبات الصدمات المفاجئة."
              : "مباراة محاطة بنسبة ضجيج إحصائي عالية تتطلب حيطة في الترجيح."}
          </p>
        </div>
      </div>

      {/* The 4 Analytical Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* 1. Chronic Draw & Draw Trap */}
        <div
          className={`rounded-xl p-4 border space-y-2.5 transition-colors ${
            draw_trap.active
              ? "bg-amber-500/5 border-amber-500/30"
              : "bg-panel/40 border-line"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink flex items-center gap-1.5">
              <span>🤝</span> فخ التعادل وتكرار النتيجة (X)
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                draw_trap.active
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                  : "bg-surface text-muted"
              }`}
            >
              {draw_trap.active ? `خطر ${draw_trap.severity}` : "طبيعي"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold tabular text-muted">
            <span>{homeName}: <strong className="text-ink">{pct(draw_trap.home_draw_rate)}</strong></span>
            <span>{awayName}: <strong className="text-ink">{pct(draw_trap.away_draw_rate)}</strong></span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed font-medium">
            {draw_trap.reason_ar}
          </p>
        </div>

        {/* 2. Second-Half Fragility & Collapse */}
        <div
          className={`rounded-xl p-4 border space-y-2.5 transition-colors ${
            second_half_fragility.active
              ? "bg-rose-500/5 border-rose-500/30"
              : "bg-panel/40 border-line"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink flex items-center gap-1.5">
              <span>⏱️</span> هشاشة الشوط الثاني (الدقائق 46–90)
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                second_half_fragility.active
                  ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                  : "bg-surface text-muted"
              }`}
            >
              {second_half_fragility.active ? "هشاشة متأخرة" : "متماسك"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold tabular text-muted">
            <span>{homeName} ش2: <strong className="text-ink">{second_half_fragility.home_sh_ga_avg.toFixed(1)} ({pct(second_half_fragility.home_sh_ratio)})</strong></span>
            <span>{awayName} ش2: <strong className="text-ink">{second_half_fragility.away_sh_ga_avg.toFixed(1)} ({pct(second_half_fragility.away_sh_ratio)})</strong></span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed font-medium">
            {second_half_fragility.reason_ar}
          </p>
        </div>

        {/* 3. Disciplinary & Red Card Volatility */}
        <div
          className={`rounded-xl p-4 border space-y-2.5 transition-colors ${
            disciplinary_risk.active
              ? "bg-rose-500/5 border-rose-500/30"
              : "bg-panel/40 border-line"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink flex items-center gap-1.5">
              <span>🟥</span> مخاطر الطرد والانضباط
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                disciplinary_risk.active
                  ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                  : "bg-surface text-muted"
              }`}
            >
              {disciplinary_risk.active ? `صدمة ${disciplinary_risk.severity}` : "انضباط جيد"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold tabular text-muted">
            <span>{homeName}: <strong className="text-ink">{disciplinary_risk.home_red_rate.toFixed(2)} طرد/م</strong></span>
            <span>{awayName}: <strong className="text-ink">{disciplinary_risk.away_red_rate.toFixed(2)} طرد/م</strong></span>
            <span>الحكم: <strong className="text-ink">×{disciplinary_risk.referee_strictness.toFixed(2)}</strong></span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed font-medium">
            {disciplinary_risk.reason_ar}
          </p>
        </div>

        {/* 4. Form Inconsistency & Goal Variance */}
        <div className="rounded-xl p-4 border border-line bg-panel/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink flex items-center gap-1.5">
              <span>📈</span> تذبذب الأداء وثبات الهوامش
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface text-muted">
              تباين {volatility_risk.score > 0.6 ? "مرتفع" : "معتدل"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold tabular text-muted">
            <span>{homeName}: <strong className="text-ink">{volatility_risk.home_variance.toFixed(1)}</strong></span>
            <span>{awayName}: <strong className="text-ink">{volatility_risk.away_variance.toFixed(1)}</strong></span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed font-medium">
            {volatility_risk.reason_ar}
          </p>
        </div>
      </div>

      {/* Actionable Anti-Randomness Decision Advice */}
      <div className="rounded-xl p-4 bg-panel/80 border border-line space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ink flex items-center gap-2">
            <span>💡</span>
            توصية الحماية والتعامل مع عشوائية المباراة
          </span>
          {report.is_strictly_excluded ? (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500 text-white">
              مستبعدة من البارلي الآمن
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-panel border border-line text-muted">
              حماية النموذج
            </span>
          )}
        </div>
        <p className="text-xs text-ink/90 font-semibold leading-relaxed">
          {report.recommended_action_ar}
        </p>
        {report.goal_recommendation_ar && (
          <div className="pt-2 border-t border-line/60 flex flex-wrap items-center justify-between gap-1 text-xs">
            <span className="text-muted font-medium flex items-center gap-1.5">
              <span>⚽</span> قراءة سوق الأهداف (/goal):
            </span>
            <span className="font-semibold text-ink">
              {report.goal_recommendation_ar}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

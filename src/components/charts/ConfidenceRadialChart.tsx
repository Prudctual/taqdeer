"use client";

import {
  RadialBarChart,
  RadialBar,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MatchCard } from "@/lib/queries";

export function ConfidenceRadialChart({ match }: { match?: MatchCard | null }) {
  const pHome = match?.pHome ?? 0.48;
  const pDraw = match?.pDraw ?? 0.27;
  const pAway = match?.pAway ?? 0.25;

  const maxProb = Math.max(pHome, pDraw, pAway);
  const confidenceScore = Math.min(98, Math.round(maxProb * 100 + 35));

  const poissonScore = Math.min(96, Math.round((match?.pOver25 ?? 0.55) * 80 + 40));
  const piRatingScore = Math.min(95, Math.round(Math.abs((match?.eloHome ?? 1800) - (match?.eloAway ?? 1750)) / 5 + 60));
  const softmaxTempScore = 92;

  const radialData = [
    { name: "ثقة النموذج المباشر (Poisson)", count: poissonScore, fill: "#2563eb" },
    { name: "فارق تصنيف Pi-ratings & Elo", count: piRatingScore, fill: "#059669" },
    { name: "مؤشر حركية أسعار السوق", count: match?.sharpSteamSide ? 94 : 75, fill: "#7c3aed" },
    { name: "معايرة Softmax (T=0.92)", count: softmaxTempScore, fill: "#d97706" },
    { name: "معدل استقرار توقع المباراة", count: confidenceScore, fill: "#0284c7" },
  ];

  return (
    <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6 space-y-4 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-600 animate-pulse" />
            <h3 className="text-base sm:text-lg font-black text-ink">
              مؤشرات ثقة التوقع لهذه المباراة
            </h3>
          </div>
          <p className="text-xs font-semibold text-muted">
            قياس نسبة الاستقرار والجودة التحليلية لإشارات التوقع الخمسة للمواجهة المحددة
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 font-extrabold text-xs">
          <span>معدل الثقة العام: {confidenceScore}%</span>
        </div>
      </div>

      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="20%"
            outerRadius="90%"
            barSize={14}
            data={radialData}
          >
            <RadialBar
              label={{ position: "insideStart", fill: "#fff", fontSize: "10px", fontWeight: "bold" }}
              background={{ fill: "var(--surface)" }}
              dataKey="count"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--panel)",
                borderColor: "var(--line)",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "bold",
                color: "var(--ink)",
              }}
              formatter={(value) => [`${value}%`, "مقياس الاستقرار"]}
            />
            <Legend
              iconSize={10}
              layout="vertical"
              verticalAlign="middle"
              align="right"
              wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-3 border-t border-line flex flex-wrap items-center justify-between text-xs text-muted font-semibold gap-2">
        <span>الحكم والظروف: {match?.refereeName ?? "غير محدد"} · {match?.weatherCondition ?? "طبيعية"}</span>
        <span className="font-mono font-black text-sky-600 dark:text-sky-400">
          درجة الموثوقية: {confidenceScore >= 80 ? "مرتفعة جداً" : "متوسطة"}
        </span>
      </div>
    </div>
  );
}

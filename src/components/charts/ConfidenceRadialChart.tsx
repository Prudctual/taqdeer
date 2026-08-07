"use client";

import {
  RadialBarChart,
  RadialBar,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MatchCard } from "@/lib/queries";

/**
 * مؤشرات حقيقية فقط من مخرجات النموذج المخزنة — لا درجات مُختلقة.
 * إذا لم يتوفر توقع للمباراة تُعرض حالة فارغة صادقة.
 */
export function ConfidenceRadialChart({ match }: { match?: MatchCard | null }) {
  const hasPred =
    match?.pHome != null && match?.pDraw != null && match?.pAway != null;

  if (!hasPred) {
    return (
      <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6 shadow-2xs">
        <h3 className="text-base sm:text-lg font-black text-ink">
          مؤشرات ثقة التوقع لهذه المباراة
        </h3>
        <p className="mt-2 text-xs font-semibold text-muted">
          لا يتوفر توقع من النموذج لهذه المباراة بعد — تُعرض المؤشرات فور صدوره.
        </p>
      </div>
    );
  }

  const pHome = match!.pHome!;
  const pDraw = match!.pDraw!;
  const pAway = match!.pAway!;
  const maxProb = Math.max(pHome, pDraw, pAway);

  const radialData = [
    { name: "أعلى احتمال معاير (1X2)", count: Math.round(maxProb * 100), fill: "var(--home)" },
    ...(match?.confidence != null
      ? [{ name: "ثقة النموذج (اتفاق الإشارات)", count: Math.round(match.confidence * 100), fill: "var(--success)" }]
      : []),
    ...(match?.pOver25 != null
      ? [{ name: "احتمال +2.5 هدف", count: Math.round(match.pOver25 * 100), fill: "var(--accent)" }]
      : []),
    ...(match?.pBttsYes != null
      ? [{ name: "احتمال تسجيل الطرفين", count: Math.round(match.pBttsYes * 100), fill: "var(--warn)" }]
      : []),
  ];

  const confidencePct = match?.confidence != null ? Math.round(match.confidence * 100) : Math.round(maxProb * 100);

  return (
    <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6 space-y-4 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-black text-ink">
              مؤشرات ثقة التوقع لهذه المباراة
            </h3>
          </div>
          <p className="text-xs font-semibold text-muted">
            احتمالات النموذج المعايرة كما خرجت من التدريب — بلا أي تجميل
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-dim border border-accent/25 text-sky-600 dark:text-sky-400 font-extrabold text-xs">
          <span>ثقة النموذج: {confidencePct}%</span>
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
              formatter={(value) => [`${value}%`, "احتمال معاير"]}
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
        <span>الحكم: {match?.refereeName ?? "لم يُعلن بعد"}</span>
        <span className="font-mono font-black text-sky-600 dark:text-sky-400">
          درجة الموثوقية: {confidencePct >= 70 ? "مرتفعة" : confidencePct >= 50 ? "متوسطة" : "منخفضة"}
        </span>
      </div>
    </div>
  );
}

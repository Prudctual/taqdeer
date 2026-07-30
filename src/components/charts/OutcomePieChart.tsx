"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { MatchCard } from "@/lib/queries";
import { pct } from "@/lib/format";

export function OutcomePieChart({ match }: { match?: MatchCard | null }) {
  const pHome = match?.pHome ?? 0.48;
  const pDraw = match?.pDraw ?? 0.27;
  const pAway = match?.pAway ?? 0.25;

  const homeName = match?.homeNameAr ?? "ريال مدريد (المضيف)";
  const awayName = match?.awayNameAr ?? "برشلونة (الضيف)";

  const outcomeData = [
    { name: `فوز ${homeName}`, value: Number((pHome * 100).toFixed(1)), color: "#2563eb" },
    { name: "التعادل (X)", value: Number((pDraw * 100).toFixed(1)), color: "#64748b" },
    { name: `فوز ${awayName}`, value: Number((pAway * 100).toFixed(1)), color: "#e11d48" },
  ];

  const pOver25 = match?.pOver25 ?? 0.58;
  const pUnder25 = 1 - pOver25;

  const goalMarketsData = [
    { name: "أكثر من 2.5 هدف (Over)", value: Number((pOver25 * 100).toFixed(1)), color: "#059669" },
    { name: "أقل من 2.5 هدف (Under)", value: Number((pUnder25 * 100).toFixed(1)), color: "#d97706" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* 1. 1X2 Outcome Distribution */}
      <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6 space-y-4 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
            <h3 className="text-base sm:text-lg font-black text-ink">
              توزيع احتمالات النتيجة (1X2) لهذه المباراة
            </h3>
          </div>
          <p className="text-xs font-semibold text-muted">
            نسبة توزيع الاحتمالات المحسوبة بنموذج Poisson المزدوج للمواجهة المحددة
          </p>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={outcomeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {outcomeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--panel)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--panel)",
                  borderColor: "var(--line)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "var(--ink)",
                }}
                formatter={(value) => [`${value}%`, ""]}
              />
              <Legend wrapperStyle={{ fontSize: "12px", fontWeight: "bold" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="pt-2 border-t border-line flex items-center justify-between text-xs text-muted font-bold">
          <span>النتيجة الأرجح: <strong className="text-ink">{pHome >= pAway && pHome >= pDraw ? `فوز ${homeName}` : pAway >= pHome && pAway >= pDraw ? `فوز ${awayName}` : "التعادل"}</strong></span>
          <span className="font-mono font-black text-blue-600 dark:text-blue-400">{pct(Math.max(pHome, pDraw, pAway))}</span>
        </div>
      </div>

      {/* 2. Goal Markets Distribution */}
      <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6 space-y-4 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-pulse" />
            <h3 className="text-base sm:text-lg font-black text-ink">
              احتمالية أهداف المباراة (Over / Under 2.5)
            </h3>
          </div>
          <p className="text-xs font-semibold text-muted">
            توقع وتوزيع معدل الأهداف لهذه المباراة بناءً على القدرة الهجومية والدفاعية
          </p>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={goalMarketsData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {goalMarketsData.map((entry, index) => (
                  <Cell key={`cell-goal-${index}`} fill={entry.color} stroke="var(--panel)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--panel)",
                  borderColor: "var(--line)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "var(--ink)",
                }}
                formatter={(value) => [`${value}%`, ""]}
              />
              <Legend wrapperStyle={{ fontSize: "12px", fontWeight: "bold" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="pt-2 border-t border-line flex items-center justify-between text-xs text-muted font-bold">
          <span>سوق الأهداف: <strong className="text-ink">{pOver25 >= 0.5 ? "مباراة هجومية (Over 2.5)" : "مباراة متوازنة (Under 2.5)"}</strong></span>
          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">{pct(pOver25)} Over</span>
        </div>
      </div>
    </div>
  );
}

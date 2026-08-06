"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { MatchCard } from "@/lib/queries";

export function EvAreaChart({ match }: { match?: MatchCard | null }) {
  const homeName = match?.homeNameAr ?? "ريال مدريد";
  const awayName = match?.awayNameAr ?? "برشلونة";

  const pHome = match?.pHome ?? 0.48;
  const pDraw = match?.pDraw ?? 0.27;
  const pAway = match?.pAway ?? 0.25;

  const oddsHome = match?.oddsHome ?? (pHome > 0 ? Number((1 / pHome).toFixed(2)) : 2.1);
  const oddsDraw = match?.oddsDraw ?? (pDraw > 0 ? Number((1 / pDraw).toFixed(2)) : 3.5);
  const oddsAway = match?.oddsAway ?? (pAway > 0 ? Number((1 / pAway).toFixed(2)) : 4.0);

  const evHome = Number(((pHome * oddsHome - 1) * 100).toFixed(1));
  const evDraw = Number(((pDraw * oddsDraw - 1) * 100).toFixed(1));
  const evAway = Number(((pAway * oddsAway - 1) * 100).toFixed(1));

  const evData = [
    { name: `فوز ${homeName}`, ev: Math.max(-10, evHome), odds: oddsHome, color: "var(--home)" },
    { name: "التعادل (X)", ev: Math.max(-10, evDraw), odds: oddsDraw, color: "var(--muted)" },
    { name: `فوز ${awayName}`, ev: Math.max(-10, evAway), odds: oddsAway, color: "var(--away)" },
  ];

  const maxEv = Math.max(evHome, evDraw, evAway);

  return (
    <div className="rounded-2xl border border-success/30 bg-panel p-5 sm:p-6 space-y-4 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-black text-ink">
              مقارنة القيمة المتوقعة (+EV) لأسعار هذه المباراة
            </h3>
          </div>
          <p className="text-xs font-semibold text-muted">
            الانحراف النظري بين تقدير نموذج تقدير وأسعار إغلاق السوق للمواجهة المحددة
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono font-black text-xs">
          <span className="bg-success-dim border border-success/30 text-success px-3 py-1 rounded-full">
            أعلى فائدة: {maxEv >= 0 ? `+${maxEv}% EV` : "متوازنة مع السوق"}
          </span>
        </div>
      </div>

      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={evData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" opacity={0.5} />
            <XAxis dataKey="name" stroke="var(--ink)" fontSize={11} fontWeight="bold" tickLine={false} />
            <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} unit="%" />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--panel)",
                borderColor: "var(--line)",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "bold",
                color: "var(--ink)",
              }}
              formatter={(value, _name, item) => [
                `${value}% EV (السعر: ${(item as { payload?: { odds?: number } })?.payload?.odds ?? 0})`,
                "الفائدة المتوقعة",
              ]}
            />
            <Bar dataKey="ev" radius={[8, 8, 0, 0]}>
              {evData.map((entry, index) => (
                <Cell key={`ev-cell-${index}`} fill={entry.ev >= 3 ? "var(--success)" : entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-3 border-t border-line flex flex-wrap items-center justify-between text-xs text-muted font-semibold gap-2">
        <span>الأسعار المعروضة: {oddsHome} (مضيف) | {oddsDraw} (تعادل) | {oddsAway} (ضيف)</span>
        <span className="font-mono font-black text-success">
          توصية كيلي: {maxEv >= 3 ? "رهان جزئي 2.5%" : "لا توجد مخاطرة"}
        </span>
      </div>
    </div>
  );
}

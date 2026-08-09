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
  const hasOdds =
    match != null &&
    match.oddsHome != null &&
    match.oddsDraw != null &&
    match.oddsAway != null &&
    match.pHome != null &&
    match.pDraw != null &&
    match.pAway != null;

  if (!hasOdds) {
    return (
      <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6 space-y-3 shadow-2xs">
        <h3 className="text-base sm:text-lg font-semibold text-ink">
          مقارنة القيمة المتوقعة (+EV)
        </h3>
        <p className="text-xs font-semibold text-muted leading-relaxed">
          لا تتوفر أسعار سوق حقيقية لهذه المباراة — لا يمكن حساب +EV بدون أودز مسجّلة.
        </p>
      </div>
    );
  }

  const homeName = match.homeNameAr;
  const awayName = match.awayNameAr;
  const pHome = match.pHome!;
  const pDraw = match.pDraw!;
  const pAway = match.pAway!;
  const oddsHome = match.oddsHome!;
  const oddsDraw = match.oddsDraw!;
  const oddsAway = match.oddsAway!;

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
            <h3 className="text-base sm:text-lg font-semibold text-ink">
              مقارنة القيمة المتوقعة (+EV) لأسعار هذه المباراة
            </h3>
          </div>
          <p className="text-xs font-semibold text-muted">
            الانحراف النظري بين تقدير نموذج تقدير وأسعار إغلاق السوق للمواجهة المحددة
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono font-semibold text-xs">
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
        <span className="font-mono font-semibold text-success">
          توصية كيلي: {maxEv >= 3 ? "رهان جزئي 2.5%" : "لا توجد مخاطرة"}
        </span>
      </div>
    </div>
  );
}

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
  const hasPred =
    match?.pHome != null && match?.pDraw != null && match?.pAway != null;

  if (!hasPred) {
    return (
      <div className="rounded-2xl border border-line bg-panel p-8 text-center space-y-2">
        <h3 className="text-sm font-semibold text-ink">لا تتوفر نسب نموذج لهذه المباراة</h3>
        <p className="text-xs text-muted leading-relaxed max-w-md mx-auto">
          تُعرض الرسوم فقط بعد كتابة توقعات ensemble الحالية في قاعدة البيانات.
        </p>
      </div>
    );
  }

  const pHome = match!.pHome!;
  const pDraw = match!.pDraw!;
  const pAway = match!.pAway!;
  const homeName = match!.homeNameAr;
  const awayName = match!.awayNameAr;
  const pOver25 = match!.pOver25;

  const outcomeData = [
    { name: `فوز ${homeName}`, value: Number((pHome * 100).toFixed(1)), color: "var(--home)" },
    { name: "التعادل (X)", value: Number((pDraw * 100).toFixed(1)), color: "var(--muted)" },
    { name: `فوز ${awayName}`, value: Number((pAway * 100).toFixed(1)), color: "var(--away)" },
  ];

  const goalMarketsData =
    pOver25 != null
      ? [
          { name: "أكثر من 2.5 هدف (Over)", value: Number((pOver25 * 100).toFixed(1)), color: "var(--success)" },
          { name: "أقل من 2.5 هدف (Under)", value: Number(((1 - pOver25) * 100).toFixed(1)), color: "var(--warn)" },
        ]
      : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6 space-y-4 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-ink">
              توزيع احتمالات النتيجة (1X2) لهذه المباراة
            </h3>
          </div>
          <p className="text-xs font-semibold text-muted">
            نسب النموذج الحالية (ensemble) لهذه المواجهة — بلا قيم افتراضية
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
          <span>
            النتيجة الأرجح:{" "}
            <strong className="text-ink">
              {pHome >= pAway && pHome >= pDraw
                ? `فوز ${homeName}`
                : pAway >= pHome && pAway >= pDraw
                  ? `فوز ${awayName}`
                  : "التعادل"}
            </strong>
          </span>
          <span className="font-mono font-semibold text-home">
            {pct(Math.max(pHome, pDraw, pAway))}
          </span>
        </div>
      </div>

      {goalMarketsData ? (
        <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-ink">
                احتمالية أهداف المباراة (Over / Under 2.5)
              </h3>
            </div>
            <p className="text-xs font-semibold text-muted">
              من ناتج النموذج الحالي لنفس المباراة
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
            <span>
              سوق الأهداف:{" "}
              <strong className="text-ink">
                {pOver25! >= 0.5 ? "مباراة هجومية (Over 2.5)" : "مباراة متوازنة (Under 2.5)"}
              </strong>
            </span>
            <span className="font-mono font-semibold text-success">{pct(pOver25!)} Over</span>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-panel p-8 text-center space-y-2">
          <h3 className="text-sm font-semibold text-ink">لا يتوفر Over/Under لهذه المباراة</h3>
        </div>
      )}
    </div>
  );
}

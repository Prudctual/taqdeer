"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const data = [
  { round: "جولة 1", accuracy: 41.2, brier: 65, pl: 44.0, pd: 42.0 },
  { round: "جولة 2", accuracy: 43.5, brier: 63, pl: 46.2, pd: 45.1 },
  { round: "جولة 3", accuracy: 42.8, brier: 64, pl: 45.8, pd: 43.9 },
  { round: "جولة 4", accuracy: 46.1, brier: 60, pl: 49.1, pd: 47.2 },
  { round: "جولة 5", accuracy: 45.4, brier: 61, pl: 48.3, pd: 46.5 },
  { round: "جولة 6", accuracy: 48.2, brier: 58, pl: 51.5, pd: 49.0 },
  { round: "جولة 7", accuracy: 47.8, brier: 59, pl: 50.8, pd: 48.4 },
  { round: "جولة 8", accuracy: 49.6, brier: 57, pl: 52.4, pd: 50.1 },
  { round: "جولة 9", accuracy: 51.2, brier: 55, pl: 54.0, pd: 51.8 },
];

export function AccuracyLineChart() {
  return (
    <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6 space-y-4 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-black text-ink">
              مسار تطور دقة التوقعات عبر الجولات
            </h3>
          </div>
          <p className="text-xs font-semibold text-muted">
            مقارنة نسبة نجاح التوقع (1X2) لكل دوري واستقرار النماذج في المباريات السابقة
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono font-bold">
          <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-home border border-blue-500/20">
            الدوري الإنجليزي: 54.0%
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-accent-dim text-accent border border-accent/25">
            الدوري الإسباني: 51.8%
          </span>
        </div>
      </div>

      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" opacity={0.5} />
            <XAxis
              dataKey="round"
              stroke="var(--muted)"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              stroke="var(--muted)"
              fontSize={11}
              tickLine={false}
              domain={[30, 60]}
              unit="%"
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
              formatter={(value) => [`${value}%`, ""]}
            />
            <Legend
              wrapperStyle={{ paddingTop: "10px", fontSize: "12px", fontWeight: "bold" }}
            />
            <Line
              name="الدوري الإنجليزي (Premier League)"
              type="monotone"
              dataKey="pl"
              stroke="var(--home)"
              strokeWidth={3}
              dot={{ r: 4, fill: "var(--home)" }}
              activeDot={{ r: 7 }}
            />
            <Line
              name="الدوري الإسباني (La Liga)"
              type="monotone"
              dataKey="pd"
              stroke="var(--accent)"
              strokeWidth={3}
              dot={{ r: 4, fill: "var(--accent)" }}
              activeDot={{ r: 7 }}
            />
            <Line
              name="متوسط النماذج العام"
              type="monotone"
              dataKey="accuracy"
              stroke="var(--success)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-3 border-t border-line flex items-center justify-between text-xs text-muted font-semibold">
        <span>تحسن مستمر بـ +10.0% منذ انطلاق الموسم</span>
        <span className="font-mono font-black text-success">
          استقرار المعايرة: 94.2%
        </span>
      </div>
    </div>
  );
}

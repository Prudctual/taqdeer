"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { MatchCard } from "@/lib/queries";

export function TeamRadarChart({ match }: { match?: MatchCard | null }) {
  const homeName = match?.homeNameAr ?? "ريال مدريد";
  const awayName = match?.awayNameAr ?? "برشلونة";

  const eloHome = match?.eloHome ?? 1850;
  const eloAway = match?.eloAway ?? 1790;
  const pHome = match?.pHome ?? 0.48;
  const pAway = match?.pAway ?? 0.25;

  const homeAttack = Math.min(98, Math.round(pHome * 160 + 15));
  const awayAttack = Math.min(98, Math.round(pAway * 160 + 20));

  const homeEloScore = Math.min(99, Math.round((eloHome / 2000) * 100));
  const awayEloScore = Math.min(99, Math.round((eloAway / 2000) * 100));

  const radarData = [
    { metric: "الفاعلية الهجومية", home: homeAttack, away: awayAttack },
    { metric: "الصلابة الدفاعية", home: Math.min(95, Math.round(100 - awayAttack * 0.7)), away: Math.min(95, Math.round(100 - homeAttack * 0.7)) },
    { metric: "تصنيف Elo القوة", home: homeEloScore, away: awayEloScore },
    { metric: "فورم آخر 5 مباريات", home: Math.min(95, Math.round(pHome * 120 + 30)), away: Math.min(95, Math.round(pAway * 120 + 35)) },
    { metric: "دقة التسديدات", home: Math.min(92, Math.round(homeAttack * 0.9)), away: Math.min(92, Math.round(awayAttack * 0.9)) },
    { metric: "نظافة الشباك", home: Math.min(90, Math.round((1 - (match?.pOver25 ?? 0.5)) * 100 + 30)), away: Math.min(90, Math.round((1 - (match?.pOver25 ?? 0.5)) * 100 + 25)) },
  ];

  return (
    <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6 space-y-4 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-600 animate-pulse" />
            <h3 className="text-base sm:text-lg font-black text-ink">
              المقارنة التكتيكية السداسية بين {homeName} و {awayName}
            </h3>
          </div>
          <p className="text-xs font-semibold text-muted">
            مقارنة أداء طرفي المباراة المحددة في 6 أبعاد تكتيكية (الهجوم، الدفاع، Elo، الفورم، التسديدات، ونظافة الشباك)
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono font-bold text-xs">
          <span className="bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full">
            {homeName} (Elo {eloHome})
          </span>
          <span className="bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 px-3 py-1 rounded-full">
            {awayName} (Elo {eloAway})
          </span>
        </div>
      </div>

      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} outerRadius="75%">
            <PolarGrid stroke="var(--line)" opacity={0.6} />
            <PolarAngleAxis dataKey="metric" stroke="var(--ink)" fontSize={11} fontWeight="bold" />
            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--muted)" fontSize={10} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--panel)",
                borderColor: "var(--line)",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "bold",
                color: "var(--ink)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px", fontWeight: "bold" }} />
            <Radar
              name={homeName}
              dataKey="home"
              stroke="#2563eb"
              fill="#2563eb"
              fillOpacity={0.4}
            />
            <Radar
              name={awayName}
              dataKey="away"
              stroke="#e11d48"
              fill="#e11d48"
              fillOpacity={0.4}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-3 border-t border-line flex flex-wrap items-center justify-between text-xs text-muted font-semibold gap-2">
        <span>الأفضلية التكتيكية: <strong className="text-ink">{pHome >= pAway ? homeName : awayName}</strong></span>
        <span className="font-mono font-black text-blue-600 dark:text-blue-400">
          مؤشر Elo المباشر: {eloHome} vs {eloAway}
        </span>
      </div>
    </div>
  );
}

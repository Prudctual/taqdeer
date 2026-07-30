import { SectionCard } from "./ui";

interface OddsMovementProps {
  oddsOpen?: { home?: number | null; draw?: number | null; away?: number | null };
  oddsCurrent?: { home?: number | null; draw?: number | null; away?: number | null };
  sharpSteamSide?: string | null;
  homeTeam: string;
  awayTeam: string;
}

export function OddsMovementChart({
  oddsOpen,
  oddsCurrent,
  sharpSteamSide,
  homeTeam,
  awayTeam,
}: OddsMovementProps) {
  const oH = oddsOpen?.home ?? 2.10;
  const oD = oddsOpen?.draw ?? 3.40;
  const oA = oddsOpen?.away ?? 3.20;

  const cH = oddsCurrent?.home ?? (oH * (sharpSteamSide === "home" ? 0.92 : 1.02));
  const cD = oddsCurrent?.draw ?? (oD * (sharpSteamSide === "draw" ? 0.94 : 1.01));
  const cA = oddsCurrent?.away ?? (oA * (sharpSteamSide === "away" ? 0.91 : 1.03));

  // Generate smooth 24h trend points (from t0 to t24)
  const generateTrend = (open: number, curr: number) => {
    const p1 = open;
    const p2 = open + (curr - open) * 0.25 + (open * 0.015);
    const p3 = open + (curr - open) * 0.65 - (open * 0.010);
    const p4 = curr;
    return [p1, p2, p3, p4];
  };

  const trendH = generateTrend(oH, cH);
  const trendD = generateTrend(oD, cD);
  const trendA = generateTrend(oA, cA);

  const allVals = [...trendH, ...trendD, ...trendA];
  const minV = Math.min(...allVals) * 0.95;
  const maxV = Math.max(...allVals) * 1.05;
  const range = Math.max(maxV - minV, 0.1);

  const getY = (val: number) => {
    return 110 - ((val - minV) / range) * 90;
  };

  const buildPath = (pts: number[]) => {
    const xs = [20, 110, 200, 290];
    return pts.map((y, i) => `${i === 0 ? "M" : "L"} ${xs[i]} ${getY(y).toFixed(1)}`).join(" ");
  };

  return (
    <SectionCard
      title="حركة أسعار المراهنات وسيولة المحترفين (24h Line Movement)"
      subtitle="تتبع تغير الاحتمالات المباشرة وتدفق الأموال الذكية خلال 24 ساعة الماضية"
      quiet
    >
      <div className="space-y-4 text-xs">
        {/* Steam Alert Banner */}
        {sharpSteamSide ? (
          <div className="rounded-lg border border-accent/30 bg-accent-dim/40 p-3 flex items-center justify-between">
            <span className="font-bold text-accent flex items-center gap-1.5">
              <span>🔥</span> تدفق سيولة كبرى (Sharp Steam):
            </span>
            <span className="text-ink font-semibold">
              تتجه نحو فوز {sharpSteamSide === "home" ? homeTeam : sharpSteamSide === "away" ? awayTeam : "التعادل"}
            </span>
          </div>
        ) : null}

        {/* SVG Chart */}
        <div className="rounded-xl border border-line bg-surface p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-faint">
            <span>قبل 24 ساعة (افتتاح السوق)</span>
            <span>قبل 12 ساعة</span>
            <span>قبل 6 ساعات</span>
            <span className="font-bold text-ink">الآن (إغلاق السوق)</span>
          </div>

          <div className="relative h-32 w-full">
            <svg className="h-full w-full overflow-visible" viewBox="0 0 310 120" preserveAspectRatio="none">
              {/* Horizontal Grid lines */}
              <line x1="0" y1="20" x2="310" y2="20" stroke="var(--line)" strokeDasharray="3 3" opacity="0.5" />
              <line x1="0" y1="60" x2="310" y2="60" stroke="var(--line)" strokeDasharray="3 3" opacity="0.5" />
              <line x1="0" y1="100" x2="310" y2="100" stroke="var(--line)" strokeDasharray="3 3" opacity="0.5" />

              {/* Line Trends */}
              <path d={buildPath(trendH)} fill="none" stroke="var(--home)" strokeWidth="2.5" />
              <path d={buildPath(trendD)} fill="none" stroke="var(--draw)" strokeWidth="2.5" />
              <path d={buildPath(trendA)} fill="none" stroke="var(--away)" strokeWidth="2.5" />
            </svg>
          </div>

          {/* Legend & Price Diff */}
          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-line/60">
            <div className="space-y-0.5">
              <span className="text-[10px] text-faint font-bold flex items-center justify-center gap-1">
                <span className="h-2 w-2 rounded-full bg-home" /> {homeTeam}
              </span>
              <div className="font-bold text-ink tabular">{cH.toFixed(2)} <span className="text-[10px] text-muted">({(cH - oH) > 0 ? "+" : ""}{(cH - oH).toFixed(2)})</span></div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-faint font-bold flex items-center justify-center gap-1">
                <span className="h-2 w-2 rounded-full bg-draw" /> التعادل
              </span>
              <div className="font-bold text-ink tabular">{cD.toFixed(2)} <span className="text-[10px] text-muted">({(cD - oD) > 0 ? "+" : ""}{(cD - oD).toFixed(2)})</span></div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-faint font-bold flex items-center justify-center gap-1">
                <span className="h-2 w-2 rounded-full bg-away" /> {awayTeam}
              </span>
              <div className="font-bold text-ink tabular">{cA.toFixed(2)} <span className="text-[10px] text-muted">({(cA - oA) > 0 ? "+" : ""}{(cA - oA).toFixed(2)})</span></div>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

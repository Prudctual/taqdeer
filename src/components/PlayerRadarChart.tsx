import { SectionCard } from "./ui";
import { getTeamTactics } from "@/lib/team-tactics";

interface PlayerRadarProps {
  playerName?: string;
  playerPos?: string;
  teamName?: string;
  metrics?: {
    scoring: number;
    playmaking: number;
    pressing: number;
    control: number;
    fitness: number;
  };
  homeTeam?: string;
  awayTeam?: string;
  homeStarName?: string;
  awayStarName?: string;
}

export function PlayerRadarChart(props: PlayerRadarProps) {
  // الوضع الفردي للاعب واحد (صفحة الفريق)
  if (props.playerName) {
    const playerName = props.playerName;
    const playerPos = props.playerPos || "مهاجم";
    const teamName = props.teamName || "الفريق";
    const m = props.metrics || {
      scoring: 92,
      playmaking: 85,
      pressing: 78,
      control: 88,
      fitness: 94,
    };

    const labels = ["التهديف xG", "الصناعة xA", "الضغط", "السيطرة", "اللياقة"];
    const values = [m.scoring, m.playmaking, m.pressing, m.control, m.fitness];
    const center = 110;
    const radius = 72;
    const angleStep = (2 * Math.PI) / 5;

    const points = values
      .map((val, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const r = (val / 100) * radius;
        return `${(center + r * Math.cos(angle)).toFixed(1)},${(center + r * Math.sin(angle)).toFixed(1)}`;
      })
      .join(" ");

    return (
      <SectionCard
        title={`التحليل البياني للاعب الفارق: ${playerName}`}
        subtitle={`بصمة التأثير والجاهزية البدنية والفنية لـ ${playerName} (${playerPos} - ${teamName})`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center text-xs p-4 sm:p-5">
          <div className="flex justify-center py-2">
            <div className="relative h-60 w-60">
              <svg className="h-full w-full overflow-visible" viewBox="0 0 220 220">
                {[0.4, 0.7, 1.0].map((lvl, idx) => (
                  <polygon
                    key={idx}
                    points={Array.from({ length: 5 })
                      .map((_, i) => {
                        const angle = i * angleStep - Math.PI / 2;
                        const r = radius * lvl;
                        return `${(center + r * Math.cos(angle)).toFixed(1)},${(center + r * Math.sin(angle)).toFixed(1)}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="var(--line)"
                    strokeDasharray="2 2"
                  />
                ))}
                {Array.from({ length: 5 }).map((_, i) => {
                  const angle = i * angleStep - Math.PI / 2;
                  const x = center + radius * Math.cos(angle);
                  const y = center + radius * Math.sin(angle);
                  return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="var(--line)" />;
                })}
                <polygon points={points} fill="var(--home)" fillOpacity="0.3" stroke="var(--home)" strokeWidth="2.5" />
                {labels.map((lbl, i) => {
                  const angle = i * angleStep - Math.PI / 2;
                  const x = center + (radius + 22) * Math.cos(angle);
                  const y = center + (radius + 22) * Math.sin(angle);
                  return (
                    <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="text-[10px] font-black fill-ink">
                      {lbl}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>
          <div className="space-y-3">
            <div className="border-b border-line pb-2">
              <span className="font-black text-ink text-sm">{playerName}</span>
              <span className="text-muted text-xs block">{playerPos} • {teamName}</span>
            </div>
            <dl className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <dt className="text-muted font-bold">الحس التهديفي xG Threat:</dt>
                <dd className="font-extrabold text-home tabular">{m.scoring}/100</dd>
              </div>
              <div className="flex items-center justify-between text-xs">
                <dt className="text-muted font-bold">صناعة الفرص المحققة xA:</dt>
                <dd className="font-extrabold text-ink tabular">{m.playmaking}/100</dd>
              </div>
              <div className="flex items-center justify-between text-xs">
                <dt className="text-muted font-bold">الافتراس والضغط الدفاعي:</dt>
                <dd className="font-extrabold text-ink tabular">{m.pressing}/100</dd>
              </div>
              <div className="flex items-center justify-between text-xs">
                <dt className="text-muted font-bold">الجاهزية والياقة البدنية:</dt>
                <dd className="font-extrabold text-success tabular">{m.fitness}/100</dd>
              </div>
            </dl>
          </div>
        </div>
      </SectionCard>
    );
  }

  // وضع المقارنة التكتيكية بين نجمي الفريقين (صفحة المباراة)
  const homeTeam = props.homeTeam || "المضيف";
  const awayTeam = props.awayTeam || "الضيف";

  const homeProf = getTeamTactics(homeTeam, true);
  const awayProf = getTeamTactics(awayTeam, false);

  const homeStarName = props.homeStarName || homeProf.starPlayers[0]?.name || "نجم المضيف";
  const awayStarName = props.awayStarName || awayProf.starPlayers[0]?.name || "نجم الضيف";

  const homeMetrics = homeProf.starPlayers[0]?.metrics || { scoring: 88, playmaking: 76, pressing: 84, control: 82, fitness: 90 };
  const awayMetrics = awayProf.starPlayers[0]?.metrics || { scoring: 82, playmaking: 91, pressing: 70, control: 89, fitness: 86 };

  const labels = ["التهديف xG", "الصناعة xA", "الضغط", "السيطرة", "اللياقة"];
  const homeValues = [homeMetrics.scoring, homeMetrics.playmaking, homeMetrics.pressing, homeMetrics.control, homeMetrics.fitness];
  const awayValues = [awayMetrics.scoring, awayMetrics.playmaking, awayMetrics.pressing, awayMetrics.control, awayMetrics.fitness];

  const center = 110;
  const radius = 70;
  const angleStep = (2 * Math.PI) / 5;

  const homeCoord = homeValues.map((val, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (val / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  });

  const awayCoord = awayValues.map((val, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (val / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  });

  const homePoints = homeCoord.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const awayPoints = awayCoord.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

  return (
    <SectionCard
      title="مقارنة بصمة أداء نجوم الفريقين"
      subtitle={`مقارنة الأداء الفني بين أبرز مفاتيح اللعب لـ ${homeTeam} (أزرق) و ${awayTeam} (أحمر)`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center text-xs p-4 sm:p-5">
        {/* SVG Dual Radar Chart */}
        <div className="flex justify-center py-3">
          <div className="relative h-64 w-64">
            <svg className="h-full w-full overflow-visible" viewBox="0 0 220 220">
              {/* Web grid levels */}
              {[0.4, 0.7, 1.0].map((lvl, idx) => (
                <polygon
                  key={idx}
                  points={Array.from({ length: 5 }).map((_, i) => {
                    const angle = i * angleStep - Math.PI / 2;
                    const r = radius * lvl;
                    return `${(center + r * Math.cos(angle)).toFixed(1)},${(center + r * Math.sin(angle)).toFixed(1)}`;
                  }).join(" ")}
                  fill="none"
                  stroke="var(--line)"
                  strokeDasharray="2 2"
                />
              ))}

              {/* Axes Lines */}
              {Array.from({ length: 5 }).map((_, i) => {
                const angle = i * angleStep - Math.PI / 2;
                const x = center + radius * Math.cos(angle);
                const y = center + radius * Math.sin(angle);
                return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="var(--line)" />;
              })}

              {/* Home Polygon - Blue */}
              <polygon points={homePoints} fill="var(--home)" fillOpacity="0.2" stroke="var(--home)" strokeWidth="2.5" />
              {homeCoord.map((c, i) => (
                <circle key={`h-${i}`} cx={c.x} cy={c.y} r="3.5" fill="var(--home)" />
              ))}

              {/* Away Polygon - Red */}
              <polygon points={awayPoints} fill="var(--away)" fillOpacity="0.2" stroke="var(--away)" strokeWidth="2.5" />
              {awayCoord.map((c, i) => (
                <circle key={`a-${i}`} cx={c.x} cy={c.y} r="3.5" fill="var(--away)" />
              ))}

              {/* Axis Labels */}
              {labels.map((lbl, i) => {
                const angle = i * angleStep - Math.PI / 2;
                const x = center + (radius + 24) * Math.cos(angle);
                const y = center + (radius + 24) * Math.sin(angle);
                return (
                  <text
                    key={i}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[10px] font-black fill-ink"
                  >
                    {lbl}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Breakdown comparison with Dual Progress Bars */}
        <div className="space-y-4">
          {/* Header cards */}
          <div className="grid grid-cols-2 gap-3 text-center">
            {/* Home Star Card */}
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 space-y-0.5">
              <span className="text-[10px] font-extrabold text-home block truncate">
                نجم {homeTeam}
              </span>
              <span className="font-black text-ink text-xs sm:text-sm block truncate">{homeStarName}</span>
            </div>

            {/* Away Star Card */}
            <div className="rounded-xl border border-rose-500/30 bg-danger-dim p-3 space-y-0.5">
              <span className="text-[10px] font-extrabold text-danger block truncate">
                نجم {awayTeam}
              </span>
              <span className="font-black text-ink text-xs sm:text-sm block truncate">{awayStarName}</span>
            </div>
          </div>

          {/* Metric Comparison Rows */}
          <div className="space-y-3 pt-1">
            {labels.map((lbl, i) => {
              const hVal = homeValues[i];
              const aVal = awayValues[i];
              return (
                <div key={lbl} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-home font-mono font-black bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      {hVal}
                    </span>
                    <span className="text-ink font-black text-xs">{lbl}</span>
                    <span className="text-danger font-mono font-black bg-danger-dim px-2 py-0.5 rounded border border-danger/25">
                      {aVal}
                    </span>
                  </div>

                  {/* Dual comparison bar */}
                  <div className="grid grid-cols-2 gap-1.5 h-2 w-full">
                    {/* Home bar (RTL: expands from center to right) */}
                    <div className="h-full bg-panel rounded-full overflow-hidden flex justify-end">
                      <div
                        className="h-full bg-home rounded-full transition-all duration-500"
                        style={{ width: `${hVal}%` }}
                      />
                    </div>
                    {/* Away bar (expands from center to left) */}
                    <div className="h-full bg-panel rounded-full overflow-hidden flex justify-start">
                      <div
                        className="h-full bg-danger rounded-full transition-all duration-500"
                        style={{ width: `${aVal}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

import { SectionCard } from "./ui";
import type { SquadStar } from "@/lib/players";

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
  homeStar?: SquadStar | null;
  awayStar?: SquadStar | null;
}

export function PlayerRadarChart(props: PlayerRadarProps) {
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

  const homeTeam = props.homeTeam || "المضيف";
  const awayTeam = props.awayTeam || "الضيف";
  const homeStar = props.homeStar;
  const awayStar = props.awayStar;

  if (!homeStar && !awayStar) {
    return (
      <SectionCard
        title="مقارنة بصمة أداء نجوم الفريقين"
        subtitle={`أبرز مفاتيح اللعب لـ ${homeTeam} و ${awayTeam}`}
      >
        <div className="rounded-xl border border-line bg-panel px-4 py-8 text-center">
          <p className="text-sm font-bold text-ink">لا تتوفر بيانات نجوم المباراة بعد</p>
          <p className="text-xs text-muted mt-1">ستظهر المقارنة بعد مزامنة تشكيلات الفريقين.</p>
        </div>
      </SectionCard>
    );
  }

  const homeStarName = homeStar?.name || "نجم المضيف";
  const awayStarName = awayStar?.name || "نجم الضيف";
  const homeMetrics = homeStar?.metrics || {
    scoring: 88,
    playmaking: 76,
    pressing: 84,
    control: 82,
    fitness: 90,
  };
  const awayMetrics = awayStar?.metrics || {
    scoring: 82,
    playmaking: 91,
    pressing: 70,
    control: 89,
    fitness: 86,
  };

  const labels = ["التهديف xG", "الصناعة xA", "الضغط", "السيطرة", "اللياقة"];
  const homeValues = [
    homeMetrics.scoring,
    homeMetrics.playmaking,
    homeMetrics.pressing,
    homeMetrics.control,
    homeMetrics.fitness,
  ];
  const awayValues = [
    awayMetrics.scoring,
    awayMetrics.playmaking,
    awayMetrics.pressing,
    awayMetrics.control,
    awayMetrics.fitness,
  ];

  const center = 110;
  const radius = 70;
  const angleStep = (2 * Math.PI) / 5;

  const homeCoord = homeValues.map((val, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (val / 100) * radius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  });

  const awayCoord = awayValues.map((val, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (val / 100) * radius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  });

  const homePoints = homeCoord.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const awayPoints = awayCoord.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

  return (
    <SectionCard
      title="مقارنة بصمة أداء نجوم الفريقين"
      subtitle={`مقارنة الأداء الفني بين ${homeStarName} (${homeTeam}) و ${awayStarName} (${awayTeam})`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center text-xs p-4 sm:p-5">
        <div className="flex justify-center py-3">
          <div className="relative h-64 w-64">
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
              <polygon points={homePoints} fill="var(--home)" fillOpacity="0.2" stroke="var(--home)" strokeWidth="2.5" />
              {homeCoord.map((c, i) => (
                <circle key={`h-${i}`} cx={c.x} cy={c.y} r="3.5" fill="var(--home)" />
              ))}
              <polygon points={awayPoints} fill="var(--away)" fillOpacity="0.2" stroke="var(--away)" strokeWidth="2.5" />
              {awayCoord.map((c, i) => (
                <circle key={`a-${i}`} cx={c.x} cy={c.y} r="3.5" fill="var(--away)" />
              ))}
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

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl border border-home/30 bg-home/10 p-3 space-y-2">
              {homeStar?.photoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={homeStar.photoUrl}
                  alt={homeStarName}
                  className="mx-auto h-14 w-14 rounded-full object-cover object-top border border-home/40"
                />
              ) : null}
              <span className="text-[10px] font-extrabold text-home block truncate">
                نجم {homeTeam}
              </span>
              <span className="font-black text-ink text-xs sm:text-sm block truncate">
                {homeStarName}
              </span>
              {homeStar?.position ? (
                <span className="text-[10px] text-muted block">{homeStar.position}</span>
              ) : null}
            </div>

            <div className="rounded-xl border border-away/30 bg-away/10 p-3 space-y-2">
              {awayStar?.photoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={awayStar.photoUrl}
                  alt={awayStarName}
                  className="mx-auto h-14 w-14 rounded-full object-cover object-top border border-away/40"
                />
              ) : null}
              <span className="text-[10px] font-extrabold text-away block truncate">
                نجم {awayTeam}
              </span>
              <span className="font-black text-ink text-xs sm:text-sm block truncate">
                {awayStarName}
              </span>
              {awayStar?.position ? (
                <span className="text-[10px] text-muted block">{awayStar.position}</span>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {labels.map((lbl, i) => {
              const hVal = homeValues[i]!;
              const aVal = awayValues[i]!;
              return (
                <div key={lbl} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-home font-mono font-black bg-home/10 px-2 py-0.5 rounded border border-home/20">
                      {hVal}
                    </span>
                    <span className="text-ink font-black text-xs">{lbl}</span>
                    <span className="text-away font-mono font-black bg-away/10 px-2 py-0.5 rounded border border-away/20">
                      {aVal}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 h-2 w-full">
                    <div className="h-full bg-panel rounded-full overflow-hidden flex justify-end">
                      <div
                        className="h-full bg-home rounded-full transition-all duration-500"
                        style={{ width: `${hVal}%` }}
                      />
                    </div>
                    <div className="h-full bg-panel rounded-full overflow-hidden flex justify-start">
                      <div
                        className="h-full bg-away rounded-full transition-all duration-500"
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

import { SectionCard } from "./ui";

interface OddsMovementProps {
  oddsOpen?: { home?: number | null; draw?: number | null; away?: number | null };
  oddsCurrent?: { home?: number | null; draw?: number | null; away?: number | null };
  homeTeam: string;
  awayTeam: string;
  steamSide?: string | null;
  steamSummary?: string | null;
}

/**
 * مقارنة صادقة بين سعر الافتتاح وآخر سعر مسجل — نقطتان حقيقيتان فقط.
 * لا يُعرض شيء إن لم تتوفر أسعار حقيقية من مصدر البيانات.
 */
export function OddsMovementChart({
  oddsOpen,
  oddsCurrent,
  homeTeam,
  awayTeam,
  steamSide,
  steamSummary,
}: OddsMovementProps) {
  const oH = oddsOpen?.home;
  const oD = oddsOpen?.draw;
  const oA = oddsOpen?.away;
  const cH = oddsCurrent?.home;
  const cD = oddsCurrent?.draw;
  const cA = oddsCurrent?.away;

  const hasOpen = oH != null && oD != null && oA != null;
  const hasCurrent = cH != null && cD != null && cA != null;

  if (!hasCurrent && !hasOpen) return null;

  const rows: { label: string; open: number | null; curr: number | null }[] = [
    { label: `فوز ${homeTeam}`, open: oH ?? null, curr: cH ?? null },
    { label: "التعادل", open: oD ?? null, curr: cD ?? null },
    { label: `فوز ${awayTeam}`, open: oA ?? null, curr: cA ?? null },
  ];

  const showDelta = hasOpen && hasCurrent;

  return (
    <SectionCard
      title="أسعار السوق المسجلة"
      subtitle={
        steamSummary
          ? steamSummary
          : showDelta
            ? "مقارنة بين سعر الافتتاح وآخر سعر مسجل من مصدر البيانات"
            : "آخر أسعار مسجلة من مصدر البيانات"
      }
      quiet
    >
      {steamSide ? (
        <div className="mb-3 text-[11px] font-black text-accent bg-accent-dim inline-flex px-2.5 py-1 rounded-full">
          حراك نحو{" "}
          {steamSide === "home"
            ? homeTeam
            : steamSide === "away"
              ? awayTeam
              : "التعادل"}
        </div>
      ) : null}
      <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {rows.map((r) => {
            const shown = r.curr ?? r.open;
            const delta =
              showDelta && r.curr != null && r.open != null
                ? r.curr - r.open
                : null;
            return (
              <div key={r.label} className="space-y-0.5">
                <span className="text-[10px] text-faint font-bold block truncate">
                  {r.label}
                </span>
                <div className="font-bold text-ink tabular">
                  {shown != null ? shown.toFixed(2) : "—"}
                  {delta != null && Math.abs(delta) >= 0.005 ? (
                    <span
                      className={`text-[10px] mr-1 ${delta > 0 ? "text-success" : "text-danger"}`}
                    >
                      ({delta > 0 ? "+" : ""}
                      {delta.toFixed(2)})
                    </span>
                  ) : null}
                </div>
                {showDelta && r.open != null ? (
                  <span className="text-[10px] text-muted tabular block">
                    الافتتاح: {r.open.toFixed(2)}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}

import { pct, type SideKey } from "@/lib/format";

const FILL: Record<SideKey, string> = {
  H: "bg-home-fill text-on-fill",
  D: "bg-draw-fill text-draw-ink",
  A: "bg-away-fill text-on-fill",
};

const GLYPH: Record<SideKey, string> = { H: "1", D: "X", A: "2" };

const NAME: Record<SideKey, string> = {
  H: "فوز المضيف",
  D: "تعادل",
  A: "فوز الضيف",
};

/** شارة الجهة الأرجح. اللون دائماً 1 أو X أو 2، حتى لو كانت المباراة متقاربة. */
export function OutcomeChip({
  side,
  p,
  close = false,
}: {
  side: SideKey;
  p: number;
  close?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`pick-chip ${FILL[side]}`}>
        <span aria-hidden>{GLYPH[side]}</span>
        <span className="sr-only">
          {close ? "متقاربة · " : ""}
          {NAME[side]}
        </span>
        <span>{pct(p)}</span>
      </span>
      {close ? <span className="text-[10px] font-medium text-muted">متقاربة</span> : null}
    </span>
  );
}

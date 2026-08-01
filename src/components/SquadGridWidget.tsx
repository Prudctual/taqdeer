"use client";

import { SectionCard } from "./ui";
import type { SquadStar } from "@/lib/players";

export function SquadGridWidget({
  homeTeam = "المضيف",
  awayTeam = "الضيف",
  players = [],
}: {
  homeTeam?: string;
  awayTeam?: string;
  players?: SquadStar[];
}) {
  const title =
    awayTeam && awayTeam.trim()
      ? `تشكيلة الفرق ونجوم مباراة ${homeTeam} ضد ${awayTeam}`
      : `تشكيلة ونجوم ${homeTeam}`;
  const subtitle =
    awayTeam && awayTeam.trim()
      ? "أسماء وصور حقيقية لأبرز لاعبي الفريقين من قاعدة التشكيلات"
      : "أسماء وصور حقيقية لأبرز لاعبي الفريق من قاعدة التشكيلات";

  if (players.length === 0) {
    return (
      <SectionCard title={title} subtitle={subtitle}>
        <div className="rounded-xl border border-line bg-panel px-4 py-8 text-center space-y-1">
          <p className="text-sm font-bold text-ink">لا تتوفر تشكيلة لاعبين بعد</p>
          <p className="text-xs text-muted leading-relaxed">
            تُحدَّث الأسماء والصور من مصدر رياضي خارجي عند تشغيل مزامنة اللاعبين.
          </p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={title} subtitle={subtitle}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {players.map((p) => (
          <div
            key={p.id}
            className={`press-scale group relative overflow-hidden rounded-2xl border bg-surface p-4 shadow-2xs transition-all hover:border-line-strong ${
              p.isHome ? "border-home/25" : "border-away/25"
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-3 ${
                p.isHome ? "border-home/20" : "border-away/20"
              }`}
            >
              <span className="text-xs font-bold text-muted">{p.position}</span>
              <span
                className={`text-xl font-black tabular font-mono ${
                  p.isHome ? "text-home" : "text-away"
                }`}
              >
                #{p.number}
              </span>
            </div>

            <div className="my-4 flex justify-center">
              <div
                className={`relative h-20 w-20 rounded-full border overflow-hidden shadow-md group-hover:scale-105 transition-transform ${
                  p.isHome ? "border-home/40 bg-home/15" : "border-away/40 bg-away/15"
                }`}
              >
                {p.photoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={p.photoUrl}
                    alt={p.name}
                    className="h-full w-full object-cover object-top bg-panel"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  style={{ display: p.photoUrl ? "none" : "flex" }}
                  className={`h-full w-full items-center justify-center font-mono font-black text-lg ${
                    p.isHome ? "text-home" : "text-away"
                  }`}
                >
                  {p.initials}
                </div>
              </div>
            </div>

            <div className="text-center space-y-0.5">
              <h3 className="text-sm font-black text-ink group-hover:text-accent transition-colors text-pretty">
                {p.name}
              </h3>
              <div className="flex items-center justify-center gap-1.5 pt-0.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${p.isHome ? "bg-home" : "bg-away"}`}
                />
                <p className="text-xs font-semibold text-muted">{p.team}</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-line grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-panel p-2 rounded-xl border border-line">
                <span className="text-[10px] font-bold text-muted block">تصنيف Elo</span>
                <span className="font-mono font-black text-ink text-xs tabular">
                  {p.rating}
                </span>
              </div>
              <div className="bg-panel p-2 rounded-xl border border-line">
                <span className="text-[10px] font-bold text-muted block">تأثير xG</span>
                <span className="font-mono font-black text-success text-xs tabular">
                  {p.xg}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

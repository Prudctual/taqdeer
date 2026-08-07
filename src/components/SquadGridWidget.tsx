"use client";

import { SectionCard } from "./ui";
import type { SquadStar } from "@/lib/players";

const STATUS_AR: Record<string, string> = {
  injured: "مصاب",
  suspended: "موقوف",
  doubtful: "مشكوك",
};

export function SquadGridWidget({
  homeTeam = "المضيف",
  awayTeam = "الضيف",
  players = [],
  missing = [],
  lineupConfirmed = false,
}: {
  homeTeam?: string;
  awayTeam?: string;
  players?: SquadStar[];
  missing?: Array<{
    teamId: string;
    playerName: string;
    status: string;
    reason?: string | null;
    isHome?: boolean;
  }>;
  lineupConfirmed?: boolean;
}) {
  const title =
    awayTeam && awayTeam.trim()
      ? `تشكيلة الفرق ونجوم مباراة ${homeTeam} ضد ${awayTeam}`
      : `تشكيلة ونجوم ${homeTeam}`;
  const subtitle = lineupConfirmed
    ? "تشكيلة مؤكدة من المصدر الحي"
    : "أسماء حقيقية من قاعدة التشكيلات — الغيابات عند توفرها من Sofascore";

  return (
    <SectionCard title={title} subtitle={subtitle}>
      {lineupConfirmed ? (
        <div className="mb-3">
          <span className="text-[10px] font-black bg-success-dim text-success px-2.5 py-1 rounded-full">
            تشكيلة مؤكدة
          </span>
        </div>
      ) : null}

      {missing.length > 0 ? (
        <div className="mb-4 rounded-xl border border-danger/25 bg-danger/5 p-3 space-y-2">
          <p className="text-xs font-black text-ink">الغيابات المسجّلة</p>
          <ul className="grid gap-1.5 sm:grid-cols-2 text-xs">
            {missing.map((m, i) => (
              <li key={`${m.playerName}-${i}`} className="flex items-center justify-between gap-2">
                <span className="font-bold text-ink truncate">{m.playerName}</span>
                <span className="text-[10px] font-black text-danger shrink-0">
                  {STATUS_AR[m.status] ?? m.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {players.length === 0 ? (
        <div className="rounded-xl border border-line bg-panel px-4 py-8 text-center space-y-1">
          <p className="text-sm font-bold text-ink">لا تتوفر تشكيلة لاعبين بعد</p>
          <p className="text-xs text-muted leading-relaxed">
            تُحدَّث الأسماء والصور من مصدر رياضي خارجي عند تشغيل مزامنة اللاعبين.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {players.map((p) => (
            <div
              key={p.id}
              className={`press-scale group relative overflow-hidden rounded-2xl border bg-surface p-4 shadow-2xs transition-all hover:border-line-strong ${
                p.isHome ? "border-home/25" : "border-away/25"
              }`}
            >
              {p.availability ? (
                <span className="absolute top-2 left-2 text-[9px] font-black bg-danger text-on-fill px-1.5 py-0.5 rounded">
                  {STATUS_AR[p.availability] ?? p.availability}
                </span>
              ) : null}
              <div
                className={`flex items-center justify-between border-b pb-3 ${
                  p.isHome ? "border-home/20" : "border-away/20"
                }`}
              >
                <span className="text-xs font-bold text-muted">{p.position}</span>
                {p.number ? (
                  <span
                    className={`text-xl font-black tabular font-mono ${
                      p.isHome ? "text-home" : "text-away"
                    }`}
                  >
                    #{p.number}
                  </span>
                ) : null}
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
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

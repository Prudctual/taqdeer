"use client";

import { useMemo, useState, type ReactNode } from "react";

type LiveEvent = {
  time?: { elapsed?: number; extra?: number | null };
  team?: { name?: string };
  player?: { name?: string };
  assist?: { name?: string } | null;
  type?: string;
  detail?: string;
};

type EventKind = "goal" | "yellow" | "red" | "sub" | "half" | "other";
type FilterKey = "all" | EventKind | "home" | "away";

function parseEvents(raw: string | null | undefined): LiveEvent[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    return Array.isArray(data) ? (data as LiveEvent[]) : [];
  } catch {
    return [];
  }
}

function namesLoose(a: string, b: string): boolean {
  const na = a.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g, "");
  const nb = b.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g, "");
  if (!na || !nb) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  const a4 = na.slice(0, Math.min(5, na.length));
  const b4 = nb.slice(0, Math.min(5, nb.length));
  return na.includes(b4) || nb.includes(a4);
}

function classify(e: LiveEvent): EventKind {
  const type = (e.type || "").toLowerCase();
  const detail = (e.detail || "").toLowerCase();
  if (type.includes("goal") || detail.includes("goal")) return "goal";
  if (type.includes("card") || detail.includes("card")) {
    if (detail.includes("red") || detail.includes("أحمر")) return "red";
    return "yellow";
  }
  if (type.includes("subst") || detail.includes("subst") || detail.includes("تبديل")) {
    return "sub";
  }
  if (
    type.includes("half") ||
    detail.includes("half") ||
    detail.includes("شوط") ||
    detail === "ht"
  ) {
    return "half";
  }
  return "other";
}

const KIND_META: Record<
  EventKind,
  {
    title: string;
    chip: string;
    chipActive: string;
    node: string;
    card: string;
    bar: string;
    Icon: () => ReactNode;
  }
> = {
  goal: {
    title: "هدف",
    chip: "border-success/35 bg-success-dim text-success",
    chipActive: "border-success bg-success text-white shadow-sm",
    node: "bg-success text-white ring-success/30",
    card: "border-success/40 bg-success-dim/50",
    bar: "bg-success",
    Icon: GoalIcon,
  },
  yellow: {
    title: "بطاقة صفراء",
    chip: "border-amber-500/40 bg-amber-500/15 text-amber-800",
    chipActive: "border-amber-500 bg-amber-500 text-white shadow-sm",
    node: "bg-amber-400 text-ink ring-amber-400/35",
    card: "border-amber-500/40 bg-amber-500/12",
    bar: "bg-amber-400",
    Icon: YellowCardIcon,
  },
  red: {
    title: "بطاقة حمراء",
    chip: "border-danger/40 bg-danger-dim text-danger",
    chipActive: "border-danger bg-danger text-white shadow-sm",
    node: "bg-danger text-white ring-danger/35",
    card: "border-danger/45 bg-danger-dim/60",
    bar: "bg-danger",
    Icon: RedCardIcon,
  },
  sub: {
    title: "تبديل",
    chip: "border-accent/35 bg-accent-dim text-accent",
    chipActive: "border-accent bg-accent text-white shadow-sm",
    node: "bg-accent text-white ring-accent/30",
    card: "border-accent/35 bg-accent-dim/40",
    bar: "bg-accent",
    Icon: SubIcon,
  },
  half: {
    title: "نهاية الشوط",
    chip: "border-line bg-panel text-muted",
    chipActive: "border-ink/30 bg-ink text-panel shadow-sm",
    node: "bg-muted text-panel ring-line",
    card: "border-line bg-panel/80",
    bar: "bg-muted",
    Icon: HalfIcon,
  },
  other: {
    title: "حدث",
    chip: "border-line bg-panel text-muted",
    chipActive: "border-ink/30 bg-ink text-panel shadow-sm",
    node: "bg-muted text-panel ring-line",
    card: "border-line bg-surface",
    bar: "bg-muted",
    Icon: DotIcon,
  },
};

function GoalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 2.2a7.8 7.8 0 0 1 5.4 2.2l-2.1 2.1-2.4-1.4L12 4.2Zm-1.2.3 1.1 3.4-2.4 1.4-3.2-.4A7.8 7.8 0 0 1 10.8 4.5Zm-5.9 4.5 3.2.4-1 3.2-2.7 1.6A7.8 7.8 0 0 1 4.9 9Zm.5 7.1 2.7-1.6 2.4 1.4-.5 3.3a7.8 7.8 0 0 1-4.6-3.1Zm6.6 3.6.5-3.3h2.8l1.2 3.1a7.8 7.8 0 0 1-4.5.2Zm6.4-2.2-1.2-3.1 1.9-2.5 3 .9a7.8 7.8 0 0 1-3.7 4.7Zm1.4-7.1-3-.9.1-3.3 2.8-1.3a7.8 7.8 0 0 1 .1 5.5Z" />
    </svg>
  );
}

function YellowCardIcon() {
  return (
    <span
      className="block size-3 rounded-[2px] bg-amber-300 shadow-sm ring-1 ring-amber-600/40"
      aria-hidden
    />
  );
}

function RedCardIcon() {
  return (
    <span
      className="block size-3 rounded-[2px] bg-danger shadow-sm ring-1 ring-danger/40"
      aria-hidden
    />
  );
}

function SubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d="M7 7h10M17 7l-3-3M17 7l-3 3M17 17H7M7 17l3-3M7 17l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HalfIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 2a8 8 0 0 1 0 16V4Z" />
    </svg>
  );
}

function DotIcon() {
  return <span className="block size-1.5 rounded-full bg-current" aria-hidden />;
}

export function LiveEventsTimeline({
  liveEventsJson,
  homeName,
  awayName,
  homeNameEn,
  awayNameEn,
  isLive = false,
}: {
  liveEventsJson?: string | null;
  homeName: string;
  awayName: string;
  homeNameEn?: string;
  awayNameEn?: string;
  isLive?: boolean;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const events = useMemo(() => {
    return parseEvents(liveEventsJson)
      .map((e, i) => {
        const kind = classify(e);
        const team = e.team?.name || "";
        const side = resolveSide(team, homeName, awayName, homeNameEn, awayNameEn);
        const minute = e.time?.elapsed ?? 0;
        const extra = e.time?.extra ?? null;
        const key = `${minute}-${extra ?? 0}-${kind}-${e.player?.name || ""}-${i}`;
        return { e, kind, team, side, minute, extra, key, i };
      })
      .sort((a, b) => {
        const am = a.minute + (a.extra ?? 0) / 100;
        const bm = b.minute + (b.extra ?? 0) / 100;
        return bm - am;
      });
  }, [liveEventsJson, homeName, awayName, homeNameEn, awayNameEn]);

  const counts = useMemo(() => {
    const c = { all: events.length, goal: 0, yellow: 0, red: 0, sub: 0, half: 0, other: 0, home: 0, away: 0 };
    for (const row of events) {
      c[row.kind] += 1;
      if (row.side === "home") c.home += 1;
      if (row.side === "away") c.away += 1;
    }
    return c;
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((row) => {
      if (filter === "all") return true;
      if (filter === "home" || filter === "away") return row.side === filter;
      return row.kind === filter;
    });
  }, [events, filter]);

  if (events.length === 0) {
    if (!isLive) return null;
    return (
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-2xs">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="live-badge-dot live-pulse-dot" />
          <h3 className="text-sm font-semibold text-ink text-wrap-balance">أحداث المباراة المباشرة</h3>
        </div>
        <p className="text-xs font-semibold text-muted leading-relaxed">
          بانتظار أول حدث مسجّل (هدف / بطاقة / تبديل)…
        </p>
      </div>
    );
  }

  type Chip = {
    key: FilterKey;
    label: string;
    count: number;
    activeClass: string;
    idleClass: string;
  };
  const allChips: Chip[] = [
    {
      key: "all",
      label: "الكل",
      count: counts.all,
      activeClass: "border-ink bg-ink text-panel",
      idleClass: "border-line bg-panel text-muted hover:border-ink/25 hover:text-ink",
    },
    {
      key: "goal",
      label: "أهداف",
      count: counts.goal,
      activeClass: KIND_META.goal.chipActive,
      idleClass: KIND_META.goal.chip,
    },
    {
      key: "yellow",
      label: "صفراء",
      count: counts.yellow,
      activeClass: KIND_META.yellow.chipActive,
      idleClass: KIND_META.yellow.chip,
    },
    {
      key: "red",
      label: "حمراء",
      count: counts.red,
      activeClass: KIND_META.red.chipActive,
      idleClass: KIND_META.red.chip,
    },
    {
      key: "sub",
      label: "تبديل",
      count: counts.sub,
      activeClass: KIND_META.sub.chipActive,
      idleClass: KIND_META.sub.chip,
    },
    {
      key: "home",
      label: homeName || "مضيف",
      count: counts.home,
      activeClass: "border-home bg-home text-white shadow-sm",
      idleClass: "border-home/35 bg-home/10 text-home",
    },
    {
      key: "away",
      label: awayName || "ضيف",
      count: counts.away,
      activeClass: "border-away bg-away text-white shadow-sm",
      idleClass: "border-away/35 bg-away/10 text-away",
    },
  ];
  const filterChips = allChips.filter((c) => c.key === "all" || c.count > 0);

  return (
    <section className="rounded-2xl border border-line bg-surface shadow-2xs overflow-hidden">
      <header className="px-4 sm:px-5 pt-4 pb-3 border-b border-line bg-panel/50">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {isLive ? <span className="live-badge-dot live-pulse-dot shrink-0" /> : null}
            <h3 className="text-sm sm:text-base font-semibold text-ink tracking-tight">أحداث المباراة</h3>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold tabular text-ink">
            <span className="text-muted font-bold">المجموع</span>
            {events.length}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="تصفية الأحداث">
          {filterChips.map((chip) => {
            const active = filter === chip.key;
            return (
              <button
                key={chip.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(chip.key)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition-[transform,background-color,border-color,color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-apple-smooth)] active:scale-[0.97] ${
                  active ? chip.activeClass : chip.idleClass
                }`}
              >
                <span className="truncate max-w-[7.5rem]">{chip.label}</span>
                <span
                  className={`min-w-[1.25rem] h-5 px-1 rounded-full inline-flex items-center justify-center tabular text-[10px] font-semibold ${
                    active ? "bg-white/20 text-inherit" : "bg-surface/80 text-ink/70"
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="px-5 py-8 text-center text-xs font-bold text-muted">
          لا أحداث ضمن هذا الفلتر
        </div>
      ) : (
        <ol className="relative px-3 sm:px-5 py-4 space-y-0">
          {filtered.map((row, idx) => {
            const meta = KIND_META[row.kind];
            const Icon = meta.Icon;
            const isOpen = expanded === row.key;
            const minuteLabel = `${row.minute}${row.extra ? `+${row.extra}` : ""}′`;
            const player = row.e.player?.name?.trim() || "";
            const assist = row.e.assist?.name?.trim() || "";
            const sideLabel =
              row.side === "home" ? homeName : row.side === "away" ? awayName : row.team;
            const sideTone =
              row.side === "home" ? "text-home" : row.side === "away" ? "text-away" : "text-muted";

            if (row.kind === "half") {
              return (
                <li
                  key={row.key}
                  className="relative grid grid-cols-[3.25rem_1.75rem_1fr] gap-2 sm:gap-3 items-center py-2 animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
                >
                  <time className="justify-self-end font-mono text-xs font-semibold tabular text-muted">
                    {minuteLabel}
                  </time>
                  <span className="relative mx-auto flex size-7 items-center justify-center">
                    {idx < filtered.length - 1 ? (
                      <span
                        className="absolute top-[calc(50%+0.9rem)] bottom-[-1.15rem] w-px bg-line/80"
                        aria-hidden
                      />
                    ) : null}
                    <span className={`relative z-[1] flex size-7 items-center justify-center rounded-full ring-4 ring-surface ${meta.node}`}>
                      <Icon />
                    </span>
                  </span>
                  <div className="h-8 flex items-center rounded-xl border border-dashed border-line bg-panel/70 px-3">
                    <span className="text-[11px] font-semibold text-muted tracking-wide">نهاية الشوط الأول</span>
                  </div>
                </li>
              );
            }

            return (
              <li
                key={row.key}
                className="relative grid grid-cols-[3.25rem_1.75rem_1fr] gap-2 sm:gap-3 items-stretch py-1.5 animate-fade-in-up"
                style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
              >
                <time className="justify-self-end self-center font-mono text-[13px] font-semibold tabular text-ink leading-none">
                  {minuteLabel}
                </time>

                <span className="relative mx-auto self-center flex size-7 items-center justify-center">
                  {idx < filtered.length - 1 ? (
                    <span
                      className="absolute top-[calc(50%+0.9rem)] bottom-[-1.35rem] w-px bg-line/80"
                      aria-hidden
                    />
                  ) : null}
                  <span
                    className={`relative z-[1] flex size-7 items-center justify-center rounded-full ring-4 ring-surface shadow-sm ${meta.node}`}
                  >
                    <Icon />
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : row.key)}
                  aria-expanded={isOpen}
                  className={`group relative min-h-[3.5rem] w-full overflow-hidden rounded-xl border text-start transition-[transform,box-shadow,border-color] duration-[var(--motion-fast)] ease-[var(--ease-apple-smooth)] hover:-translate-y-px hover:shadow-xs active:scale-[0.995] ${meta.card}`}
                >
                  <span
                    className={`absolute inset-y-0 inset-inline-start-0 w-1 ${
                      row.side === "home" ? "bg-home" : row.side === "away" ? "bg-away" : meta.bar
                    }`}
                    aria-hidden
                  />

                  <div className="flex h-full items-center gap-3 ps-3.5 pe-3 py-2.5">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-[11px] font-semibold tracking-tight text-ink">
                          {meta.title}
                        </span>
                        {sideLabel ? (
                          <span className={`text-[11px] font-semibold truncate ${sideTone}`}>
                            {sideLabel}
                          </span>
                        ) : null}
                      </div>

                      {row.kind === "sub" ? (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] font-semibold text-ink">
                          <span className="truncate text-success">{player || "داخل"}</span>
                          {assist ? (
                            <>
                              <span className="text-muted font-bold text-[10px]">بدل</span>
                              <span className="truncate text-danger/90">{assist}</span>
                            </>
                          ) : player ? null : (
                            <span className="text-muted">—</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[13px] font-semibold text-ink truncate">
                          {player || (row.kind === "other" ? row.e.detail || "—" : "—")}
                        </p>
                      )}

                      {isOpen && (
                        <div className="pt-1.5 mt-1 border-t border-line/70 space-y-1 text-[11px] font-semibold text-muted">
                          {assist && row.kind === "goal" ? (
                            <p>
                              صناعة: <span className="text-ink font-bold">{assist}</span>
                            </p>
                          ) : null}
                          {row.e.detail ? (
                            <p>
                              التفصيل: <span className="text-ink font-bold">{row.e.detail}</span>
                            </p>
                          ) : null}
                          {row.team ? (
                            <p dir="ltr" className="font-mono text-[10px] opacity-80">
                              {row.team}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <span
                      className={`shrink-0 size-6 rounded-full border border-line bg-surface/80 text-muted grid place-items-center transition-transform duration-[var(--motion-fast)] ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden
                    >
                      <svg viewBox="0 0 20 20" className="size-3.5" fill="currentColor">
                        <path d="M5.2 7.5a.9.9 0 0 1 1.27-.05L10 10.7l3.53-3.25a.9.9 0 1 1 1.2 1.34l-4.13 3.8a.9.9 0 0 1-1.2 0L5.27 8.8a.9.9 0 0 1-.07-1.3Z" />
                      </svg>
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function resolveSide(
  team: string,
  homeAr: string,
  awayAr: string,
  homeEn?: string,
  awayEn?: string,
): "home" | "away" | "unknown" {
  if (!team) return "unknown";
  if (
    (homeAr && namesLoose(team, homeAr)) ||
    (homeEn && namesLoose(team, homeEn))
  ) {
    return "home";
  }
  if (
    (awayAr && namesLoose(team, awayAr)) ||
    (awayEn && namesLoose(team, awayEn))
  ) {
    return "away";
  }
  return "unknown";
}

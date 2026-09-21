"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { buildDoubleChance, type DcCode } from "@/lib/double-chance";
import { formatKickoffAbsolute, pct } from "@/lib/format";
import { matchDisplay, type MatchPhase } from "@/lib/match-status";
import { assessX2, x2ChipLabel } from "@/lib/x2-baseline";
import type { DoubleChanceMatch } from "@/lib/queries";

const LEAGUES_CONFIG = [
  { id: "ALL", name: "الكل" },
  { id: "pl", name: "إنجلترا" },
  { id: "pd", name: "إسبانيا" },
  { id: "bl1", name: "ألمانيا" },
  { id: "sa", name: "إيطاليا" },
  { id: "fl1", name: "فرنسا" },
  { id: "ppd", name: "البرتغال" },
  { id: "ded", name: "هولندا" },
];

const DC_FILTERS: { id: "ALL" | DcCode; label: string }[] = [
  { id: "ALL", label: "كل التوصيات" },
  { id: "1X", label: "1X مضيف/تعادل" },
  { id: "X2", label: "X2 ضيف/تعادل" },
  { id: "12", label: "12 بدون تعادل" },
];

type Enriched = DoubleChanceMatch & {
  bestCode: DcCode;
  bestP: number;
  bestTitle: string;
  bestExplain: string;
  p1x: number;
  px2: number;
  p12: number;
  x2League: number;
  x2Delta: number;
  x2Band: "green" | "yellow" | "red";
  x2Chip: string;
  phase: MatchPhase;
};

export function DoubleChanceMatchesView({ matches }: { matches: DoubleChanceMatch[] }) {
  const [selectedLeague, setSelectedLeague] = useState("ALL");
  const [dcFilter, setDcFilter] = useState<"ALL" | DcCode>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [minP, setMinP] = useState(0);

  const enriched = useMemo<Enriched[]>(() => {
    return matches.map((m) => {
      const dc = buildDoubleChance(m.pHome, m.pDraw, m.pAway, m.homeNameAr, m.awayNameAr);
      const x2 = assessX2({
        leagueId: m.leagueId,
        pHome: m.pHome,
        pDraw: m.pDraw,
        pAway: m.pAway,
        source: "published",
      });
      return {
        ...m,
        bestCode: dc.best.code,
        bestP: dc.best.p,
        bestTitle: dc.best.title,
        bestExplain: dc.best.explain,
        p1x: dc.p1x,
        px2: dc.px2,
        p12: dc.p12,
        x2League: x2.baseline.x2,
        x2Delta: x2.delta,
        x2Band: x2.band,
        x2Chip: x2ChipLabel(x2.reason),
        phase: matchDisplay({
          status: m.status,
          utcDate: m.utcDate,
          homeGoals: null,
          awayGoals: null,
        }).phase,
      };
    });
  }, [matches]);

  const sorted = useMemo(() => {
    return [...enriched].sort((a, b) => {
      const byDate = a.utcDate.localeCompare(b.utcDate);
      if (byDate !== 0) return byDate;
      return b.bestP - a.bestP;
    });
  }, [enriched]);

  const leagueCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: sorted.length };
    for (const m of sorted) {
      counts[m.leagueId] = (counts[m.leagueId] || 0) + 1;
    }
    return counts;
  }, [sorted]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sorted.filter((m) => {
      if (selectedLeague !== "ALL" && m.leagueId !== selectedLeague) return false;
      if (dcFilter !== "ALL" && m.bestCode !== dcFilter) return false;
      if (m.bestP < minP) return false;
      if (
        q &&
        !m.homeNameAr.toLowerCase().includes(q) &&
        !m.awayNameAr.toLowerCase().includes(q) &&
        !m.leagueNameAr.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [sorted, selectedLeague, dcFilter, searchQuery, minP]);

  const avgBest =
    sorted.length > 0 ? sorted.reduce((s, m) => s + m.bestP, 0) / sorted.length : 0;
  const highCount = sorted.filter((m) => m.bestP >= 0.75).length;
  const codeCounts = useMemo(() => {
    const c = { "1X": 0, X2: 0, "12": 0 };
    for (const m of sorted) c[m.bestCode] += 1;
    return c;
  }, [sorted]);

  return (
    <div className="space-y-6">
      <header className="space-y-3 border-b border-line pb-5">
        <h1 className="type-page text-balance text-ink">الفرصة المزدوجة</h1>
        <p className="max-w-[60ch] text-sm leading-relaxed text-muted">
          أفضل غطاء من نسب النموذج: مضيف أو تعادل، ضيف أو تعادل، أو فوز أحد الطرفين.
          الترتيب حسب موعد المباراة، مستقلاً عن النتيجة الأرجح.
        </p>
        {sorted.length > 0 ? (
          <p className="text-xs tabular text-faint">
            {sorted.length} مباراة · متوسط التوصية {pct(avgBest)} · غطاء ≥ 75٪ {highCount} · 1X {codeCounts["1X"]} · X2 {codeCounts.X2} · 12 {codeCounts["12"]}
          </p>
        ) : null}
      </header>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center space-y-2">
          <h2 className="text-sm font-semibold text-ink">لا توجد توقعات قادمة حالياً</h2>
          <p className="text-xs text-muted max-w-lg mx-auto leading-relaxed">
            تظهر هنا المباريات المجدولة التي لديها نسب 1X2 جاهزة من النموذج.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 px-1">
              <h2 className="text-xs sm:text-sm font-semibold text-ink">تصفية حسب الدوري</h2>
              <span className="text-[11px] font-bold text-muted">عرض ({filtered.length})</span>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto border-b border-line" dir="rtl">
              <div className="flex min-w-max items-center">
                {LEAGUES_CONFIG.map((league) => {
                  const count = leagueCounts[league.id] || 0;
                  const isActive = selectedLeague === league.id;
                  return (
                    <button
                      key={league.id}
                      type="button"
                      onClick={() => setSelectedLeague(league.id)}
                      className={`press-scale -mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                        isActive
                          ? "border-accent text-ink"
                          : "border-transparent text-muted hover:text-ink"
                      }`}
                    >
                      <span>{league.name}</span>
                      <span className="tabular text-faint">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {DC_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setDcFilter(f.id)}
                  className={`press-scale cursor-pointer rounded-md border px-2.5 py-1.5 text-[11px] font-semibold ${
                    dcFilter === f.id
                      ? "border-line-strong bg-panel text-ink"
                      : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الفريق أو الدوري..."
                className="flex-1 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink placeholder:text-muted focus:border-accent focus:outline-none transition-colors"
              />
              <select
                value={String(minP)}
                onChange={(e) => setMinP(Number(e.target.value))}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink focus:border-accent focus:outline-none"
              >
                <option value="0">كل نسب الغطاء</option>
                <option value="0.65">غطاء ≥ 65٪</option>
                <option value="0.7">غطاء ≥ 70٪</option>
                <option value="0.75">غطاء ≥ 75٪</option>
                <option value="0.8">غطاء ≥ 80٪</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface p-8 text-center space-y-2 shadow-2xs">
              <h3 className="text-xs font-semibold text-ink">لا توجد مواجهات مطابقة</h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedLeague("ALL");
                  setDcFilter("ALL");
                  setSearchQuery("");
                  setMinP(0);
                }}
                className="press-scale inline-block px-3.5 py-1.5 rounded-xl bg-accent text-on-fill font-bold text-xs shadow-xs"
              >
                إعادة ضبط الفلاتر
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filtered.map((m) => (
                <article
                  key={m.id}
                  className="card space-y-3 p-3.5 sm:p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="type-label text-ink">
                        {m.leagueNameAr}
                      </span>
                      <span className="text-[11px] font-bold text-muted">
                        {formatKickoffAbsolute(m.utcDate)}
                      </span>
                      {m.phase === "live" ? (
                        <span className="text-[10px] font-bold text-live bg-live-dim px-2 py-0.5 rounded-md">
                          مباشرة
                        </span>
                      ) : null}
                      {m.phase === "postponed" ? (
                        <span className="text-[10px] font-bold text-warn bg-warn-dim px-2 py-0.5 rounded-md">
                          مؤجّلة
                        </span>
                      ) : null}
                    </div>
                    <Link
                      href={`/match/${encodeURIComponent(m.id)}#double-chance`}
                      className="press-scale inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-panel border border-line hover:border-accent text-ink hover:text-accent font-semibold text-xs no-underline transition-all shadow-2xs"
                    >
                      تفاصيل المباراة
                      <span>←</span>
                    </Link>
                  </div>

                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                    <div className="space-y-2 min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold text-ink tracking-tight">
                        {m.homeNameAr}{" "}
                        <span className="text-muted font-normal mx-1">ضد</span>{" "}
                        {m.awayNameAr}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-muted">
                        <span>1X2:</span>
                        <span className="text-home tabular">{pct(m.pHome, 0)}</span>
                        <span>·</span>
                        <span className="text-draw tabular">{pct(m.pDraw, 0)}</span>
                        <span>·</span>
                        <span className="text-away tabular">{pct(m.pAway, 0)}</span>
                      </div>
                    </div>

                    <div className="min-w-[12rem] shrink-0 space-y-1 rounded-lg border border-line bg-panel px-3.5 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-accent">التوصية</span>
                        <span className="text-xs font-bold font-mono text-ink bg-surface border border-line px-2 py-0.5 rounded-md">
                          {m.bestCode}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-ink">{m.bestTitle}</p>
                      <p className="text-lg font-semibold text-accent tabular">{pct(m.bestP)}</p>
                      <p className="text-[10px] text-muted font-semibold leading-relaxed">
                        {m.bestExplain}
                      </p>
                      <p className="text-[10px] font-semibold tabular text-muted">
                        X2 الدوري {pct(m.x2League, 2)} · النموذج {pct(m.px2, 2)} ·{" "}
                        <span className={m.x2Delta >= 0 ? "text-ink" : "text-danger"}>
                          {m.x2Delta > 0 ? "+" : ""}
                          {(m.x2Delta * 100).toFixed(2)}
                        </span>
                        <span className="mx-1 text-faint">·</span>
                        {m.x2Chip}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { code: "1X" as const, p: m.p1x, tip: "مضيف أو تعادل" },
                        { code: "X2" as const, p: m.px2, tip: "ضيف أو تعادل" },
                        { code: "12" as const, p: m.p12, tip: "بدون تعادل" },
                      ] as const
                    ).map((row) => {
                      const isBest = row.code === m.bestCode;
                      return (
                        <div
                          key={row.code}
                          className={`rounded-lg border p-2 text-center space-y-0.5 ${
                            isBest
                              ? "border-line-strong bg-panel"
                              : "border-line bg-surface"
                          }`}
                        >
                          <span
                            className={`text-[10px] font-bold font-mono block ${
                              isBest ? "text-accent" : "text-muted"
                            }`}
                          >
                            {row.code}
                          </span>
                          <span className="text-sm font-semibold text-ink tabular block">
                            {pct(row.p)}
                          </span>
                          <span className="text-[9px] font-semibold text-muted block">{row.tip}</span>
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

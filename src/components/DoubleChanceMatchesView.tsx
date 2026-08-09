"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { buildDoubleChance, type DcCode } from "@/lib/double-chance";
import { formatMatchTime, formatShortDate, pct } from "@/lib/format";
import type { DoubleChanceMatch } from "@/lib/queries";

const LEAGUES_CONFIG = [
  { id: "ALL", name: "جميع الدوريات", icon: "🌐" },
  { id: "pl", name: "الدوري الإنجليزي", icon: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "pd", name: "الدوري الإسباني", icon: "🇪🇸" },
  { id: "bl1", name: "الدوري الألماني", icon: "🇩🇪" },
  { id: "sa", name: "الدوري الإيطالي", icon: "🇮🇹" },
  { id: "fl1", name: "الدوري الفرنسي", icon: "🇫🇷" },
  { id: "ppd", name: "الدوري البرتغالي", icon: "🇵🇹" },
  { id: "ded", name: "الدوري الهولندي", icon: "🇳🇱" },
  { id: "tur1", name: "الدوري التركي", icon: "🇹🇷" },
  { id: "no1", name: "الدوري النرويجي", icon: "🇳🇴" },
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
};

export function DoubleChanceMatchesView({ matches }: { matches: DoubleChanceMatch[] }) {
  const [selectedLeague, setSelectedLeague] = useState("ALL");
  const [dcFilter, setDcFilter] = useState<"ALL" | DcCode>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [minP, setMinP] = useState(0);

  const enriched = useMemo<Enriched[]>(() => {
    return matches.map((m) => {
      const dc = buildDoubleChance(m.pHome, m.pDraw, m.pAway, m.homeNameAr, m.awayNameAr);
      return {
        ...m,
        bestCode: dc.best.code,
        bestP: dc.best.p,
        bestTitle: dc.best.title,
        bestExplain: dc.best.explain,
        p1x: dc.p1x,
        px2: dc.px2,
        p12: dc.p12,
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
    <div className="space-y-4">
      <div className="rounded-2xl border border-accent/30 bg-panel p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-accent-dim border border-accent/25 text-accent font-semibold text-[11px]">
            فرصة مزدوجة من نسب النموذج
          </span>
          <span className="text-[11px] font-bold text-muted bg-surface px-3 py-0.5 rounded-full border border-line">
            مباريات الأسابيع القادمة
          </span>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl sm:text-3xl font-semibold text-ink tracking-tight leading-tight">
            الفرصة المزدوجة
          </h1>
          <p className="text-xs font-semibold text-muted leading-relaxed max-w-3xl">
            لكل مباراة بتوقع جاهز نعرض أفضل غطاء مزدوج (1X / X2 / 12) بوضوح — متى تفوز ومتى تخسر —
            مرتّبة تصاعدياً حسب موعد المباراة. هذا مستقل عن اختيار النتيجة الوحيدة.
          </p>
        </div>

        {sorted.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2.5 border-t border-line">
            <div className="rounded-xl border border-line bg-surface p-2.5 space-y-0.5">
              <span className="text-[10px] font-bold text-muted block">مباريات متاحة</span>
              <span className="text-xl font-semibold text-ink font-mono tabular">{sorted.length}</span>
            </div>
            <div className="rounded-xl border border-line bg-surface p-2.5 space-y-0.5">
              <span className="text-[10px] font-bold text-muted block">متوسط التوصية</span>
              <span className="text-xl font-semibold text-accent font-mono tabular">{pct(avgBest)}</span>
            </div>
            <div className="rounded-xl border border-line bg-surface p-2.5 space-y-0.5">
              <span className="text-[10px] font-bold text-muted block">غطاء ≥ 75٪</span>
              <span className="text-xl font-semibold text-ink font-mono tabular">{highCount}</span>
            </div>
            <div className="rounded-xl border border-line bg-surface p-2.5 space-y-0.5">
              <span className="text-[10px] font-bold text-muted block">توزيع 1X · X2 · 12</span>
              <span className="text-xs font-semibold text-ink block pt-1 tabular">
                {codeCounts["1X"]} · {codeCounts.X2} · {codeCounts["12"]}
              </span>
            </div>
          </div>
        ) : null}
      </div>

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

            <div
              className="w-full max-w-full overflow-x-auto scrollbar-none rounded-xl bg-panel p-1.5 border border-line"
              dir="rtl"
            >
              <div className="flex items-center gap-1.5 min-w-max">
                {LEAGUES_CONFIG.map((league) => {
                  const count = leagueCounts[league.id] || 0;
                  const isActive = selectedLeague === league.id;
                  return (
                    <button
                      key={league.id}
                      type="button"
                      onClick={() => setSelectedLeague(league.id)}
                      className={`shrink-0 press-scale flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? "bg-surface text-ink border border-accent/60 shadow-2xs font-semibold ring-1 ring-accent/30"
                          : "text-muted hover:text-ink hover:bg-surface/50 border border-transparent"
                      }`}
                    >
                      <span className="text-xs shrink-0">{league.icon}</span>
                      <span className="shrink-0">{league.name}</span>
                      <span
                        className={`shrink-0 px-1.5 rounded-full text-[9px] font-mono font-semibold ${
                          isActive
                            ? "bg-accent text-on-fill"
                            : "bg-surface border border-line text-muted"
                        }`}
                      >
                        {count}
                      </span>
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
                  className={`press-scale rounded-lg px-2.5 py-1.5 text-[11px] font-bold border cursor-pointer transition-colors ${
                    dcFilter === f.id
                      ? "border-accent/50 bg-accent-dim text-accent"
                      : "border-line bg-surface text-muted hover:text-ink"
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
                  className="rounded-xl border border-accent/25 bg-surface p-3.5 sm:p-4 space-y-3 shadow-2xs hover:border-accent/50 transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-accent-dim text-accent font-semibold text-[11px]">
                        {m.leagueNameAr}
                      </span>
                      <span className="text-[11px] font-bold text-muted">
                        {formatShortDate(m.utcDate)} · {formatMatchTime(m.utcDate)}
                      </span>
                      {(m.status === "IN_PLAY" || m.status === "PAUSED") && (
                        <span className="text-[10px] font-bold text-danger bg-danger-dim px-2 py-0.5 rounded-md">
                          مباشرة
                        </span>
                      )}
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

                    <div className="rounded-xl border border-accent/40 bg-accent-dim/20 px-3.5 py-2.5 space-y-1 shrink-0 min-w-[12rem]">
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
                              ? "border-accent/45 bg-accent-dim/25"
                              : "border-line bg-panel"
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

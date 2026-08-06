"use client";

import { useMemo, useState } from "react";
import { Crest } from "./Crest";
import { formatMatchTime, formatShortDate, pct } from "@/lib/format";
import { leagueEmblemUrl } from "@/lib/leagues";
import type { FinishedPredictionItem, MatchCard } from "@/lib/queries";

/** ألوان وثيمات الدول وتصميم أوراق اللعب (Playing Cards) لكل دوري */
function getCountryCardTheme(leagueId?: string) {
  const id = (leagueId || "").trim().toLowerCase();

  if (id === "pl" || id === "elc" || id.includes("england") || id.includes("premier")) {
    // England: Red & White St George Cross gradient
    return {
      countryAr: "إنجلترا",
      leagueName: "الدوري الإنجليزي الممتاز",
      cardBg: "bg-gradient-to-r from-red-950 via-rose-900 to-red-950 text-white",
      flagSplitGradient: "linear-gradient(135deg, #7f1d1d 0%, #be123c 45%, #991b1b 55%, #450a0a 100%)",
      accentText: "text-amber-300 font-extrabold",
      tagHit: "bg-emerald-500/25 border-emerald-400/50 text-emerald-200",
      tagMiss: "bg-rose-500/25 border-rose-400/50 text-rose-200",
    };
  }

  // Portugal MUST be checked before Spain ("ppd" contains "pd")
  if (id === "ppd" || id.includes("portugal") || id.includes("primeira")) {
    // Portugal: Forest Green (Home 40%) | Crimson Red (Away 60%)
    return {
      countryAr: "البرتغال",
      leagueName: "الدوري البرتغالي",
      cardBg: "bg-gradient-to-r from-emerald-950 via-red-950 to-rose-950 text-white",
      flagSplitGradient: "linear-gradient(135deg, #064e3b 0%, #047857 40%, #991b1b 41%, #881337 100%)",
      accentText: "text-amber-300 font-extrabold",
      tagHit: "bg-emerald-500/25 border-emerald-400/50 text-emerald-200",
      tagMiss: "bg-rose-500/25 border-rose-400/50 text-rose-200",
    };
  }

  if (id === "pd" || id.includes("laliga") || id.includes("spain") || id.includes("primera")) {
    // Spain: Crimson Red - Spanish Gold - Crimson Red (Spanish Flag Split)
    return {
      countryAr: "إسبانيا",
      leagueName: "الدوري الإسباني",
      cardBg: "bg-gradient-to-r from-red-950 via-amber-900 to-red-950 text-white",
      flagSplitGradient: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 35%, #92400e 50%, #991b1b 65%, #450a0a 100%)",
      accentText: "text-amber-300 font-extrabold",
      tagHit: "bg-emerald-500/25 border-emerald-400/50 text-emerald-200",
      tagMiss: "bg-rose-500/25 border-rose-400/50 text-rose-200",
    };
  }

  if (id === "sa" || id.includes("serie") || id.includes("italy")) {
    // Italy: Tricolore - Green (Right/Home RTL) | White (Center) | Red (Left/Away RTL)
    return {
      countryAr: "إيطاليا",
      leagueName: "الدوري الإيطالي",
      cardBg: "bg-gradient-to-r from-emerald-950 via-slate-900 to-rose-950 text-white",
      flagSplitGradient: "linear-gradient(135deg, #064e3b 0%, #047857 38%, #1e293b 50%, #be123c 62%, #881337 100%)",
      accentText: "text-sky-300 font-extrabold",
      tagHit: "bg-emerald-500/25 border-emerald-400/50 text-emerald-200",
      tagMiss: "bg-rose-500/25 border-rose-400/50 text-rose-200",
    };
  }

  if (id === "bl1" || id.includes("bundes") || id.includes("germany")) {
    // Germany: Tricolor - Charcoal (Right/Home) | Crimson (Center) | Gold (Left/Away)
    return {
      countryAr: "ألمانيا",
      leagueName: "الدوري الألماني",
      cardBg: "bg-gradient-to-r from-zinc-950 via-red-950 to-amber-950 text-white",
      flagSplitGradient: "linear-gradient(135deg, #09090b 0%, #18181b 38%, #881337 50%, #78350f 62%, #451a03 100%)",
      accentText: "text-amber-400 font-extrabold",
      tagHit: "bg-emerald-500/25 border-emerald-400/50 text-emerald-200",
      tagMiss: "bg-rose-500/25 border-rose-400/50 text-rose-200",
    };
  }

  if (id === "fl1" || id.includes("ligue") || id.includes("france")) {
    // France: Tricolore - Royal Blue (Right/Home) | White (Center) | Crimson Red (Left/Away)
    return {
      countryAr: "فرنسا",
      leagueName: "الدوري الفرنسي",
      cardBg: "bg-gradient-to-r from-blue-950 via-slate-900 to-rose-950 text-white",
      flagSplitGradient: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 38%, #1e293b 50%, #be123c 62%, #881337 100%)",
      accentText: "text-cyan-300 font-extrabold",
      tagHit: "bg-emerald-500/25 border-emerald-400/50 text-emerald-200",
      tagMiss: "bg-rose-500/25 border-rose-400/50 text-rose-200",
    };
  }

  if (id === "cl" || id === "ucl" || id.includes("champions")) {
    // UEFA Champions League: Midnight Starball Gold & Blue
    return {
      countryAr: "أوروبا",
      leagueName: "دوري أبطال أوروبا",
      cardBg: "bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 text-amber-200",
      flagSplitGradient: "linear-gradient(135deg, #020617 0%, #1e1b4b 50%, #1e3a8a 100%)",
      accentText: "text-amber-300 font-extrabold",
      tagHit: "bg-emerald-500/25 border-emerald-400/50 text-emerald-200",
      tagMiss: "bg-rose-500/25 border-rose-400/50 text-rose-200",
    };
  }

  if (id === "ded" || id.includes("eredivisie") || id.includes("netherlands")) {
    // Netherlands: Iconic Dutch Oranje (البرتغالي الهولندي البرّاق والفريد)
    return {
      countryAr: "هولندا",
      leagueName: "الدوري الهولندي",
      cardBg: "bg-gradient-to-r from-orange-950 via-amber-900 to-orange-950 text-white",
      flagSplitGradient: "linear-gradient(135deg, #7c2d12 0%, #ea580c 45%, #c2410c 55%, #431407 100%)",
      accentText: "text-amber-300 font-extrabold",
      tagHit: "bg-emerald-500/25 border-emerald-400/50 text-emerald-200",
      tagMiss: "bg-rose-500/25 border-rose-400/50 text-rose-200",
    };
  }

  if (id === "tur1" || id === "tr1" || id.includes("turkey") || id.includes("superlig")) {
    // Turkey: Turkish Crimson Red & White Crescent
    return {
      countryAr: "تركيا",
      leagueName: "الدوري التركي الممتاز",
      cardBg: "bg-gradient-to-r from-red-950 via-rose-900 to-red-950 text-white",
      flagSplitGradient: "linear-gradient(135deg, #7f1d1d 0%, #b91c1c 45%, #991b1b 55%, #450a0a 100%)",
      accentText: "text-amber-300 font-extrabold",
      tagHit: "bg-emerald-500/25 border-emerald-400/50 text-emerald-200",
      tagMiss: "bg-rose-500/25 border-rose-400/50 text-rose-200",
    };
  }

  if (id === "no1" || id.includes("norway") || id.includes("eliteserien")) {
    // Norway: Norwegian Crimson Red (Home 50%) | Nordic Navy Cross (Away 50%)
    return {
      countryAr: "النرويج",
      leagueName: "الدوري النرويجي",
      cardBg: "bg-gradient-to-r from-red-950 via-slate-900 to-blue-950 text-white",
      flagSplitGradient: "linear-gradient(135deg, #991b1b 0%, #be123c 45%, #1e3a8a 55%, #0f172a 100%)",
      accentText: "text-sky-300 font-extrabold",
      tagHit: "bg-emerald-500/25 border-emerald-400/50 text-emerald-200",
      tagMiss: "bg-rose-500/25 border-rose-400/50 text-rose-200",
    };
  }

  if (id === "bsa" || id.includes("brazil") || id.includes("brasileiro")) {
    // Brazil: Forest Green (Home) | Yellow Diamond (Center) | Celestial Blue (Away)
    return {
      countryAr: "البرازيل",
      leagueName: "الدوري البرازيلي",
      cardBg: "bg-gradient-to-r from-emerald-950 via-amber-950 to-blue-950 text-white",
      flagSplitGradient: "linear-gradient(135deg, #064e3b 0%, #047857 38%, #78350f 50%, #1e3a8a 62%, #172554 100%)",
      accentText: "text-amber-300 font-extrabold",
      tagHit: "bg-emerald-500/25 border-emerald-400/50 text-emerald-200",
      tagMiss: "bg-rose-500/25 border-rose-400/50 text-rose-200",
    };
  }

  if (id === "arg" || id.includes("argentina")) {
    // Argentina: Sky Blue (Home) | Sun Gold (Center) | Sky Blue (Away)
    return {
      countryAr: "الأرجنتين",
      leagueName: "الدوري الأرجنتيني",
      cardBg: "bg-gradient-to-r from-sky-950 via-amber-950 to-sky-950 text-white",
      flagSplitGradient: "linear-gradient(135deg, #075985 0%, #0284c7 38%, #78350f 50%, #0284c7 62%, #0369a1 100%)",
      accentText: "text-amber-300 font-extrabold",
      tagHit: "bg-emerald-500/25 border-emerald-400/50 text-emerald-200",
      tagMiss: "bg-rose-500/25 border-rose-400/50 text-rose-200",
    };
  }

  if (id === "spl" || id.includes("saudi")) {
    // Saudi Arabia: Saudi Forest Green & Palm Gold
    return {
      countryAr: "السعودية",
      leagueName: "الدوري السعودي للمحترفين",
      cardBg: "bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 text-white",
      flagSplitGradient: "linear-gradient(135deg, #064e3b 0%, #047857 50%, #022c22 100%)",
      accentText: "text-emerald-300 font-extrabold",
      tagHit: "bg-emerald-500/25 border-emerald-400/50 text-emerald-200",
      tagMiss: "bg-rose-500/25 border-rose-400/50 text-rose-200",
    };
  }

  if (id === "uel" || id === "el" || id.includes("europa")) {
    // UEFA Europa League: Europa Orange & Charcoal
    return {
      countryAr: "أوروبا",
      leagueName: "الدوري الأوروبي",
      cardBg: "bg-gradient-to-r from-orange-950 via-amber-950 to-zinc-950 text-white",
      flagSplitGradient: "linear-gradient(135deg, #7c2d12 0%, #c2410c 50%, #18181b 100%)",
      accentText: "text-amber-300 font-extrabold",
      tagHit: "bg-emerald-500/25 border-emerald-400/50 text-emerald-200",
      tagMiss: "bg-rose-500/25 border-rose-400/50 text-rose-200",
    };
  }

  return {
    countryAr: "",
    leagueName: "دوري عام",
    cardBg: "bg-gradient-to-r from-zinc-800 via-zinc-900 to-black text-white",
    flagSplitGradient: "linear-gradient(135deg, #18181b 0%, #09090b 100%)",
    accentText: "text-accent font-extrabold",
    tagHit: "bg-emerald-500/25 border-emerald-400/50 text-emerald-200",
    tagMiss: "bg-rose-500/25 border-rose-400/50 text-rose-200",
  };
}

/** توليد باترن خلفية SVG زغرفية مخصصة لرموز كل دولة */
function getCountryPatternSvg(leagueId?: string) {
  const id = (leagueId || "").trim().toLowerCase();

  if (id === "pl" || id === "elc" || id.includes("england") || id.includes("premier")) {
    // England: St George Cross & Crown heraldic pattern
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" opacity="0.6"><path d="M32 0v64M0 32h64" stroke="%23ffffff" stroke-width="2.5"/><circle cx="32" cy="32" r="14" stroke="%23ffffff" stroke-width="2"/><path d="M26 24h12l2 8H24z" fill="%23ffffff"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  // Portugal MUST be checked before Spain ("ppd" contains "pd")
  if (id === "ppd" || id.includes("portugal") || id.includes("primeira")) {
    // Portugal: Order of Christ Cross pattern
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" opacity="0.6"><path d="M22 10h20v12h12v20H42v12H22V42H10V22h12z" stroke="%23ffffff" stroke-width="2"/><path d="M28 16h8v32h-8zM16 28h32v8H16z" fill="%23ffffff" opacity="0.6"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  if (id === "pd" || id.includes("laliga") || id.includes("spain") || id.includes("primera")) {
    // Spain: Castle & Sun Heraldic pattern
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" opacity="0.6"><path d="M24 42V28h5v-4h6v4h5v14H24z" fill="%23ffffff"/><circle cx="32" cy="14" r="7" stroke="%23ffffff" stroke-width="2"/><path d="M32 3v4M32 21v4M21 14h-4M47 14h-4" stroke="%23ffffff" stroke-width="2"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  if (id === "sa" || id.includes("serie") || id.includes("italy")) {
    // Italy: Stella d'Italia (Star) & Laurel pattern
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" opacity="0.6"><path d="M32 8l6 16h16l-13 10 5 16-14-10-14 10 5-16-13-10h16z" stroke="%23ffffff" stroke-width="2" fill="%23ffffff" fill-opacity="0.3"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  if (id === "bl1" || id.includes("bundes") || id.includes("germany")) {
    // Germany: Eagle & Geometric Shield pattern
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" opacity="0.6"><path d="M32 8l10 12h14l-10 14 12 6-16 5-10 13-10-13-16-5 12-6-10-14h14z" stroke="%23ffffff" stroke-width="2"/><path d="M32 18v24" stroke="%23ffffff" stroke-width="2.5"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  if (id === "fl1" || id.includes("ligue") || id.includes("france")) {
    // France: Fleur-de-lis pattern
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" opacity="0.6"><path d="M32 8c0 10-10 14-10 22h20c0-8-10-12-10-22z" stroke="%23ffffff" stroke-width="2.2"/><path d="M18 30c5 0 10 5 10 12H13zM46 30c-5 0-10 5-10 12h15z" stroke="%23ffffff" stroke-width="2"/><path d="M20 38h24" stroke="%23ffffff" stroke-width="3"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  if (id === "cl" || id === "ucl" || id.includes("champions")) {
    // UEFA Champions League: Starball constellation pattern
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" fill="none" opacity="0.7"><path d="M40 8l4 11 11 2-8 8 3 11-10-6-10 6 3-11-8-8 11-2z" fill="%23ffd700"/><path d="M16 52l3 7 7 1-5 5 2 7-7-4-7 4 2-7-5-5 7-1z" fill="%23ffffff"/><path d="M64 52l3 7 7 1-5 5 2 7-7-4-7 4 2-7-5-5 7-1z" fill="%23ffffff"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  if (id === "ded" || id.includes("eredivisie") || id.includes("netherlands")) {
    // Netherlands: Tulip & Windmill pattern
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" opacity="0.6"><path d="M32 10l14 22H18zM32 54L18 32h28zM10 32l22-14v28zM54 32L32 18v28z" stroke="%23ffffff" stroke-width="2"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  if (id === "tur1" || id === "tr1" || id.includes("turkey") || id.includes("superlig")) {
    // Turkey: Turkish Crescent Moon & Star pattern
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" opacity="0.6"><path d="M28 18a14 14 0 1 0 0 28 10 10 0 1 1 0-28z" fill="%23ffffff"/><path d="M44 26l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" fill="%23ffffff"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  if (id === "no1" || id.includes("norway") || id.includes("eliteserien")) {
    // Norway: Nordic Cross pattern
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" opacity="0.6"><path d="M20 0v64M0 20h64M24 0v64M0 24h64" stroke="%23ffffff" stroke-width="2.5"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  if (id === "bsa" || id.includes("brazil") || id.includes("brasileiro")) {
    // Brazil: Diamond & Celestial Globe pattern
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" opacity="0.6"><path d="M32 8L56 32L32 56L8 32Z" stroke="%23ffffff" stroke-width="2"/><circle cx="32" cy="32" r="10" stroke="%23ffffff" stroke-width="2"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  if (id === "arg" || id.includes("argentina")) {
    // Argentina: Sun of May pattern
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" opacity="0.6"><circle cx="32" cy="32" r="8" fill="%23ffffff"/><path d="M32 10v6M32 48v6M10 32h6M48 32h6M16 16l4 4M44 44l4 4M16 48l4-4M44 20l4-4" stroke="%23ffffff" stroke-width="2"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  if (id === "spl" || id.includes("saudi")) {
    // Saudi Arabia: Crossed Swords & Palm pattern
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" opacity="0.6"><path d="M20 44l24-24M44 44L20 20" stroke="%23ffffff" stroke-width="2.5"/><path d="M32 12c-4 4-8 12-8 18h16c0-6-4-14-8-18z" fill="%23ffffff"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  if (id === "uel" || id === "el" || id.includes("europa")) {
    // Europa League: Geometric Waves pattern
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" opacity="0.6"><path d="M0 32 Q 16 16 32 32 T 64 32" stroke="%23ffffff" stroke-width="2.5"/><path d="M0 44 Q 16 28 32 44 T 64 44" stroke="%23ffffff" stroke-width="2.5"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  // Default subtle grid pattern
  const defaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none" opacity="0.4"><path d="M0 24h48M24 0v48" stroke="%23ffffff" stroke-width="1.5"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(defaultSvg)}")`;
}

export function PredictionArchiveLog({
  items,
  upcomingSnapshots = [],
}: {
  items: FinishedPredictionItem[];
  upcomingSnapshots?: MatchCard[];
}) {
  const [selectedLeague, setSelectedLeague] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "hit" | "miss" | "dc_hit">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Extract unique leagues list
  const leagues = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      if (item.leagueId && item.leagueNameAr) {
        map.set(item.leagueId, item.leagueNameAr);
      }
    });
    upcomingSnapshots.forEach((item) => {
      if (item.leagueId && item.leagueNameAr) {
        map.set(item.leagueId, item.leagueNameAr);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items, upcomingSnapshots]);

  // Filter finished items
  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (selectedLeague !== "all" && item.leagueId !== selectedLeague) {
        return false;
      }
      if (selectedStatus === "hit" && !item.isHit) return false;
      if (selectedStatus === "miss" && item.isHit) return false;
      if (selectedStatus === "dc_hit" && !item.doubleChanceHit) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const homeAr = (item.homeNameAr || "").toLowerCase();
        const awayAr = (item.awayNameAr || "").toLowerCase();
        const homeEn = (item.homeNameEn || "").toLowerCase();
        const awayEn = (item.awayNameEn || "").toLowerCase();
        if (
          !homeAr.includes(q) &&
          !awayAr.includes(q) &&
          !homeEn.includes(q) &&
          !awayEn.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [items, selectedLeague, selectedStatus, searchQuery]);

  // Filter upcoming snapshots
  const filteredUpcoming = useMemo(() => {
    return upcomingSnapshots.filter((item) => {
      if (selectedLeague !== "all" && item.leagueId !== selectedLeague) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const homeAr = (item.homeNameAr || "").toLowerCase();
        const awayAr = (item.awayNameAr || "").toLowerCase();
        const homeEn = (item.homeNameEn || "").toLowerCase();
        const awayEn = (item.awayNameEn || "").toLowerCase();
        if (
          !homeAr.includes(q) &&
          !awayAr.includes(q) &&
          !homeEn.includes(q) &&
          !awayEn.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [upcomingSnapshots, selectedLeague, searchQuery]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = filtered.length;
    if (total === 0)
      return { total: 0, hits: 0, hitRate: 0, dcHits: 0, dcHitRate: 0, avgBrier: 0 };

    const hits = filtered.filter((i) => i.isHit).length;
    const dcHits = filtered.filter((i) => i.doubleChanceHit).length;
    const totalBrier = filtered.reduce((acc, i) => acc + i.brierScore, 0);

    return {
      total,
      hits,
      hitRate: hits / total,
      dcHits,
      dcHitRate: dcHits / total,
      avgBrier: totalBrier / total,
    };
  }, [filtered]);

  return (
    <div className="space-y-6">


      {/* Control Bar: Filters & Search (Borderless) */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 via-zinc-900/90 to-black p-4 space-y-3 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          {/* Header Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h1.5a2.5 2.5 0 002.5-2.5V7.865M12 21a9 9 0 100-18 9 9 0 000 18z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-white tracking-wide">
                تصفية المباريات حسب الدوري ({leagues.length + 1})
              </h3>
              <p className="text-[10px] font-semibold text-zinc-400">
                اختر البطولة لعرض المباريات والتوقعات الخاصة بها
              </p>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative shrink-0 sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الفريق..."
              className="w-full rounded-xl bg-black/40 px-3.5 py-1.5 pe-8 text-xs font-bold text-white placeholder:text-white/40 focus:outline-none backdrop-blur-md border border-white/10"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute end-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Permanent Static Leagues Grid */}
        <div className="pt-1 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {/* Option 1: All Leagues Card */}
            <button
              type="button"
              onClick={() => {
                setSelectedLeague("all");
              }}
              className={`p-3 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center justify-between gap-2.5 group backdrop-blur-md ${
                selectedLeague === "all"
                  ? "bg-white text-zinc-950 border-white shadow-xl shadow-white/10 font-black scale-[1.02] ring-2 ring-white/50"
                  : "bg-gradient-to-b from-white/[0.08] to-white/[0.03] text-white/90 border-white/10 hover:border-white/30 hover:bg-white/[0.12]"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedLeague === "all" ? "bg-zinc-950 text-white" : "bg-white/10 text-white/90"
                }`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </div>
                <span className="text-xs font-black truncate">جميع الدوريات</span>
              </div>
              <span className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-black shrink-0 ${
                selectedLeague === "all" ? "bg-black/10 text-zinc-900" : "bg-white/10 text-white/70"
              }`}>
                {items.length + upcomingSnapshots.length}
              </span>
            </button>

            {/* Option 2: Individual League Cards */}
            {leagues.map((l) => {
              const count = items.filter((i) => i.leagueId.toLowerCase() === l.id.toLowerCase()).length + upcomingSnapshots.filter((u) => u.leagueId.toLowerCase() === l.id.toLowerCase()).length;
              const isSelected = selectedLeague === l.id;
              const theme = getCountryCardTheme(l.id);

              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    setSelectedLeague(l.id);
                  }}
                  className={`p-3 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center justify-between gap-2.5 group backdrop-blur-md ${
                    isSelected
                      ? "bg-white text-zinc-950 border-white shadow-xl shadow-white/10 font-black scale-[1.02] ring-2 ring-white/50"
                      : "bg-gradient-to-b from-white/[0.08] to-white/[0.03] text-white/90 border-white/10 hover:border-white/30 hover:bg-white/[0.12]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={leagueEmblemUrl(l.id)}
                      alt=""
                      className="w-6 h-6 sm:w-7 sm:h-7 object-contain filter drop-shadow-md shrink-0 group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "https://flagcdn.com/w40/gb.png";
                      }}
                    />
                    <div className="text-start min-w-0">
                      <span className="text-xs font-black truncate block">{l.name}</span>
                      <span className={`text-[10px] font-bold block ${isSelected ? "text-zinc-600" : "text-white/50"}`}>
                        {theme.countryAr}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-black shrink-0 ${
                    isSelected ? "bg-black/10 text-zinc-900" : "bg-white/10 text-white/70"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Outcome Filter */}
        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-line">
            <span className="text-[11px] font-bold text-muted me-1">تصفية النتائج:</span>
            <button
              type="button"
              onClick={() => setSelectedStatus("all")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedStatus === "all"
                  ? "bg-ink text-surface"
                  : "bg-surface text-muted hover:text-ink border border-line"
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("hit")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedStatus === "hit"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20"
              }`}
            >
              توقع صائب
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("miss")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedStatus === "miss"
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20"
              }`}
            >
              توقع غير صائب
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("dc_hit")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedStatus === "dc_hit"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-500/20"
              }`}
            >
              نجاح الفرصة المزدوجة
            </button>
          </div>
        )}
      </div>

      {/* Finished Matches List - Clean Country Cards without Cliché Borders */}
      {filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((item) => {
            const pHome = item.pHome ?? 0;
            const pDraw = item.pDraw ?? 0;
            const pAway = item.pAway ?? 0;
            const theme = getCountryCardTheme(item.leagueId);

            const predText =
              item.predictedOutcome === "H"
                ? `فوز ${item.homeNameAr}`
                : item.predictedOutcome === "D"
                ? "التعادل"
                : `فوز ${item.awayNameAr}`;

            return (
              <div
                key={item.id}
                style={{ background: theme.flagSplitGradient }}
                className="relative overflow-hidden rounded-3xl p-5 sm:p-6 shadow-xl transition-all duration-300 hover:shadow-2xl text-white"
              >
                {/* National Symbol Pattern Watermark Overlay */}
                <div
                  className="absolute inset-0 opacity-25 pointer-events-none"
                  style={{
                    backgroundImage: getCountryPatternSvg(item.leagueId),
                    backgroundRepeat: "repeat",
                    backgroundSize: "64px 64px",
                  }}
                />

                <div className="relative z-10 space-y-4.5">
                  {/* Header info */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-white/15 pb-3.5">
                    <div className="flex items-center gap-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={leagueEmblemUrl(item.leagueId || "")}
                        alt=""
                        className="w-6 h-6 object-contain filter drop-shadow-md"
                      />
                      <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                        {item.leagueNameAr}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/35 backdrop-blur-md border border-white/15 text-xs font-semibold text-white/90 font-sans shadow-2xs">
                        <svg className="w-3.5 h-3.5 text-white/80 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>
                          {new Date(item.utcDate).toLocaleDateString("ar-IQ", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            timeZone: "Asia/Baghdad",
                          })}
                        </span>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold border backdrop-blur-md shadow-2xs ${item.isHit ? "bg-emerald-500/25 border-emerald-400/40 text-emerald-200" : "bg-rose-500/25 border-rose-400/40 text-rose-200"}`}>
                        {item.isHit ? "توقع صائب" : "توقع غير صائب"}
                      </span>
                    </div>
                  </div>

                  {/* Matchup: Pure Crests & Large Team Names Without Cliché Borders */}
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-2">
                    {/* Home Team */}
                    <div className="flex items-center justify-end gap-3.5 min-w-0">
                      <span className="font-black text-base sm:text-xl text-white truncate text-end drop-shadow-sm">
                        {item.homeNameAr}
                      </span>
                      <Crest src={item.homeCrestUrl} alt={item.homeNameAr} size="xl" className="shrink-0 drop-shadow-lg" />
                    </div>

                    {/* Score */}
                    <div className="flex items-center justify-center gap-3 px-4 py-1.5 rounded-2xl bg-black/30 backdrop-blur-md font-mono font-black text-2xl sm:text-3xl text-white">
                      <span>{item.homeGoals ?? 0}</span>
                      <span className="text-white/40 font-sans text-sm font-normal">-</span>
                      <span>{item.awayGoals ?? 0}</span>
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Crest src={item.awayCrestUrl} alt={item.awayNameAr} size="xl" className="shrink-0 drop-shadow-lg" />
                      <span className="font-black text-base sm:text-xl text-white truncate drop-shadow-sm">
                        {item.awayNameAr}
                      </span>
                    </div>
                  </div>

                  {/* Predictions Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="rounded-2xl bg-black/25 backdrop-blur-xs p-3.5 space-y-1">
                      <span className="text-white/70 block text-[11px] font-semibold font-sans">
                        التوقع الرئيسي المسجل
                      </span>
                      <div className="font-black text-white flex items-center justify-between font-sans">
                        <span className="font-extrabold">{predText}</span>
                        <span className={`font-mono text-base ${theme.accentText}`}>{pct(item.topProb)}</span>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-black/25 backdrop-blur-xs p-3.5 space-y-1">
                      <span className="text-white/70 block text-[11px] font-semibold font-sans">
                        الفرصة المزدوجة (Double Chance)
                      </span>
                      <div className="font-black text-white flex items-center justify-between font-sans">
                        <span className="font-mono font-extrabold">{item.doubleChanceRec}</span>
                        <span className={item.doubleChanceHit ? "text-emerald-300 font-extrabold" : "text-white/60"}>
                          {item.doubleChanceHit ? "توقع ناجح" : "غير موفق"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Visual 1X2 Probability Bar */}
                  <div className="rounded-2xl bg-black/35 backdrop-blur-md border border-white/15 p-3.5 space-y-2.5 shadow-lg shadow-black/20">
                    <div className="flex items-center justify-between text-xs font-semibold text-white/90 font-sans">
                      <span className="font-bold text-white/90 drop-shadow-xs">توزيع الاحتمالات (1X2)</span>
                      <div className="flex items-center gap-2.5 text-xs font-bold">
                        <span className="text-emerald-300 drop-shadow-xs">مضيف</span>
                        <span className="text-white/40 font-normal">•</span>
                        <span className="text-amber-300 drop-shadow-xs">تعادل</span>
                        <span className="text-white/40 font-normal">•</span>
                        <span className="text-rose-300 drop-shadow-xs">ضيف</span>
                      </div>
                    </div>
                    <div className="h-5 sm:h-6 w-full rounded-full bg-black/50 overflow-hidden flex gap-1 p-0.5 shadow-inner border border-white/10">
                      <div
                        style={{ width: `${Math.max(pHome * 100, 4)}%` }}
                        className="h-full bg-emerald-400 rounded-s-full flex items-center justify-center font-mono font-black text-[11px] text-emerald-950 px-1 truncate transition-all duration-300"
                        title={`فوز المضيف: ${pct(pHome)}`}
                      >
                        {pct(pHome)}
                      </div>
                      <div
                        style={{ width: `${Math.max(pDraw * 100, 4)}%` }}
                        className="h-full bg-amber-400 flex items-center justify-center font-mono font-black text-[11px] text-amber-950 px-1 truncate transition-all duration-300"
                        title={`التعادل: ${pct(pDraw)}`}
                      >
                        {pct(pDraw)}
                      </div>
                      <div
                        style={{ width: `${Math.max(pAway * 100, 4)}%` }}
                        className="h-full bg-rose-400 rounded-e-full flex items-center justify-center font-mono font-black text-[11px] text-rose-950 px-1 truncate transition-all duration-300"
                        title={`فوز الضيف: ${pct(pAway)}`}
                      >
                        {pct(pAway)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upcoming Snapshots Section - Clean Country Cards */}
      {filteredUpcoming.length > 0 && (
        <div className="space-y-4 pt-2">


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredUpcoming.map((item) => {
              const pHome = item.pHome ?? 0;
              const pDraw = item.pDraw ?? 0;
              const pAway = item.pAway ?? 0;
              const theme = getCountryCardTheme(item.leagueId);

              return (
                <div
                  key={item.id}
                  style={{ background: theme.flagSplitGradient }}
                  className="relative overflow-hidden rounded-3xl p-4 sm:p-5 shadow-lg transition-all duration-300 hover:shadow-xl text-white"
                >
                  {/* National Symbol Pattern Watermark Overlay */}
                  <div
                    className="absolute inset-0 opacity-25 pointer-events-none"
                    style={{
                      backgroundImage: getCountryPatternSvg(item.leagueId),
                      backgroundRepeat: "repeat",
                      backgroundSize: "64px 64px",
                    }}
                  />

                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between text-xs border-b border-white/15 pb-3">
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={leagueEmblemUrl(item.leagueId || "")}
                          alt=""
                          className="w-5 h-5 object-contain filter drop-shadow-md"
                        />
                        <span className="font-extrabold text-xs sm:text-sm text-white tracking-wide">
                          {item.leagueNameAr}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold text-white/90 font-sans">
                        {/* Date Badge */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/35 backdrop-blur-md border border-white/15 shadow-2xs">
                          <svg className="w-3.5 h-3.5 text-white/80 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{formatShortDate(item.utcDate)}</span>
                        </div>

                        {/* Time Badge */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/35 backdrop-blur-md border border-white/15 shadow-2xs">
                          <svg className="w-3.5 h-3.5 text-white/80 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{formatMatchTime(item.utcDate)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-1">
                      <div className="flex items-center justify-end gap-3 min-w-0">
                        <span className="font-bold text-sm sm:text-base text-white truncate text-end">
                          {item.homeNameAr}
                        </span>
                        <Crest src={item.homeCrestUrl} alt={item.homeNameAr} size="lg" className="shrink-0 drop-shadow-md" />
                      </div>
                      <span className="text-xs font-bold text-white/80 px-3 py-1 rounded-xl bg-black/25 font-sans">
                        VS
                      </span>
                      <div className="flex items-center gap-3 min-w-0">
                        <Crest src={item.awayCrestUrl} alt={item.awayNameAr} size="lg" className="shrink-0 drop-shadow-md" />
                        <span className="font-bold text-sm sm:text-base text-white truncate">
                          {item.awayNameAr}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-black/35 backdrop-blur-md border border-white/15 p-3 space-y-2 shadow-lg shadow-black/20">
                      <div className="flex items-center justify-between text-xs font-semibold text-white/90 font-sans">
                        <span className="font-bold text-white/90 drop-shadow-xs">توزيع الاحتمالات (1X2)</span>
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <span className="text-emerald-300 drop-shadow-xs">مضيف</span>
                          <span className="text-white/40 font-normal">•</span>
                          <span className="text-amber-300 drop-shadow-xs">تعادل</span>
                          <span className="text-white/40 font-normal">•</span>
                          <span className="text-rose-300 drop-shadow-xs">ضيف</span>
                        </div>
                      </div>
                      <div className="h-4 sm:h-5 w-full rounded-full bg-black/50 overflow-hidden flex gap-1 p-0.5 shadow-inner border border-white/10">
                        <div
                          style={{ width: `${Math.max(pHome * 100, 4)}%` }}
                          className="h-full bg-emerald-400 rounded-s-full flex items-center justify-center font-mono font-black text-[10px] text-emerald-950 px-1 truncate transition-all duration-300"
                          title={`فوز المضيف: ${pct(pHome)}`}
                        >
                          {pct(pHome)}
                        </div>
                        <div
                          style={{ width: `${Math.max(pDraw * 100, 4)}%` }}
                          className="h-full bg-amber-400 flex items-center justify-center font-mono font-black text-[10px] text-amber-950 px-1 truncate transition-all duration-300"
                          title={`التعادل: ${pct(pDraw)}`}
                        >
                          {pct(pDraw)}
                        </div>
                        <div
                          style={{ width: `${Math.max(pAway * 100, 4)}%` }}
                          className="h-full bg-rose-400 rounded-e-full flex items-center justify-center font-mono font-black text-[10px] text-rose-950 px-1 truncate transition-all duration-300"
                          title={`فوز الضيف: ${pct(pAway)}`}
                        >
                          {pct(pAway)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

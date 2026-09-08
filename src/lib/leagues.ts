export type LeagueDef = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  countryAr: string;
  /** football-data.org competition code (European Big Five) */
  fdOrgCode?: string;
  /** football-data.co.uk CSV code (European Big Five) */
  fdUkCode?: string;
};

export const LEAGUES: LeagueDef[] = [
  {
    id: "pl",
    code: "PL",
    nameAr: "الدوري الإنجليزي",
    nameEn: "Premier League",
    countryAr: "إنجلترا",
    fdOrgCode: "PL",
    fdUkCode: "E0",
  },
  {
    id: "pd",
    code: "PD",
    nameAr: "الدوري الإسباني",
    nameEn: "La Liga",
    countryAr: "إسبانيا",
    fdOrgCode: "PD",
    fdUkCode: "SP1",
  },
  {
    id: "bl1",
    code: "BL1",
    nameAr: "الدوري الألماني",
    nameEn: "Bundesliga",
    countryAr: "ألمانيا",
    fdOrgCode: "BL1",
    fdUkCode: "D1",
  },
  {
    id: "sa",
    code: "SA",
    nameAr: "الدوري الإيطالي",
    nameEn: "Serie A",
    countryAr: "إيطاليا",
    fdOrgCode: "SA",
    fdUkCode: "I1",
  },
  {
    id: "fl1",
    code: "FL1",
    nameAr: "الدوري الفرنسي",
    nameEn: "Ligue 1",
    countryAr: "فرنسا",
    fdOrgCode: "FL1",
    fdUkCode: "F1",
  },
  {
    id: "ppd",
    code: "PPD",
    nameAr: "الدوري البرتغالي",
    nameEn: "Primeira Liga",
    countryAr: "البرتغال",
    fdOrgCode: "PPD",
    fdUkCode: "P1",
  },
  {
    id: "ded",
    code: "DED",
    nameAr: "الدوري الهولندي",
    nameEn: "Eredivisie",
    countryAr: "هولندا",
    fdOrgCode: "DED",
    fdUkCode: "N1",
  },
];

export function leagueByCode(code: string) {
  return LEAGUES.find(
    (l) =>
      l.code.toLowerCase() === code.toLowerCase() ||
      l.id === code.toLowerCase() ||
      (l.fdOrgCode?.toLowerCase() ?? "") === code.toLowerCase(),
  );
}

/** معرّف لوني مستقر لـ data-league */
export function leagueToneId(idOrCode?: string | null): string | undefined {
  if (!idOrCode) return undefined;
  const hit = leagueByCode(idOrCode);
  return hit?.id;
}

const LEAGUE_EMBLEM_MAP: Record<string, string> = {
  PL: "https://crests.football-data.org/PL.png",
  PD: "https://crests.football-data.org/PD.png",
  BL1: "https://crests.football-data.org/BL1.png",
  SA: "https://crests.football-data.org/SA.png",
  FL1: "https://crests.football-data.org/FL1.png",
  PPD: "https://crests.football-data.org/PPL.png",
  DED: "https://crests.football-data.org/ED.png",
  UEL: "https://crests.football-data.org/EL.png",
  UCL: "https://crests.football-data.org/CL.png",
};

/** شعار الدوري المعزز والموثوق بكافة المعرفات */
export function leagueEmblemUrl(codeOrId: string) {
  if (!codeOrId) return "https://crests.football-data.org/PL.png";
  const upper = codeOrId.toUpperCase();
  const hit = LEAGUES.find(
    (l) => l.id.toUpperCase() === upper || l.code.toUpperCase() === upper || l.fdOrgCode?.toUpperCase() === upper
  );
  const targetCode = hit?.code || hit?.fdOrgCode || upper;
  
  if (LEAGUE_EMBLEM_MAP[targetCode]) return LEAGUE_EMBLEM_MAP[targetCode];
  if (LEAGUE_EMBLEM_MAP[upper]) return LEAGUE_EMBLEM_MAP[upper];
  
  return `https://crests.football-data.org/${targetCode}.png`;
}

export type TournamentType = "ucl" | "uel" | "acl_elite" | "acl_2";

/** شعار البطولة المعتمدة (دوري الأبطال والدوري الأوروبي ودوري أبطال آسيا) */
export function tournamentEmblemUrl(type: TournamentType) {
  if (type === "ucl") {
    return "https://crests.football-data.org/CL.png";
  }
  if (type === "uel") {
    return "https://crests.football-data.org/EL.png";
  }
  if (type === "acl_elite") {
    return "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/AFC_Champions_League_Elite_logo.svg/120px-AFC_Champions_League_Elite_logo.svg.png";
  }
  return "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/AFC_Champions_League_Two_logo.svg/120px-AFC_Champions_League_Two_logo.svg.png";
}

/** football-data.co.uk season path segment, e.g. 2324 for 2023-24 */
export function ukSeasonPath(startYear: number): string {
  const a = String(startYear).slice(2);
  const b = String(startYear + 1).slice(2);
  return `${a}${b}`;
}

/**
 * سنة بداية أحدث موسم أوروبي. الموسم يبدأ في أغسطس، لذا يوليو يبقى على الموسم السابق
 * (ملفات football-data.co.uk لموسم جديد لا تظهر قبل انطلاقه).
 */
export function latestSeasonStartYear(now = new Date()): number {
  const y = now.getUTCFullYear();
  return now.getUTCMonth() >= 7 ? y : y - 1;
}

/** آخر خمسة مواسم حتى الموسم الجاري — تُشتق من التاريخ فلا تتقادم. */
export function historicalSeasons(now = new Date()): number[] {
  const latest = latestSeasonStartYear(now);
  return [latest - 4, latest - 3, latest - 2, latest - 1, latest];
}

export const HISTORICAL_SEASONS = historicalSeasons();

export type LeagueZone = {
  color: string;
  bgColor: string;
  textColor: string;
  positionBgColor: string;
  positionTextColor: string;
  borderColor: string;
  label: string;
  tournamentType?: TournamentType;
};

/**
 * يحدد منطقة الفريق في جدول الترتيب (أوروبية/قارية أو هبوط أو ملحق)
 * حسب اللوائح المعتمدة لكل دوري.
 */
export function getLeagueZone(
  position: number,
  total: number,
  leagueId?: string,
): LeagueZone | null {
  const lid = leagueId?.toLowerCase();

  // Portugal (Primeira Liga)
  if (lid === "ppd") {
    if (position <= 2) {
      return {
        color: "var(--home)",
        bgColor: "bg-blue-500/10 hover:bg-blue-500/20",
        textColor: "text-blue-500 font-semibold",
        positionBgColor: "bg-blue-500/20",
        positionTextColor: "text-blue-500",
        borderColor: "border-blue-500/30",
        label: position === 1 ? "دوري أبطال أوروبا" : "تصفيات دوري الأبطال",
        tournamentType: "ucl",
      };
    }
    if (position === 3) {
      return {
        color: "var(--warn)",
        bgColor: "bg-orange-500/10 hover:bg-orange-500/20",
        textColor: "text-orange-500 font-semibold",
        positionBgColor: "bg-orange-500/20",
        positionTextColor: "text-orange-500",
        borderColor: "border-orange-500/30",
        label: "الدوري الأوروبي",
        tournamentType: "uel",
      };
    }
    if (position === 4) {
      return {
        color: "var(--warn)",
        bgColor: "bg-emerald-500/10 hover:bg-emerald-500/20",
        textColor: "text-emerald-500 font-semibold",
        positionBgColor: "bg-emerald-500/20",
        positionTextColor: "text-emerald-500",
        borderColor: "border-emerald-500/30",
        label: "دوري المؤتمر الأوروبي",
        tournamentType: "uel",
      };
    }
    if (position === total - 2) {
      return {
        color: "var(--warn)",
        bgColor: "bg-amber-500/10 hover:bg-amber-500/20",
        textColor: "text-amber-500 font-semibold",
        positionBgColor: "bg-amber-500/20",
        positionTextColor: "text-amber-500",
        borderColor: "border-amber-500/30",
        label: "ملحق تفادي الهبوط",
      };
    }
    if (position >= total - 1) {
      return {
        color: "var(--danger)",
        bgColor: "bg-danger-dim hover:bg-danger-dim",
        textColor: "text-danger font-semibold",
        positionBgColor: "bg-danger-dim",
        positionTextColor: "text-danger",
        borderColor: "border-danger/30",
        label: "منطقة الهبوط المباشر",
      };
    }
    return null;
  }

  // Netherlands (Eredivisie)
  if (lid === "ded") {
    if (position <= 2) {
      return {
        color: "var(--home)",
        bgColor: "bg-blue-500/10 hover:bg-blue-500/20",
        textColor: "text-blue-500 font-semibold",
        positionBgColor: "bg-blue-500/20",
        positionTextColor: "text-blue-500",
        borderColor: "border-blue-500/30",
        label: "دوري أبطال أوروبا",
        tournamentType: "ucl",
      };
    }
    if (position === 3) {
      return {
        color: "var(--home)",
        bgColor: "bg-blue-500/10 hover:bg-blue-500/20",
        textColor: "text-blue-500 font-semibold",
        positionBgColor: "bg-blue-500/20",
        positionTextColor: "text-blue-500",
        borderColor: "border-blue-500/30",
        label: "تصفيات دوري الأبطال",
        tournamentType: "ucl",
      };
    }
    if (position === 4) {
      return {
        color: "var(--warn)",
        bgColor: "bg-orange-500/10 hover:bg-orange-500/20",
        textColor: "text-orange-500 font-semibold",
        positionBgColor: "bg-orange-500/20",
        positionTextColor: "text-orange-500",
        borderColor: "border-orange-500/30",
        label: "الدوري الأوروبي",
        tournamentType: "uel",
      };
    }
    if (position >= 5 && position <= 8) {
      return {
        color: "var(--warn)",
        bgColor: "bg-emerald-500/10 hover:bg-emerald-500/20",
        textColor: "text-emerald-500 font-semibold",
        positionBgColor: "bg-emerald-500/20",
        positionTextColor: "text-emerald-500",
        borderColor: "border-emerald-500/30",
        label: "تصفيات دوري المؤتمر (Play-offs)",
        tournamentType: "uel",
      };
    }
    if (position === total - 2) {
      return {
        color: "var(--warn)",
        bgColor: "bg-amber-500/10 hover:bg-amber-500/20",
        textColor: "text-amber-500 font-semibold",
        positionBgColor: "bg-amber-500/20",
        positionTextColor: "text-amber-500",
        borderColor: "border-amber-500/30",
        label: "ملحق تفادي الهبوط",
      };
    }
    if (position >= total - 1) {
      return {
        color: "var(--danger)",
        bgColor: "bg-danger-dim hover:bg-danger-dim",
        textColor: "text-danger font-semibold",
        positionBgColor: "bg-danger-dim",
        positionTextColor: "text-danger",
        borderColor: "border-danger/30",
        label: "منطقة الهبوط المباشر",
      };
    }
    return null;
  }

  // France (Ligue 1)
  if (lid === "fl1") {
    if (position <= 3) {
      return {
        color: "var(--home)",
        bgColor: "bg-blue-500/10 hover:bg-blue-500/20",
        textColor: "text-blue-500 font-semibold",
        positionBgColor: "bg-blue-500/20",
        positionTextColor: "text-blue-500",
        borderColor: "border-blue-500/30",
        label: "دوري أبطال أوروبا",
        tournamentType: "ucl",
      };
    }
    if (position === 4) {
      return {
        color: "var(--home)",
        bgColor: "bg-blue-500/10 hover:bg-blue-500/20",
        textColor: "text-blue-500 font-semibold",
        positionBgColor: "bg-blue-500/20",
        positionTextColor: "text-blue-500",
        borderColor: "border-blue-500/30",
        label: "تصفيات دوري الأبطال",
        tournamentType: "ucl",
      };
    }
    if (position === 5) {
      return {
        color: "var(--warn)",
        bgColor: "bg-orange-500/10 hover:bg-orange-500/20",
        textColor: "text-orange-500 font-semibold",
        positionBgColor: "bg-orange-500/20",
        positionTextColor: "text-orange-500",
        borderColor: "border-orange-500/30",
        label: "الدوري الأوروبي",
        tournamentType: "uel",
      };
    }
    if (position === 6) {
      return {
        color: "var(--warn)",
        bgColor: "bg-emerald-500/10 hover:bg-emerald-500/20",
        textColor: "text-emerald-500 font-semibold",
        positionBgColor: "bg-emerald-500/20",
        positionTextColor: "text-emerald-500",
        borderColor: "border-emerald-500/30",
        label: "دوري المؤتمر الأوروبي",
        tournamentType: "uel",
      };
    }
    if (total <= 18) {
      if (position === total - 2) {
        return {
          color: "var(--warn)",
          bgColor: "bg-amber-500/10 hover:bg-amber-500/20",
          textColor: "text-amber-500 font-semibold",
          positionBgColor: "bg-amber-500/20",
          positionTextColor: "text-amber-500",
          borderColor: "border-amber-500/30",
          label: "ملحق تفادي الهبوط",
        };
      }
      if (position >= total - 1) {
        return {
          color: "var(--danger)",
          bgColor: "bg-danger-dim hover:bg-danger-dim",
          textColor: "text-danger font-semibold",
          positionBgColor: "bg-danger-dim",
          positionTextColor: "text-danger",
          borderColor: "border-danger/30",
          label: "منطقة الهبوط المباشر",
        };
      }
    } else {
      // مواسم الـ 20 نادياً (مثل 2021-2022)
      if (position >= total - 3) {
        return {
          color: "var(--danger)",
          bgColor: "bg-danger-dim hover:bg-danger-dim",
          textColor: "text-danger font-semibold",
          positionBgColor: "bg-danger-dim",
          positionTextColor: "text-danger",
          borderColor: "border-danger/30",
          label: "منطقة الهبوط المباشر",
        };
      }
    }
    return null;
  }

  // Germany (Bundesliga)
  if (lid === "bl1") {
    if (position <= 4) {
      return {
        color: "var(--home)",
        bgColor: "bg-blue-500/10 hover:bg-blue-500/20",
        textColor: "text-blue-500 font-semibold",
        positionBgColor: "bg-blue-500/20",
        positionTextColor: "text-blue-500",
        borderColor: "border-blue-500/30",
        label: "دوري أبطال أوروبا",
        tournamentType: "ucl",
      };
    }
    if (position === 5) {
      return {
        color: "var(--warn)",
        bgColor: "bg-orange-500/10 hover:bg-orange-500/20",
        textColor: "text-orange-500 font-semibold",
        positionBgColor: "bg-orange-500/20",
        positionTextColor: "text-orange-500",
        borderColor: "border-orange-500/30",
        label: "الدوري الأوروبي",
        tournamentType: "uel",
      };
    }
    if (position === 6) {
      return {
        color: "var(--warn)",
        bgColor: "bg-emerald-500/10 hover:bg-emerald-500/20",
        textColor: "text-emerald-500 font-semibold",
        positionBgColor: "bg-emerald-500/20",
        positionTextColor: "text-emerald-500",
        borderColor: "border-emerald-500/30",
        label: "دوري المؤتمر الأوروبي",
        tournamentType: "uel",
      };
    }
    if (position === total - 2) {
      return {
        color: "var(--warn)",
        bgColor: "bg-amber-500/10 hover:bg-amber-500/20",
        textColor: "text-amber-500 font-semibold",
        positionBgColor: "bg-amber-500/20",
        positionTextColor: "text-amber-500",
        borderColor: "border-amber-500/30",
        label: "ملحق تفادي الهبوط",
      };
    }
    if (position >= total - 1) {
      return {
        color: "var(--danger)",
        bgColor: "bg-danger-dim hover:bg-danger-dim",
        textColor: "text-danger font-semibold",
        positionBgColor: "bg-danger-dim",
        positionTextColor: "text-danger",
        borderColor: "border-danger/30",
        label: "منطقة الهبوط المباشر",
      };
    }
    return null;
  }

  // Top 4 default (England, Spain, Italy)
  if (position <= 4) {
    return {
      color: "var(--home)",
      bgColor: "bg-blue-500/10 hover:bg-blue-500/20",
      textColor: "text-blue-500 font-semibold",
      positionBgColor: "bg-blue-500/20",
      positionTextColor: "text-blue-500",
      borderColor: "border-blue-500/30",
      label: "دوري أبطال أوروبا",
      tournamentType: "ucl",
    };
  }
  if (position === 5) {
    return {
      color: "var(--warn)",
      bgColor: "bg-orange-500/10 hover:bg-orange-500/20",
      textColor: "text-orange-500 font-semibold",
      positionBgColor: "bg-orange-500/20",
      positionTextColor: "text-orange-500",
      borderColor: "border-orange-500/30",
      label: "الدوري الأوروبي",
      tournamentType: "uel",
    };
  }
  if (position === 6) {
    return {
      color: "var(--warn)",
      bgColor: "bg-emerald-500/10 hover:bg-emerald-500/20",
      textColor: "text-emerald-500 font-semibold",
      positionBgColor: "bg-emerald-500/20",
      positionTextColor: "text-emerald-500",
      borderColor: "border-emerald-500/30",
      label: "دوري المؤتمر الأوروبي",
      tournamentType: "uel",
    };
  }
  if (total >= 8 && position >= total - 2) {
    return {
      color: "var(--danger)",
      bgColor: "bg-danger-dim hover:bg-danger-dim",
      textColor: "text-danger font-semibold",
      positionBgColor: "bg-danger-dim",
      positionTextColor: "text-danger",
      borderColor: "border-danger/30",
      label: "منطقة الهبوط",
    };
  }
  return null;
}


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
  /**
   * Calendar-year seasons synced from Wikipedia football-box fixtures
   * (e.g. K League 1 pages: `2026_K_League_1`).
   */
  wikiSeasons?: number[];
  wikiTitle?: (year: number) => string;
};

function kleagueSeasons(now = new Date()): number[] {
  const y = now.getUTCFullYear();
  return [y - 3, y - 2, y - 1, y];
}

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
    id: "kl1",
    code: "KL1",
    nameAr: "الدوري الكوري",
    nameEn: "K League 1",
    countryAr: "كوريا الجنوبية",
    // الدوري الكوري بتقويم سنوي — آخر أربع سنوات حتى السنة الجارية
    wikiSeasons: kleagueSeasons(),
    wikiTitle: (year) => `${year}_K_League_1`,
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

const LEAGUE_EMBLEM_FALLBACK: Record<string, string> = {
  KL1: "/crests/kl1-league.png",
};

/** شعار الدوري (football-data.org أو مصدر بديل) */
export function leagueEmblemUrl(code: string) {
  const upper = code.toUpperCase();
  if (LEAGUE_EMBLEM_FALLBACK[upper]) return LEAGUE_EMBLEM_FALLBACK[upper];
  return `https://crests.football-data.org/${upper}.png`;
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

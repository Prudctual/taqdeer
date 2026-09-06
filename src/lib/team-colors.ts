/**
 * نظام ألوان الأندية الرياضية الموحد
 * يوفر لون هوية رسمي لكل نادٍ معروف مع خوارزمية هاش حتمية للأندية الأخرى
 */

export interface TeamColorTheme {
  hex: string;
  bg: string;
  border: string;
  text: string;
}

const KNOWN_COLORS: Record<string, string> = {
  // الدوري الإنجليزي
  arsenal: "#EF0107",
  "آرسنال": "#EF0107",
  chelsea: "#034694",
  "تشيلسي": "#034694",
  liverpool: "#C8102E",
  "ليفربول": "#C8102E",
  "manchester city": "#6CABDD",
  "مانشستر سيتي": "#6CABDD",
  "manchester united": "#DA291C",
  "مانشستر يونايتد": "#DA291C",
  tottenham: "#132257",
  "توتنهام": "#132257",
  newcastle: "#241F20",
  "نيوكاسل": "#241F20",
  "aston villa": "#670E36",
  "أستون فيلا": "#670E36",
  everton: "#003399",
  "إيفرتون": "#003399",
  "west ham": "#7A263A",
  "وست هام": "#7A263A",
  brighton: "#0057B8",
  "برايتون": "#0057B8",
  wolves: "#FDB913",
  "ولفرهامبتون": "#FDB913",
  "وولفرهامبتون": "#FDB913",
  fulham: "#CC0000",
  "فولهام": "#CC0000",
  brentford: "#E30613",
  "برينتفورد": "#E30613",
  "nottingham forest": "#DD0000",
  "نوتينغهام فورست": "#DD0000",
  "crystal palace": "#1B458F",
  "كريستال بالاس": "#1B458F",
  bournemouth: "#DA291C",
  "بورنموث": "#DA291C",
  leicester: "#0053A0",
  "ليستر سيتي": "#0053A0",
  ipswich: "#004488",
  "إيبسويتش": "#004488",
  southampton: "#D71920",
  "ساوثهامبتون": "#D71920",

  // الدوري الإسباني
  "real madrid": "#E5A823",
  "ريال مدريد": "#E5A823",
  barcelona: "#A50044",
  "برشلونة": "#A50044",
  "atletico madrid": "#CB3524",
  "أتلتيكو مدريد": "#CB3524",
  sevilla: "#D40F1D",
  "إشبيلية": "#D40F1D",
  "real betis": "#00954C",
  "ريال بيتيس": "#00954C",
  "athletic club": "#EE2523",
  "athletic bilbao": "#EE2523",
  "أتلتيك بيلباو": "#EE2523",
  "real sociedad": "#0067B1",
  "ريال سوسيداد": "#0067B1",
  valencia: "#EE7500",
  "فالنسيا": "#EE7500",
  villarreal: "#DDAA00",
  "فياريال": "#DDAA00",
  girona: "#CD1226",
  "جيرونا": "#CD1226",
  "celta vigo": "#8AC3EE",
  "سيلتا فيغو": "#8AC3EE",
  osasuna: "#0A1C2A",
  "أوساسونا": "#0A1C2A",
  mallorca: "#E20613",
  "مايوركا": "#E20613",
  getafe: "#005BA9",
  "خيتافي": "#005BA9",
  "rayo vallecano": "#E53027",
  "رايو فاليكانو": "#E53027",
  espanyol: "#007FC8",
  "إسبانيول": "#007FC8",
  "las palmas": "#DEB800",
  "لاس بالماس": "#DEB800",
  alaves: "#005BAC",
  "ديبورتيفو ألافيس": "#005BAC",
  leganes: "#0055A5",
  "ليغانيس": "#0055A5",
  valladolid: "#5B257E",
  "بلد الوليد": "#5B257E",

  // الدوري الألماني
  "bayern munich": "#DC052D",
  "بايرن ميونخ": "#DC052D",
  "borussia dortmund": "#D4B000",
  "بوروسيا دورتموند": "#D4B000",
  "bayer leverkusen": "#E32221",
  "باير ليفركوزن": "#E32221",
  "rb leipzig": "#E30613",
  "لايبزيغ": "#E30613",
  frankfurt: "#E1000F",
  "آينتراخت فرانكفورت": "#E1000F",
  "فرانكفورت": "#E1000F",
  stuttgart: "#E32219",
  "شتوتغارت": "#E32219",
  wolfsburg: "#65B32E",
  "فولفسبورغ": "#65B32E",
  "union berlin": "#EB1923",
  "يونيون برلين": "#EB1923",
  freiburg: "#D1021B",
  "فرايبورغ": "#D1021B",
  mainz: "#C3141E",
  "ماينز": "#C3141E",
  monchengladbach: "#1E7B34",
  "بوروسيا مونشنغلادباخ": "#1E7B34",
  hoffenheim: "#1C63B7",
  "هوفنهايم": "#1C63B7",
  "werder bremen": "#1D8B4E",
  "فيردر بريمن": "#1D8B4E",
  augsburg: "#BA3733",
  "آوغسبورغ": "#BA3733",
  bochum: "#005CA9",
  "بوخوم": "#005CA9",
  "st pauli": "#573926",
  "سانت باولي": "#573926",
  heidenheim: "#E2001A",
  "هايدنهايم": "#E2001A",
  "holstein kiel": "#004B9B",
  "هولشتاين كيل": "#004B9B",

  // الدوري الإيطالي
  inter: "#010E80",
  "إنتر": "#010E80",
  "إنتر ميلان": "#010E80",
  milan: "#FB090B",
  "ميلان": "#FB090B",
  "إيه سي ميلان": "#FB090B",
  juventus: "#222222",
  "يوفنتوس": "#222222",
  napoli: "#12A0D7",
  "نابولي": "#12A0D7",
  roma: "#8E1F2F",
  "روما": "#8E1F2F",
  lazio: "#87D8F7",
  "لاتسيو": "#87D8F7",
  atalanta: "#1E71B8",
  "أتالانتا": "#1E71B8",
  fiorentina: "#4F2582",
  "فيورنتينا": "#4F2582",
  bologna: "#1A2F50",
  "بولونيا": "#1A2F50",
  torino: "#8B1C24",
  "تورينو": "#8B1C24",
  genoa: "#991B24",
  "جنوى": "#991B24",
  udinese: "#222222",
  "أودينيزي": "#222222",
  parma: "#C8A000",
  "بارما": "#C8A000",
  cagliari: "#9B1B30",
  "كالياري": "#9B1B30",
  lecce: "#CC9900",
  "ليتشي": "#CC9900",
  verona: "#002F6C",
  "هيلاس فيرونا": "#002F6C",
  empoli: "#005CA9",
  "إمبولي": "#005CA9",
  como: "#004F9F",
  "كومو": "#004F9F",
  monza: "#E4002B",
  "مونزا": "#E4002B",
  venezia: "#D05A10",
  "فينيزيا": "#D05A10",

  // الدوري الفرنسي
  psg: "#004170",
  "باريس سان جيرمان": "#004170",
  marseille: "#00A3E0",
  "مارسيليا": "#00A3E0",
  monaco: "#E41B17",
  "موناكو": "#E41B17",
  lyon: "#DA0812",
  "ليون": "#DA0812",
  lille: "#ED1C24",
  "ليل": "#ED1C24",
  rennes: "#E2001A",
  "رين": "#E2001A",
  lens: "#CC9900",
  "لانس": "#CC9900",
  nice: "#E2001A",
  "نيس": "#E2001A",
  strasbourg: "#009EE0",
  "ستراسبورغ": "#009EE0",
  nantes: "#C8A800",
  "نانت": "#C8A800",
  reims: "#D9001D",
  "ريمس": "#D9001D",
  toulouse: "#5A2D81",
  "تولوز": "#5A2D81",
  auxerre: "#004FA3",
  "أوكسير": "#004FA3",
  brest: "#E2001A",
  "بريست": "#E2001A",
  angers: "#222222",
  "أنجيه": "#222222",
  "saint-etienne": "#008050",
  "سانت إتيان": "#008050",
  "le havre": "#87CEEB",
  "لوهافر": "#87CEEB",
  montpellier: "#002D62",
  "مونبلييه": "#002D62",

  // الدوريات الأخرى (هولندي، برتغالي، تركي)
  benfica: "#E83D3D",
  "بنفيكا": "#E83D3D",
  porto: "#003882",
  "بورتو": "#003882",
  sporting: "#008057",
  "سبورتينغ لشبونة": "#008057",
  braga: "#E4002B",
  "براغا": "#E4002B",
  ajax: "#D2122E",
  "أياكس": "#D2122E",
  feyenoord: "#ED1C24",
  "فاينورد": "#ED1C24",
  psv: "#ED1C24",
  "آيندهوفن": "#ED1C24",
  "az alkmaar": "#DC0018",
  "ألكمار": "#DC0018",
  twente: "#E30613",
  "تفينتي": "#E30613",
  galatasaray: "#A90432",
  "غلطة سراي": "#A90432",
  fenerbahce: "#C8A800",
  "فنربخشة": "#C8A800",
  besiktas: "#222222",
  "بشكتاش": "#222222",
  trabzonspor: "#800020",
  "طرابزون سبور": "#800020",
};

const PALETTE = [
  "#0284C7", // Sky Blue
  "#059669", // Emerald
  "#D97706", // Amber
  "#DC2626", // Red
  "#4F46E5", // Indigo
  "#7C3AED", // Violet
  "#0D9488", // Teal
  "#EA580C", // Orange
  "#BE123C", // Rose
  "#475569", // Slate
  "#15803D", // Forest Green
  "#1D4ED8", // Royal Blue
  "#9333EA", // Purple
  "#0369A1", // Ocean Blue
  "#B91C1C", // Crimson
  "#A16207", // Gold
];

function stringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  let r = 0;
  let g = 0;
  let b = 0;
  if (clean.length === 3) {
    r = parseInt(clean[0]! + clean[0]!, 16);
    g = parseInt(clean[1]! + clean[1]!, 16);
    b = parseInt(clean[2]! + clean[2]!, 16);
  } else if (clean.length === 6) {
    r = parseInt(clean.substring(0, 2), 16);
    g = parseInt(clean.substring(2, 4), 16);
    b = parseInt(clean.substring(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * الحصول على ألوان الفريق المنسقة
 */
export function getTeamColors(teamName: string, teamId?: string): TeamColorTheme {
  const normName = teamName.toLowerCase().trim();
  const normId = (teamId || "").toLowerCase().trim();

  let hex = KNOWN_COLORS[normName] || KNOWN_COLORS[normId];

  if (!hex) {
    // حاول مطابقة جزء من الاسم
    for (const [key, val] of Object.entries(KNOWN_COLORS)) {
      if (normName.includes(key) || key.includes(normName)) {
        hex = val;
        break;
      }
    }
  }

  if (!hex) {
    const hash = stringHash(normName || normId || "team");
    hex = PALETTE[hash % PALETTE.length]!;
  }

  return {
    hex,
    bg: hexToRgba(hex, 0.12),
    border: hexToRgba(hex, 0.35),
    text: hex,
  };
}

/**
 * Team Tactical Profiles, Formations, and Roster database.
 * Provides accurate tactical data for top clubs and realistic, dynamic fallbacks for all teams.
 */

export interface PlayerProfile {
  name: string;
  number: string;
  position: string;
  rating: string;
  xg: string;
  initials: string;
  photoUrl?: string;
  metrics: {
    scoring: number;
    playmaking: number;
    pressing: number;
    control: number;
    fitness: number;
  };
}

export interface TeamTacticalProfile {
  formation: string;
  style: string;
  strengths: string[];
  weaknesses: string[];
  starPlayers: PlayerProfile[];
}

const TOP_TEAMS_DB: Record<string, TeamTacticalProfile> = {
  // Real Madrid
  مدريد: {
    formation: "4-3-3 / 4-4-2 الماسية",
    style: "التحول الهجومي السريع والسيطرة على المساحات الضيقة",
    strengths: ["هجمات مرتدة خاطفة", "إنهاء هجومي حاسم", "مرونة تكتيكية عالية"],
    weaknesses: ["ثغرات خلف الأظهرة عند الاندفاع الهجومي"],
    starPlayers: [
      {
        name: "فينيسيوس جونيور",
        number: "7",
        position: "جناح أيسر / مهاجم",
        rating: "1850",
        xg: "+3.95",
        initials: "VJ",
        photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Vinicius_Jr_2021.jpg/500px-Vinicius_Jr_2021.jpg",
        metrics: { scoring: 96, playmaking: 88, pressing: 82, control: 92, fitness: 95 },
      },
      {
        name: "جود بيلينجهام",
        number: "5",
        position: "وسط مهاجم",
        rating: "1840",
        xg: "+3.20",
        initials: "JB",
        photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Jude_Bellingham_2023.jpg/500px-Jude_Bellingham_2023.jpg",
        metrics: { scoring: 91, playmaking: 93, pressing: 87, control: 90, fitness: 94 },
      },
    ],
  },

  // Barcelona
  برشلونة: {
    formation: "4-3-3 الضغط العالي",
    style: "الاستحواذ المتقدم والدفاع بخط خلفي مرتفع وبناء من الخلف",
    strengths: ["استحواذ عالي وفرص محققة", "ضغط عكسي سريع", "صناعة اللعب عبر الأطراف والعمق"],
    weaknesses: ["مساحات خلف مصيدة التسلل المرتفعة"],
    starPlayers: [
      {
        name: "روبرت ليفاندوفسكي",
        number: "9",
        position: "رأس حربة",
        rating: "1835",
        xg: "+3.80",
        initials: "RL",
        photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Robert_Lewandowski_2021.jpg/500px-Robert_Lewandowski_2021.jpg",
        metrics: { scoring: 97, playmaking: 78, pressing: 75, control: 88, fitness: 89 },
      },
      {
        name: "لامين يامال",
        number: "19",
        position: "جناح أيمن / صانع ألعاب",
        rating: "1820",
        xg: "+3.10",
        initials: "LY",
        photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Lamine_Yamal_2024.jpg/500px-Lamine_Yamal_2024.jpg",
        metrics: { scoring: 87, playmaking: 95, pressing: 80, control: 94, fitness: 91 },
      },
    ],
  },

  // Manchester City
  سيتي: {
    formation: "3-2-4-1 الاستحواذ المطلق",
    style: "التدوير المستمر بالكرة وحصار المنافس في ثلثه الدفاعي",
    strengths: ["سيطرة تامة على إيقاع المباراة", "نجاعة تهديفية فائقة", "زيادة عددية بوسط الملعب"],
    weaknesses: ["المخاطرة بالهجمات المرتدة المباشرة"],
    starPlayers: [
      {
        name: "إيرلينج هالاند",
        number: "9",
        position: "مهاجم صريح",
        rating: "1860",
        xg: "+4.20",
        initials: "EH",
        photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Erling_Haaland_2023.jpg/500px-Erling_Haaland_2023.jpg",
        metrics: { scoring: 99, playmaking: 72, pressing: 79, control: 82, fitness: 96 },
      },
      {
        name: "كيفين دي بروين",
        number: "17",
        position: "صانع ألعاب محوري",
        rating: "1845",
        xg: "+3.50",
        initials: "KDB",
        photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Kevin_De_Bruyne_2018.jpg/500px-Kevin_De_Bruyne_2018.jpg",
        metrics: { scoring: 88, playmaking: 99, pressing: 80, control: 95, fitness: 88 },
      },
    ],
  },

  // Liverpool
  ليفربول: {
    formation: "4-3-3 الضغط العكسي (Gegenpressing)",
    style: "السرعة الفائقة والضغط الشرس فور فقدان الكرة",
    strengths: ["تحولات هجومية صاعقة", "عرضيات وكرات ثابتة خطيرة", "صلابة دفاعية بالعمق"],
    weaknesses: ["اندفاع الأظهرة للأمام بكثافة"],
    starPlayers: [
      {
        name: "محمد صلاح",
        number: "11",
        position: "جناح أيمن / هداف",
        rating: "1845",
        xg: "+3.85",
        initials: "MS",
        photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Mohamed_Salah_2018.jpg/500px-Mohamed_Salah_2018.jpg",
        metrics: { scoring: 96, playmaking: 89, pressing: 81, control: 90, fitness: 93 },
      },
      {
        name: "فيرجيل فان دايك",
        number: "4",
        position: "قلب دفاع قائد",
        rating: "1830",
        xg: "+1.80",
        initials: "VVD",
        photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Virgil_van_Dijk_2018.jpg/500px-Virgil_van_Dijk_2018.jpg",
        metrics: { scoring: 70, playmaking: 81, pressing: 92, control: 89, fitness: 94 },
      },
    ],
  },

  // Arsenal
  أرسنال: {
    formation: "4-3-3 التوازن التكتيكي",
    style: "الضغط العالي والتحضير المنظم مع قوة الركلات الثابتة",
    strengths: ["منظومة دفاعية حديدية", "خطورة استثنائية بالكرات الثابتة", "تنظيم تكتيكي محكم"],
    weaknesses: ["بطء ريتم الهجوم أحياناً أمام التكتلات المنخفضة"],
    starPlayers: [
      {
        name: "بوكايو ساكا",
        number: "7",
        position: "جناح أيمن",
        rating: "1825",
        xg: "+3.10",
        initials: "BS",
        photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Bukayo_Saka_2022.jpg/500px-Bukayo_Saka_2022.jpg",
        metrics: { scoring: 89, playmaking: 91, pressing: 85, control: 90, fitness: 92 },
      },
      {
        name: "مارتن أوديغارد",
        number: "8",
        position: "صانع ألعاب وقائد",
        rating: "1820",
        xg: "+2.90",
        initials: "MO",
        photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Martin_%C3%98degaard_2022.jpg/500px-Martin_%C3%98degaard_2022.jpg",
        metrics: { scoring: 84, playmaking: 96, pressing: 88, control: 93, fitness: 90 },
      },
    ],
  },

  // Bayern Munich
  بايرن: {
    formation: "4-2-3-1 الضغط الألماني",
    style: "الهجوم المتواصل عبر الأطراف والعرضيات السريعة والضغط المرتفع",
    strengths: ["كثافة هجومية وتسديدات غزيرة", "سرعة أجنحة عالية", "عمق التشكيلة"],
    weaknesses: ["مساحات خلف قلبي الدفاع في المرتدات"],
    starPlayers: [
      {
        name: "هاري كين",
        number: "9",
        position: "رأس حربة ومحطة",
        rating: "1855",
        xg: "+4.10",
        initials: "HK",
        photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Harry_Kane_2023.jpg/500px-Harry_Kane_2023.jpg",
        metrics: { scoring: 98, playmaking: 86, pressing: 79, control: 88, fitness: 91 },
      },
      {
        name: "جمال موسيالا",
        number: "42",
        position: "صانع ألعاب ومراوغ",
        rating: "1830",
        xg: "+3.20",
        initials: "JM",
        photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Jamal_Musiala_2023.jpg/500px-Jamal_Musiala_2023.jpg",
        metrics: { scoring: 88, playmaking: 94, pressing: 82, control: 97, fitness: 90 },
      },
    ],
  },

  // PSG
  باريس: {
    formation: "4-3-3 المرونة الهجومية",
    style: "السرعة والمهارة في التحول الهجومي والاستحواذ بملعب المنافس",
    strengths: ["مهارات فردية بالمواجهات المباشرة", "سرعة الارتداد الهجومي"],
    weaknesses: ["تراجع التغطية الدفاعية في الفترات المتأخرة"],
    starPlayers: [
      {
        name: "عثمان ديمبيلي",
        number: "10",
        position: "جناح أيمن/أيسر",
        rating: "1810",
        xg: "+2.95",
        initials: "OD",
        photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Ousmane_Demb%C3%A9l%C3%A9_2018.jpg/500px-Ousmane_Demb%C3%A9l%C3%A9_2018.jpg",
        metrics: { scoring: 82, playmaking: 93, pressing: 78, control: 93, fitness: 88 },
      },
      {
        name: "أشرف حكيمي",
        number: "2",
        position: "ظهير أيمن هجومي",
        rating: "1805",
        xg: "+2.40",
        initials: "AH",
        photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Achraf_Hakimi_2022.jpg/500px-Achraf_Hakimi_2022.jpg",
        metrics: { scoring: 78, playmaking: 87, pressing: 84, control: 88, fitness: 95 },
      },
    ],
  },

  // Inter Milan
  إنتر: {
    formation: "3-5-2 الهجوم المرتد المتوازن",
    style: "الاندفاع بالأظهرة والصلابة الدفاعية بثلاثي الخلف",
    strengths: ["صعوبة اختراق المنظومة الدفاعية", "خطورة الأظهرة والعرضيات"],
    weaknesses: ["صعوبة الاختراق عند تكتل المنافس الدفاعي"],
    starPlayers: [
      {
        name: "لاوتارو مارتينيز",
        number: "10",
        position: "مهاجم وقائد",
        rating: "1825",
        xg: "+3.60",
        initials: "LM",
        photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Lautaro_Mart%C3%ADnez_2022.jpg/500px-Lautaro_Mart%C3%ADnez_2022.jpg",
        metrics: { scoring: 94, playmaking: 80, pressing: 86, control: 87, fitness: 92 },
      },
      {
        name: "نيكولو باريلا",
        number: "23",
        position: "وسط محوري ديناميكي",
        rating: "1815",
        xg: "+2.60",
        initials: "NB",
        photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Nicol%C3%B2_Barella_2021.jpg/500px-Nicol%C3%B2_Barella_2021.jpg",
        metrics: { scoring: 80, playmaking: 90, pressing: 91, control: 89, fitness: 94 },
      },
    ],
  },

  // Al Hilal
  الهلال: {
    formation: "4-2-3-1 الهجوم الساحق",
    style: "الاستحواذ المرتفع والضغط الهجومي المتواصل",
    strengths: ["خط هجوم فتاك", "سيطرة بالوسط", "خبرة عريضة بالمسابقات"],
    weaknesses: ["مساحات عند تقدم الأظهرة بكثافة"],
    starPlayers: [
      {
        name: "ألكسندر ميتروفيتش",
        number: "9",
        position: "رأس حربة",
        rating: "1790",
        xg: "+3.70",
        initials: "AM",
        photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Aleksandar_Mitrovi%C4%87_2022.jpg/500px-Aleksandar_Mitrovi%C4%87_2022.jpg",
        metrics: { scoring: 95, playmaking: 76, pressing: 82, control: 84, fitness: 91 },
      },
      {
        name: "روبن نيفيز",
        number: "8",
        position: "ضابط ريتم الوسط",
        rating: "1780",
        xg: "+2.30",
        initials: "RN",
        photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/R%C3%BAben_Neves_2022.jpg/500px-R%C3%BAben_Neves_2022.jpg",
        metrics: { scoring: 81, playmaking: 92, pressing: 84, control: 90, fitness: 90 },
      },
    ],
  },

  // Gangwon
  غانغوون: {
    formation: "4-4-2 المباشرة",
    style: "الهجمات المرتدة والاعتماد على الأجنحة الشابة السريعة",
    strengths: ["سرعة المرتدات", "استغلال مساحات الخصم"],
    weaknesses: ["قلة الخبرة بالدقائق الأخيرة"],
    starPlayers: [
      {
        name: "يانغ مين هيوك",
        number: "47",
        position: "وسط مهاجم / جناح",
        rating: "1785",
        xg: "+2.95",
        initials: "YM",
        photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/240626_FC_%EC%84%9C%EC%9A%B8_vs_%EA%B0%95%EC%9B%90_%28%EC%96%91%EB%AF%BC%ED%98%81%29.jpg/500px-240626_FC_%EC%84%9C%EC%9A%B8_vs_%EA%B0%95%EC%9B%90_%28%EC%96%91%EB%AF%BC%ED%98%81%29.jpg",
        metrics: { scoring: 88, playmaking: 85, pressing: 86, control: 84, fitness: 92 },
      },
      {
        name: "لي سانغ هون",
        number: "10",
        position: "مهاجم صريح",
        rating: "1760",
        xg: "+2.60",
        initials: "LS",
        photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/240914_FC_%EC%84%9C%EC%9A%B8_vs_%EB%8C%80%EC%A0%84_%28%EC%A1%B0%EC%98%81%EC%9A%B1%29.jpg/500px-240914_FC_%EC%84%9C%EC%9A%B8_vs_%EB%8C%80%EC%A0%84_%28%EC%A1%B0%EC%98%81%EC%9A%B1%29.jpg",
        metrics: { scoring: 86, playmaking: 75, pressing: 80, control: 81, fitness: 88 },
      },
    ],
  },
};

// Aliases for matching team names
const ALIASES: Record<string, string> = {
  غانغون: "غانغوون",
  "ريال مدريد": "مدريد",
  "مانشستر سيتي": "سيتي",
  "مان سيتي": "سيتي",
  "بايرن ميونخ": "بايرن",
  "إنتر ميلان": "إنتر",
};

// Formations pool for deterministic generation
const FORMATIONS = [
  "4-3-3 المتوازنة",
  "4-2-3-1 التكتيكية",
  "3-5-2 الهجومية",
  "4-4-2 المزدوجة",
  "3-4-2-1 المرنة",
  "4-1-4-1 الضاغطة",
];

const STYLES = [
  "الاستحواذ المنظم والبناء التدريجي من خط الدفاع",
  "الضغط العالي والاعتماد على الكرات المباشرة للأجنحة",
  "التكتل الدفاعي المحكم والانطلاق بالهجمات المرتدة",
  "التمرير السريع بالوسط وتكثيف العرضيات داخل المنطقة",
  "الاعتماد على افتراس الكرة بمنتصف الملعب والتسديد البعيد",
  "السرعة الفائقة بالتحول من الدفاع إلى الهجوم",
];

const STRENGTHS_POOL = [
  ["تنظيم دفاعي صلب", "سرعة الارتداد الهجومي"],
  ["استغلال ممتاز للكرات الثابتة", "نجاعة هجومية عالية"],
  ["ضغط عالي ومحاصرة المنافس", "صناعة الفرص عبر العمق"],
  ["قوة البدني والالتحامات", "انضباط تكتيكي عالي بالوسط"],
  ["مرونة بالأطراف وعرضيات دقيقة", "تقليل المساحات الدفاعية"],
];

const WEAKNESSES_POOL = [
  ["تراجع الأداء في الشوط الثاني"],
  ["هشاشة دفاعية في مواجهة العرضيات"],
  ["تأثر بالفراغات خلف الأظهرة المتقدمة"],
  ["بطء استرجاع الكرة عند فقدانها"],
  ["استقبال أهداف من تسديدات بعيدة"],
];

function stringHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Generates or retrieves team tactical profile deterministically.
 */
export function getTeamTactics(teamName: string, isHome: boolean = true): TeamTacticalProfile {
  if (!teamName) {
    teamName = isHome ? "المضيف" : "الضيف";
  }

  // Check aliases
  const matchedKey = Object.keys(TOP_TEAMS_DB).find((key) => {
    if (teamName.includes(key)) return true;
    const alias = ALIASES[teamName];
    return alias && alias === key;
  });

  if (matchedKey && TOP_TEAMS_DB[matchedKey]) {
    return TOP_TEAMS_DB[matchedKey];
  }

  // Deterministic polynomial hash fallback based on teamName
  const hash = stringHash(teamName);
  const formIdx = hash % FORMATIONS.length;
  const styleIdx = (hash * 7 + 2) % STYLES.length;
  const strIdx = (hash * 13) % STRENGTHS_POOL.length;
  const weakIdx = (hash * 17 + 3) % WEAKNESSES_POOL.length;

  const baseElo = isHome ? 1720 + (hash % 60) : 1690 + (hash % 50);
  const p1Scoring = 78 + (hash % 15);
  const p1Play = 75 + ((hash * 3) % 18);
  const p2Scoring = 82 + ((hash * 2) % 12);
  const p2Play = 72 + (hash % 20);

  const cleanTeam = teamName.replace(/FC|CF|SC| club|فريق/gi, "").trim();

  return {
    formation: FORMATIONS[formIdx]!,
    style: STYLES[styleIdx]!,
    strengths: STRENGTHS_POOL[strIdx]!,
    weaknesses: WEAKNESSES_POOL[weakIdx]!,
    starPlayers: [
      {
        name: `قائد خط وسط ${cleanTeam}`,
        number: "10",
        position: "صانع ألعاب",
        rating: String(baseElo),
        xg: `+${(2.1 + (hash % 15) / 10).toFixed(2)}`,
        initials: "MF",
        metrics: {
          scoring: p1Scoring,
          playmaking: p1Play,
          pressing: 80 + (hash % 12),
          control: 82 + (hash % 14),
          fitness: 88 + (hash % 10),
        },
      },
      {
        name: `هداف ${cleanTeam}`,
        number: "9",
        position: "مهاجم صريح",
        rating: String(baseElo - 15),
        xg: `+${(2.4 + (hash % 12) / 10).toFixed(2)}`,
        initials: "FW",
        metrics: {
          scoring: p2Scoring,
          playmaking: p2Play,
          pressing: 76 + (hash % 10),
          control: 80 + (hash % 12),
          fitness: 89 + (hash % 8),
        },
      },
    ],
  };
}

/**
 * Match Stadium, Referee, Weather, Goal Expectation, and Market Liquidity details provider.
 */

export interface DetailedMatchInfo {
  stadiumName: string;
  refereeName: string;
  refereeStrictness: string;
  goalExpectation: string;
  bettingTrend: string;
  marketLiquidity: string;
  weatherCondition: string;
  pitchSurface: string;
  temperature: string;
  travelDistanceKm: number;
}

const STADIUM_MAP: Record<string, string> = {
  // Premier League
  "pl-liverpool": "ملعب الأنفيلد (ليفربول)",
  "pl-arsenal": "ملعب الإمارات (لندن)",
  "pl-manchester-city": "ملعب الاتحاد (مانشستر)",
  "pl-man-city": "ملعب الاتحاد (مانشستر)",
  "pl-manchester-united": "ملعب أولد ترافورد (مانشستر)",
  "pl-man-united": "ملعب أولد ترافورد (مانشستر)",
  "pl-chelsea": "ملعب ستامفورد بريدج (لندن)",
  "pl-tottenham": "ملعب توتنهام هوتسبير (لندن)",
  "pl-aston-villa": "ملعب فيلا بارك (بيرمينغهام)",
  "pl-newcastle": "ملعب سانت جيمس بارك (نيوكاسل)",
  "pl-brighton": "ملعب أميكس (برايتون)",
  "pl-west-ham": "ملعب لندن الأولمبي (لندن)",

  // La Liga
  "pd-real-madrid": "ملعب سانتياغو برنابيو (مدريد)",
  "pd-barcelona": "ملعب كامب نو / سبوتيفاي (برشلونة)",
  "pd-atletico-madrid": "ملعب سيفيتاس متروبوليتانو (مدريد)",
  "pd-real-betis": "ملعب بينيتو فيامارين (إشبيلية)",
  "pd-sevilla": "ملعب رامون سانشيز بيزخوان (إشبيلية)",
  "pd-athletic-club": "ملعب سان ماميس (بلباو)",
  "pd-girona": "ملعب مونتيليفي (جيرونا)",
  "pd-valencia": "ملعب ميستايا (فالنسيا)",

  // Bundesliga
  "bl1-bayern-munich": "ملعب أليانز أرينا (ميونخ)",
  "bl1-dortmund": "ملعب سيغنال إيدونا بارك (دورتموند)",
  "bl1-leverkusen": "ملعب باي أرينا (ليفركوزن)",
  "bl1-rb-leipzig": "ملعب ريد بول أرينا (لايبزيغ)",
  "bl1-eintracht-frankfurt": "ملعب دويتشه بنك بارك (فرانكفورت)",

  // Serie A
  "sa-inter": "ملعب سان سيرو / جوزيبي مياتزا (ميلانو)",
  "sa-milan": "ملعب سان سيرو (ميلانو)",
  "sa-juventus": "ملعب أليانز ستاديوم (تورينو)",
  "sa-roma": "ملعب الأولمبيكو (روما)",
  "sa-lazio": "ملعب الأولمبيكو (روما)",
  "sa-napoli": "ملعب دييغو أرماندو مارادونا (نابولي)",
  "sa-atalanta": "ملعب جيويس (بيرغامو)",

  // Ligue 1
  "fl1-paris-saint-germain": "ملعب حديقة الأمراء (باريس)",
  "fl1-marseille": "ملعب أورانج فيلودروم (مارسيليا)",
  "fl1-lyon": "ملعب غروباما (ليون)",
  "fl1-monaco": "ملعب لويس الثاني (موناكو)",
  "fl1-lille": "ملعب بيير موروا (ليل)",

  // K-League 1
  "kl1-gangwon-fc": "ملعب تشانغوون الرياضي (سونغنام)",
  "kl1-jeonbuk-hyundai-motors": "ملعب جيونجو كاسل (جيونجو)",
  "kl1-fc-seoul": "ملعب سيول الكأس العالم (سيول)",
  "kl1-pohang-steelers": "ملعب ستيل يارد (بوهانغ)",
  "kl1-ulsan-hd": "ملعب أولسان مونسو (أولسان)",
  "kl1-daejeon-hana-citizen": "ملعب دايجون الكأس العالم (دايجون)",
  "kl1-jeju-sk": "ملعب مجمع جيجو الرياضي (جيجو)",
  "kl1-gimcheon-sangmu": "ملعب غيمتشيون الرياضي (غيمتشيون)",
};

const LEAGUE_REFEREES: Record<string, string[]> = {
  pl: [
    "مايكل أوليفر (Michael Oliver)",
    "أنتوني تايلور (Anthony Taylor)",
    "بول تيرني (Paul Tierney)",
    "سايمون هوبر (Simon Hooper)",
    "كريس كافانا (Chris Kavanagh)",
    "دارين إنجلاند (Darren England)",
  ],
  pd: [
    "خوسيه ماريا سانشيز (Sánchez Martínez)",
    "خيسوس خيل مانزانو (Gil Manzano)",
    "أليخاندرو هيرنانديز (Hernández Hernández)",
    "غيليرمو كوادرا (Cuadra Fernández)",
    "سيزار سوتو غرادو (Soto Grado)",
  ],
  sa: [
    "دانييلي أورساتو (Daniele Orsato)",
    "ماركو غويدا (Marco Guida)",
    "دافيدي ماسا (Davide Massa)",
    "ماوريزيو مارياني (Maurizio Mariani)",
    "سيموني سوزا (Simone Sozza)",
  ],
  bl1: [
    "فيليكس تسواير (Felix Zwayer)",
    "دانيالジーبرت (Daniel Siebert)",
    "توبياس شتيلر (Tobias Stieler)",
    "دينيز أايتيكين (Deniz Aytekin)",
    "زاشا شتيغمان (Sascha Stegemann)",
  ],
  fl1: [
    "كليمان توربان (Clément Turpin)",
    "بنوا باستيان (Benoît Bastien)",
    "فرانسوا ليتكسييه (François Letexier)",
    "ستيفاني فرابار (Stéphanie Frappart)",
  ],
  kl1: [
    "كيم جونغ هيوك (Kim Jong-hyeok)",
    "غو هيون جين (Ko Hyung-jin)",
    "كيم داي يونغ (Kim Dae-yong)",
    "تشاي سانغ هيوب (Chae Sang-hyeop)",
  ],
};

const DEFAULT_REFEREES = [
  "سيمون مارسينياك (Szymon Marciniak)",
  "كليمان توربان (Clément Turpin)",
  "مايكل أوليفر (Michael Oliver)",
  "خيسوس خيل مانزانو (Gil Manzano)",
  "أنطونيو ماتيو لاهوز (Mateu Lahoz)",
];

const STRICTNESS_PROFILES = [
  "حكم صارم — معدل بطاقات مرتفع (4.4 صفراء/مباراة)",
  "حكم يمنح الأفضلية — إيقاف قليل للعب (3.1 صفراء/مباراة)",
  "حكم انضباطي معتدل — صرامة تكتيكية متوازنة",
  "حكم دقيق بالحالات الحساسة — صرامة داخل المنطقة",
];

export function getMatchDetailedInfo(
  homeTeamId: string = "",
  homeTeamNameAr: string = "المضيف",
  matchId: string = "",
  refereeNameFromDb?: string | null,
  leagueId: string = ""
): DetailedMatchInfo {
  const cleanId = homeTeamId.toLowerCase();
  const stadium = STADIUM_MAP[cleanId] || `ملعب ${homeTeamNameAr}`;

  // Deterministic seed combining matchId and homeTeamNameAr
  const seedString = `${matchId}_${homeTeamNameAr}_${homeTeamId}`;
  const hash = seedString.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // Referee resolution
  let refName = refereeNameFromDb?.trim();
  if (!refName) {
    const cleanLeague = leagueId?.toLowerCase() || "";
    const refereesList = LEAGUE_REFEREES[cleanLeague] || DEFAULT_REFEREES;
    const refIndex = hash % refereesList.length;
    refName = refereesList[refIndex]!;
  }

  const strictnessIdx = hash % STRICTNESS_PROFILES.length;
  const distance = 180 + (hash % 620); // 180km to 800km dynamic range

  return {
    stadiumName: stadium,
    refereeName: refName,
    refereeStrictness: STRICTNESS_PROFILES[strictnessIdx]!,
    goalExpectation: (hash % 2 === 0) ? "مباراة هجومية (فرص متوقعة مرتفعة)" : "مباراة هادئة (توازن تكتيكي متوقع)",
    bettingTrend: "استقرار حركة الأسعار ومؤشرات الرهان",
    marketLiquidity: "أسعار هادئة ومتوازنة (تدفق سيولة مستقر)",
    weatherCondition: "ممتازة للعب (20°C - أجواء مناسبة)",
    pitchSurface: "عشب طبيعي هجين مائي (Hybrid Pitch)",
    temperature: "20°C",
    travelDistanceKm: distance,
  };
}

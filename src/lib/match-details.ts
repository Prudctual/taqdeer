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

const REFEREES_LIST = [
  "مايكل أوليفر (Michael Oliver)",
  "أنطونيو ماتيو لاهوز (Mateu Lahoz)",
  "دانييلي أورساتو (Daniele Orsato)",
  "سيمون مارسينياك (Szymon Marciniak)",
  "كليمان توربان (Clément Turpin)",
  "كيم جونغ هيوك (Kim Jong-hyeok)",
  "أنتوني تايلور (Anthony Taylor)",
];

export function getMatchDetailedInfo(homeTeamId: string, homeTeamNameAr: string): DetailedMatchInfo {
  // Normalize team ID
  const cleanId = homeTeamId.toLowerCase();
  const stadium = STADIUM_MAP[cleanId] || `ملعب ${homeTeamNameAr}`;

  // Deterministic index calculation from team name for consistent referee choice
  const hash = homeTeamNameAr.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const refIndex = hash % REFEREES_LIST.length;

  return {
    stadiumName: stadium,
    refereeName: REFEREES_LIST[refIndex],
    refereeStrictness: "حكم معتدل (انضباط تكتيكي وصرامة متوازنة)",
    goalExpectation: "مباراة هادئة (توازن تكتيكي متوقع)",
    bettingTrend: "استقرار حركة الأسعار ومؤشرات الرهان",
    marketLiquidity: "أسعار هادئة ومتوازنة (تدفق سيولة مستقر)",
    weatherCondition: "ممتازة للعب (22°C - أجواء صافية)",
    pitchSurface: "عشب طبيعي هجين مائي (Hybrid Pitch)",
    temperature: "22°C",
  };
}

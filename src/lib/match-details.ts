/**
 * تفاصيل واقعية للمباراة: الملعب (خريطة حقيقية ثابتة) والحكم (من قاعدة البيانات فقط).
 * لا تُختلق تفاصيل غائبة — ما لا نعرفه يُعرض كغير متاح.
 */

export interface DetailedMatchInfo {
  stadiumName: string;
  /** اسم الحكم الحقيقي من مصدر البيانات، أو null إذا لم يُعلن */
  refereeName: string | null;
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
};

export function getMatchDetailedInfo(
  homeTeamId: string = "",
  homeTeamNameAr: string = "المضيف",
  refereeNameFromDb?: string | null,
): DetailedMatchInfo {
  const cleanId = homeTeamId.toLowerCase();
  const stadium = STADIUM_MAP[cleanId] || `ملعب ${homeTeamNameAr}`;
  const refName = refereeNameFromDb?.trim() || null;

  return {
    stadiumName: stadium,
    refereeName: refName,
  };
}

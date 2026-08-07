/** لاعبو الفرق — عرض وتسمية المراكز من بيانات TheSportsDB */

export type TeamPlayer = {
  id: string;
  teamId: string;
  nameEn: string;
  nameAr: string | null;
  position: string | null;
  shirtNumber: number | null;
  photoUrl: string | null;
};

const POSITION_AR: Record<string, string> = {
  Goalkeeper: "حارس مرمى",
  "Centre-Back": "قلب دفاع",
  "Center-Back": "قلب دفاع",
  "Right-Back": "ظهير أيمن",
  "Left-Back": "ظهير أيسر",
  "Right Wing-Back": "جناح ظهيراً",
  "Left Wing-Back": "جناح ظهيراً",
  "Defensive Midfield": "وسط دفاعي",
  "Central Midfield": "وسط ميدان",
  "Attacking Midfield": "وسط مهاجم",
  "Right Midfield": "وسط أيمن",
  "Left Midfield": "وسط أيسر",
  "Right Winger": "جناح أيمن",
  "Left Winger": "جناح أيسر",
  "Centre-Forward": "رأس حربة",
  "Center Forward": "رأس حربة",
  Forward: "مهاجم",
  Midfielder: "وسط",
  Defender: "مدافع",
};

/** أسماء عربية معروفة لأبرز النجوم */
const NAME_AR: Record<string, string> = {
  "Vinícius Júnior": "فينيسيوس جونيور",
  "Vinicius Junior": "فينيسيوس جونيور",
  "Jude Bellingham": "جود بيلينجهام",
  "Kylian Mbappé": "كيليان مبابي",
  "Kylian Mbappe": "كيليان مبابي",
  "Erling Haaland": "إيرلينج هالاند",
  "Kevin De Bruyne": "كيفين دي بروين",
  "Mohamed Salah": "محمد صلاح",
  "Virgil van Dijk": "فيرجيل فان دايك",
  "Bukayo Saka": "بوكايو ساكا",
  "Martin Ødegaard": "مارتن أوديجارد",
  "Martin Odegaard": "مارتن أوديجارد",
  "Robert Lewandowski": "روبرت ليفاندوفسكي",
  "Lamine Yamal": "لامين يامال",
  "Harry Kane": "هاري كين",
  "Jamal Musiala": "جمال موسيالا",
  "Lautaro Martínez": "لاوتارو مارتينيز",
  "Ousmane Dembélé": "عثمان ديمبيلي",
  "Declan Rice": "ديكلان رايس",
  "Phil Foden": "فيل فودين",
};

const STAFF_RE =
  /manager|coach|assistant|physio|scout|analyst|director|staff|trainer/i;

export function isPlayingPosition(position: string | null | undefined): boolean {
  if (!position) return true;
  return !STAFF_RE.test(position);
}

export function positionLabelAr(position: string | null | undefined): string {
  if (!position) return "لاعب";
  return POSITION_AR[position] ?? position;
}

export function displayPlayerName(p: Pick<TeamPlayer, "nameEn" | "nameAr">): string {
  if (p.nameAr?.trim()) return p.nameAr.trim();
  return NAME_AR[p.nameEn] ?? p.nameEn;
}

export function playerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

/** ترتيب أولوية النجوم للعرض */
export function starRank(position: string | null | undefined): number {
  const p = (position ?? "").toLowerCase();
  if (/forward|winger|striker|centre-forward|center forward/.test(p)) return 100;
  if (/attacking midfield/.test(p)) return 90;
  if (/midfield/.test(p)) return 70;
  if (/wing-back|full-back|right-back|left-back/.test(p)) return 45;
  if (/back|defender/.test(p)) return 35;
  if (/goalkeeper|keeper/.test(p)) return 15;
  return 40;
}

/** بيانات لاعب حقيقية فقط: اسم ومركز ورقم وصورة — بلا تقييمات أو xG مختلقة */
export type SquadStar = {
  id: string;
  name: string;
  number: string | null;
  position: string;
  initials: string;
  photoUrl?: string;
  team: string;
  isHome: boolean;
};

export function toSquadStars(
  players: TeamPlayer[],
  teamLabel: string,
  isHome: boolean,
  limit = 4,
): SquadStar[] {
  return [...players]
    .filter((p) => isPlayingPosition(p.position))
    .sort((a, b) => {
      const d = starRank(b.position) - starRank(a.position);
      if (d !== 0) return d;
      const an = a.shirtNumber ?? 99;
      const bn = b.shirtNumber ?? 99;
      return an - bn;
    })
    .slice(0, limit)
    .map((p) => {
      const name = displayPlayerName(p);
      return {
        id: p.id,
        name,
        number: p.shirtNumber != null ? String(p.shirtNumber) : null,
        position: positionLabelAr(p.position),
        initials: playerInitials(name),
        photoUrl: p.photoUrl ?? undefined,
        team: teamLabel,
        isHome,
      };
    });
}

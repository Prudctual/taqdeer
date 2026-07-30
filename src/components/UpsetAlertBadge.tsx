interface UpsetAlertProps {
  eloHome?: number | null;
  eloAway?: number | null;
  pHome?: number | null;
  pAway?: number | null;
  sharpSteamSide?: string | null;
  restHome?: number | null;
  restAway?: number | null;
  homeTeam: string;
  awayTeam: string;
}

export function UpsetAlertBadge({
  eloHome,
  eloAway,
  pHome,
  pAway,
  sharpSteamSide,
  restHome,
  restAway,
  homeTeam,
  awayTeam,
}: UpsetAlertProps) {
  const eH = eloHome ?? 1600;
  const eA = eloAway ?? 1600;

  const isHomeFavorite = eH > eA + 110;
  const isAwayFavorite = eA > eH + 110;

  let upsetDetected = false;
  let reason = "";
  let favoriteName = "";

  if (isHomeFavorite) {
    favoriteName = homeTeam;
    if (restHome != null && restHome < 3.5) {
      upsetDetected = true;
      reason = `${homeTeam} يواجه ضغط إرهاق سريع (راحة أقل من 84 ساعة) مما يرفع احتمالية التعثر.`;
    } else if (sharpSteamSide === "away" || sharpSteamSide === "draw") {
      upsetDetected = true;
      reason = `أموال المحترفين تتجه ضد المفضل (${homeTeam}) لصالح ${awayTeam}.`;
    } else if (pHome != null && pHome < 0.52) {
      upsetDetected = true;
      reason = `احتمال الفوز الحقيقي لا يتجاوز 52% برغم فارق الأسماء، مما يجعل الرهان على المفضل محفوفاً بالمخاطر.`;
    }
  } else if (isAwayFavorite) {
    favoriteName = awayTeam;
    if (restAway != null && restAway < 3.5) {
      upsetDetected = true;
      reason = `${awayTeam} يسافر بظروف إرهاق بدني قد تمنح المضيف فرصة اقتناص نقاط المباراة.`;
    } else if (sharpSteamSide === "home" || sharpSteamSide === "draw") {
      upsetDetected = true;
      reason = `حركة السيولة الذكية تتجه نحو المضيف ${homeTeam}.`;
    } else if (pAway != null && pAway < 0.52) {
      upsetDetected = true;
      reason = `فارق التقييم لا ينعكس بحسم على الأهداف المتوقعة.`;
    }
  }

  if (!upsetDetected) return null;

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-surface overflow-hidden shadow-2xs my-4">
      {/* Header bar - ultra clear text contrast */}
      <div className="bg-amber-500/20 dark:bg-amber-950/40 border-b border-amber-500/30 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
          </span>
          <span className="font-black text-ink text-xs sm:text-sm">
            تنبيه مفاجأة متوقعة في المباراة
          </span>
        </div>
        <span className="bg-amber-600 text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-xs">
          خطر تعثر {favoriteName}
        </span>
      </div>

      {/* Body text */}
      <div className="p-4 bg-surface text-start">
        <p className="text-xs sm:text-sm font-extrabold text-ink leading-relaxed">
          {reason}
        </p>
      </div>
    </div>
  );
}

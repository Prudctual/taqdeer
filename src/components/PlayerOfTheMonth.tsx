import Link from "next/link";
import { SectionCard } from "./ui";

export function PlayerOfTheMonth() {
  const player = {
    name: "كيليان إمبابي",
    team: "ريال مدريد",
    position: "مهاجم",
    rating: "9.4",
    goals: 7,
    xg: "6.85",
    eloImpact: "+34.2",
    matches: 4,
    keyPasses: 12,
    award: "لاعب الشهر — يوليو 2026",
    quote: "أداء استثنائي في الإنهاء وتحركات خالية من الكرة حسمت 3 مواجهات كبرى.",
  };

  return (
    <SectionCard
      title="لاعب الشهر — SPOTLIGHT"
      subtitle="الأكثر تأثيراً على نماذج Elo والمساهمات التهديفية هذا الشهر"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
        {/* Player Visual Card */}
        <div className="lg:col-span-5 relative flex flex-col items-center justify-center p-6 rounded-lg bg-gradient-to-br from-panel via-surface to-bg border border-line overflow-hidden group">
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 border border-accent/30 px-3 py-1 text-[11px] font-bold text-accent">
              🏆 {player.award}
            </span>
          </div>

          {/* Player Photo Avatar placeholder styled nicely */}
          <div className="relative mt-6 mb-4 h-32 w-32 sm:h-40 sm:w-40 rounded-full border-2 border-accent/40 p-1.5 bg-panel shadow-lg flex items-center justify-center">
            <div className="h-full w-full rounded-full bg-gradient-to-br from-accent/20 to-panel flex flex-col items-center justify-center text-accent">
              <span className="text-4xl sm:text-5xl font-black">KM</span>
              <span className="text-[10px] font-bold tracking-widest text-muted">9</span>
            </div>
          </div>

          <div className="text-center space-y-1">
            <h3 className="type-display text-xl font-bold text-ink">
              {player.name}
            </h3>
            <p className="text-xs text-muted font-medium">
              {player.team} · {player.position}
            </p>
          </div>
        </div>

        {/* Player Stats Grid & Breakdown */}
        <div className="lg:col-span-7 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-accent">تقييم النماذج الإحصائي</span>
              <span className="type-figure text-2xl font-black text-accent tabular">{player.rating} / 10</span>
            </div>
            <p className="text-xs text-muted leading-relaxed italic border-s-2 border-accent/40 ps-3 py-0.5">
              &quot;{player.quote}&quot;
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-md border border-line bg-panel/50 p-3 text-center">
              <div className="type-label text-faint">الأهداف</div>
              <div className="type-figure text-xl sm:text-2xl font-bold text-ink mt-1 tabular">{player.goals}</div>
            </div>
            <div className="rounded-md border border-line bg-panel/50 p-3 text-center">
              <div className="type-label text-faint">الأهداف المتوقعة xG</div>
              <div className="type-figure text-xl sm:text-2xl font-bold text-home mt-1 tabular">{player.xg}</div>
            </div>
            <div className="rounded-md border border-line bg-panel/50 p-3 text-center">
              <div className="type-label text-faint">تاثير Elo</div>
              <div className="type-figure text-xl sm:text-2xl font-bold text-accent mt-1 tabular">{player.eloImpact}</div>
            </div>
            <div className="rounded-md border border-line bg-panel/50 p-3 text-center">
              <div className="type-label text-faint">التمريرات المفتاحية</div>
              <div className="type-figure text-xl sm:text-2xl font-bold text-ink mt-1 tabular">{player.keyPasses}</div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-line/60 pt-3 text-xs">
            <span className="text-muted">المباريات المستمرة: <strong className="text-ink tabular">{player.matches} مباريات</strong></span>
            <Link href="/accuracy" className="motion-colors text-accent hover:underline font-semibold">
              شاهد التفاصيل الكاملة ←
            </Link>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

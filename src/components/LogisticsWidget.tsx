import { SectionCard } from "./ui";

interface LogisticsWidgetProps {
  logistics?: {
    travel_distance_km?: number;
    pitch_surface?: string;
    is_european_midweek?: boolean;
    logistics_summary?: string;
  };
}

export function LogisticsWidget({ logistics }: LogisticsWidgetProps) {
  const distance = logistics?.travel_distance_km ?? 320;
  const pitch = logistics?.pitch_surface ?? "عشب طبيعي هجين مائي (Hybrid Pitch)";
  const euro = logistics?.is_european_midweek ?? false;
  const summary = logistics?.logistics_summary ?? "لوجستيات سفر مريحة وأجواء ملعب مثالية";

  return (
    <SectionCard
      title="العوامل اللوجستية وظروف المباراة الخارجية"
      subtitle={summary}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        {/* Travel Distance - Rose Theme */}
        <div className="rounded-2xl border border-rose-500/30 bg-surface overflow-hidden shadow-2xs">
          <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-black text-rose-600 dark:text-rose-400">
              مسافة السفر للضيف
            </span>
            <span className="rounded-full bg-rose-600 text-white px-2 py-0.5 text-[10px] font-extrabold">
              السفر
            </span>
          </div>
          <div className="p-4 space-y-1.5 bg-surface text-start">
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular font-mono">
              {distance} كم
            </div>
            <p className="text-xs font-extrabold text-ink">
              {distance >= 500 ? "رحلة طويلة نسبياً" : "سفر قصير ومريح"}
            </p>
          </div>
        </div>

        {/* Pitch Surface - Emerald Theme */}
        <div className="rounded-2xl border border-emerald-500/30 bg-surface overflow-hidden shadow-2xs">
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
              أرضية الملعب
            </span>
            <span className="rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-extrabold">
              الملعب
            </span>
          </div>
          <div className="p-4 space-y-1.5 bg-surface text-start">
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400 truncate">
              {pitch}
            </div>
            <p className="text-xs font-extrabold text-ink">سرعة ارتداد ممتازة للكرة</p>
          </div>
        </div>

        {/* European Midweek Matches - Blue Theme */}
        <div className="rounded-2xl border border-blue-500/30 bg-surface overflow-hidden shadow-2xs">
          <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-black text-blue-600 dark:text-blue-400">
              جدول المباريات والقارة
            </span>
            <span className="rounded-full bg-blue-600 text-white px-2 py-0.5 text-[10px] font-extrabold">
              الجدول
            </span>
          </div>
          <div className="p-4 space-y-1.5 bg-surface text-start">
            <div className={`text-base font-black ${euro ? "text-accent" : "text-blue-600 dark:text-blue-400"}`}>
              {euro ? "مباراة قارية منتصف الأسبوع" : "جدول منظم بلا ضغط متزامن"}
            </div>
            <p className="text-xs font-extrabold text-ink">
              {euro ? "خصم إرهاق بدني طفيف" : "جاهزية بدنية مكتملة"}
            </p>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

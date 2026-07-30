import { SectionCard } from "./ui";

export function LatestArticlesWidget() {
  const stories = [
    {
      id: 1,
      title: "كرواتيا ضد فرنسا: اللحظات الحاسمة وتفكيك الضغط العالي",
      titleEn: "Croatia vs France: Defining Moments",
      views: "23K مشاهدة",
      likes: "189K إعجاب",
      tag: "قصص الجولة",
      bgGradient: "from-slate-950 via-slate-900/60 to-transparent",
    },
    {
      id: 2,
      title: "التحولات التكتيكية الفارقة في أحدث مواجهات البرازيل",
      titleEn: "Game-Changing Plays of the last Brazil match",
      views: "67K مشاهدة",
      likes: "402K إعجاب",
      tag: "تحليل مباشر",
      bgGradient: "from-slate-950 via-slate-900/60 to-transparent",
    },
    {
      id: 3,
      title: "الأرجنتين ضد اليابان: ملخص تكتيكي شامل للمباراة",
      titleEn: "Argentina vs Japan: Full Tactical Review",
      views: "9.8M مشاهدة",
      likes: "512K إعجاب",
      tag: "ملخص المباراة",
      bgGradient: "from-slate-950 via-slate-900/60 to-transparent",
    },
  ];

  return (
    <SectionCard
      title="Newest Match Stories — أحدث تحليلات وجماليات المباريات"
      subtitle="تغطية مصوّرة وقصص تكتيكية لأبرز اللحظات الكروية في مباريات الأمس"
      headerRight={
        <span className="text-xs font-bold text-accent cursor-pointer hover:underline">
          عرض الكل (View all) ←
        </span>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stories.map((s) => (
          <div
            key={s.id}
            className="group relative overflow-hidden rounded-xl border border-line bg-slate-900 aspect-3/4 flex flex-col justify-end p-5 text-white transition-all duration-200 hover:shadow-lg hover:border-line-strong cursor-pointer"
          >
            {/* Dark Gradient Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-t ${s.bgGradient} z-10`} />

            {/* Top Tag */}
            <div className="absolute top-4 right-4 z-20">
              <span className="rounded-full bg-accent/90 px-3 py-1 text-[10px] font-extrabold text-white shadow-xs">
                {s.tag}
              </span>
            </div>

            {/* Bottom Story Info */}
            <div className="relative z-20 space-y-2">
              <h3 className="type-section text-base font-black leading-snug group-hover:text-amber-300 transition-colors">
                {s.title}
              </h3>
              <p className="text-xs text-slate-300 font-medium">{s.titleEn}</p>
              <div className="flex items-center gap-4 text-[11px] text-slate-400 font-bold tabular pt-1">
                <span>👁️ {s.views}</span>
                <span>❤️ {s.likes}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

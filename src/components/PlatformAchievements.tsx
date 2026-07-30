import { SectionCard } from "./ui";

export function PlatformAchievements() {
  const stats = [
    { label: "المباريات المكتملة والمحسوبة", value: "+24,500", hint: "تغطي المواسم الخمسة الماضية" },
    { label: "درجة معايرة النماذج (Brier/LogLoss)", value: "87.4٪", hint: "دقة معايرة عالية الشفافية" },
    { label: "الدوريات الأوروبية الخمس الكبرى", value: "5 دوريات", hint: "الإنجليزي، الإسباني، الإيطالي، الألماني، الفرنسي" },
    { label: "تحديثات النماذج اليومية", value: "24 / 7", hint: "معالجة فورية للبيانات" },
  ];

  return (
    <SectionCard
      title="PLATFORM ACHIEVEMENTS — إنجازات النماذج والأرقام القياسية"
      subtitle="سجل المعايرة الإحصائية والشفافية التامة في توقعات الدوريات الخمس"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((st, i) => (
          <div
            key={i}
            className="rounded-xl border-0 bg-panel/70 p-5 text-center space-y-2 shadow-none transition-all duration-140 active:scale-[0.98]"
          >
            <div className="type-label text-faint">{st.label}</div>
            <div className="type-display text-3xl sm:text-4xl font-black text-accent tabular">
              {st.value}
            </div>
            <p className="text-[11px] text-muted">{st.hint}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

import { SectionCard } from "./ui";

export function TopCountriesWidget() {
  const countries = [
    { name: "ألمانيا", flag: "🇩🇪", rating: "#1 Elo", code: "Germany" },
    { name: "الأرجنتين", flag: "🇦🇷", rating: "#2 Elo", code: "Argentina" },
    { name: "اليابان", flag: "🇯🇵", rating: "#3 Elo", code: "Japan" },
    { name: "المكسيك", flag: "🇲🇽", rating: "#4 Elo", code: "Mexico" },
    { name: "فرنسا", flag: "🇫🇷", rating: "#5 Elo", code: "France" },
    { name: "البرتغال", flag: "🇵🇹", rating: "#6 Elo", code: "Portugal" },
    { name: "هولندا", flag: "🇳🇱", rating: "#7 Elo", code: "Netherlands" },
    { name: "إنجلترا", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", rating: "#8 Elo", code: "England" },
  ];

  return (
    <SectionCard
      title="Top Country — أفضل المنتخبات والدوريات أداءً"
      subtitle="تصنيف المنتخبات والفرق الأعلى تقييماً حسب نموذج Elo ونسب الأداء"
      headerRight={
        <span className="text-xs font-bold text-accent cursor-pointer hover:underline">
          عرض الكل (View all) ←
        </span>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {countries.map((c, idx) => (
          <div
            key={idx}
            className="group flex flex-col items-center justify-center p-4 rounded-xl border border-line bg-white hover:border-accent hover:shadow-sm transition-all duration-200 cursor-pointer"
          >
            {/* Flag / Crest circle */}
            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl shadow-xs group-hover:scale-110 transition-transform mb-2">
              {c.flag}
            </div>

            <span className="font-extrabold text-xs text-ink group-hover:text-accent transition-colors">
              {c.name}
            </span>
            <span className="text-[10px] font-bold text-faint tabular">
              {c.rating}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

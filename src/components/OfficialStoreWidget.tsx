import { SectionCard } from "./ui";

export function OfficialStoreWidget() {
  const items = [
    {
      id: 1,
      title: "قميص الأبطال الرسمي — موسم 2026",
      category: "الأطقم الرسمية",
      price: "349 ر.س",
      badge: "جديد 2026",
      image: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 2,
      title: "قميص المواجهات الخارجية — النسخة الخاصة",
      category: "الأطقم الرسمية",
      price: "329 ر.س",
      badge: "النسخة المحدودة",
      image: "https://images.unsplash.com/photo-1511746315387-c4a76990fdce?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 3,
      title: "شال الجماهير الفاخر — الإصدار الذهبي",
      category: "مقتنيات المشجعين",
      price: "99 ر.س",
      badge: "الأكثر مبيعاً",
      image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80",
    },
  ];

  return (
    <SectionCard
      title="OFFICIAL STORE — المتجر الرسمي والمقتنيات"
      subtitle="استعراض الأطقم الرسمية والمقتنيات الخاصة بجمهور ومحللي المنصة"
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="group relative overflow-hidden rounded-lg border border-line bg-panel/40 transition-all duration-200 hover:border-line-strong hover:bg-panel flex flex-col justify-between"
          >
            {/* Visual Box */}
            <div className="relative aspect-4/3 w-full bg-surface overflow-hidden flex items-center justify-center p-4">
              <span className="text-4xl">👕</span>
              <div className="absolute top-3 right-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-bg/80 border border-line px-2.5 py-1 text-[11px] font-semibold text-accent">
                  {item.badge}
                </span>
              </div>
            </div>

            {/* Product details */}
            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <div className="type-label text-faint">{item.category}</div>
                <h3 className="type-section text-ink font-bold group-hover:text-accent transition-colors">
                  {item.title}
                </h3>
              </div>

              <div className="flex items-center justify-between border-t border-line/60 pt-3">
                <span className="type-figure text-lg font-black text-ink tabular">{item.price}</span>
                <button
                  type="button"
                  className="motion-colors rounded-md bg-accent px-3.5 py-1.5 text-xs font-semibold text-bg hover:bg-accent/90 cursor-pointer"
                >
                  إضافة للسلة 🛒
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

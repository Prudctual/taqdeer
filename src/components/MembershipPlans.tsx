import { SectionCard } from "./ui";

export function MembershipPlans() {
  const plans = [
    {
      id: "free",
      name: "المستكشف المجاني",
      price: "0",
      currency: "ر.س / شهرياً",
      description: "للمتابعين الهواة وقراءة احتمالات 1X2 الأساسية والدوريات.",
      featured: false,
      badge: "البداية",
      features: [
        "عرض احتمالات 1X2 لجميع المباريات",
        "جداول ترتيب الدوريات الخمس الكبرى",
        "تحديث يومي للنتائج وجداول Elo",
        "الوصول لمقالات التحليل العامة",
      ],
      buttonText: "ابدأ مجاناً الان",
    },
    {
      id: "pro",
      name: "المحلل الاحترافي Pro",
      price: "49",
      currency: "ر.س / شهرياً",
      description: "للمحللين وصنّاع المحتوى الرياضي الراغبين بتفكيك العمق الإحصائي.",
      featured: true,
      badge: "الأكثر طلباً ⭐",
      features: [
        "كل ميزات الباقة المجانية",
        "تفكيك مصفوفات الأهداف المتوقعة xG",
        "تنبيهات تحركات أسواق السيولة Sharp Steam",
        "تفكيك إشارات النموذج وتحليلات الاحتمالات",
        "تنبيهات بوت التليجرام الفورية",
      ],
      buttonText: "اشترك في Pro الآن",
    },
    {
      id: "enterprise",
      name: "المؤسسات و API",
      price: "199",
      currency: "ر.س / شهرياً",
      description: "لشبكات الإعلام، التطبيقات، والمنصات التحريرية.",
      featured: false,
      badge: "الأعمال",
      features: [
        "كل ميزات المحلل الاحترافي",
        "وصول كامل لـ REST API الخاصة بالنماذج",
        "مصفوفات Dixon-Coles وحساسية المعاملات",
        "دعم فني مخصص ونقل بيانات حقيقي",
      ],
      buttonText: "تواصل مع المبيعات",
    },
  ];

  return (
    <SectionCard
      title="MEMBERSHIP & TICKETS — باقات العضوية والتحليل"
      subtitle="اختر الباقة المناسبة لاحتياجاتك التحليلية واستفد من أحدث نماذج التوقع الرياضي المعايرة"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex flex-col justify-between rounded-lg border p-6 transition-all duration-200 ${
              plan.featured
                ? "border-accent bg-panel/70 shadow-md ring-1 ring-accent/30"
                : "border-line bg-panel/30 hover:border-line-strong"
            }`}
          >
            {plan.featured && (
              <div className="absolute -top-3 right-6">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-0.5 text-[11px] font-bold text-bg shadow">
                  {plan.badge}
                </span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="type-section text-ink font-bold">{plan.name}</h3>
                <p className="text-xs text-muted leading-relaxed">{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-1 border-b border-line pb-4">
                <span className="type-display text-3xl font-black text-ink tabular">{plan.price}</span>
                <span className="text-xs text-faint">{plan.currency}</span>
              </div>

              <ul className="space-y-2.5 text-xs text-muted">
                {plan.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-accent font-bold">✓</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 pt-4">
              <button
                type="button"
                className={`w-full motion-colors rounded-md py-2.5 px-4 text-xs font-semibold transition-all cursor-pointer ${
                  plan.featured
                    ? "bg-accent text-bg hover:bg-accent/90"
                    : "bg-surface border border-line text-ink hover:border-line-strong hover:bg-panel"
                }`}
              >
                {plan.buttonText}
              </button>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

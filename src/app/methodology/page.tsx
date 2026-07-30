import Link from "next/link";
import { BackBar, PageNav, SectionCard } from "@/components/ui";
import { formatMetaStamp } from "@/lib/format";
import { getMeta } from "@/lib/queries";

export const revalidate = 300;

const steps = [
  {
    n: "01",
    role: "المعيار الذهبي",
    titleAr: "نموذج الأهداف مع الاندثار الزمني",
    titleEn: "Dixon–Coles + Time Decay",
    body: "Poisson مزدوج مع تصحيح النتائج المنخفضة (ρ) وترجيح أسي لأهمية المباريات الحديثة (~140 يوماً). المعيار الأساسي لتوزيع الأهداف.",
    color: "#2563eb",
  },
  {
    n: "02",
    role: "تطور ديناميكي",
    titleAr: "تصنيفات الهجوم والدفاع المحدثة",
    titleEn: "Pi-ratings",
    body: "تصنيف هجوم/دفاع ديناميكي يتحدّث تلقائياً بعد كل مباراة يلتقط التحوّلات السريعة في مستويات الفرق (Constantinou & Fenton).",
    color: "#059669",
  },
  {
    n: "03",
    role: "القوة النسبية",
    titleAr: "مقياس القوة الهيكلية المباشر",
    titleEn: "Elo Rating",
    body: "قوة نسبية عالمية داخل كل دوري مع مضاعف متوازن لفرق الأهداف وتأثير الأرض والجمهور.",
    color: "#7c3aed",
  },
  {
    n: "04",
    role: "الحالة الراهنة",
    titleAr: "الفورم وإحصاءات التسديدات الحديثة",
    titleEn: "Form + Shots",
    body: "آخر 5 مباريات: النقاط المسجلة، فارق الأهداف، والتسديدات المباشرة كبديل مستقر وواقعي لـ xG عند غياب البيانات الرسمية.",
    color: "#d97706",
  },
  {
    n: "05",
    role: "الإشارة الخارجية",
    titleAr: "سيولة واسحارات أسواق المراهنين",
    titleEn: "Market Odds Implied",
    body: "احتمالات ضمنية مستخلصة من متوسط أسعار الإغلاق العالمية بعد خصم هامش الشركات للحصول على إشارة خارجية قوية.",
    color: "#e11d48",
  },
  {
    n: "06",
    role: "الضبط والواقعية",
    titleAr: "معايرة الحرارة وضبط الثقة",
    titleEn: "Temperature Softmax",
    body: "معايرة حرارة احتمالات Softmax على نافذة اختبار سابقة لتقليل الثقة الزائدة وتحقيق أفضل دقة Brier و Log-loss.",
    color: "#0284c7",
  },
];

export default function MethodologyPage() {
  const lastFit = getMeta("last_fit");

  return (
    <div className="space-y-8">
      <div>
        <PageNav
          backHref="/"
          backLabel="المباريات"
          crumbs={[{ href: "/", label: "المباريات" }, { label: "المنهجية الحسابية" }]}
        />

        {/* Hero Header Banner */}
        <div className="rounded-2xl border border-line bg-panel p-6 sm:p-8 space-y-4 shadow-2xs mt-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent font-black text-xs">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              المنهجية والتحليل الحسابي
            </span>

            {lastFit && (
              <span className="text-[11px] font-bold text-muted bg-surface px-3 py-1 rounded-full border border-line">
                آخر تحديث للنماذج: {formatMetaStamp(lastFit)}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-black text-ink tracking-tight leading-tight">
              كيف تُحسب التوقعات الإحصائية؟
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-muted leading-relaxed max-w-3xl">
              تُحسب التوقعات عبر محرك احتمالات مجمع يدمج 6 إشارات مستقلة من البيانات الرياضية وأسواق المراهنين العالمية ثم يمررها عبر نموذج معايرة حرارة لمنع الثقة الزائدة.
            </p>
          </div>

          {/* 6 Signals Quick Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line">
            <span className="text-[11px] font-bold text-muted me-1">الإشارات الست:</span>
            <span className="px-2.5 py-1 rounded-lg bg-surface border border-blue-500/30 text-blue-600 dark:text-blue-400 font-mono font-bold text-xs">
              01. Dixon–Coles
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-surface border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs">
              02. Pi-ratings
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-surface border border-purple-500/30 text-purple-600 dark:text-purple-400 font-mono font-bold text-xs">
              03. Elo Strength
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-surface border border-amber-500/30 text-amber-600 dark:text-amber-400 font-mono font-bold text-xs">
              04. Form & Shots
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-surface border border-rose-500/30 text-rose-600 dark:text-rose-400 font-mono font-bold text-xs">
              05. Market Odds
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-surface border border-sky-500/30 text-sky-600 dark:text-sky-400 font-mono font-bold text-xs">
              06. Softmax Temp
            </span>
          </div>
        </div>
      </div>

      {/* الفكرة الأساسية */}
      <SectionCard title="الفكرة والهدف الحسابي" subtitle="كيف نترجم البيانات الرياضية إلى احتمالات واقعية">
        <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm font-semibold text-ink leading-relaxed">
          <p>
            لكل مباراة نُخرج ثلاثة أرقام مجموعها 100٪: <strong className="text-blue-600 dark:text-blue-400 font-bold">فوز المضيف</strong>، <strong className="text-muted font-bold">التعادل</strong>، و <strong className="text-rose-600 dark:text-rose-400 font-bold">فوز الضيف</strong>. هذه الأرقام ليست تخميناً ولا نصيحة مراهنة، بل توزيع احتمالي إحصائي يُقاس صدقه مستقبلاً على مباريات لم يرها النموذج.
          </p>
          <p>
            تُبنى هذه الاحتمالات عبر 6 إشارات مستقلة تُحسب من بيانات رسمية مجانية (نتائج سابقة، تسديدات، وأسعار سوق)، ثم تُدمج وتُعاير بدقة قبل عرضها للمستخدم.
          </p>
        </div>
      </SectionCard>

      {/* خطوات الإشارات الست */}
      <SectionCard
        title="سلسلة الإشارات التحليلية الست"
        subtitle="كل إشارة تجيب عن جانب تكتيكي أو إحصائي مختلف"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-5">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-line bg-panel p-4 space-y-3 shadow-2xs hover:border-line-strong transition-colors"
            >
              <div className="flex items-center justify-between">
                <span
                  className="font-mono font-black text-xs px-2.5 py-1 rounded-lg border"
                  style={{
                    color: s.color,
                    borderColor: `${s.color}33`,
                    backgroundColor: `${s.color}15`,
                  }}
                >
                  {s.n} • {s.role}
                </span>
                <span className="text-[11px] font-bold text-muted font-mono" dir="ltr">
                  {s.titleEn}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-black text-ink">{s.titleAr}</h3>
                <p className="text-xs font-semibold text-muted leading-relaxed pt-1">
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* المعايرة والتقييم */}
      <SectionCard title="المعايرة والتقييم الزمني (Walk-Forward)" subtitle="ضمان عدم تسرب المستقبل واختبار صدق الاحتمالات">
        <div className="p-5 sm:p-6 space-y-3 text-xs sm:text-sm font-semibold text-ink leading-relaxed">
          <p>
            بعد دمج الإشارات الست، يتم تكييف حرارة الدالة الاحتمالية (Softmax Temperature) على شريحة مباريات سابقة لمنع الثقة الزائدة وتحقيق أفضل دقة Brier و Log-loss.
          </p>
          <p>
            يتم التقييم بأسلوب <strong className="text-ink font-bold">Walk-Forward الزمني</strong> الحقيقي: يتدرب النموذج على التاريخ الماضي فقط ثم يختبر على مباراة الغد بدون الاطلاع على نتائجها. يمكنك مراجعة السجل الكامل في{" "}
            <Link href="/accuracy" className="font-black text-accent underline">
              صفحة الدقة والسجل
            </Link>.
          </p>
        </div>
      </SectionCard>

      {/* حدود صادقة */}
      <div className="rounded-2xl border border-amber-500/40 bg-surface overflow-hidden shadow-2xs">
        <div className="bg-amber-500/15 border-b border-amber-500/25 px-5 py-3.5 flex items-center justify-between">
          <span className="font-black text-ink text-sm sm:text-base">
            حدود وحقائق صادقة عن النموذج
          </span>
          <span className="bg-amber-600 text-white font-extrabold text-[11px] px-3 py-1 rounded-full">
            تنبيه منهجي
          </span>
        </div>

        <div className="p-5 sm:p-6 space-y-3 text-xs sm:text-sm font-semibold text-ink leading-relaxed bg-surface">
          <ul className="space-y-2.5 list-disc list-inside text-muted">
            <li>
              <strong className="text-ink">الدوريات الشحيحة:</strong> الدوري الذي يفتقر لإشارة كافية تتسطّح احتمالاته تلقائياً نحو 33٪ لكل نتيجة بفعل المعايرة، ليقول النموذج «لا توجد إشارة حاسمة» بدلاً من التخمين.
            </li>
            <li>
              <strong className="text-ink">الفرق الصاعدة حديثاً:</strong> تبدأ بـ Elo مبدئي (1500) وتتحسن قراءتها مع توالي الجولات.
            </li>
            <li>
              <strong className="text-ink">التوقعات غير فورية بعد إعلان التشكيل:</strong> تُحسب التوقعات وقت التدريب ولا تتعدل مع التشكيلات المعلنة قبل المباراة بدقائق.
            </li>
          </ul>
        </div>
      </div>

      <BackBar
        links={[
          { href: "/", label: "المباريات" },
          { href: "/accuracy", label: "الدقة والسجل" },
        ]}
      />
    </div>
  );
}

import Link from "next/link";
import { BackBar, MetaItem, PageHeader, PageNav } from "@/components/ui";
import { formatMetaStamp } from "@/lib/format";
import { getMeta } from "@/lib/queries";

export const revalidate = 300;

const steps = [
  {
    n: "01",
    role: "المعيار",
    titleAr: "نموذج الأهداف مع اندثار زمني",
    titleEn: "Dixon–Coles + time decay",
    body: "Poisson مزدوج مع تصحيح النتائج المنخفضة (ρ) وترجيح أسي (~140 يوماً). المعيار الذهبي لتوزيع النتيجة.",
  },
  {
    n: "02",
    role: "ديناميكي",
    titleAr: "تصنيفات هجوم ودفاع ديناميكية",
    titleEn: "Pi-ratings",
    body: "تصنيف هجوم/دفاع ديناميكي يتحدّث بعد كل مباراة (Constantinou & Fenton). يلتقط التحوّلات السريعة.",
  },
  {
    n: "03",
    role: "نسبي",
    titleAr: "قوة نسبية بهامش الأهداف",
    titleEn: "Elo",
    body: "قوة نسبية عالمية داخل الدوري مع مضاعف لفرق الأهداف وأفضلية الأرض.",
  },
  {
    n: "04",
    role: "حديث",
    titleAr: "فورم وتسديدات حديثة",
    titleEn: "Form + shots",
    body: "آخر 5 مباريات: نقاط، فارق أهداف، وتسديدات على المرمى كبديل مستقر لـ xG عندما لا يتوفر xG مجاني.",
  },
  {
    n: "05",
    role: "خارجي",
    titleAr: "احتمالات السوق الضمنية",
    titleEn: "Market",
    body: "احتمالات ضمنية من متوسط الأسعار في CSV (AvgH/D/A) بعد إزالة الهامش. إشارة خارجية قوية.",
  },
  {
    n: "06",
    role: "معايرة",
    titleAr: "معايرة الحرارة",
    titleEn: "Temperature",
    body: "ضبط حرارة softmax على نافذة walk-forward لتقليل الثقة الزائدة وتحسين Brier/Log-loss.",
  },
];

export default function MethodologyPage() {
  const lastFit = getMeta("last_fit");

  return (
    <div className="space-y-6">
      <div>
        <PageNav
          backHref="/"
          backLabel="المباريات"
          crumbs={[{ href: "/", label: "المباريات" }, { label: "المنهجية" }]}
        />
        <PageHeader
          title="المنهجية"
          display
          description="نموذج أهداف + تصنيفات ديناميكية + فورم + سوق + معايرة."
          meta={
            lastFit ? (
              <MetaItem label="آخر تدريب" value={formatMetaStamp(lastFit)} />
            ) : null
          }
        />
      </div>

      <article className="max-w-[68ch] space-y-8">
        <section aria-labelledby="mth-idea" className="space-y-3">
          <h2 id="mth-idea" className="type-section text-ink">
            الفكرة
          </h2>
          <p className="text-sm leading-7 text-muted text-pretty">
            لكل مباراة نُخرج ثلاثة أرقام مجموعها 100٪: فوز المضيف، تعادل، فوز
            الضيف. ليست نصيحة ولا نتيجة مؤكدة، بل توزيع احتمالي نعود لاحقاً
            ونقيس صدقه على مباريات لم يرها النموذج.
          </p>
          <p className="text-sm leading-7 text-muted text-pretty">
            تُبنى هذه الأرقام من ست إشارات مستقلة تُحسب من بيانات متاحة مجاناً —
            نتائج سابقة، تسديدات، ومتوسط أسعار السوق — ثم تُدمج وتُعاير قبل
            العرض.
          </p>
        </section>

        <section aria-labelledby="mth-signals" className="space-y-3">
          <h2 id="mth-signals" className="type-section text-ink">
            سلسلة الإشارات
          </h2>
          <p className="text-sm leading-7 text-muted text-pretty">
            كل إشارة تجيب عن سؤال مختلف؛ الترتيب أدناه هو ترتيب الحساب لا ترتيب
            الأهمية.
          </p>
          <ol className="border-t border-line">
            {steps.map((s) => (
              <li
                key={s.n}
                className="grid grid-cols-[1.5rem_1fr] gap-x-3 border-b border-line py-4"
              >
                <span className="pt-0.5 text-[11px] font-medium tabular text-faint">
                  {s.n}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <h3 className="type-section text-ink">{s.titleAr}</h3>
                    <span className="text-[11px] text-faint">{s.role}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-faint">
                    <span dir="ltr" className="inline-block">
                      {s.titleEn}
                    </span>
                  </p>
                  <p className="mt-2 text-sm leading-7 text-muted text-pretty">
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="mth-eval" className="space-y-3">
          <h2 id="mth-eval" className="type-section text-ink">
            المعايرة والتقييم
          </h2>
          <p className="text-sm leading-7 text-muted text-pretty">
            بعد دمج الإشارات تُضبط حرارة softmax على نافذة سابقة، حتى لا تكون
            الاحتمالات المعروضة أكثر ثقة مما تستحق. ثم يُقاس النموذج بأسلوب
            walk-forward: يتدرّب على ما قبل المباراة فقط ثم يُسأل عنها، فلا
            تسرّب من المستقبل.
          </p>
          <p className="text-sm leading-7 text-muted text-pretty">
            نتائج هذا القياس — الدقة وBrier وLog-loss لكل دوري — منشورة كاملة في{" "}
            <Link
              href="/accuracy"
              className="motion-colors font-medium text-accent no-underline hover:underline"
            >
              صفحة الدقة
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="mth-limits" className="space-y-3">
          <h2 id="mth-limits" className="type-section text-ink">
            حدود صادقة
          </h2>
          <p className="text-sm leading-7 text-muted text-pretty">
            بدون xG لقطي أو تشكيلات لحظية تبقى إشارة الأهداف والفورم والسوق هي
            الأقوى المتاح مجاناً. كرة القدم عشوائية بطبيعتها، والرقم المقيس عندنا
            هو ما تعرضه{" "}
            <Link
              href="/accuracy"
              className="motion-colors font-medium text-accent no-underline hover:underline"
            >
              صفحة الدقة
            </Link>{" "}
            لا رقماً مثالياً — اقرأه هناك بعد كل تدريب بدل الاعتماد على مدى عام.
          </p>
          <ul className="space-y-2 text-sm leading-7 text-muted">
            <li>
              دوري بلا إشارة صالحة تتسطّح احتمالاته نحو ٣٣٪ لكل نتيجة بفعل
              المعايرة. ذلك مقصود: النموذج يقول «لا أعرف» بدل أن يخمّن.
            </li>
            <li>
              فريق صاعد بلا نتائج في القاعدة يبدأ من قيم بَدئية (‏Elo ‏1500)،
              وصفحة المباراة تعلن ذلك؛ الرقم عندها أولويّة أوّلية لا قراءة
              معايَرة.
            </li>
            <li>
              التوقعات تُحسب وقت التدريب ولا تتفاعل مع الإصابات أو التشكيلات
              المعلنة بعده.
            </li>
          </ul>
        </section>
      </article>

      <BackBar
        links={[
          { href: "/", label: "المباريات" },
          { href: "/accuracy", label: "الدقة" },
        ]}
      />
    </div>
  );
}

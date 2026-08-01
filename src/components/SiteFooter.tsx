import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/", label: "المباريات" },
  { href: "/leagues", label: "الدوريات" },
  { href: "/value", label: "فرص القيمة" },
  { href: "/accuracy", label: "دقة النماذج" },
  { href: "/methodology", label: "المنهجية" },
  { href: "/news", label: "الأخبار" },
  { href: "/articles", label: "المقالات" },
  { href: "/charts", label: "الرسوم" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto w-full max-w-[var(--content-max)] px-4 py-8 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="space-y-2 max-w-md">
            <p className="text-sm font-black text-ink">تقدير</p>
            <p className="text-xs text-muted leading-relaxed">
              احتمالات 1X2 وتوزيع النتائج بنماذج Dixon–Coles وElo معايرة على نتائج حقيقية.
              الاحتمال ليس يقيناً — نعرض الثقة والمعايرة بجانب الرقم.
            </p>
          </div>

          <nav aria-label="روابط التذييل" className="flex flex-wrap gap-x-4 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-bold text-muted hover:text-accent motion-colors no-underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-line pt-4 text-[11px] text-faint">
          <p>© {new Date().getFullYear()} تقدير — أداة تحليل لا منصة مراهنات.</p>
          <p className="tabular">البيانات للعرض التحليلي · ليست نصيحة مالية</p>
        </div>
      </div>
    </footer>
  );
}

import { Skeleton } from "@/components/ui";

/** جانب فريق في بطاقة المواجهة */
function MatchupSide() {
  return (
    <div className="flex min-w-0 flex-col items-center gap-3 px-3 py-5 sm:px-4 sm:py-6">
      <Skeleton className="h-14 w-14 rounded-full" />
      <div className="flex w-full min-w-0 flex-col items-center gap-1.5">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

/** رأس بطاقة: عنوان + سطر وصف */
function CardHead({ subWidth = "w-52" }: { subWidth?: string }) {
  return (
    <div className="card-head">
      <div className="min-w-0 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className={`h-3 ${subWidth}`} />
      </div>
    </div>
  );
}

export default function MatchLoading() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">جاري تحميل تحليل المباراة</span>

      <div className="space-y-4">
        {/* مسار الصفحة */}
        <Skeleton className="h-3 w-56" />

        {/* شريط سياق المباراة */}
        <section className="card flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-end sm:justify-between sm:px-5">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-40" />
          </div>
        </section>

        {/* المواجهة */}
        <section className="card overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch">
            <MatchupSide />
            <div className="flex flex-col items-center justify-center gap-1.5 border-x border-line px-3 py-5 sm:px-5">
              <Skeleton className="h-3 w-10" />
            </div>
            <MatchupSide />
          </div>
        </section>
      </div>

      {/* احتمال النتيجة النهائي */}
      <section className="card overflow-hidden">
        <CardHead />
        <div className="divide-y divide-line">
          {/* القراءة الأرجح */}
          <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:px-5">
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-56" />
            </div>
            <Skeleton className="h-3 w-32 shrink-0" />
          </div>

          {/* 1X2 */}
          <div className="grid grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className={`flex flex-col items-center gap-2 px-2 py-4 ${
                  i > 0 ? "border-s border-line" : ""
                }`}
              >
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>

          {/* الشريط + الثقة */}
          <div className="space-y-3 px-4 py-3.5 sm:px-5">
            <Skeleton className="h-2.5 w-full" />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <Skeleton className="h-3 w-16 shrink-0" />
              <Skeleton className="h-1.5 max-w-48 flex-1" />
              <Skeleton className="h-3 w-28 shrink-0" />
            </div>
          </div>
        </div>
      </section>

      {/* تفكيك الإشارات */}
      <section className="card overflow-hidden">
        <CardHead subWidth="w-60" />
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="flex h-13 items-center gap-3 border-b border-line px-4 sm:px-5"
          >
            <Skeleton className="h-3 w-24 shrink-0" />
            <Skeleton className="h-1.5 min-w-0 flex-1" />
            <Skeleton className="h-3 w-10 shrink-0" />
            <Skeleton className="h-4 w-12 shrink-0" />
          </div>
        ))}
        <div className="border-t border-line px-4 py-3 sm:px-5">
          <Skeleton className="h-3 w-56" />
          <div className="mt-3 grid gap-4 sm:grid-cols-2 sm:gap-6">
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="min-w-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* توزيع النتائج + الأسواق المشتقة */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <CardHead subWidth="w-56" />
          <div className="p-4 sm:p-5">
            <Skeleton className="h-56 w-full" />
          </div>
        </section>

        <div className="space-y-6">
          <section className="card overflow-hidden">
            <CardHead subWidth="w-36" />
            <div className="space-y-2.5 p-4 sm:p-5">
              <Skeleton className="h-3 w-48" />
              <div className="grid grid-cols-3 divide-x divide-x-reverse divide-line border border-line">
                {Array.from({ length: 3 }, (_, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-2 px-2 py-2.5"
                  >
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="card overflow-hidden">
            <CardHead subWidth="w-48" />
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="grid h-10 grid-cols-[1.5rem_3.5rem_3.25rem_minmax(0,1fr)] items-center gap-3 border-b border-line px-4 last:border-b-0"
              >
                <Skeleton className="h-3 w-3" />
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))}
          </section>
        </div>
      </div>

      {/* أهداف متوقعة + النموذج مقابل السوق */}
      <div className="grid gap-6 sm:grid-cols-2">
        <section className="card overflow-hidden">
          <CardHead subWidth="w-28" />
          <div className="space-y-3 p-4 sm:p-5">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-44" />
            </div>
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Skeleton className="h-3 w-18 shrink-0" />
                <Skeleton className="h-1.5 min-w-0 flex-1" />
                <Skeleton className="h-3 w-10 shrink-0" />
              </div>
            ))}
          </div>
        </section>

        <section className="card overflow-hidden">
          <CardHead subWidth="w-60" />
          <div className="divide-y divide-line">
            <div className="px-4 py-2.5">
              <Skeleton className="h-3 w-44" />
            </div>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="space-y-2 px-4 py-3.5">
                <div className="flex items-baseline justify-between gap-2">
                  <Skeleton className="h-4 w-14" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="space-y-1.5">
                  {Array.from({ length: 2 }, (_, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <Skeleton className="h-3 w-10 shrink-0" />
                      <Skeleton className="h-1.5 min-w-0 flex-1" />
                      <Skeleton className="h-3 w-10 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* كيف تُصنع الإشارة */}
      <section className="card overflow-hidden">
        <CardHead subWidth="w-56" />
        <div className="space-y-4 p-4 sm:p-5">
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
      </section>

      {/* شريط الرجوع */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  );
}

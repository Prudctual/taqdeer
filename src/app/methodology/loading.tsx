import { Skeleton } from "@/components/ui";

export default function MethodologyLoading() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">جاري تحميل المنهجية</span>

      <div>
        {/* مسار الصفحة */}
        <div className="mb-4">
          <Skeleton className="h-3 w-40" />
        </div>
        {/* رأس الصفحة */}
        <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-full max-w-[28rem]" />
            <div className="pt-1">
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
        </div>
      </div>

      {/* سلسلة الإشارات */}
      <section className="card overflow-hidden">
        <div className="card-head">
          <div className="min-w-0">
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="flex gap-4 border-b border-line px-4 py-5 last:border-b-0 sm:gap-5 sm:px-5 sm:py-6"
          >
            <Skeleton className="h-10 w-10 shrink-0" />
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-14" />
              </div>
              <Skeleton className="mt-1.5 h-3 w-32" />
              <div className="mt-2.5 space-y-2">
                <Skeleton className="h-3 w-full max-w-prose" />
                <Skeleton className="h-3 w-full max-w-[28rem]" />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* حدود صادقة */}
      <section className="card overflow-hidden">
        <div className="card-head">
          <div className="min-w-0">
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
      </section>

      {/* شريط الرجوع */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

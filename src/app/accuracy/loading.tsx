import { Skeleton } from "@/components/ui";

export default function AccuracyLoading() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">جاري تحميل مقاييس الدقة</span>

      <div>
        {/* مسار الصفحة */}
        <div className="mb-4">
          <Skeleton className="h-3 w-36" />
        </div>
        {/* رأس الصفحة */}
        <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-40" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full max-w-[34rem]" />
              <Skeleton className="h-4 w-full max-w-[26rem]" />
            </div>
            <div className="pt-1">
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
        </div>
      </div>

      {/* ملخص عبر الدوريات */}
      <section className="card overflow-hidden">
        <div className="card-head">
          <div className="min-w-0">
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-x-reverse divide-line">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="px-4 py-4 sm:px-5 sm:py-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-6 w-16" />
              <Skeleton className="mt-1.5 h-3 w-40" />
            </div>
          ))}
        </div>
      </section>

      {/* حسب الدوري */}
      <section className="card overflow-hidden">
        <div className="card-head">
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-52" />
          </div>
        </div>
        <div className="max-h-[28rem] overflow-hidden">
          {/* رأس الجدول */}
          <div className="flex h-8 items-center gap-3 border-b border-line px-3">
            <Skeleton className="h-2.5 w-16 shrink-0" />
            <Skeleton className="h-2.5 w-14 shrink-0" />
            <Skeleton className="h-2.5 w-12 shrink-0" />
            <Skeleton className="h-2.5 w-14 shrink-0" />
            <Skeleton className="ms-auto h-2.5 w-10 shrink-0" />
            <Skeleton className="h-2.5 w-12 shrink-0" />
          </div>
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="flex h-10 items-center gap-3 border-b border-line px-3 last:border-b-0"
            >
              <Skeleton className="h-3 w-24 shrink-0" />
              <Skeleton className="h-3 w-20 shrink-0" />
              <Skeleton className="h-3 w-8 shrink-0" />
              <div className="flex shrink-0 items-center gap-2">
                <Skeleton className="h-1.5 w-16 sm:w-24" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="ms-auto h-3 w-10 shrink-0" />
              <Skeleton className="h-3 w-10 shrink-0" />
            </div>
          ))}
        </div>
      </section>

      {/* ملاحظة أسفل الجدول */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-full max-w-[38rem]" />
        <Skeleton className="h-3 w-full max-w-[22rem]" />
      </div>

      {/* شريط الرجوع */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

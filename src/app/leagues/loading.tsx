import { Skeleton } from "@/components/ui";

export default function LeaguesLoading() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">جاري تحميل الدوريات</span>

      <div>
        {/* مسار الصفحة */}
        <div className="mb-4">
          <Skeleton className="h-3 w-40" />
        </div>
        {/* رأس الصفحة */}
        <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-full max-w-[30rem]" />
            <div className="pt-1">
              <Skeleton className="h-3 w-52" />
            </div>
          </div>
        </div>
      </div>

      {/* قائمة الدوريات */}
      <section className="card overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="flex h-18 items-center gap-3.5 border-b border-line px-4 last:border-b-0 sm:px-5"
          >
            <Skeleton className="h-11 w-11 shrink-0 rounded-[0.3rem]" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
            <Skeleton className="h-3 w-10 shrink-0" />
          </div>
        ))}
      </section>

      {/* شريط الرجوع */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-5">
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  );
}

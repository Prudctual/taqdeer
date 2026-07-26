import { Skeleton } from "@/components/ui";

/** رأس أعمدة قائمة المباريات */
function ListHead() {
  return (
    <div className="hidden h-8 items-center gap-3 border-b border-line px-4 sm:flex">
      <Skeleton className="h-2.5 w-10 shrink-0" />
      <div className="flex min-w-0 flex-1 justify-center">
        <Skeleton className="h-2.5 w-16" />
      </div>
      <div className="flex w-40 shrink-0 justify-center">
        <Skeleton className="h-2.5 w-14" />
      </div>
      <div className="flex w-22 shrink-0 justify-end">
        <Skeleton className="h-2.5 w-10" />
      </div>
    </div>
  );
}

/** صف مباراة — نفس ارتفاع صف القائمة الحقيقي */
function RowSkeleton() {
  return (
    <div className="flex h-13 items-center gap-3 border-b border-line px-4 last:border-b-0">
      <div className="w-21 shrink-0 space-y-1.5">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-2.5 w-14" />
      </div>
      <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 items-center justify-end gap-1.5">
          <Skeleton className="h-3 min-w-0 flex-1" />
          <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
        </div>
        <Skeleton className="h-3 w-5" />
        <div className="flex min-w-0 items-center gap-1.5">
          <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
          <Skeleton className="h-3 min-w-0 flex-1" />
        </div>
      </div>
      <div className="hidden w-40 shrink-0 space-y-1.5 sm:block">
        <Skeleton className="h-1.5 w-full" />
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-2.5 w-9" />
          <Skeleton className="h-2.5 w-9" />
          <Skeleton className="h-2.5 w-9" />
        </div>
      </div>
      <div className="flex w-16 shrink-0 justify-end sm:w-22">
        <Skeleton className="h-5 w-12" />
      </div>
    </div>
  );
}

export default function TeamLoading() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">جاري تحميل بيانات الفريق</span>

      <div>
        {/* مسار الصفحة */}
        <div className="mb-4">
          <Skeleton className="h-3 w-64" />
        </div>
        {/* هوية الفريق */}
        <section className="card flex flex-col items-center gap-3 overflow-hidden px-4 py-6 text-center sm:px-5">
          <Skeleton className="h-[4.5rem] w-[4.5rem] rounded-full" />
          <div className="flex min-w-0 flex-col items-center gap-2">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-28" />
          </div>
        </section>
      </div>

      {/* مؤشرات القوة */}
      <section className="card overflow-hidden">
        <div className="card-head">
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid grid-cols-3 gap-5">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="min-w-0 space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
          <div className="space-y-2.5 border-t border-line pt-4">
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Skeleton className="h-3 w-14 shrink-0" />
                <Skeleton className="h-1.5 min-w-0 flex-1" />
                <Skeleton className="h-3 w-10 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* منحنى Elo */}
      <section className="card overflow-hidden">
        <div className="card-head">
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-60" />
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      </section>

      {/* آخر المباريات */}
      <section className="card overflow-hidden">
        <div className="card-head">
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-3 w-20 shrink-0" />
        </div>
        <ListHead />
        {Array.from({ length: 12 }, (_, i) => (
          <RowSkeleton key={i} />
        ))}
      </section>

      {/* شريط الرجوع */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  );
}

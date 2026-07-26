import { Skeleton } from "@/components/ui";

const CHIP_WIDTHS = ["w-24", "w-20", "w-28", "w-24", "w-20", "w-24", "w-24"];

/** رأس أعمدة قائمة المباريات — نفس شبكة MatchListHeader */
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

export default function HomeLoading() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">جاري تحميل المباريات</span>

      <div className="space-y-4">
        {/* رأس الصفحة */}
        <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-full max-w-[26rem]" />
            <div className="flex flex-wrap gap-3 pt-1">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
        </div>

        {/* شارات الدوريات */}
        <div className="flex flex-wrap items-center gap-2">
          {CHIP_WIDTHS.map((w, i) => (
            <Skeleton key={i} className={`h-8 ${w}`} />
          ))}
        </div>
      </div>

      {/* إحاطة الجولة — المباراة القادمة */}
      <section className="card overflow-hidden">
        <div className="flex h-9 items-center justify-between gap-3 border-b border-line px-4">
          <Skeleton className="h-2.5 w-36" />
          <Skeleton className="h-2.5 w-44" />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
            <div className="min-w-0 space-y-1">
              <Skeleton className="h-2.5 w-10" />
              <Skeleton className="h-4 w-24 sm:w-32" />
            </div>
          </div>
          <Skeleton className="h-2.5 w-6" />
          <div className="flex min-w-0 flex-row-reverse items-center gap-2.5">
            <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
            <div className="min-w-0 space-y-1">
              <Skeleton className="h-2.5 w-10 ms-auto" />
              <Skeleton className="h-4 w-24 sm:w-32" />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-line px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
          <div className="flex shrink-0 items-center gap-2">
            <Skeleton className="h-2.5 w-10" />
            <Skeleton className="h-4 w-5" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-10" />
          </div>
          <div className="min-w-0 flex-1">
            <Skeleton className="h-2.5 w-full" />
          </div>
          <Skeleton className="h-3 w-14 shrink-0" />
        </div>
      </section>

      {/* الجدول */}
      <section className="card overflow-hidden">
        <div className="card-head">
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="h-3 w-10 shrink-0" />
        </div>
        <ListHead />
        <div className="flex h-9 items-center justify-center border-b border-line px-4">
          <Skeleton className="h-3 w-40" />
        </div>
        {Array.from({ length: 5 }, (_, i) => (
          <RowSkeleton key={i} />
        ))}
        <div className="flex h-9 items-center justify-center border-b border-line px-4">
          <Skeleton className="h-3 w-36" />
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <RowSkeleton key={i} />
        ))}
      </section>

      {/* آخر النتائج */}
      <section className="card overflow-hidden">
        <div className="card-head">
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-52" />
          </div>
          <Skeleton className="h-3 w-16 shrink-0" />
        </div>
        {Array.from({ length: 3 }, (_, g) => (
          <div key={g}>
            <div className="flex h-9 items-center justify-between border-b border-line px-4">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-4" />
            </div>
            {Array.from({ length: 3 }, (_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}

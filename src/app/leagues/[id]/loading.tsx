import { Skeleton } from "@/components/ui";

const CHIP_WIDTHS = ["w-28", "w-24", "w-28", "w-24", "w-28", "w-24"];
const NUM_COLS = ["w-4", "w-4", "w-4", "w-4", "w-6", "w-6", "w-8"];

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

/** رأس بطاقة: عنوان + سطر وصف */
function CardHead({ wide = false }: { wide?: boolean }) {
  return (
    <div className="card-head">
      <div className="min-w-0 space-y-1.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className={wide ? "h-3 w-64" : "h-3 w-48"} />
      </div>
    </div>
  );
}

export default function LeagueLoading() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">جاري تحميل بيانات الدوري</span>

      <div>
        <div className="mb-4">
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
            <div className="pt-1">
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* شارات الدوريات */}
      <div className="flex flex-wrap items-center gap-2">
        {CHIP_WIDTHS.map((w, i) => (
          <Skeleton key={i} className={`h-8 ${w}`} />
        ))}
      </div>

      {/* جدول الترتيب */}
      <section className="card overflow-hidden">
        <CardHead wide />
        <div className="max-h-[28rem] overflow-hidden">
          <div className="flex h-8 items-center gap-3 border-b border-line px-3">
            <Skeleton className="h-2.5 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-2.5 w-12" />
            </div>
            {NUM_COLS.map((w, i) => (
              <Skeleton key={i} className={`h-2.5 shrink-0 ${w}`} />
            ))}
          </div>
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className="flex h-12 items-center gap-3 border-b border-line px-3"
            >
              <Skeleton className="h-3 w-4 shrink-0" />
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                <Skeleton className="h-3 w-24 max-w-full sm:w-32" />
              </div>
              {NUM_COLS.map((w, j) => (
                <Skeleton key={j} className={`h-3 shrink-0 ${w}`} />
              ))}
            </div>
          ))}
        </div>
        {/* مفتاح مناطق الجدول */}
        <div className="flex flex-wrap gap-3 border-t border-line px-4 py-2.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-24" />
        </div>
      </section>

      {/* قوة النموذج */}
      <section className="card overflow-hidden">
        <CardHead wide />
        <div className="max-h-[22rem] overflow-hidden">
          <div className="flex h-8 items-center gap-3 border-b border-line px-3">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-2.5 w-12" />
            </div>
            <Skeleton className="h-2.5 w-24 shrink-0 sm:w-32" />
            <Skeleton className="h-2.5 w-24 shrink-0 sm:w-32" />
            <Skeleton className="h-2.5 w-8 shrink-0" />
          </div>
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="flex h-12 items-center gap-3 border-b border-line px-3"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                <Skeleton className="h-3 w-24 max-w-full sm:w-32" />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Skeleton className="h-1.5 w-16 sm:w-24" />
                <Skeleton className="h-3 w-8" />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Skeleton className="h-1.5 w-16 sm:w-24" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-3 w-8 shrink-0" />
            </div>
          ))}
        </div>
      </section>

      {/* مباريات الدوري */}
      <section className="card overflow-hidden">
        <CardHead />
        <ListHead />
        <div className="flex h-9 items-center justify-center border-b border-line px-4">
          <Skeleton className="h-3 w-40" />
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <RowSkeleton key={i} />
        ))}
        <div className="flex h-9 items-center justify-center border-b border-line px-4">
          <Skeleton className="h-3 w-36" />
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <RowSkeleton key={i} />
        ))}
      </section>

      {/* شريط الرجوع */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { PageNav } from "@/components/ui";
import { PredictionArchiveLog } from "@/components/PredictionArchiveLog";
import { getFinishedPredictionsHistory, getUpcomingSnapshotMatches } from "@/lib/queries";

export const metadata: Metadata = {
  title: "سجل التوقعات التوثيقي | منصة تقدير",
  description:
    "السجل التوثيقي المجمّد لجميع توقعات النموذج الصادرة قبل انطلاق المباريات ومقارنتها الشفافة بالنتائج الرسمية.",
};

export const revalidate = 120;

export default function HistoryPage() {
  const historyItems = getFinishedPredictionsHistory("all", 200);
  const upcomingSnapshots = getUpcomingSnapshotMatches(40);

  return (
    <div className="space-y-6">
      <PageNav
        backHref="/"
        backLabel="المباريات"
        crumbs={[{ href: "/", label: "المباريات" }, { label: "سجل التوقعات التوثيقي" }]}
      />

      {/* Header Banner */}
      <div className="rounded-2xl border border-line bg-panel p-6 sm:p-8 space-y-3 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-black text-accent uppercase tracking-wide">
          <span className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
          السجل التوثيقي المجمّد
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-ink tracking-tight">
          سجل حفظ ومراجعة التوقعات التوثيقي
        </h1>

        <p className="text-xs sm:text-sm font-semibold text-muted max-w-3xl leading-relaxed">
          جميع التوقعات الصادرة عن النموذج تُقفل وتُجمّد قبل انطلاق المباريات بجدول غير قابل للتعديل، محفوظة لضمان أقصى درجات المصداقية وتتبع الأداء ابتداءً من مباريات الموسم الجديد.
        </p>
      </div>

      {/* Main Interactive History Log */}
      <PredictionArchiveLog items={historyItems} upcomingSnapshots={upcomingSnapshots} />
    </div>
  );
}

import type { Metadata } from "next";
import { PageNav } from "@/components/ui";
import { PredictionArchiveLog } from "@/components/PredictionArchiveLog";
import { getFinishedPredictionsHistory } from "@/lib/queries";

export const metadata: Metadata = {
  title: "سجل التوقعات الأرشيفي الكامل | منصة تقدير",
  description:
    "الأرشيف الكامل لجميع توقعات النموذج السابقة ومقارنتها الشفافة بالنتائج الرسمية الفعلية.",
};

export const revalidate = 120;

export default function HistoryPage() {
  const historyItems = getFinishedPredictionsHistory("all", 200);

  return (
    <div className="space-y-6">
      <PageNav
        backHref="/"
        backLabel="المباريات"
        crumbs={[{ href: "/", label: "المباريات" }, { label: "سجل التوقعات الأرشيفي" }]}
      />

      {/* Header Banner */}
      <div className="rounded-2xl border border-line bg-panel p-6 sm:p-8 space-y-3 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-black text-accent uppercase tracking-wide">
          <span className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
          السجل الأرشيفي التوثيقي
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-ink tracking-tight">
          سجل حفظ ومراجعة التوقعات الكامل
        </h1>

        <p className="text-xs sm:text-sm font-semibold text-muted max-w-3xl leading-relaxed">
          جميع التوقعات السابقة الصادرة عن النموذج قبل انطلاق المباريات، محفوظة بالكامل لضمان المصداقية وتتبع الأداء على أحدث نتائج الدوريات الـ 7.
        </p>
      </div>

      {/* Main Interactive History Log */}
      <PredictionArchiveLog items={historyItems} />
    </div>
  );
}

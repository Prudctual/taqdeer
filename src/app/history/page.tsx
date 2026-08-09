import type { Metadata } from "next";
import { PageNav } from "@/components/ui";
import { PredictionArchiveLog } from "@/components/PredictionArchiveLog";
import {
  getFinishedPredictionsHistory,
  getUpcomingSnapshotMatches,
  PREDICTION_ARCHIVE_FROM,
} from "@/lib/queries";

export const metadata: Metadata = {
  title: "سجل حفظ التوقعات | منصة تقدير",
  description:
    "توقعات محفوظة للمباريات القادمة، وتنتقل تلقائياً إلى النتائج المكتملة بعد انتهاء المباراة.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HistoryPage() {
  const upcomingSnapshots = getUpcomingSnapshotMatches(20);
  // المكتملة من يوم إعادة التشغيل فصاعداً — عند انتهاء المباراة تظهر هنا
  const finishedItems = getFinishedPredictionsHistory("all", 300, {
    fromDate: PREDICTION_ARCHIVE_FROM,
    allowSeasonFallback: false,
  });

  return (
    <div className="space-y-6">
      <PageNav
        backHref="/"
        backLabel="المباريات"
        crumbs={[{ href: "/", label: "المباريات" }, { label: "سجل حفظ التوقعات" }]}
      />

      <PredictionArchiveLog
        items={finishedItems}
        upcomingSnapshots={upcomingSnapshots}
        showFinished
      />
    </div>
  );
}

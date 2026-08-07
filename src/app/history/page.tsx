import type { Metadata } from "next";
import { PageNav } from "@/components/ui";
import { PredictionArchiveLog } from "@/components/PredictionArchiveLog";
import {
  getFinishedPredictionsHistory,
  getUpcomingSnapshotMatches,
} from "@/lib/queries";

export const metadata: Metadata = {
  title: "سجل حفظ التوقعات | منصة تقدير",
  description:
    "توقعات محفوظة للمباريات القادمة، وتنتقل تلقائياً إلى تبويب النتائج المكتملة بعد انتهاء المباراة.",
};

export const revalidate = 120;

export default function HistoryPage() {
  const upcomingSnapshots = getUpcomingSnapshotMatches(20);
  // المنتهية ذات التوقعات المحفوظة — تظهر في تبويب منفصل عند اكتمال النتائج
  const finishedItems = getFinishedPredictionsHistory("all", 300);

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
      />
    </div>
  );
}

import type { Metadata } from "next";
import { PageNav } from "@/components/ui";
import { PredictionArchiveLog } from "@/components/PredictionArchiveLog";
import { getFinishedPredictionsHistory, getUpcomingSnapshotMatches } from "@/lib/queries";

export const metadata: Metadata = {
  title: "أرشيف نتائج وتوقعات المباريات | منصة تقدير",
  description:
    "أرشيف شفاف يوثق جميع توقعات النموذج الصادرة قبل انطلاق المباريات ومقارنتها بالنتائج الرسمية الفعلية.",
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
        crumbs={[{ href: "/", label: "المباريات" }, { label: "أرشيف التوقعات والنتائج" }]}
      />

      {/* Main Interactive History Log */}
      <PredictionArchiveLog items={historyItems} upcomingSnapshots={upcomingSnapshots} />
    </div>
  );
}

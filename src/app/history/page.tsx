import type { Metadata } from "next";
import { PageNav } from "@/components/ui";
import { PredictionArchiveLog } from "@/components/PredictionArchiveLog";
import { getUpcomingSnapshotMatches } from "@/lib/queries";

export const metadata: Metadata = {
  title: "سجل حفظ التوقعات | منصة تقدير",
  description:
    "توقعات محفوظة للمباريات القادمة من اليوم فصاعداً.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HistoryPage() {
  // نبدأ من اليوم: القادمة فقط — بدون أرشيف النتائج المكتملة السابقة
  const upcomingSnapshots = getUpcomingSnapshotMatches(20);

  return (
    <div className="space-y-6">
      <PageNav
        backHref="/"
        backLabel="المباريات"
        crumbs={[{ href: "/", label: "المباريات" }, { label: "سجل حفظ التوقعات" }]}
      />

      <PredictionArchiveLog
        items={[]}
        upcomingSnapshots={upcomingSnapshots}
        showFinished={false}
      />
    </div>
  );
}

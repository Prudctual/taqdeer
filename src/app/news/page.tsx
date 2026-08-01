import { Metadata } from "next";
import { getLatestNews } from "@/lib/queries";
import { RefreshCw } from "lucide-react";
import NewsFeedClient from "./NewsFeedClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "الأخبار الرياضية اللحظية — منصة تقدير",
  description:
    "موجز رياضي مباشر ولحظي لأحدث الأخبار الموثوقة وسوق الانتقالات وتحديثات التشكيلات والإصابات من كبرى المصادر الرياضية العالمية.",
};

export default function NewsPage() {
  const newsItems = getLatestNews(40);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-line pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="live-badge-dot live-pulse-dot" />
            <span className="text-xs font-bold text-live">بث مباشر وتحديث مستمر</span>
          </div>
          <h1 className="type-page text-ink">الأخبار الرياضية اللحظية</h1>
          <p className="text-sm text-muted max-w-2xl leading-relaxed">
            متابعة فورية ومباشرة لأحدث المستجدات، الانتقالات، وأخبار الفرق من المصادر العالمية المعتمدة.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-panel border border-line text-xs text-muted shrink-0">
          <RefreshCw className="w-3.5 h-3.5 text-live" />
          <span>تحديث تلقائي كل 15 دقيقة</span>
        </div>
      </div>

      <NewsFeedClient initialNews={newsItems} />
    </div>
  );
}

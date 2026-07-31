import { Metadata } from "next";
import { getLatestNews } from "@/lib/queries";
import { RefreshCw } from "lucide-react";
import NewsFeedClient from "./NewsFeedClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "الأخبار الرياضية اللحظية — منصة تقدير",
  description: "موجز رياضي مباشر ولحظي لأحدث الأخبار الموثوقة وسوق الانتقالات وتحديثات التشكيلات والإصابات من كبرى المصادر الرياضية العالمية.",
};

export default function NewsPage() {
  const newsItems = getLatestNews(40);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 dir-rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-emerald-400">بث مباشر وتحديث مستمر</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            الأخبار الرياضية اللحظية
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            متابعة فورية ومباشرة لأحدث المستجدات، الانتقالات، وأخبار الفرق من المصادر العالمية المعتمدة.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-slate-400 shrink-0">
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          <span>تحديث تلقائي كل 15 دقيقة</span>
        </div>
      </div>

      {/* Main News Timeline Client */}
      <NewsFeedClient initialNews={newsItems} />
    </div>
  );
}

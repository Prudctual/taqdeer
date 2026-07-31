import Link from "next/link";
import { getLatestNews } from "@/lib/queries";
import { SectionCard } from "./ui";
import { ExternalLink, Clock, Globe } from "lucide-react";

function timeAgoArabic(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return "الآن";
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  const diffDays = Math.floor(diffHours / 24);
  return `منذ ${diffDays} يوم`;
}

export function LatestNewsWidget() {
  const news = getLatestNews(4);

  if (!news || news.length === 0) {
    return null;
  }

  return (
    <SectionCard
      title="موجز الأخبار الرياضية اللحظية"
      subtitle="متابعة عاجلة ومباشرة لأحدث المستجدات والانتقالات من المصادر الرياضية العالمية"
      headerRight={
        <Link
          href="/news"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>الأخبار اللحظية (بث حي)</span>
          <span className="text-sm">←</span>
        </Link>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {news.map((item) => (
          <div
            key={item.id}
            className="group flex flex-col justify-between p-4 rounded-xl border border-white/10 bg-slate-900/80 hover:bg-slate-900 hover:border-emerald-500/40 transition-all duration-200"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <Globe className="w-3 h-3" />
                  {item.sourceName}
                </span>
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {timeAgoArabic(item.publishedAt)}
                </span>
              </div>

              <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug line-clamp-2">
                {item.title}
              </h4>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {item.summary}
              </p>
            </div>

            {item.sourceUrl && (
              <div className="mt-3 pt-2 border-t border-white/5 flex justify-end">
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  <span>قراءة الخبر بالمصدر</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

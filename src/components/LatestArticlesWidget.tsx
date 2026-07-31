import Link from "next/link";
import { getArticles } from "@/lib/queries";
import { SectionCard } from "./ui";
import { BookOpen, Clock, Eye, Sparkles } from "lucide-react";

export function LatestArticlesWidget() {
  const articles = getArticles(3);

  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <SectionCard
      title="التقارير التحليلية والمقالات الحصرية"
      subtitle="قراءات تكتيكية ودراسات كمية خالية من الانحياز، بأقلام غرفة تحليلات منصة «تقدير»"
      headerRight={
        <Link
          href="/articles"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <span>عرض كافة المقالات</span>
          <span className="text-sm">←</span>
        </Link>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {articles.map((art) => (
          <Link
            key={art.id}
            href={`/articles/${art.slug}`}
            className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950 p-5 text-white transition-all duration-300 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1"
          >
            {/* Top Category Badge & Read Time */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
                <Sparkles className="h-3 w-3" />
                {art.category}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="h-3 w-3" />
                {art.readTimeMins} دقائق
              </span>
            </div>

            {/* Article Content Preview */}
            <div className="space-y-2.5 flex-1">
              <h3 className="text-base font-bold leading-snug text-white group-hover:text-emerald-300 transition-colors line-clamp-2">
                {art.title}
              </h3>
              <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                {art.summary}
              </p>
            </div>

            {/* Footer Metadata */}
            <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-medium text-slate-400 flex items-center gap-1">
                <BookOpen className="h-3 w-3 text-emerald-500" />
                {art.author}
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <Eye className="h-3 w-3" />
                {art.viewsCount.toLocaleString("ar-EG")} مشاهدة
              </span>
            </div>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

import { Metadata } from "next";
import Link from "next/link";
import { getArticles, getFeaturedArticle } from "@/lib/queries";
import { BookOpen, Clock, Sparkles, TrendingUp } from "lucide-react";
import ArticlesFilterClient from "./ArticlesFilterClient";

export const metadata: Metadata = {
  title: "المقالات والتقارير الحصرية — منصة تقدير",
  description: "غرفة التحليلات والدراسات الرياضية الكمية: قراءات تكتيكية، تفكيك أرقام المتوقع، وتقارير حصرية تعتمد المعايرة العلمية بدقة متناهية.",
};

export default function ArticlesPage() {
  const allArticles = getArticles(30);
  const featured = getFeaturedArticle();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10 dir-rtl">
      {/* Header Banner */}
      <div className="space-y-3 border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>غرفة تحليلات تقدير</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          المقالات والتقارير الرياضية الحصرية
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-3xl leading-relaxed">
          دراسات تكتيكية وتحليلات كمية تجمع بين علوم الاحتمالات المعايرة والرؤية الفنية المعمقة.
        </p>
      </div>

      {/* Featured Lead Article Banner */}
      {featured && (
        <Link
          href={`/articles/${featured.slug}`}
          className="group relative block overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 p-6 sm:p-10 shadow-2xl transition-all duration-300 hover:border-emerald-500/60 hover:shadow-emerald-500/10"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10 group-hover:bg-emerald-500/20 transition-all" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-4 max-w-3xl">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 text-xs font-black">
                  <TrendingUp className="w-3.5 h-3.5" />
                  المقال الرئيسي الموصى به
                </span>
                <span className="text-xs font-semibold text-slate-400 bg-white/5 px-2.5 py-1 rounded-md">
                  {featured.category}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white group-hover:text-emerald-300 transition-colors leading-tight">
                {featured.title}
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">
                {featured.summary}
              </p>

              <div className="flex items-center gap-6 text-xs text-slate-400 font-medium pt-2">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  {featured.author}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {featured.readTimeMins} دقائق قراءة
                </span>
              </div>
            </div>

            <div className="shrink-0 self-end md:self-center">
              <span className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-sm group-hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20">
                اقرأ المقال الكامل ←
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Interactive Category Filter & Search Section */}
      <ArticlesFilterClient articles={allArticles} />
    </div>
  );
}

import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticleBySlug, getArticles } from "@/lib/queries";
import { BookOpen, Clock, Sparkles, ArrowRight, Calendar } from "lucide-react";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(props: ArticlePageProps): Promise<Metadata> {
  const params = await props.params;
  const article = getArticleBySlug(params.slug);
  if (!article) return { title: "المقال غير موجود — منصة تقدير" };

  return {
    title: `${article.title} — منصة تقدير`,
    description: article.summary,
  };
}

export default async function ArticleDetailsPage(props: ArticlePageProps) {
  const params = await props.params;
  const article = getArticleBySlug(params.slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = getArticles(3)
    .filter((a) => a.slug !== article.slug)
    .slice(0, 3);

  // Formatter for markdown-like text to HTML blocks cleanly
  const renderMarkdownLines = (text: string) => {
    const lines = text.trim().split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("# ")) {
        return (
          <h1 key={idx} className="text-2xl sm:text-3xl font-black text-white mt-8 mb-4 border-r-4 border-emerald-500 pr-3">
            {trimmed.replace(/^#\s+/, "")}
          </h1>
        );
      }
      if (trimmed.startsWith("## ")) {
        return (
          <h2 key={idx} className="text-xl sm:text-2xl font-bold text-white mt-6 mb-3 text-emerald-300">
            {trimmed.replace(/^##\s+/, "")}
          </h2>
        );
      }
      if (trimmed.startsWith("### ")) {
        return (
          <h3 key={idx} className="text-lg font-bold text-slate-100 mt-5 mb-2">
            {trimmed.replace(/^###\s+/, "")}
          </h3>
        );
      }
      if (trimmed.startsWith("> ")) {
        return (
          <blockquote key={idx} className="my-4 p-4 rounded-xl bg-emerald-500/10 border-r-4 border-emerald-500 text-emerald-200 text-sm font-medium italic leading-relaxed">
            {trimmed.replace(/^>\s+/, "").replace(/^"(.*)"$/, "$1")}
          </blockquote>
        );
      }
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        return (
          <li key={idx} className="text-slate-300 text-sm leading-relaxed mr-4 list-disc mb-1">
            {trimmed.replace(/^[-*]\s+/, "")}
          </li>
        );
      }
      if (/^\d+\.\s+/.test(trimmed)) {
        return (
          <p key={idx} className="text-slate-300 text-sm leading-relaxed mb-2 font-semibold">
            {trimmed}
          </p>
        );
      }
      if (trimmed === "---") {
        return <hr key={idx} className="my-6 border-white/10" />;
      }
      if (!trimmed) {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="text-slate-300 text-sm sm:text-base leading-relaxed mb-4">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8 dir-rtl">
      {/* Back Button & Breadcrumb */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <Link
          href="/articles"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لجميع المقالات والتقارير</span>
        </Link>
        <span className="text-xs text-slate-500 font-medium">غرفة التحليلات الحصرية</span>
      </div>

      {/* Article Header Metadata */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            {article.category}
          </span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            قراءة {article.readTimeMins} دقائق
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
          {article.title}
        </h1>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium bg-slate-900/60 p-4 rounded-xl border border-white/10">
          {article.summary}
        </p>

        {/* Author Tag & Date Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white text-xs">{article.author}</p>
              <p className="text-[10px] text-slate-400">منصة تقدير للتحليلات الرياضية</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {new Date(article.publishedAt).toLocaleDateString("ar-EG", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Article Markdown Body */}
      <article className="bg-slate-900/40 rounded-2xl border border-white/10 p-6 sm:p-10 shadow-xl space-y-2">
        {renderMarkdownLines(article.contentMd)}
      </article>

      {/* Related Articles Footer */}
      {relatedArticles.length > 0 && (
        <div className="pt-8 border-t border-white/10 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>مقالات وتقارير ذات صلة</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedArticles.map((rel) => (
              <Link
                key={rel.id}
                href={`/articles/${rel.slug}`}
                className="group p-4 rounded-xl border border-white/10 bg-slate-900/60 hover:border-emerald-500/40 hover:bg-slate-900 transition-all"
              >
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {rel.category}
                </span>
                <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors mt-2 line-clamp-2">
                  {rel.title}
                </h4>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

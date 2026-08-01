import { Metadata } from "next";
import Link from "next/link";
import { getArticles, getFeaturedArticle } from "@/lib/queries";
import { BookOpen, Clock, TrendingUp } from "lucide-react";
import ArticlesFilterClient from "./ArticlesFilterClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "المقالات والتقارير — منصة تقدير",
  description:
    "دراسات تكتيكية وتحليلات كمية تجمع بين علوم الاحتمالات المعايرة والرؤية الفنية المعمقة.",
};

export default function ArticlesPage() {
  const allArticles = getArticles(30);
  const featured = getFeaturedArticle();

  return (
    <div className="space-y-10">
      <div className="space-y-3 border-b border-line pb-6">
        <h1 className="type-page text-ink">المقالات والتقارير الرياضية</h1>
        <p className="text-sm sm:text-base text-muted max-w-3xl leading-relaxed">
          دراسات تكتيكية وتحليلات كمية تجمع بين علوم الاحتمالات المعايرة والرؤية الفنية المعمقة.
        </p>
      </div>

      {featured && (
        <Link
          href={`/articles/${featured.slug}`}
          className="group relative block overflow-hidden rounded-2xl border border-line bg-panel p-6 sm:p-10 no-underline motion-colors hover:border-line-strong"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-4 max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-on-fill text-xs font-black">
                  <TrendingUp className="w-3.5 h-3.5" />
                  المقال الرئيسي الموصى به
                </span>
                <span className="text-xs font-semibold text-muted bg-surface px-2.5 py-1 rounded-md border border-line">
                  {featured.category}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-ink group-hover:text-accent motion-colors leading-tight">
                {featured.title}
              </h2>

              <p className="text-sm text-muted leading-relaxed line-clamp-3">
                {featured.summary}
              </p>

              <div className="flex items-center gap-6 text-xs text-faint font-medium pt-2">
                <span className="flex items-center gap-1.5 text-muted">
                  <BookOpen className="w-4 h-4 text-accent" />
                  {featured.author}
                </span>
                <span className="flex items-center gap-1.5 tabular">
                  <Clock className="w-4 h-4" />
                  {featured.readTimeMins} دقائق قراءة
                </span>
              </div>
            </div>

            <div className="shrink-0 self-end md:self-center">
              <span className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-accent text-on-fill font-extrabold text-sm">
                اقرأ المقال الكامل ←
              </span>
            </div>
          </div>
        </Link>
      )}

      <ArticlesFilterClient articles={allArticles} />
    </div>
  );
}

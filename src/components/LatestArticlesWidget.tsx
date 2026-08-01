import Link from "next/link";
import { getArticles } from "@/lib/queries";
import { SectionCard } from "./ui";
import { BookOpen, Clock, Sparkles } from "lucide-react";

export function LatestArticlesWidget() {
  const articles = getArticles(3);

  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <SectionCard
      title="التقارير التحليلية والمقالات"
      subtitle="قراءات تكتيكية ودراسات كمية خالية من الانحياز"
      headerRight={
        <Link
          href="/articles"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:opacity-80 transition-opacity"
        >
          <span>عرض كافة المقالات</span>
          <span aria-hidden>←</span>
        </Link>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {articles.map((art) => (
          <Link
            key={art.id}
            href={`/articles/${art.slug}`}
            className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-line bg-panel p-5 no-underline motion-colors hover:border-line-strong"
          >
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-dim px-3 py-1 text-[11px] font-bold text-accent border border-line">
                <Sparkles className="h-3 w-3" />
                {art.category}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-faint tabular">
                <Clock className="h-3 w-3" />
                {art.readTimeMins} دقائق
              </span>
            </div>

            <div className="space-y-2.5 flex-1">
              <h3 className="text-base font-bold leading-snug text-ink group-hover:text-accent motion-colors line-clamp-2">
                {art.title}
              </h3>
              <p className="text-xs text-muted line-clamp-3 leading-relaxed">
                {art.summary}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-line flex items-center justify-between text-[11px] text-faint">
              <span className="font-medium text-muted flex items-center gap-1">
                <BookOpen className="h-3 w-3 text-accent" />
                {art.author}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticleBySlug, getArticles } from "@/lib/queries";
import { BookOpen, Clock, Sparkles, ArrowRight, Calendar } from "lucide-react";
import { ReactNode } from "react";

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

function renderMarkdownBlocks(text: string): ReactNode[] {
  const lines = text.trim().split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (keyBase: number) => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`ul-${keyBase}`} className="my-3 ms-5 space-y-1.5 list-disc text-sm text-muted leading-relaxed">
        {listItems.map((item, i) => (
          <li key={`li-${keyBase}-${i}`}>{item}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listItems.push(trimmed.replace(/^[-*]\s+/, ""));
      return;
    }

    flushList(idx);

    if (trimmed.startsWith("# ")) {
      blocks.push(
        <h2
          key={idx}
          className="text-2xl sm:text-3xl font-black text-ink mt-8 mb-4 border-e-4 border-accent pe-3"
        >
          {trimmed.replace(/^#\s+/, "")}
        </h2>,
      );
      return;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push(
        <h3 key={idx} className="text-xl sm:text-2xl font-bold text-ink mt-6 mb-3">
          {trimmed.replace(/^##\s+/, "")}
        </h3>,
      );
      return;
    }
    if (trimmed.startsWith("### ")) {
      blocks.push(
        <h4 key={idx} className="text-lg font-bold text-ink mt-5 mb-2">
          {trimmed.replace(/^###\s+/, "")}
        </h4>,
      );
      return;
    }
    if (trimmed.startsWith("> ")) {
      blocks.push(
        <blockquote
          key={idx}
          className="my-4 p-4 rounded-xl bg-accent-dim border-e-4 border-accent text-ink text-sm font-medium italic leading-relaxed"
        >
          {trimmed.replace(/^>\s+/, "").replace(/^"(.*)"$/, "$1")}
        </blockquote>,
      );
      return;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      blocks.push(
        <p key={idx} className="text-muted text-sm leading-relaxed mb-2 font-semibold">
          {trimmed}
        </p>,
      );
      return;
    }
    if (trimmed === "---") {
      blocks.push(<hr key={idx} className="my-6 border-line" />);
      return;
    }
    if (!trimmed) {
      blocks.push(<div key={idx} className="h-2" />);
      return;
    }

    blocks.push(
      <p key={idx} className="text-muted text-sm sm:text-base leading-relaxed mb-4">
        {trimmed}
      </p>,
    );
  });

  flushList(lines.length);
  return blocks;
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

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <Link
          href="/articles"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-accent motion-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لجميع المقالات والتقارير</span>
        </Link>
      </div>

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent-dim border border-line text-accent text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            {article.category}
          </span>
          <span className="text-xs text-faint flex items-center gap-1 tabular">
            <Clock className="w-3.5 h-3.5" />
            قراءة {article.readTimeMins} دقائق
          </span>
        </div>

        <h1 className="type-page text-ink leading-tight">{article.title}</h1>

        <p className="text-sm sm:text-base text-muted leading-relaxed font-medium bg-panel p-4 rounded-xl border border-line">
          {article.summary}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-line text-xs text-faint">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent-dim border border-line flex items-center justify-center text-accent font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-ink text-xs">{article.author}</p>
              <p className="text-[10px] text-faint">منصة تقدير للتحليلات الرياضية</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 tabular">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {new Date(article.publishedAt).toLocaleDateString("ar-IQ", {
                timeZone: "Asia/Baghdad",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </header>

      <article className="bg-surface rounded-2xl border border-line p-6 sm:p-10 space-y-1">
        {renderMarkdownBlocks(article.contentMd)}
      </article>

      {relatedArticles.length > 0 && (
        <section className="pt-8 border-t border-line space-y-4">
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <span>مقالات وتقارير ذات صلة</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedArticles.map((rel) => (
              <Link
                key={rel.id}
                href={`/articles/${rel.slug}`}
                className="group p-4 rounded-xl border border-line bg-panel hover:border-line-strong motion-colors no-underline"
              >
                <span className="text-[10px] font-bold text-accent bg-accent-dim px-2 py-0.5 rounded border border-line">
                  {rel.category}
                </span>
                <h3 className="text-xs font-bold text-ink group-hover:text-accent motion-colors mt-2 line-clamp-2">
                  {rel.title}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

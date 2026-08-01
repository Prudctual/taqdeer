"use client";

import { useState } from "react";
import Link from "next/link";
import { Article } from "@/lib/queries";
import { BookOpen, Clock, Sparkles, Search, Layers, Filter } from "lucide-react";

interface ArticlesFilterClientProps {
  articles: Article[];
}

const CATEGORIES = [
  "الكل",
  "تحليل تكتيكي",
  "تقارير حصرية",
  "قراءة إحصائية",
  "فرص القيمة +EV",
];

export default function ArticlesFilterClient({ articles }: ArticlesFilterClientProps) {
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredArticles = articles.filter((art) => {
    const matchesCategory =
      selectedCategory === "الكل" || art.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      art.title.toLowerCase().includes(q) ||
      art.summary.toLowerCase().includes(q) ||
      art.category.toLowerCase().includes(q) ||
      art.author.toLowerCase().includes(q);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-panel p-4 rounded-xl border border-line">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          <Filter className="w-4 h-4 text-accent shrink-0 ms-1" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-accent text-on-fill"
                  : "bg-surface text-muted hover:text-ink border border-line"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في المقالات..."
            className="w-full ps-3 pe-9 py-1.5 bg-surface border border-line rounded-lg text-xs text-ink placeholder:text-faint focus:outline-none focus:border-accent motion-colors"
          />
        </div>
      </div>

      {filteredArticles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArticles.map((art) => (
            <Link
              key={art.id}
              href={`/articles/${art.slug}`}
              className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-line bg-panel p-5 no-underline motion-colors hover:border-line-strong"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-dim px-3 py-1 text-[11px] font-bold text-accent border border-line">
                    <Sparkles className="h-3 w-3" />
                    {art.category}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-faint font-medium tabular">
                    <Clock className="h-3 w-3" />
                    {art.readTimeMins} دقائق
                  </span>
                </div>

                <h3 className="text-base font-bold leading-snug text-ink group-hover:text-accent motion-colors">
                  {art.title}
                </h3>
                <p className="text-xs text-muted line-clamp-3 leading-relaxed">
                  {art.summary}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-line flex items-center justify-between text-[11px] text-faint">
                <span className="font-medium flex items-center gap-1 text-muted">
                  <BookOpen className="h-3.5 w-3.5 text-accent" />
                  {art.author}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-panel rounded-xl border border-line">
          <Layers className="w-10 h-10 text-faint mx-auto mb-3" />
          <h3 className="text-base font-bold text-ink">لا توجد مقالات مطابقة لخيارات البحث</h3>
          <p className="text-xs text-muted mt-1">جرّب تغيير كلمة البحث أو اختيار تصنيف آخر.</p>
        </div>
      )}
    </div>
  );
}

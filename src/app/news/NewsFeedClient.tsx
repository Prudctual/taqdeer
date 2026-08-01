"use client";

import { useState } from "react";
import { NewsItem } from "@/lib/queries";
import { Radio, Search, ExternalLink, Filter, Clock, Globe } from "lucide-react";

interface NewsFeedClientProps {
  initialNews: NewsItem[];
}

const CATEGORIES = [
  "الكل",
  "انتقالات",
  "إصابات وتشكيلات",
  "أخبار الدوريات",
  "تقارير إحصائية",
];

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

export default function NewsFeedClient({ initialNews }: NewsFeedClientProps) {
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = initialNews.filter((item) => {
    const matchesCat =
      selectedCategory === "الكل" || item.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q) ||
      item.sourceName.toLowerCase().includes(q);

    return matchesCat && matchesSearch;
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
            placeholder="بحث في الأخبار اللحظية..."
            className="w-full ps-3 pe-9 py-1.5 bg-surface border border-line rounded-lg text-xs text-ink placeholder:text-faint focus:outline-none focus:border-accent motion-colors"
          />
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 rounded-xl border border-line bg-surface hover:border-line-strong motion-colors"
            >
              <div className="space-y-2 max-w-4xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-accent-dim border border-line text-accent text-[11px] font-bold">
                    <Globe className="w-3 h-3" />
                    {item.sourceName}
                  </span>
                  <span className="text-[11px] font-semibold text-muted bg-panel px-2 py-0.5 rounded border border-line">
                    {item.category}
                  </span>
                  <span className="text-[11px] text-faint flex items-center gap-1 tabular">
                    <Clock className="w-3 h-3" />
                    {timeAgoArabic(item.publishedAt)}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-ink group-hover:text-accent motion-colors leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed line-clamp-2">
                  {item.summary}
                </p>
              </div>

              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-panel border border-line text-xs font-bold text-muted hover:text-accent hover:border-accent motion-colors shrink-0 self-end md:self-center"
                >
                  <span>المصدر الأصلي</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-panel rounded-xl border border-line">
          <Radio className="w-10 h-10 text-faint mx-auto mb-3" />
          <h3 className="text-base font-bold text-ink">لا توجد أخبار مطابقة لخيارات التصفية</h3>
          <p className="text-xs text-muted mt-1">جرّب تغيير عبارة البحث أو اختيار تصنيف آخر.</p>
        </div>
      )}
    </div>
  );
}

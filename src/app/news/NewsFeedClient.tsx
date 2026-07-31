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
      {/* Category Pills & Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-slate-900/60 p-4 rounded-xl border border-white/10">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          <Filter className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الأخبار اللحظية..."
            className="w-full pl-3 pr-9 py-1.5 bg-slate-950 border border-white/15 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Live News Timeline List */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 rounded-xl border border-white/10 bg-slate-900/70 hover:bg-slate-900 hover:border-emerald-500/40 transition-all duration-200"
            >
              <div className="space-y-2 max-w-4xl">
                {/* Source & Time Metadata */}
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-emerald-400 text-[11px] font-bold">
                    <Globe className="w-3 h-3" />
                    {item.sourceName}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {item.category}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgoArabic(item.publishedAt)}
                  </span>
                </div>

                {/* Title & Summary */}
                <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed line-clamp-2">
                  {item.summary}
                </p>
              </div>

              {/* Action Link */}
              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:text-white hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all shrink-0 self-end md:self-center"
                >
                  <span>المصدر الأصلي</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900/40 rounded-xl border border-white/5">
          <Radio className="w-10 h-10 text-slate-600 mx-auto mb-3 animate-pulse" />
          <h3 className="text-base font-bold text-slate-300">لا توجد أخبار مطابقة لخيارات التصفية</h3>
          <p className="text-xs text-slate-500 mt-1">جرّب تغيير عبارة البحث أو اختيار تصنيف آخر.</p>
        </div>
      )}
    </div>
  );
}

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
      {/* Category Pills & Search Controls */}
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

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في المقالات..."
            className="w-full pl-3 pr-9 py-1.5 bg-slate-950 border border-white/15 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Articles Grid */}
      {filteredArticles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((art) => (
            <Link
              key={art.id}
              href={`/articles/${art.slug}`}
              className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-slate-900/80 p-5 text-white transition-all duration-300 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1"
            >
              <div className="space-y-3">
                {/* Top Category Badge & Read Time */}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
                    <Sparkles className="h-3 w-3" />
                    {art.category}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                    <Clock className="h-3 w-3" />
                    {art.readTimeMins} دقائق
                  </span>
                </div>

                {/* Title & Summary */}
                <h3 className="text-base font-bold leading-snug text-white group-hover:text-emerald-300 transition-colors">
                  {art.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {art.summary}
                </p>
              </div>

              {/* Bottom Metadata */}
              <div className="mt-6 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-medium flex items-center gap-1 text-slate-300">
                  <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
                  {art.author}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900/40 rounded-xl border border-white/5">
          <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300">لا توجد مقالات مطابقة لخيارات البحث</h3>
          <p className="text-xs text-slate-500 mt-1">جرّب تغيير كلمة البحث أو اختيار تصنيف آخر.</p>
        </div>
      )}
    </div>
  );
}

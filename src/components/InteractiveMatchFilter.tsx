"use client";

import { useState } from "react";

export type FilterSortOption = "all" | "confidence" | "sharp" | "elo";

interface MatchFilterProps {
  onFilterChange: (option: FilterSortOption, search: string) => void;
}

export function InteractiveMatchFilter({ onFilterChange }: MatchFilterProps) {
  const [selectedSort, setSelectedSort] = useState<FilterSortOption>("all");
  const [searchQuery, setSearchQuery] = useState("");

  function handleSortSelect(opt: FilterSortOption) {
    setSelectedSort(opt);
    onFilterChange(opt, searchQuery);
  }

  function handleSearchChange(text: string) {
    setSearchQuery(text);
    onFilterChange(selectedSort, text);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/80 bg-panel/90 p-3 shadow-sm">
      {/* Search Input */}
      <div className="relative min-w-[14rem] flex-1">
        <input
          type="text"
          placeholder="ابحث باسم الفريق (مثل: بايرن، أولسان...)"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full rounded-lg border border-line bg-zinc-950 px-3 py-1.5 pr-8 text-xs text-ink placeholder-muted transition-colors duration-150 ease-out focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <svg
          className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Filter Options */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => handleSortSelect("all")}
          className={`rounded-full px-3 py-1 text-xs font-bold transition-all duration-150 ease-out active:scale-95 ${
            selectedSort === "all"
              ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-400"
              : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
          }`}
        >
          جميع المواعيد
        </button>

        <button
          onClick={() => handleSortSelect("confidence")}
          className={`rounded-full px-3 py-1 text-xs font-bold transition-all duration-150 ease-out active:scale-95 ${
            selectedSort === "confidence"
              ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-400"
              : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
          }`}
        >
          🎯 أعلى نسبة ثقة
        </button>

        <button
          onClick={() => handleSortSelect("sharp")}
          className={`rounded-full px-3 py-1 text-xs font-bold transition-all duration-150 ease-out active:scale-95 ${
            selectedSort === "sharp"
              ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-400"
              : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
          }`}
        >
          ⚡ حراك الأسواق
        </button>

        <button
          onClick={() => handleSortSelect("elo")}
          className={`rounded-full px-3 py-1 text-xs font-bold transition-all duration-150 ease-out active:scale-95 ${
            selectedSort === "elo"
              ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-400"
              : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
          }`}
        >
          🔥 أقوى المواجهات Elo
        </button>
      </div>
    </div>
  );
}

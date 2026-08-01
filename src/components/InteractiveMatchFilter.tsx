"use client";

import { useState } from "react";
import { TargetIcon, ZapIcon, FlameIcon } from "./Icons";

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
    <div className="bg-surface p-4 rounded-2xl border border-line shadow-xs flex flex-wrap items-center justify-between gap-3">
      {/* Search Input */}
      <div className="relative min-w-[14rem] flex-1">
        <input
          type="text"
          placeholder="ابحث باسم الفريق (مثل: بايرن، ريال مدريد...)"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full rounded-xl border border-line bg-panel px-4 py-2 ps-9 text-xs font-bold text-ink placeholder-faint transition-all duration-140 focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent-dim"
        />
        <svg
          className="absolute start-3 top-2.5 h-4 w-4 text-faint pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Filter Options */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => handleSortSelect("all")}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-all duration-140 active:scale-[0.97] cursor-pointer ${
            selectedSort === "all"
              ? "bg-accent text-on-fill shadow-xs border-0"
              : "bg-panel text-muted hover:bg-surface hover:text-ink border border-line"
          }`}
        >
          جميع المواعيد
        </button>

        <button
          onClick={() => handleSortSelect("confidence")}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-all duration-140 active:scale-[0.97] cursor-pointer ${
            selectedSort === "confidence"
              ? "bg-accent text-on-fill shadow-xs border-0"
              : "bg-panel text-muted hover:bg-surface hover:text-ink border border-line"
          }`}
        >
          <TargetIcon size={14} />
          <span>أعلى نسبة ثقة</span>
        </button>

        <button
          onClick={() => handleSortSelect("sharp")}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-all duration-140 active:scale-[0.97] cursor-pointer ${
            selectedSort === "sharp"
              ? "bg-accent text-on-fill shadow-xs border-0"
              : "bg-panel text-muted hover:bg-surface hover:text-ink border border-line"
          }`}
        >
          <ZapIcon size={14} />
          <span>حراك الأسواق</span>
        </button>

        <button
          onClick={() => handleSortSelect("elo")}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-all duration-140 active:scale-[0.97] cursor-pointer ${
            selectedSort === "elo"
              ? "bg-accent text-on-fill shadow-xs border-0"
              : "bg-panel text-muted hover:bg-surface hover:text-ink border border-line"
          }`}
        >
          <FlameIcon size={14} />
          <span>أقوى المواجهات Elo</span>
        </button>
      </div>
    </div>
  );
}

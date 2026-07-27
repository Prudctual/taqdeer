"use client";

import { useState, type ReactNode } from "react";

type TabKey = "overview" | "scores" | "market" | "h2h";

interface TabItem {
  key: TabKey;
  label: string;
  icon: string;
  count?: number | string;
}

const TABS: TabItem[] = [
  { key: "overview", label: "الإشارة والتوصية", icon: "📊" },
  { key: "scores", label: "النتائج والأسواق", icon: "⚽" },
  { key: "market", label: "النموذج مقابل السوق", icon: "📈" },
  { key: "h2h", label: "التاريخ والمصدر", icon: "📜" },
];

export function MatchTabContainer({
  overviewContent,
  scoresContent,
  marketContent,
  h2hContent,
}: {
  overviewContent: ReactNode;
  scoresContent: ReactNode;
  marketContent: ReactNode;
  h2hContent: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  return (
    <div className="space-y-6">
      {/* شريط التبويبات الرئيسي - Vercel Design System Style */}
      <div className="sticky top-[3.25rem] z-20 -mx-4 px-4 py-2 bg-bg/90 backdrop-blur-md border-b border-line sm:mx-0 sm:px-0 sm:rounded-xl sm:border sm:bg-surface/80">
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none p-1" aria-label="أقسام التحليل">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`press-scale flex flex-1 min-w-[7.5rem] items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-bold transition-all duration-150 select-none ${
                  isActive
                    ? "bg-panel text-ink shadow-sm border border-line-strong/40"
                    : "text-muted hover:text-ink hover:bg-panel/40 border border-transparent"
                }`}
                role="tab"
                aria-selected={isActive}
              >
                <span className="text-base">{tab.icon}</span>
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* المحتوى حسب التبويب النشط */}
      <div className="transition-opacity duration-200 ease-out">
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-200">{overviewContent}</div>
        )}
        {activeTab === "scores" && (
          <div className="space-y-6 animate-in fade-in duration-200">{scoresContent}</div>
        )}
        {activeTab === "market" && (
          <div className="space-y-6 animate-in fade-in duration-200">{marketContent}</div>
        )}
        {activeTab === "h2h" && (
          <div className="space-y-6 animate-in fade-in duration-200">{h2hContent}</div>
        )}
      </div>
    </div>
  );
}

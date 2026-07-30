"use client";

import { useState, type ReactNode } from "react";
import { useAdvancedMode } from "./AdvancedModeContext";

export function AdvancedOverviewWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const { isAdvancedMode } = useAdvancedMode();
  const [isOpen, setIsOpen] = useState(false);

  if (isAdvancedMode) {
    return <div className="space-y-6">{children}</div>;
  }

  return (
    <div className="pt-2 border-t border-line space-y-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 rounded-xl border border-line bg-panel hover:bg-surface text-xs font-extrabold text-muted hover:text-ink transition-all cursor-pointer shadow-xs"
      >
        <span className="flex items-center gap-2">
          <span>⚙️</span> المعاملات والتعديلات الخوارزمية المتقدمة (Dixon-Coles / Pi-Ratings / Elo)
        </span>
        <span className="text-accent font-mono text-sm">{isOpen ? "▲ إخفاء" : "▼ إظهار الرياضيات"}</span>
      </button>

      {isOpen && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

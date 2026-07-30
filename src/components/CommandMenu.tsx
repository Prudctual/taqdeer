"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme, ColorPreset } from "./ThemeContext";

export function CommandMenu() {
  const {
    commandOpen,
    setCommandOpen,
    mode,
    setMode,
    preset,
    setPreset,
  } = useTheme();

  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && commandOpen) {
        setCommandOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [commandOpen, setCommandOpen]);

  if (!commandOpen) return null;

  const quickLinks = [
    { label: "الرئيسية والمباريات القادمة", href: "/", category: "التنقل", icon: "⚽" },
    { label: "الدوريات والجدول العام", href: "/leagues", category: "التنقل", icon: "🏆" },
    { label: "دقة النماذج ومعايرة Dixon-Coles", href: "/accuracy", category: "التنقل", icon: "🎯" },
    { label: "منهجية الحسابات والافتراضات", href: "/methodology", category: "التنقل", icon: "📖" },
  ];

  const presets: { name: string; value: ColorPreset }[] = [
    { name: "Rose (قاني)", value: "rose" },
    { name: "Zinc (رمادي داكن)", value: "zinc" },
    { name: "Emerald (زمردي)", value: "emerald" },
    { name: "Blue (أزرق نقي)", value: "blue" },
    { name: "Violet (بنفسجي مائل)", value: "violet" },
  ];

  const filteredLinks = quickLinks.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60">
      {/* Backdrop click to close */}
      <div
        className="fixed inset-0"
        onClick={() => setCommandOpen(false)}
        aria-hidden="true"
      />

      {/* Modal dialog box */}
      <div className="relative w-full max-w-xl rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden z-10 modal-enter">
        {/* Search input bar */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-3 bg-panel/30">
          <span className="text-muted text-base">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن صفحة، فريق، أو أمر إعداد..."
            className="flex-1 bg-transparent text-sm text-ink placeholder-faint outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-line bg-panel px-1.5 py-0.5 text-[10px] font-semibold text-muted tabular">
            ESC
          </kbd>
        </div>

        {/* Results / Commands Body */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-line/40">
          {/* Section: Quick Navigation */}
          <div className="py-2">
            <div className="px-3 py-1 text-[11px] font-bold text-faint uppercase">
              الصفحات السريعة
            </div>
            {filteredLinks.length > 0 ? (
              filteredLinks.map((item, idx) => (
                <Link
                  key={idx}
                  href={item.href}
                  onClick={() => setCommandOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-panel active:scale-[0.98] transition-colors duration-150"
                >
                  <div className="flex items-center gap-2.5">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <span className="text-xs text-faint font-normal">← انتقل</span>
                </Link>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-xs text-muted">
                لا توجد نتائج مطابقة لـ &quot;{query}&quot;
              </div>
            )}
          </div>

          {/* Section: Theme & Mode Commands */}
          <div className="py-2">
            <div className="px-3 py-1 text-[11px] font-bold text-faint uppercase">
              المظهر والنمط (Theme & Preset)
            </div>

            {/* Light / Dark Mode Toggle */}
            <div className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-ink">
              <div className="flex items-center gap-2">
                <span>🌗</span>
                <span>نمط الشاشة (Light / Dark)</span>
              </div>
              <div className="flex gap-1">
                {(["light", "dark", "system"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`px-2.5 py-1 text-xs rounded-md font-bold transition-transform duration-150 active:scale-95 cursor-pointer ${
                      mode === m
                        ? "bg-accent text-white shadow-xs"
                        : "bg-panel text-muted hover:text-ink"
                    }`}
                  >
                    {m === "light" ? "فاتح" : m === "dark" ? "داكن" : "تلقائي"}
                  </button>
                ))}
              </div>
            </div>

            {/* Presets */}
            <div className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-ink">
              <div className="flex items-center gap-2">
                <span>🎨</span>
                <span>لون اللمسات (Accent)</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {presets.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPreset(p.value)}
                    className={`px-2 py-0.5 text-xs rounded-md font-semibold transition-all cursor-pointer ${
                      preset === p.value
                        ? "bg-accent text-white shadow-xs"
                        : "bg-panel text-muted hover:text-ink"
                    }`}
                  >
                    {p.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Developer CLI Command */}
          <div className="py-2 px-3">
            <div className="py-1 text-[11px] font-bold text-faint uppercase">
              أمر المطورين (CLI Quick Setup)
            </div>
            <div className="mt-1 flex items-center justify-between rounded-lg border border-line bg-panel/60 px-3 py-2 text-xs font-mono text-ink">
              <span>npx taqdeer@latest init</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("npx taqdeer@latest init");
                }}
                className="text-accent font-sans font-bold hover:underline cursor-pointer"
              >
                نسخ
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-line bg-panel/50 px-4 py-2 flex items-center justify-between text-[11px] text-faint">
          <span>استخدم الأسهم للتنقل و ENTER للااختيار</span>
          <button
            type="button"
            onClick={() => setCommandOpen(false)}
            className="hover:text-ink cursor-pointer"
          >
            إغلاق (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}

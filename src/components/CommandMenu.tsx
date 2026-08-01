"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTheme, ColorPreset } from "./ThemeContext";

const QUICK_LINKS = [
  { label: "الرئيسية والمباريات", href: "/", icon: "⚽" },
  { label: "الدوريات والجداول", href: "/leagues", icon: "🏆" },
  { label: "فرص القيمة (+EV)", href: "/value", icon: "📈" },
  { label: "الرسوم البيانية", href: "/charts", icon: "📊" },
  { label: "دقة النماذج", href: "/accuracy", icon: "🎯" },
  { label: "المنهجية", href: "/methodology", icon: "📖" },
  { label: "الأخبار اللحظية", href: "/news", icon: "📰" },
  { label: "المقالات والتقارير", href: "/articles", icon: "✍️" },
];

const PRESETS: { name: string; value: ColorPreset }[] = [
  { name: "أزرق", value: "blue" },
  { name: "قاني", value: "rose" },
  { name: "رمادي", value: "zinc" },
  { name: "زمردي", value: "emerald" },
  { name: "بنفسجي", value: "violet" },
];

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
    if (!commandOpen) setQuery("");
  }, [commandOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && commandOpen) {
        setCommandOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [commandOpen, setCommandOpen]);

  const filteredLinks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return QUICK_LINKS;
    return QUICK_LINKS.filter((item) => item.label.toLowerCase().includes(q));
  }, [query]);

  if (!commandOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-ink/50"
      role="dialog"
      aria-modal="true"
      aria-label="قائمة الأوامر"
    >
      <div
        className="fixed inset-0"
        onClick={() => setCommandOpen(false)}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-xl rounded-2xl border border-line bg-surface overflow-hidden z-10 modal-enter">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3 bg-panel">
          <span className="text-muted text-base" aria-hidden>
            ⌕
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن صفحة أو أمر مظهر..."
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-faint outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted tabular">
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          <div className="py-2">
            <div className="px-3 py-1 text-[11px] font-bold text-faint">الصفحات</div>
            {filteredLinks.length > 0 ? (
              filteredLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setCommandOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-panel motion-colors no-underline"
                >
                  <div className="flex items-center gap-2.5">
                    <span aria-hidden>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <span className="text-xs text-faint">←</span>
                </Link>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-xs text-muted">
                لا توجد نتائج مطابقة لـ &quot;{query}&quot;
              </div>
            )}
          </div>

          <div className="border-t border-line py-2">
            <div className="px-3 py-1 text-[11px] font-bold text-faint">المظهر</div>

            <div className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-ink">
              <span>نمط الشاشة</span>
              <div className="flex gap-1">
                {(["light", "dark", "system"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`px-2.5 py-1 text-xs rounded-md font-bold cursor-pointer ${
                      mode === m
                        ? "bg-accent text-on-fill"
                        : "bg-panel text-muted hover:text-ink border border-line"
                    }`}
                  >
                    {m === "light" ? "فاتح" : m === "dark" ? "داكن" : "تلقائي"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-ink gap-3">
              <span className="shrink-0">لون اللمسة</span>
              <div className="flex gap-1.5 flex-wrap justify-end">
                {PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPreset(p.value)}
                    className={`px-2 py-0.5 text-xs rounded-md font-semibold cursor-pointer ${
                      preset === p.value
                        ? "bg-accent text-on-fill"
                        : "bg-panel text-muted hover:text-ink border border-line"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-line bg-panel px-4 py-2 flex items-center justify-between text-[11px] text-faint">
          <span>⌘K لفتح القائمة · Esc للإغلاق</span>
          <button
            type="button"
            onClick={() => setCommandOpen(false)}
            className="hover:text-ink cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

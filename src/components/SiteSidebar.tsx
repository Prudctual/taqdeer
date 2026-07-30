"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeContext";
import { useAdvancedMode } from "./AdvancedModeContext";

export function SiteSidebar() {
  const pathname = usePathname();
  const { mode, setMode, toggleCommand } = useTheme();
  const { isAdvancedMode, toggleAdvancedMode } = useAdvancedMode();

  const navItems = [
    {
      href: "/",
      label: "المباريات",
      active: pathname === "/",
      icon: (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v12M6 12h12" />
        </svg>
      ),
    },
    {
      href: "/value",
      label: "فرص القيمة (+EV)",
      active: pathname.startsWith("/value"),
      icon: (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      href: "/leagues",
      label: "الدوريات والجدول",
      active: pathname.startsWith("/leagues"),
      icon: (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      href: "/accuracy",
      label: "الدقة والسجل",
      active: pathname.startsWith("/accuracy"),
      icon: (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: "/charts",
      label: "الرسوم البيانية",
      active: pathname.startsWith("/charts"),
      icon: (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      href: "/methodology",
      label: "المنهجية الحسابية",
      active: pathname.startsWith("/methodology"),
      icon: (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="sidebar-desktop">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <Link href="/" className="flex items-center gap-3 no-underline group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-black text-sm text-white group-hover:scale-105 active:scale-95 transition-transform duration-150 shadow-xs">
            ت
          </div>
          <div className="flex flex-col">
            <span className="font-black text-[0.9375rem] tracking-tight text-ink leading-tight">تقدير</span>
            <span className="text-[10px] font-bold text-muted leading-tight">تحليلات متقدمة</span>
          </div>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav space-y-1">
        <span className="sidebar-section-label">التنقل الرئيسي</span>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
              item.active
                ? "bg-accent/10 text-accent font-black"
                : "text-muted hover:bg-panel hover:text-ink"
            }`}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer Controls */}
      <div className="sidebar-footer space-y-2 pt-3 border-t border-line">
        {/* Search */}
        <button
          type="button"
          onClick={toggleCommand}
          className="sidebar-btn sidebar-btn-search w-full flex items-center justify-between px-3 py-2 rounded-xl border border-line bg-surface hover:bg-panel text-xs text-muted font-bold transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-ink">بحث سريعة...</span>
          </span>
          <kbd className="sidebar-kbd px-1.5 py-0.5 rounded bg-panel border border-line text-[10px] font-mono text-muted">⌘K</kbd>
        </button>

        {/* Advanced Mode Toggle */}
        <button
          type="button"
          onClick={toggleAdvancedMode}
          className={`sidebar-btn w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
            isAdvancedMode
              ? "border-accent/30 bg-accent/10 text-accent font-black"
              : "border-line bg-surface text-muted hover:bg-panel hover:text-ink"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{isAdvancedMode ? "وضع الخبير (متقدم)" : "الوضع المبسط"}</span>
          </span>
        </button>

        {/* Theme Toggle */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setMode(mode === "dark" ? "light" : "dark")}
            className="sidebar-btn-icon w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-line bg-surface hover:bg-panel text-xs font-bold text-ink transition-colors cursor-pointer"
          >
            {mode === "dark" ? (
              <>
                <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>النمط الفاتح</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <span>النمط الداكن</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

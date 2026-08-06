"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "./ThemeContext";
import { useAdvancedMode } from "./AdvancedModeContext";

export function SiteHeader() {
  const pathname = usePathname();
  const { mode, setMode, toggleCommand } = useTheme();
  const { isAdvancedMode, toggleAdvancedMode } = useAdvancedMode();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

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
      active: pathname === "/accuracy",
      icon: (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: "/history",
      label: "سجل حفظ التوقعات",
      active: pathname.startsWith("/history"),
      icon: (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
      href: "/news",
      label: "الأخبار اللحظية",
      active: pathname.startsWith("/news"),
      icon: (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
        </svg>
      ),
    },
    {
      href: "/articles",
      label: "المقالات والتقارير",
      active: pathname.startsWith("/articles"),
      icon: (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
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

  const activeItem = navItems.find((item) => item.active);

  return (
    <>
      <header className="topbar">
        <div className="mx-auto max-w-[var(--content-max)] px-4">
          {/* Main Header Bar */}
          <div className="flex items-center justify-between gap-3 h-14">
            {/* Mobile: Hamburger Menu Button + Brand Logo */}
            <div className="flex items-center gap-2.5 md:hidden">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-line text-ink hover:bg-panel transition-colors cursor-pointer"
                aria-label="القائمة الجانبية"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <Link href="/" className="flex items-center gap-2 no-underline">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent font-black text-base text-on-fill shadow-xs">
                  ت
                </div>
                <span className="font-black text-base tracking-tight text-ink">تقدير</span>
              </Link>
            </div>

            {/* Desktop: Page Title */}
            <div className="hidden md:flex items-center gap-2">
              <span className="text-base font-black text-ink tracking-tight">{activeItem?.label ?? "تقدير"}</span>
            </div>

            {/* Desktop: Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`topbar-mobile-link text-xs px-3.5 py-1.5 font-bold transition-all ${
                    item.active ? "is-active font-black" : ""
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Controls: Telegram Bot + Search Trigger + Theme Switcher */}
            <div className="flex items-center gap-2">
              {/* Telegram Bot Direct Button */}
              <a
                href="https://t.me/Taqdeerbot"
                target="_blank"
                rel="noopener noreferrer"
                className="group press-scale flex items-center gap-1.5 rounded-xl bg-accent-dim hover:bg-accent-dim border border-accent/30 px-3 py-1.5 text-xs font-black text-accent no-underline transition-all shadow-xs"
                title="افتـح بوت التلغرام التفاعلي (@Taqdeerbot)"
              >
                <svg className="h-4 w-4 fill-current text-[#229ED9] group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
                <span className="hidden sm:inline">بوت التلغرام</span>
              </a>

              <button
                type="button"
                onClick={toggleCommand}
                aria-label="البحث في المنصة"
                className="topbar-search-btn"
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-xs">🔍</span>
                  <span className="text-faint font-bold text-xs">بحث...</span>
                </span>
                <kbd className="topbar-kbd">⌘K</kbd>
              </button>

              <button
                type="button"
                onClick={() => setMode(mode === "dark" ? "light" : "dark")}
                aria-label="تغيير النمط"
                className="topbar-icon-btn"
              >
                {mode === "dark" ? "☀️" : "🌙"}
              </button>
            </div>
          </div>

          {/* Mobile Only: Sub-Bar Navigation Links (Scrollable Pills) */}
          <nav className="md:hidden flex items-center gap-1.5 overflow-x-auto scrollbar-none py-2 border-t border-line/60">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`topbar-mobile-link shrink-0 ${item.active ? "is-active font-black" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile Sidebar Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop Click to Close */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          {/* Sliding Drawer Panel (RTL - right to left) */}
          <aside className="fixed inset-y-0 right-0 z-50 w-72 sm:w-80 bg-surface border-s border-line shadow-2xl flex flex-col justify-between p-5 overflow-y-auto animate-in slide-in-from-right duration-250">
            <div className="space-y-6">
              {/* Brand Header + Close Button */}
              <div className="flex items-center justify-between pb-4 border-b border-line">
                <Link href="/" onClick={() => setIsMobileSidebarOpen(false)} className="flex items-center gap-3 no-underline">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent font-black text-base text-on-fill shadow-xs">
                    ت
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-base tracking-tight text-ink leading-tight">تقدير</span>
                    <span className="text-[11px] font-bold text-muted leading-tight">تحليلات كرة القدم المتقدمة</span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-panel border border-line text-muted hover:text-ink transition-colors cursor-pointer"
                  aria-label="إغلاق القائمة"
                >
                  ✕
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="space-y-1">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider block px-3 mb-2">
                  التنقل الرئيسي
                </span>
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      item.active
                        ? "bg-accent/15 text-accent font-black shadow-2xs"
                        : "text-muted hover:bg-panel hover:text-ink"
                    }`}
                  >
                    <span className="text-current">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>

            {/* Footer Actions */}
            <div className="space-y-2.5 pt-4 border-t border-line mt-6">
              {/* Telegram Bot Direct Link */}
              <a
                href="https://t.me/Taqdeerbot"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-accent-dim border border-accent/30 text-xs font-black text-accent no-underline transition-all shadow-xs"
              >
                <svg className="h-4 w-4 fill-current text-[#229ED9]" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
                <span>بوت التلغرام المباشر</span>
              </a>

              {/* Advanced Mode Toggle */}
              <button
                type="button"
                onClick={toggleAdvancedMode}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isAdvancedMode
                    ? "border-accent/30 bg-accent/10 text-accent font-black"
                    : "border-line bg-panel text-muted hover:text-ink"
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{isAdvancedMode ? "وضع الخبير (مفعل)" : "الوضع المبسط"}</span>
                </span>
              </button>

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={() => setMode(mode === "dark" ? "light" : "dark")}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-line bg-panel hover:bg-surface text-xs font-bold text-ink transition-all cursor-pointer"
              >
                {mode === "dark" ? (
                  <>
                    <span className="text-warn">☀️</span>
                    <span>النمط الفاتح</span>
                  </>
                ) : (
                  <>
                    <span className="text-indigo-500">🌙</span>
                    <span>النمط الداكن</span>
                  </>
                )}
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeContext";

export function SideSidebarNav() {
  const pathname = usePathname();
  const { mode, setMode, toggleCommand } = useTheme();

  const navItems = [
    {
      href: "/",
      label: "الرئيسية والمباريات",
      active: pathname === "/",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: "/value",
      label: "مباريات القيمة (+EV)",
      active: pathname.startsWith("/value"),
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      href: "/leagues",
      label: "الدوريات والجدول",
      active: pathname.startsWith("/leagues"),
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      href: "/accuracy",
      label: "دقة النماذج والسجل",
      active: pathname.startsWith("/accuracy"),
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: "/charts",
      label: "الرسوم البيانية (Charts)",
      active: pathname.startsWith("/charts"),
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      href: "/methodology",
      label: "المنهجية الحسابية",
      active: pathname.startsWith("/methodology"),
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col items-center justify-between w-16 bg-surface border-e border-line py-5 sticky top-0 h-screen shrink-0 z-40">
      {/* Top Brand Icon */}
      <div className="flex flex-col items-center gap-6">
        <Link
          href="/"
          className="h-10 w-10 rounded-2xl bg-accent text-white flex items-center justify-center font-black text-lg shadow-sm hover:scale-105 transition-transform"
        >
          ت
        </Link>

        {/* Vertical Icon List */}
        <nav className="flex flex-col gap-2.5">
          {navItems.map((item, idx) => (
            <Link
              key={idx}
              href={item.href}
              title={item.label}
              className={`relative h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                item.active
                  ? "bg-accent/15 text-accent font-bold shadow-xs"
                  : "text-muted hover:bg-panel hover:text-ink"
              }`}
            >
              {item.active && (
                <span className="absolute -left-3 inset-y-2 w-1 bg-accent rounded-r-md" />
              )}
              <span>{item.icon}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Bottom Controls */}
      <div className="flex flex-col gap-3 items-center">
        {/* Search Cmd+K */}
        <button
          type="button"
          onClick={toggleCommand}
          title="بحث (⌘K)"
          className="h-10 w-10 rounded-xl flex items-center justify-center text-muted hover:bg-panel hover:text-ink transition-colors cursor-pointer"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>



        {/* Dark/Light mode toggle */}
        <button
          type="button"
          onClick={() => setMode(mode === "dark" ? "light" : "dark")}
          title="نمط الشاشة"
          className="h-10 w-10 rounded-xl flex items-center justify-center text-muted hover:bg-panel hover:text-ink transition-colors cursor-pointer"
        >
          {mode === "dark" ? (
            <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>
    </aside>
  );
}

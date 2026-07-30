"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeContext";

export function SiteHeader() {
  const pathname = usePathname();
  const { mode, setMode, toggleCommand } = useTheme();

  const navItems = [
    { href: "/", label: "المباريات", active: pathname === "/" },
    { href: "/value", label: "فرص القيمة", active: pathname.startsWith("/value") },
    { href: "/leagues", label: "الدوريات", active: pathname.startsWith("/leagues") },
    { href: "/accuracy", label: "الدقة والسجل", active: pathname.startsWith("/accuracy") },
    { href: "/methodology", label: "المنهجية", active: pathname.startsWith("/methodology") },
  ];

  // Page title from active route
  const activeItem = navItems.find((item) => item.active);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        {/* Mobile: Brand + hamburger area */}
        <div className="flex items-center gap-3 md:hidden">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent font-black text-sm text-white">
              ت
            </div>
            <span className="font-black text-[0.9375rem] tracking-tight text-ink">تقدير</span>
          </Link>
        </div>

        {/* Desktop: Breadcrumb / Page title */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-sm font-bold text-ink">{activeItem?.label ?? "تقدير"}</span>
        </div>

        {/* Mobile: Nav links (horizontal scroll) */}
        <nav className="md:hidden flex items-center gap-1 overflow-x-auto scrollbar-none -mx-4 px-4 py-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`topbar-mobile-link ${item.active ? "is-active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Search Trigger */}
          <button
            type="button"
            onClick={toggleCommand}
            className="topbar-search-btn"
          >
            <span className="flex items-center gap-1.5">
              <span>🔍</span>
              <span className="text-faint font-medium">بحث...</span>
            </span>
            <kbd className="topbar-kbd">⌘K</kbd>
          </button>

          {/* Mobile: Theme toggle */}
          <button
            type="button"
            onClick={() => setMode(mode === "dark" ? "light" : "dark")}
            className="topbar-icon-btn md:hidden"
          >
            {mode === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </div>
    </header>
  );
}

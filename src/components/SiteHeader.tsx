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

  const activeItem = navItems.find((item) => item.active);

  return (
    <header className="topbar">
      <div className="mx-auto max-w-[var(--content-max)] px-4">
        {/* Main Header Bar */}
        <div className="flex items-center justify-between gap-3 h-14">
          {/* Mobile: Brand Logo */}
          <div className="flex items-center gap-2.5 md:hidden">
            <Link href="/" className="flex items-center gap-2 no-underline">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent font-black text-base text-white shadow-xs">
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

          {/* Controls: Search Trigger + Theme Switcher */}
          <div className="flex items-center gap-2">
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
  );
}

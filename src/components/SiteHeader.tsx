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
    { href: "/history", label: "حفظ التوقعات", active: pathname.startsWith("/history") },
    { href: "/charts", label: "الرسوم", active: pathname.startsWith("/charts") },
    { href: "/news", label: "الأخبار", active: pathname.startsWith("/news") },
    { href: "/articles", label: "المقالات", active: pathname.startsWith("/articles") },
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
          <a
            href="https://t.me/Taqdeerbot"
            target="_blank"
            rel="noopener noreferrer"
            className="topbar-mobile-link shrink-0 flex items-center gap-1 bg-accent-dim text-accent font-black border border-accent/30 no-underline"
          >
            <svg className="h-3.5 w-3.5 fill-current text-[#229ED9]" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
            <span>بوت التلغرام</span>
          </a>
        </nav>
      </div>
    </header>
  );
}

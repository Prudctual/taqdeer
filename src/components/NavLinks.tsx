"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "المباريات", match: (p: string) => p === "/" },
  {
    href: "/leagues",
    label: "الدوريات",
    match: (p: string) => p.startsWith("/leagues"),
  },
  {
    href: "/accuracy",
    label: "الدقة",
    match: (p: string) => p.startsWith("/accuracy"),
  },
  {
    href: "/methodology",
    label: "المنهجية",
    match: (p: string) => p.startsWith("/methodology"),
  },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    // الحشو السفلي يساوي إزاحة خط التفعيل (‎-0.9rem‎) حتى يستقر على الخط الشعري
    // السفلي للرأس بدل أن يقصّه تمرير الشريط الأفقي.
    <nav
      className="site-nav self-end pb-[0.9rem]"
      aria-label="التنقل الرئيسي"
    >
      {links.map((l) => {
        const active = l.match(pathname);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`site-nav-link ${active ? "is-active" : ""}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

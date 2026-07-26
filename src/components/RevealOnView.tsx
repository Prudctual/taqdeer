"use client";

import { useEffect, useRef, type ReactNode } from "react";

const REVEALED = "is-inview";

/** مراقب واحد لكل هامش — بدل مراقب لكل شريط في القوائم الطويلة */
const observers = new Map<string, IntersectionObserver>();

function getObserver(rootMargin: string): IntersectionObserver | null {
  if (typeof IntersectionObserver === "undefined") return null;
  const existing = observers.get(rootMargin);
  if (existing) return existing;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add(REVEALED);
        io.unobserve(entry.target);
      }
    },
    { rootMargin, threshold: 0.15 },
  );
  observers.set(rootMargin, io);
  return io;
}

/** يضيف `.is-inview` مرة واحدة عند أول ظهور؛ خامل تماماً مع تفضيل تقليل الحركة. */
export function RevealOnView({
  children,
  className = "",
  rootMargin = "0px 0px -40px 0px",
}: {
  children: ReactNode;
  className?: string;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.classList.contains(REVEALED)) return;

    // مع تقليل الحركة لا كشف ولا مراقبة — المحتوى ظاهر أصلاً بلا الصنف
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = getObserver(rootMargin);
    if (!io) {
      el.classList.add(REVEALED);
      return;
    }

    io.observe(el);
    return () => io.unobserve(el);
  }, [rootMargin]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

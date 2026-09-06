"use client";

import { usePathname } from "next/navigation";

export function MainContentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHasr = pathname.startsWith("/hasr");

  if (isHasr) {
    return <main className="w-full flex-1 min-w-0">{children}</main>;
  }

  return (
    <main className="mx-auto w-full max-w-[var(--content-max)] flex-1 px-4 py-6 sm:px-6 sm:py-8">
      {children}
    </main>
  );
}

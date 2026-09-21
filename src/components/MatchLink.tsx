"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Link>;

/** يجهّز صفحة المباراة عند مرور المؤشر أو اللمس، فيفتح الضغط من الذاكرة. */
export function MatchLink({ href, onMouseEnter, onFocus, onTouchStart, ...rest }: Props) {
  const router = useRouter();
  const url = typeof href === "string" ? href : (href.pathname ?? "");

  const warm = () => {
    if (url) router.prefetch(url);
  };

  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={(event) => {
        warm();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        warm();
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        warm();
        onTouchStart?.(event);
      }}
      {...rest}
    />
  );
}

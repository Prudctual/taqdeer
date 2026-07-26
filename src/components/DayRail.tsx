import type { ReactNode } from "react";

/**
 * سكة اليوم — شريط لاصق بخط شعري تحت رأس الموقع.
 * بلا زجاج ولا ظل: السطح صلب والفصل خط واحد.
 */
export function DayRail({ children }: { children: ReactNode }) {
  return <div className="day-rail px-4 py-2">{children}</div>;
}

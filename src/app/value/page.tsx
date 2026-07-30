import type { Metadata } from "next";
import { getValueMatches } from "@/lib/queries";
import { PageNav, BackBar } from "@/components/ui";
import { ValueMatchesView } from "@/components/ValueMatchesView";

export const metadata: Metadata = {
  title: "المباريات ذات القيمة (+EV Value Bets)",
  description: "ترشيح المباريات القادمة التي تحتوي على عائد متوقع موجب (+EV) وحصة كيلي الموصى بها.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ValueMatchesPage() {
  const matches = getValueMatches();

  return (
    <div className="space-y-8">
      <PageNav backHref="/" backLabel="المباريات" crumbs={[{ href: "/", label: "المباريات" }, { label: "فرص القيمة (+EV)" }]} />
      <ValueMatchesView matches={matches} />
      <BackBar links={[{ href: "/", label: "الرئيسية" }]} />
    </div>
  );
}

import type { Metadata } from "next";
import { getDoubleChanceMatches } from "@/lib/queries";
import { PageNav, BackBar } from "@/components/ui";
import { DoubleChanceMatchesView } from "@/components/DoubleChanceMatchesView";

export const metadata: Metadata = {
  title: "الفرصة المزدوجة",
  description:
    "كل التوقعات القادمة مع أفضل فرصة مزدوجة (1X / X2 / 12) بشكل واضح ومستقل عن التوقع الأرجح.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function DoubleChancePage() {
  const matches = getDoubleChanceMatches(14);

  return (
    <div className="space-y-8">
      <PageNav
        backHref="/"
        backLabel="المباريات"
        crumbs={[{ href: "/", label: "المباريات" }, { label: "الفرصة المزدوجة" }]}
      />
      <DoubleChanceMatchesView matches={matches} />
      <BackBar links={[{ href: "/", label: "الرئيسية" }, { href: "/value", label: "فرص القيمة" }]} />
    </div>
  );
}

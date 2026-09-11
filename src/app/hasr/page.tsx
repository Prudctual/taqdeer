import type { Metadata } from "next";
import { getConfinedPlatformData } from "@/lib/queries";
import { HasrTerminalView } from "@/components/hasr/HasrTerminalView";

export const revalidate = 20;

export const metadata: Metadata = {
  title: "الفرق المحصورة · منصة حصر النخب الإحصائية والبارلي المزدوج",
  description:
    "بوابة مستقلة لحصر الفرق الأكثر أماناً وقيمة، وتصفية عشوائية المباريات والبارلي المزدوج المعتمد رياضياً بنماذج إحصائية صارمة.",
};

export default async function HasrPage() {
  const data = getConfinedPlatformData();

  return <HasrTerminalView initialData={data} />;
}

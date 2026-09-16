import type { Metadata } from "next";
import { getConfinedPlatformData } from "@/lib/queries";
import { HasrTerminalView } from "@/components/hasr/HasrTerminalView";

export const revalidate = 20;

export const metadata: Metadata = {
  title: "المحسوم · غربال يتفق فيه النموذج مع السوق الحاد",
  description:
    "لا تُوصف مباراة بالمحسومة إلا باتفاق لبّ النموذج مع إغلاق السوق الحاد منزوع الهامش، وعتبة θ معايرة لكل دوري، واستبعاد الديربي والغياب المؤثر وصدمات بداية الموسم. كل ما عداه أرشيف إشارة ضعيفة بلا ادعاء.",
};

export default async function HasrPage() {
  const data = getConfinedPlatformData();

  return <HasrTerminalView initialData={data} />;
}

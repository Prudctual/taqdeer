import { BackLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="max-w-[52ch] space-y-3 py-12 sm:py-16">
      <h1 className="type-page text-ink">الصفحة غير موجودة</h1>
      <p className="text-sm leading-relaxed text-muted text-pretty">
        الرابط قديم أو المباراة لم تعد في القاعدة.
      </p>
      <div className="pt-2">
        <BackLink href="/" label="المباريات" />
      </div>
    </div>
  );
}

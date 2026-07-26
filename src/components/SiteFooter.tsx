import { formatMetaStamp } from "@/lib/format";
import { getMeta } from "@/lib/queries";

function Rule() {
  return <span className="h-3 w-px shrink-0 bg-line" aria-hidden />;
}

/** تذييل هادئ — سطر واحد: المصادر وآخر مزامنة، بلا زينة */
export function SiteFooter() {
  const lastSync = getMeta("last_sync");
  const lastFit = getMeta("last_fit");
  const stamp = lastSync
    ? { label: "آخر مزامنة", value: lastSync }
    : lastFit
      ? { label: "آخر تدريب", value: lastFit }
      : null;

  return (
    <footer className="mt-10 border-t border-line">
      <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-4 text-[11px] leading-relaxed text-faint">
        <span className="font-semibold text-muted">توقّع</span>
        <Rule />
        <span>احتمال وليس يقيناً</span>
        <Rule />
        <span>احتمالات 1X2 من نماذج معايرة للدوريات الأوروبية الخمس</span>
        <Rule />
        <span>
          المصادر{" "}
          <span dir="ltr" className="text-muted">
            football-data.org
          </span>
          ،{" "}
          <span dir="ltr" className="text-muted">
            football-data.co.uk
          </span>
        </span>
        {stamp ? (
          <>
            <Rule />
            <span className="tabular">
              {stamp.label} {formatMetaStamp(stamp.value)}
            </span>
          </>
        ) : null}
      </div>
    </footer>
  );
}

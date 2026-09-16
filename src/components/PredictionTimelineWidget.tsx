import { SectionCard } from "@/components/ui";
import { pct } from "@/lib/format";
import type { SieveRule, SieveTier, TimelineSnapshot, TimelineSnapshotKind } from "@/lib/queries";
import { SieveRulesChips, SieveTierBadge } from "@/components/SieveRulesChips";

const KIND_LABEL: Record<TimelineSnapshotKind, string> = {
  announce: "الإعلان",
  lineup: "التشكيلة (T−1h)",
  close: "الإغلاق",
};

const PICK_LABEL: Record<string, string> = { H: "فوز المضيف", D: "التعادل", A: "فوز الضيف" };

function kindLabel(kind: TimelineSnapshotKind): string {
  switch (kind) {
    case "announce":
      return KIND_LABEL.announce;
    case "lineup":
      return KIND_LABEL.lineup;
    case "close":
      return KIND_LABEL.close;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

function idx(pick: string | null): 0 | 1 | 2 | null {
  if (pick === "H") return 0;
  if (pick === "D") return 1;
  if (pick === "A") return 2;
  return null;
}

function fmtAt(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ar", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" });
}

/**
 * مسار التوقع الزمني (خطة 006 §د): ثلاث لقطات — إعلان، تشكيلة، إغلاق — لكل منها
 * لبّ النموذج والسوق الحاد والناتج المدموج وα والفجوة وحكم الغربال. التقييم النهائي
 * يُجرى دائماً مقابل الإغلاق، وتحرّك التوقع بين اللقطات يُعرض لا يُخفى.
 */
export function PredictionTimelineWidget({
  snapshots,
  sieveTier,
  sieveRules,
  sieveTheta,
}: {
  snapshots: TimelineSnapshot[];
  sieveTier: SieveTier | null;
  sieveRules: SieveRule[];
  sieveTheta: number | null;
}) {
  if (snapshots.length === 0 && sieveRules.length === 0) return null;

  return (
    <SectionCard
      title="مسار التوقع وحكم الغربال"
      subtitle="إعلان → تشكيلة → إغلاق: ما قاله النموذج وما قاله السوق الحاد وما نُشر فعلاً"
    >
      <div className="p-4 sm:p-5 space-y-4">
        {sieveRules.length > 0 ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-ink">حكم غربال المحسوم:</span>
              <SieveTierBadge tier={sieveTier} />
              {sieveTheta != null ? (
                <span className="font-mono text-muted tabular">θ = {sieveTheta.toFixed(2)}</span>
              ) : null}
            </div>
            <SieveRulesChips rules={sieveRules} />
          </div>
        ) : null}

        {snapshots.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <caption className="sr-only">لقطات التوقع الزمنية مع احتمالات اللبّ والسوق والناتج النهائي</caption>
              <thead>
                <tr className="border-b border-line text-muted text-[11px] font-bold">
                  <th scope="col" className="py-2 px-2 text-start">اللقطة</th>
                  <th scope="col" className="py-2 px-2 text-start">الوقت</th>
                  <th scope="col" className="py-2 px-2 text-start">الترجيح</th>
                  <th scope="col" className="py-2 px-2 text-center">لبّ النموذج</th>
                  <th scope="col" className="py-2 px-2 text-center">السوق الحاد</th>
                  <th scope="col" className="py-2 px-2 text-center">النهائي</th>
                  <th scope="col" className="py-2 px-2 text-center">α</th>
                  <th scope="col" className="py-2 px-2 text-center">الفجوة</th>
                  <th scope="col" className="py-2 px-2 text-center">الشريحة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {snapshots.map((s) => {
                  const i = idx(s.pick);
                  return (
                    <tr key={`${s.kind}-${s.at}`} className="hover:bg-panel/50 transition-colors">
                      <td className="py-2 px-2 font-semibold text-ink">{kindLabel(s.kind)}</td>
                      <td className="py-2 px-2 text-muted font-mono tabular whitespace-nowrap">{fmtAt(s.at)}</td>
                      <td className="py-2 px-2 text-ink">{s.pick ? (PICK_LABEL[s.pick] ?? s.pick) : "—"}</td>
                      <td className="py-2 px-2 text-center font-mono tabular text-ink">
                        {i != null && s.pm ? pct(s.pm[i], 1) : "—"}
                      </td>
                      <td className="py-2 px-2 text-center font-mono tabular text-ink">
                        {i != null && s.ps ? pct(s.ps[i], 1) : "—"}
                        {s.oddsSource ? <span className="block text-[9px] text-muted">{s.oddsSource}</span> : null}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold tabular text-ink">
                        {s.pPick != null ? pct(s.pPick, 1) : i != null && s.pf ? pct(s.pf[i], 1) : "—"}
                      </td>
                      <td className="py-2 px-2 text-center font-mono tabular text-muted">
                        {s.alpha != null ? s.alpha.toFixed(2) : "—"}
                      </td>
                      <td className="py-2 px-2 text-center font-mono tabular text-muted">
                        {s.gapPick != null ? `${s.gapPick >= 0 ? "+" : ""}${(s.gapPick * 100).toFixed(1)}` : "—"}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <SieveTierBadge tier={s.tier} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

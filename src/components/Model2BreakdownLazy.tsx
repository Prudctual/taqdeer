"use client";

import { useEffect, useState } from "react";
import { Model2Breakdown } from "./Model2Breakdown";
import type { Model2Report } from "@/lib/queries";

/**
 * تقرير النموذج 2 مع تحميل عوامله عند الطلب.
 *
 * لائحة الحصر تغطي كامل الجدول القادم، فلو حملت كل مباراة عواملها الثلاثين
 * لتضخمت الحمولة بميغابايتات لا تُقرأ إلا عند فتح بطاقة واحدة. لذا تشحن اللائحة
 * ملخص التقرير و`groupsOmitted: true`، وهذا المكوّن يُكمل التفاصيل عند الفتح.
 */
export function Model2BreakdownLazy({
  matchId,
  model2,
  compact = false,
}: {
  matchId: string;
  model2?: Model2Report | null;
  compact?: boolean;
}) {
  const needsGroups = Boolean(model2?.groupsOmitted);
  const [detail, setDetail] = useState<Model2Report | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!needsGroups) return;
    let mounted = true;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`/api/v1/hasr/model2/${encodeURIComponent(matchId)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { model2?: Model2Report };
        if (!mounted || !body.model2) return;
        setDetail(body.model2);
      } catch {
        if (mounted) setFailed(true);
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [matchId, needsGroups]);

  return (
    <div className="space-y-2">
      <Model2Breakdown model2={detail ?? model2} compact={compact} />
      {needsGroups && !detail ? (
        <p className="text-[11px] text-muted">
          {failed
            ? "تعذّر جلب تفصيل العوامل الثلاثين — الموثوقية أعلاه محسوبة منها."
            : "جارٍ جلب تفصيل العوامل الثلاثين…"}
        </p>
      ) : null}
    </div>
  );
}

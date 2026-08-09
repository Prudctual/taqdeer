import { pct } from "@/lib/format";
import {
  bestDoubleChance,
  calculateInPlayProbs,
  countRedCards,
  parseLiveEvents,
} from "@/lib/in-play-probs";

type Props = {
  homeName: string;
  awayName: string;
  pHome: number;
  pDraw: number;
  pAway: number;
  confidence?: number | null;
  isEquallyBalanced?: boolean;
  /** مكوّن الفورم من analytics إن وُجد */
  formAwayLean?: boolean;
  formHomePts?: number | null;
  formAwayPts?: number | null;
  isLive?: boolean;
  finished?: boolean;
  minute?: number | null;
  homeGoals?: number | null;
  awayGoals?: number | null;
  lambdaHome?: number | null;
  lambdaAway?: number | null;
  liveEventsJson?: string | null;
};

/**
 * طبقة حماية من حالات مثل ساندفيورد:
 * 1) قبل المباراة: تكافؤ / ثقة منخفضة / فورم معاكس → فرصة مزدوجة لا إشارة حاسمة
 * 2) أثناء/بعد: طرد → إعادة حساب الاحتمالات اللحظية
 */
export function MatchRiskPanel({
  homeName,
  awayName,
  pHome,
  pDraw,
  pAway,
  confidence,
  isEquallyBalanced,
  formAwayLean,
  formHomePts,
  formAwayPts,
  isLive,
  finished,
  minute,
  homeGoals,
  awayGoals,
  lambdaHome,
  lambdaAway,
  liveEventsJson,
}: Props) {
  const soft =
    isEquallyBalanced ||
    (confidence != null && confidence < 0.55) ||
    !!formAwayLean;

  const dc = bestDoubleChance(pHome, pDraw, pAway, homeName, awayName);
  const events = parseLiveEvents(liveEventsJson);
  const reds = countRedCards(events, homeName, awayName);
  const hasRed = reds.homeReds > 0 || reds.awayReds > 0;

  let liveAdj: ReturnType<typeof calculateInPlayProbs> | null = null;
  if (
    hasRed &&
    minute != null &&
    lambdaHome != null &&
    lambdaAway != null &&
    (isLive || finished)
  ) {
    liveAdj = calculateInPlayProbs(
      lambdaHome,
      lambdaAway,
      minute,
      homeGoals ?? 0,
      awayGoals ?? 0,
      { homeReds: reds.homeReds, awayReds: reds.awayReds },
    );
  }

  if (!soft && !hasRed) return null;

  return (
    <div className="space-y-3">
      {soft ? (
        <div className="rounded-2xl border border-amber-500/35 bg-warn-dim/40 p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-ink">
              إشارة غير حاسمة — لا تعتمد النتيجة الوحيدة
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-warn text-on-fill">
              حماية من المفاجأة
            </span>
          </div>
          <ul className="text-xs text-muted font-semibold space-y-1.5 leading-relaxed list-disc ps-4">
            {isEquallyBalanced ? (
              <li>
                الفارق بين أعلى نتيجتين أقل من 8٪ — المباراة متكافئة إحصائياً.
              </li>
            ) : null}
            {confidence != null && confidence < 0.55 ? (
              <li>
                ثقة النموذج {pct(confidence)} فقط — دون عتبة الإشارة الواضحة.
              </li>
            ) : null}
            {formAwayLean ? (
              <li>
                الفورم الأخير يميل ضد التوقع الهيكلي
                {formHomePts != null && formAwayPts != null
                  ? ` (نقاط فورم: مضيف ${formHomePts.toFixed(1)} · ضيف ${formAwayPts.toFixed(1)})`
                  : ""}
                .
              </li>
            ) : null}
            <li>
              راجع كتلة «الفرصة المزدوجة» أعلاه —{" "}
              <strong className="text-ink">
                {dc.label} بنسبة {pct(dc.p)}
              </strong>
            </li>
          </ul>
        </div>
      ) : null}

      {hasRed ? (
        <div className="rounded-2xl border border-danger/40 bg-danger-dim/30 p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-ink flex items-center gap-2">
              <span aria-hidden>🟥</span>
              تحديث بعد الطرد
              {reds.firstRedMinute != null ? ` · د ${reds.firstRedMinute}'` : ""}
            </span>
            <span className="text-[11px] font-semibold text-danger">
              {reds.homeReds > 0
                ? `${homeName}: −${reds.homeReds} لاعب`
                : null}
              {reds.homeReds > 0 && reds.awayReds > 0 ? " · " : null}
              {reds.awayReds > 0
                ? `${awayName}: −${reds.awayReds} لاعب`
                : null}
            </span>
          </div>
          <p className="text-xs text-muted font-semibold leading-relaxed">
            الطرد يغيّر λ الهجومي فوراً. التوقع قبل المباراة لم يعد صالحاً وحده —
            نعتمد الاحتمال اللحظية بعد الحدث.
          </p>
          {liveAdj ? (
            <div className="flex flex-wrap gap-3 text-xs font-semibold tabular pt-1">
              <span className="text-home">مضيف {pct(liveAdj.pHome)}</span>
              <span className="text-draw">تعادل {pct(liveAdj.pDraw)}</span>
              <span className="text-away">ضيف {pct(liveAdj.pAway)}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

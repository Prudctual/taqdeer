import type { ComponentType } from "react";
import { pct } from "@/lib/format";
import { HandshakeIcon, BrainIcon, FootballIcon, TrendingUpIcon, FlameIcon, type IconProps } from "./Icons";

type Comp = {
  label: string;
  p: [number, number, number];
  w?: number;
  Icon: ComponentType<IconProps>;
  description: string;
};

function rowPick(p: [number, number, number]): "H" | "D" | "A" {
  if (p[0] >= p[1] && p[0] >= p[2]) return "H";
  if (p[2] >= p[0] && p[2] >= p[1]) return "A";
  return "D";
}

type ComponentEntry = {
  p?: [number, number, number] | null;
  [key: string]: unknown;
};

export function SignalBreakdown({
  components,
  weights,
  pickKey,
}: {
  components: Record<string, ComponentEntry | undefined>;
  weights?: Record<string, number>;
  pickKey?: "H" | "D" | "A";
}) {


  const candidates: Array<{
    label: string;
    Icon: ComponentType<IconProps>;
    description: string;
    p: [number, number, number] | null;
    w?: number;
  }> = [
    {
      label: "نموذج أهداف الفريقين (Dixon–Coles)",
      Icon: BrainIcon,
      description: "حساب معدل الأهداف المتوقعة وقوة الهجوم والدفاع",
      p: components.dixon_coles?.p ?? null,
      w: weights?.dc,
    },
    {
      label: "نموذج التفوق التكتيكي (Pi-Ratings)",
      Icon: FootballIcon,
      description: "حساب فارق المستويات والتفوق في المواجهات المباشرة",
      p: components.pi_ratings?.p ?? null,
      w: weights?.pi,
    },
    {
      label: "التصنيف التاريخي العام (Elo Rating)",
      Icon: TrendingUpIcon,
      description: "نقاط تصنيف قوة النادي التراكمية عبر المواسم",
      p: components.elo?.p ?? null,
      w: weights?.elo,
    },
    {
      label: "نتائج المباريات الأخيرة (الفورم)",
      Icon: FlameIcon,
      description: "معدل النقاط والأهداف في آخر 5 مباريات لعبها الفريقان",
      p: components.form?.p ?? null,
      w: weights?.form,
    },
  ];

  const rows = candidates.filter((r): r is Comp => r.p != null);
  if (!rows.length) return null;

  const tw = rows.reduce((s, r) => s + (r.w ?? 0), 0);
  const agreeCount =
    pickKey != null
      ? rows.filter((r) => rowPick(r.p) === pickKey).length
      : null;

  return (
    <div className="space-y-4 p-4 sm:p-5">
      {/* Top Consensus Summary Banner */}
      {agreeCount != null && (
        <div className="rounded-xl border-0 bg-success text-on-fill p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-on-fill/20 rounded-lg text-on-fill">
              <HandshakeIcon size={20} />
            </span>
            <div>
              <h4 className="text-sm font-black tracking-tight">
                نتيجة التوافق بين الخوارزميات: {agreeCount} من أصل {rows.length} نماذج متفقة تماماً!
              </h4>
              <p className="text-xs text-on-fill/80 font-medium">
                جميع محركات التحليل تُشير إلى نفس اتجاه القراءة النهائية بدون تعارض.
              </p>
            </div>
          </div>
          <span className="shrink-0 font-extrabold text-xs bg-on-fill text-success px-3.5 py-1.5 rounded-full shadow-2xs">
            توافق كامل 100%
          </span>
        </div>
      )}

      <p className="text-xs font-bold text-muted">
        تفكيك نسبة ترجيح كل خوارزمية على حدة قبل دمجها في النتيجة النهائية:
      </p>

      {/* Grid of Super Simple Visual Cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((r, idx) => {
          const topPick = rowPick(r.p);
          const topPct =
            topPick === "H" ? r.p[0] : topPick === "D" ? r.p[1] : r.p[2];
          const topLabel =
            topPick === "H"
              ? "فوز المضيف 1"
              : topPick === "D"
              ? "التعادل X"
              : "فوز الضيف 2";

          const agrees = pickKey != null && topPick === pickKey;
          const weightPct = r.w && tw > 0 ? Math.round((r.w / tw) * 100) : null;
          const IconComp = r.Icon;

          return (
            <div
              key={idx}
              className="press-scale rounded-2xl border-0 bg-panel/70 p-4 space-y-3 shadow-none transition-all duration-140 active:scale-[0.98]"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 border-b border-line/60 pb-2.5">
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-ink flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-surface text-ink">
                      <IconComp size={16} />
                    </span>
                    {r.label}
                  </span>
                  <p className="text-[10px] font-medium text-muted">{r.description}</p>
                </div>
                {weightPct != null && (
                  <span className="shrink-0 text-[11px] font-black text-accent bg-accent-dim px-2.5 py-0.5 rounded-full">
                    تأثير {weightPct}%
                  </span>
                )}
              </div>

              {/* Prediction Result Pill */}
              <div className="flex items-center justify-between bg-surface rounded-xl p-2.5 border-0 shadow-none">
                <span className="text-xs font-black text-ink">
                  ترجيح هذا النموذج: <strong className="text-accent font-extrabold">{topLabel}</strong>
                </span>
                <span className="text-xs font-mono font-black text-home bg-panel px-2.5 py-0.5 rounded-md">
                  نسبة {pct(topPct)}
                </span>
              </div>

              {/* Simple 1X2 Animated Progress Track */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted">
                  <span>فوز المضيف ({pct(r.p[0])})</span>
                  <span>تعادل ({pct(r.p[1])})</span>
                  <span>فوز الضيف ({pct(r.p[2])})</span>
                </div>
                <div className="prob-track h-2.5 is-inview">
                  <div
                    className="prob-segment"
                    data-tooltip={`فوز المضيف ${pct(r.p[0])}`}
                    style={{ width: `${r.p[0] * 100}%`, background: "var(--home)", transform: "scaleX(1)", transitionDelay: `${idx * 30}ms` }}
                  />
                  <div
                    className="prob-segment"
                    data-tooltip={`تعادل ${pct(r.p[1])}`}
                    style={{ width: `${r.p[1] * 100}%`, background: "var(--draw)", transform: "scaleX(1)", transitionDelay: `${idx * 30 + 30}ms` }}
                  />
                  <div
                    className="prob-segment"
                    data-tooltip={`فوز الضيف ${pct(r.p[2])}`}
                    style={{ width: `${r.p[2] * 100}%`, background: "var(--away)", transform: "scaleX(1)", transitionDelay: `${idx * 30 + 60}ms` }}
                  />
                </div>
              </div>

              {/* Agreement Status */}
              <div className="pt-1 flex items-center justify-between text-[11px]">
                <span className={`font-bold ${agrees ? "text-home" : "text-muted"}`}>
                  {agrees ? "✓ متفق مع التوقع النهائي" : "⚠️ يتوقع اتجاهاً مختلفاً"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

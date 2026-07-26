import { RevealOnView } from "./RevealOnView";
import { confidenceLabel, pct, pctCss } from "@/lib/format";

const GLYPH = { H: "1", D: "X", A: "2" } as const;
const TONE = {
  H: "var(--home)",
  D: "var(--draw)",
  A: "var(--away)",
} as const;

/** سطر ثقة هادئ تحت شريط الاحتمال */
export function ConfidenceMeter({
  value,
  inline = false,
}: {
  value: number;
  /** وضع إثبات مطبوع داخل ورقة الإشارة */
  inline?: boolean;
}) {
  const label = confidenceLabel(value);
  if (inline) {
    return (
      <RevealOnView className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="type-label shrink-0">ثقة الإشارة</span>
          <div className="prob-track h-1.5 max-w-[12rem] flex-1">
            <div
              className="meter-fill h-full bg-accent"
              style={{ width: pctCss(value) }}
            />
          </div>
        </div>
        <p className="text-[11px] tabular text-muted">
          <span className="font-medium text-ink">{pct(value)}</span>
          <span className="mx-1.5 text-line" aria-hidden>
            ·
          </span>
          {label}
        </p>
      </RevealOnView>
    );
  }

  return (
    <RevealOnView className="min-w-0 space-y-2.5">
      <dl>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="type-label">ثقة الإشارة</dt>
          <dd className="text-sm font-semibold tabular text-ink">
            {pct(value)}
          </dd>
        </div>
      </dl>
      <div className="prob-track h-1.5">
        <div
          className="meter-fill h-full bg-accent"
          style={{ width: pctCss(value) }}
        />
      </div>
      <p className="text-[11px] leading-relaxed text-muted">{label}</p>
    </RevealOnView>
  );
}

/** مقارنة أهداف متوقعة مضيف/ضيف */
export function LambdaCompare({
  home,
  away,
  homeName,
  awayName,
}: {
  home: number;
  away: number;
  homeName?: string;
  awayName?: string;
}) {
  const max = Math.max(home, away, 0.01);
  const delta = home - away;
  const lead =
    Math.abs(delta) < 0.08
      ? "تكافؤ هجومي متوقع"
      : delta > 0
        ? `${homeName ?? "المضيف"} أعلى بـ ${delta.toFixed(2)} λ`
        : `${awayName ?? "الضيف"} أعلى بـ ${Math.abs(delta).toFixed(2)} λ`;

  const sides = [
    {
      key: "H" as const,
      name: homeName ?? "مضيف",
      value: home,
    },
    {
      key: "A" as const,
      name: awayName ?? "ضيف",
      value: away,
    },
  ];

  return (
    <RevealOnView className="min-w-0 space-y-3.5">
      <div>
        <p className="type-label">أهداف متوقعة λ</p>
        <p className="mt-1 text-sm font-medium text-ink">{lead}</p>
        <p className="mt-0.5 text-[11px] text-muted">نسبي لأقوى λ في المواجهة</p>
      </div>
      <dl className="space-y-2.5">
        {sides.map((s) => (
          <div key={s.key} className="flex items-center gap-2.5">
            <dt
              className="flex w-[5.5rem] shrink-0 items-center gap-1.5 text-[11px] text-muted"
              title={s.name}
            >
              <span className="tabular font-medium text-ink">
                {GLYPH[s.key]}
              </span>
              <span className="min-w-0 truncate">{s.name}</span>
            </dt>
            <dd className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="prob-track h-1.5 flex-1">
                <div
                  className="meter-fill h-full"
                  style={{
                    width: pctCss(s.value / max),
                    background: TONE[s.key],
                  }}
                />
              </div>
              <span className="w-10 text-end text-xs font-semibold tabular text-ink">
                {s.value.toFixed(2)}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </RevealOnView>
  );
}

/** فورم بصري من متوسط النقاط (0–3) — تذييل ورقة التفكيك */
export function FormBars({
  homePts,
  awayPts,
  homeGd,
  awayGd,
  pickKey,
}: {
  homePts?: number;
  awayPts?: number;
  homeGd?: number;
  awayGd?: number;
  /** قراءة المزيج — مفتاح متفق / خالف مع اتجاه الفورم */
  pickKey?: "H" | "D" | "A";
}) {
  if (homePts == null && awayPts == null) return null;
  const h = homePts ?? 0;
  const a = awayPts ?? 0;
  const close = Math.abs(h - a) < 0.05;
  const formLead = close
    ? "فورم متقارب"
    : h > a
      ? "فورم المضيف أقوى"
      : "فورم الضيف أقوى";
  const formSide: "H" | "D" | "A" = close ? "D" : h > a ? "H" : "A";
  const agrees = pickKey != null && formSide === pickKey;

  return (
    <div className="border-t border-line px-4 py-3.5 sm:px-5">
      <p className="text-[11px] text-muted">
        <span className="font-medium text-ink">{formLead}</span>
        <span className="mx-1.5 text-line" aria-hidden>
          ·
        </span>
        <span>متوسط نقاط آخر المباريات</span>
        {pickKey != null ? (
          <>
            <span className="mx-1.5 text-line" aria-hidden>
              ·
            </span>
            <span
              className={`verdict-chip ${
                agrees ? "verdict-chip-hit" : "verdict-chip-miss"
              }`}
            >
              {agrees ? "متفق" : "خالف"}
            </span>
            <span> مع القراءة</span>
          </>
        ) : null}
      </p>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2 sm:gap-6">
        <FormSide label="فورم المضيف" pts={h} gd={homeGd} side="H" />
        <FormSide label="فورم الضيف" pts={a} gd={awayGd} side="A" />
      </dl>
    </div>
  );
}

function FormSide({
  label,
  pts,
  gd,
  side,
}: {
  label: string;
  pts: number;
  gd?: number;
  side: "H" | "A";
}) {
  const filled = Math.round(Math.min(3, Math.max(0, pts)) * (5 / 3));
  return (
    <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-1.5 text-[11px]">
      <dt className="flex min-w-0 items-center gap-1.5 text-muted">
        <span className="tabular font-medium text-ink">{GLYPH[side]}</span>
        <span className="truncate">{label}</span>
      </dt>
      <dd className="tabular text-ink">
        {pts.toFixed(2)} نق/م
        {gd != null ? ` · GD ${gd.toFixed(1)}` : ""}
      </dd>
      <dd className="flex w-full gap-1" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-[2px]"
            style={{
              background: i < filled ? TONE[side] : "var(--panel)",
            }}
          />
        ))}
      </dd>
    </div>
  );
}

/** سطر القراءة الأرجح أعلى ورقة الاحتمالات */
export function VerdictBanner({
  pickLabel,
  pickPct,
  pickKey,
  confidence,
  homeName,
  awayName,
}: {
  pickLabel: string;
  pickPct: number;
  pickKey: "H" | "D" | "A";
  confidence: number;
  homeName: string;
  awayName: string;
}) {
  const who =
    pickKey === "H" ? homeName : pickKey === "A" ? awayName : "التعادل";

  return (
    <div className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:px-5">
      <div className="min-w-0">
        <p className="type-label">القراءة الأرجح</p>
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span
            className="pick-chip self-center"
            style={{ background: TONE[pickKey] }}
          >
            {GLYPH[pickKey]}
          </span>
          <span className="text-base font-semibold text-ink">{pickLabel}</span>
          <span
            className="text-base font-semibold tabular"
            style={{ color: TONE[pickKey] }}
          >
            {pct(pickPct)}
          </span>
          <span className="text-line" aria-hidden>
            ·
          </span>
          <span className="min-w-0 truncate text-sm text-muted" title={who}>
            {who}
          </span>
        </p>
      </div>
      <p className="shrink-0 text-[11px] text-muted sm:text-end">
        {confidenceLabel(confidence)}
      </p>
    </div>
  );
}

/** شريط أسواق مشتقة */
export function DerivedMarketsStrip({
  btts,
  over25,
}: {
  btts: number;
  over25: number;
}) {
  const cells = [
    { label: "BTTS", value: btts },
    { label: "فوق 2.5", value: over25 },
    { label: "تحت 2.5", value: 1 - over25 },
  ];
  const top = cells.reduce((a, b) => (b.value > a.value ? b : a));

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted">
        أرجح سوق مشتقة:{" "}
        <span className="font-medium tabular text-ink">
          {top.label} {pct(top.value)}
        </span>
      </p>
      <dl className="grid grid-cols-3 overflow-hidden rounded-md border border-line text-center">
        {cells.map((c, i) => {
          const hot = c.label === top.label;
          return (
            <div
              key={c.label}
              className={`motion-colors relative px-2 py-3 hover:bg-panel ${
                i > 0 ? "border-s border-line" : ""
              }`}
            >
              <dt className="text-[11px] tabular text-muted">
                {hot ? (
                  <span
                    className="absolute inset-x-0 top-0 h-0.5 bg-accent"
                    aria-hidden
                  />
                ) : null}
                {c.label}
              </dt>
              <dd
                className={`mt-1.5 text-sm tabular ${
                  hot ? "font-semibold text-ink" : "font-medium text-muted"
                }`}
              >
                {pct(c.value)}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

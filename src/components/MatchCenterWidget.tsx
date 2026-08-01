import { SectionCard } from "./ui";

export function MatchCenterWidget() {
  const scores = [
    { score: "1 - 0", prob: "14.2٪", isTop: true },
    { score: "2 - 1", prob: "12.8٪", isTop: true },
    { score: "1 - 1", prob: "11.5٪", isTop: true },
    { score: "2 - 0", prob: "9.8٪", isTop: false },
    { score: "0 - 1", prob: "8.4٪", isTop: false },
    { score: "0 - 0", prob: "7.1٪", isTop: false },
  ];

  return (
    <SectionCard
      title="MATCH CENTER — مركز البيانات والخريطة التكتيكية"
      subtitle="تفكيك إشارات النموذج، مصفوفة الأهداف المتوقعة، ونقاط القوة والضعف"
    >
      <div id="match-center" className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Tactical Pitch Illustration */}
        <div className="lg:col-span-6 rounded-xl border-0 bg-panel/70 p-5 flex flex-col justify-between space-y-4 shadow-none">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <span className="text-xs font-semibold text-accent flex items-center gap-2">
              ⚽ الخريطة التكتيكية المباشرة
            </span>
            <span className="type-label text-faint">نموذج Dixon-Coles</span>
          </div>

          {/* Tactical Pitch SVG/Grid */}
          <div className="relative aspect-video w-full rounded-lg border-0 bg-success-dim p-4 overflow-hidden flex flex-col items-center justify-between">
            {/* Pitch Lines */}
            <div className="absolute inset-2 border border-success/25 rounded-sm pointer-events-none" />
            <div className="absolute inset-y-2 left-1/2 w-px bg-success-dim pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-success/25 pointer-events-none" />

            {/* Tactical Position Dots */}
            <div className="w-full flex justify-around relative z-10">
              <span className="h-3 w-3 rounded-full bg-home shadow-none" title="هجوم المضيف" />
              <span className="h-3 w-3 rounded-full bg-home shadow-none" title="وسط المضيف" />
              <span className="h-3 w-3 rounded-full bg-home shadow-none" title="وسط المضيف" />
            </div>

            <div className="w-full flex justify-between px-8 relative z-10">
              <span className="h-3 w-3 rounded-full bg-draw shadow-none" title="صانع اللعب" />
              <span className="h-3 w-3 rounded-full bg-draw shadow-none" title="محور الارتكاز" />
            </div>

            <div className="w-full flex justify-around relative z-10">
              <span className="h-3 w-3 rounded-full bg-away shadow-none" title="دفاع الضيف" />
              <span className="h-3 w-3 rounded-full bg-away shadow-none" title="دفاع الضيف" />
              <span className="h-3 w-3 rounded-full bg-away shadow-none" title="حارس الضيف" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="border-0 rounded-lg bg-surface p-2">
              <div className="text-faint text-[10px]">الضغط العالي PPDA</div>
              <div className="font-bold text-ink tabular mt-0.5">8.4 / 11.2</div>
            </div>
            <div className="border-0 rounded-lg bg-surface p-2">
              <div className="text-faint text-[10px]">معدل الأهداف xG</div>
              <div className="font-bold text-home tabular mt-0.5">1.94 vs 1.12</div>
            </div>
            <div className="border-0 rounded-lg bg-surface p-2">
              <div className="text-faint text-[10px]">فارق Elo</div>
              <div className="font-bold text-accent tabular mt-0.5">+142 نقطة</div>
            </div>
          </div>
        </div>

        {/* Score Prediction Matrix */}
        <div className="lg:col-span-6 rounded-xl border-0 bg-panel/70 p-5 space-y-4 shadow-none">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <span className="text-xs font-semibold text-accent">
              📊 مصفوفة النتائج الأكثر ترجيحاً
            </span>
            <span className="type-label text-faint">أعلى 6 نتائج مصفوفة</span>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            النتائج الدقيقة المتوقعة محسوبة عبر توزيع بواسون المعدل (Poisson Distribution) استناداً إلى قوة الهجوم والدفاع.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            {scores.map((s, idx) => (
              <div
                key={idx}
                className={`rounded-lg border-0 p-3 text-center space-y-1 ${
                  s.isTop
                    ? "bg-accent/15 text-accent"
                    : "bg-surface"
                }`}
              >
                <div className="type-figure text-lg font-black text-ink tabular">{s.score}</div>
                <div className="text-xs font-bold text-accent tabular">{s.prob}</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border-0 bg-surface p-3 text-[11px] text-faint leading-relaxed">
            💡 ملحوظة: نتيجة 1-0 هي الأكثر احتمالاً بنسبة 14.2٪ يليه تفوق 2-1، مما يعكس تفوق الفريق المضيف بنسبة ضئيلة.
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

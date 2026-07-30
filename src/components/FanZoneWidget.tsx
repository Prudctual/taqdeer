"use client";

import { useState } from "react";
import { SectionCard } from "./ui";

export function FanZoneWidget() {
  const [votedOption, setVotedOption] = useState<number | null>(null);

  const poll = {
    question: "من يحسم القمة المرتقبة في مواجهة الجولة القادمة؟",
    totalVotes: 3420,
    options: [
      { id: 1, text: "فوز الفريق المضيف (Home)", votes: 1846, percent: 54, color: "var(--home)" },
      { id: 2, text: "التعادل (Draw)", votes: 752, percent: 22, color: "var(--draw)" },
      { id: 3, text: "فوز الفريق الضيف (Away)", votes: 822, percent: 24, color: "var(--away)" },
    ],
  };

  const handleVote = (id: number) => {
    setVotedOption(id);
  };

  return (
    <SectionCard
      title="FAN ZONE — منطقة الجماهير والتوقعات"
      subtitle="شارك في تصويت الجمهور وقارن توقعات الشارع الرياضي بنماذج تقدير المعايرة"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Fan Poll Box */}
        <div className="lg:col-span-8 rounded-lg border border-line bg-panel/40 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
              🗳️ استطلاع الأسبوع
            </span>
            <span className="type-label tabular text-faint">
              إجمالي الأصوات: {(poll.totalVotes + (votedOption ? 1 : 0)).toLocaleString("ar")}
            </span>
          </div>

          <h3 className="type-section text-ink font-bold">{poll.question}</h3>

          <div className="space-y-3">
            {poll.options.map((opt) => {
              const isSelected = votedOption === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleVote(opt.id)}
                  type="button"
                  className={`w-full text-start relative overflow-hidden rounded-md border p-3 transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "border-accent bg-accent/10"
                      : "border-line bg-surface/50 hover:bg-panel hover:border-line-strong"
                  }`}
                >
                  {/* Progress background bar */}
                  <div
                    className="absolute inset-y-0 right-0 opacity-15 transition-all duration-500"
                    style={{
                      width: `${opt.percent + (isSelected ? 1 : 0)}%`,
                      background: opt.color,
                    }}
                    aria-hidden
                  />

                  <div className="relative z-10 flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-semibold text-ink flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: opt.color }}
                        aria-hidden
                      />
                      {opt.text}
                    </span>
                    <span className="font-bold tabular text-accent">
                      {opt.percent}٪
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {votedOption ? (
            <p className="text-xs text-home font-semibold text-center pt-1 animate-pulse">
              ✓ تم تسجيل تصويتك بنجاح! شكرًا لمشاركتك.
            </p>
          ) : (
            <p className="text-[11px] text-faint text-center">
              اضغط على أحد الخيارات المشار إليها أعلاه لتسجيل صوتك المباشر.
            </p>
          )}
        </div>

        {/* Fan Streak & Reward Widget */}
        <div className="lg:col-span-4 rounded-lg border border-line bg-surface p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-draw">
              ⚡ التوقعات المتتالية
            </span>
            <h4 className="type-section text-ink font-bold">سلسلة النصر (Fan Streak)</h4>
            <p className="text-xs text-muted leading-relaxed">
              خسّن دقتك في توقع نتائج الجولات لتتسلق قائمة متصدري المشجعين وتحصل على شارات التحليل الذهبية.
            </p>
          </div>

          <div className="rounded-md border border-line bg-panel p-3 text-center space-y-1">
            <div className="type-label text-faint">سلسلتك الحالية</div>
            <div className="type-figure text-3xl font-black text-accent tabular">5 🔥</div>
            <div className="text-[11px] text-muted">توقع صحيح متتالي</div>
          </div>

          <button
            type="button"
            className="w-full motion-colors rounded-md bg-panel border border-line px-3 py-2 text-xs font-semibold text-ink hover:border-line-strong hover:bg-surface text-center"
          >
            دخول تحدي النتيجة الدقيقة →
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

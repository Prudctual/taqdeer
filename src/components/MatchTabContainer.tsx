"use client";

import { useState, type ReactNode } from "react";
import { useAdvancedMode } from "./AdvancedModeContext";
import { ChevronIcon } from "./ChevronIcon";

export function MatchTabContainer({
  overviewContent,
  tacticsContent,
  scoresContent,
  marketContent,
  h2hContent,
}: {
  overviewContent: ReactNode;
  tacticsContent?: ReactNode;
  scoresContent: ReactNode;
  marketContent: ReactNode;
  h2hContent: ReactNode;
}) {
  const { isAdvancedMode, toggleAdvancedMode } = useAdvancedMode();

  // افتراضياً نفتح قسم التوقع فقط لتسهيل القراءة وعدم إرباك المستخدم
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overview: true,
    tactics: false,
    market: false,
    history: false,
  });

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    setOpenSections({
      overview: true,
      tactics: true,
      market: true,
      history: true,
    });
  };

  const collapseAll = () => {
    setOpenSections({
      overview: false,
      tactics: false,
      market: false,
      history: false,
    });
  };

  const allOpen = Object.values(openSections).every(Boolean);

  const sections = [
    {
      id: "overview",
      title: "1. التوقع الأرجح والمؤشرات",
      subtitle: "من الأقرب للفوز وكيف تتوزع الفرص بين الفريقين؟",
      badge: "النتيجة المتوقعة",
      content: overviewContent,
    },
    {
      id: "tactics",
      title: "2. تحليل الأهداف والفرص والتكتيك",
      subtitle: "كم هدفاً متوقعاً وما هي التشكيلات ونقاط القوة والضعف؟",
      badge: "الأهداف والتكتيك",
      content: (
        <div className="space-y-6">
          {tacticsContent && <div>{tacticsContent}</div>}
          <div>{scoresContent}</div>
        </div>
      ),
    },
    {
      id: "market",
      title: "3. أسعار السوق وفرص القيمة",
      subtitle: "هل هناك رهان ممتاز يقدم قيمة أعلى من أسعار السوق؟",
      badge: "تقييم الأسعار",
      content: marketContent,
    },
    {
      id: "history",
      title: "4. المواجهات السابقة والتاريخ",
      subtitle: "كيف كانت نتائج الفريقين عند التقائهما سابقاً؟",
      badge: "السجل التاريخي",
      content: h2hContent,
    },
  ];

  return (
    <div className="space-y-4">
      {/* شريط التحكم والتنقل البسيط والمباشر مع تأثيرات تفاعلية انسيابية */}
      <div className="sticky top-14 z-20 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-line bg-surface/95 p-2.5 backdrop-none shadow-xs">
        {/* أزرار التنقل السريع الأربعة */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {sections.map((sec) => {
            const isOpen = openSections[sec.id];
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => {
                  if (!isOpen) toggleSection(sec.id);
                  const el = document.getElementById(`section-${sec.id}`);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`press-scale flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isOpen
                    ? "bg-panel text-ink border border-line shadow-2xs"
                    : "text-muted hover:text-ink hover:bg-panel/50"
                }`}
              >
                <span>{sec.title.split(". ")[1]?.split(" ")[0] || sec.title}</span>
              </button>
            );
          })}
        </div>

        {/* أدوات التوسيع والوضع */}
        <div className="flex items-center gap-2 shrink-0 ms-auto">
          <button
            type="button"
            onClick={allOpen ? collapseAll : expandAll}
            className="press-scale rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[11px] font-semibold text-muted hover:text-ink hover:bg-surface transition-all cursor-pointer"
          >
            {allOpen ? "إغلاق التفاصيل" : "عرض كل التفاصيل"}
          </button>

          <button
            type="button"
            onClick={toggleAdvancedMode}
            className="press-scale flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1.5 text-[11px] font-bold text-ink hover:bg-surface transition-all cursor-pointer"
          >
            <span className="text-muted">الوضع:</span>
            <span>{isAdvancedMode ? "متقدم" : "مبسط"}</span>
          </button>
        </div>
      </div>

      {/* أقسام التقرير المنسقة والبسيطة ذات التمدد والتأثيرات الانسيابية */}
      <div className="space-y-4">
        {sections.map((section) => {
          const isOpen = openSections[section.id];
          return (
            <section
              id={`section-${section.id}`}
              key={section.id}
              className={`rounded-2xl bg-surface border transition-all duration-200 overflow-hidden ${
                isOpen ? "border-line-strong shadow-xs" : "border-line hover:border-line-strong"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-panel/40 transition-colors cursor-pointer text-start select-none group"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-sm sm:text-base font-black text-ink tracking-tight truncate group-hover:text-accent transition-colors">
                        {section.title}
                      </h2>
                      <span className="hidden sm:inline-block rounded-md bg-panel px-2 py-0.5 text-[11px] font-bold text-muted border border-line">
                        {section.badge}
                      </span>
                    </div>
                    <p className="text-xs text-muted truncate">
                      {section.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ms-3">
                  <span className="text-xs font-semibold text-muted me-1 group-hover:text-ink transition-colors">
                    {isOpen ? "إخفاء" : "عرض"}
                  </span>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-panel text-muted transition-transform duration-250 ease-out group-hover:border-line-strong ${
                    isOpen ? "rotate-90 text-accent" : "-rotate-90"
                  }`}>
                    <ChevronIcon size={14} />
                  </span>
                </div>
              </button>

              <div className={`accordion-wrapper ${isOpen ? "is-open" : ""}`}>
                <div className="accordion-content">
                  <div className="border-t border-line p-4 sm:p-6 bg-surface animate-fade-in-up">
                    {section.content}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

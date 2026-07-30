import { SectionCard } from "./ui";
import { pct } from "@/lib/format";

interface BankerPick {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  leagueName: string;
  pickLabel: string;
  probability: number;
  confidence: number;
}

export function BankerPicksWidget({
  picks,
  title = "أأمن 4 توقعات للجولة (Banker Picks)",
}: {
  picks?: BankerPick[];
  title?: string;
}) {
  const defaultPicks: BankerPick[] = [
    { matchId: "1", homeTeam: "ريال مدريد", awayTeam: "خيتافي", leagueName: "الدوري الإسباني", pickLabel: "فوز المضيف (1)", probability: 0.78, confidence: 0.88 },
    { matchId: "2", homeTeam: "مانشستر سيتي", awayTeam: "برينتفورد", leagueName: "الدوري الإنجليزي", pickLabel: "فوز المضيف (1)", probability: 0.74, confidence: 0.84 },
    { matchId: "3", homeTeam: "بايرن ميونخ", awayTeam: "أوغسبورغ", leagueName: "الدوري الألماني", pickLabel: "فوز المضيف (1)", probability: 0.81, confidence: 0.90 },
    { matchId: "4", homeTeam: "باريس سان جيرمان", awayTeam: "ميتز", leagueName: "الدوري الفرنسي", pickLabel: "فوز المضيف (1)", probability: 0.76, confidence: 0.82 },
  ];

  const list = picks && picks.length > 0 ? picks.slice(0, 4) : defaultPicks;

  return (
    <SectionCard
      title={title}
      subtitle="التوقعات الأعلى استقراراً وتوافقاً بين الخوارزميات الخمس للجولة الحالية"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs p-4 sm:p-5">
        {list.map((item, idx) => (
          <div
            key={item.matchId || idx}
            className="rounded-2xl border border-indigo-500/30 bg-surface overflow-hidden shadow-2xs space-y-0"
          >
            {/* Header Strip */}
            <div className="bg-indigo-500/10 border-b border-indigo-500/20 px-3.5 py-2 flex items-center justify-between">
              <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 truncate">
                {item.leagueName}
              </span>
              <span className="bg-indigo-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shrink-0">
                ثقة {pct(item.confidence)}
              </span>
            </div>

            {/* Body */}
            <div className="p-3.5 space-y-2 bg-surface text-start">
              <div className="font-black text-ink text-xs truncate">
                {item.homeTeam} <span className="text-muted font-normal me-1 ms-1">ضد</span> {item.awayTeam}
              </div>

              <div className="text-[11px] font-semibold text-muted">
                التوقع: <strong className="text-ink font-black">{item.pickLabel}</strong>
              </div>

              <div className="pt-2 border-t border-line flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted">احتمال الفوز</span>
                <span className="font-mono font-black text-blue-600 dark:text-blue-400 tabular text-base">
                  {pct(item.probability)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

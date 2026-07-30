"use client";

import { useState } from "react";
import { SectionCard } from "./ui";

export function ReliveGloryWidget() {
  const [isPlaying, setIsPlaying] = useState<number | null>(null);

  const mediaList = [
    {
      id: 1,
      teams: "إسبانيا ضد الأرجنتين",
      teamsEn: "SPAIN vs ARGENTINA",
      badge: "HIGHLIGHTS",
      views: "18M مشاهدة",
      time: "منذ 6 أيام",
      bgGradient: "from-emerald-600 to-emerald-800",
    },
    {
      id: 2,
      teams: "ألمانيا ضد المكسيك",
      teamsEn: "GERMANY vs MEXICO",
      badge: "FULL MATCH",
      views: "24M مشاهدة",
      time: "منذ أسبوعين",
      bgGradient: "from-rose-600 to-red-800",
    },
    {
      id: 3,
      teams: "كرواتيا ضد فرنسا",
      teamsEn: "CROATIA vs FRANCE",
      badge: "FULL MATCH",
      views: "15M مشاهدة",
      time: "منذ 5 أيام",
      bgGradient: "from-blue-600 to-indigo-800",
    },
    {
      id: 4,
      teams: "إنجلترا ضد البرتغال",
      teamsEn: "ENGLAND vs PORTUGAL",
      badge: "FULL MATCH",
      views: "13M مشاهدة",
      time: "منذ أسبوع",
      bgGradient: "from-amber-500 to-amber-700",
    },
  ];

  return (
    <SectionCard
      title="Last Match Highlights — ملخصات وأبرز مباريات الأسبوع"
      subtitle="استعرض أهداف وملخصات المباريات الكبرى بجودة عالية وتفكيك تكتيكي"
      headerRight={
        <span className="text-xs font-bold text-accent cursor-pointer hover:underline">
          عرض الكل (View all) ←
        </span>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mediaList.map((item) => (
          <div
            key={item.id}
            className="group relative overflow-hidden rounded-xl border border-line bg-white transition-all duration-200 hover:shadow-md hover:border-line-strong flex flex-col justify-between"
          >
            {/* Visual Thumbnail Card with Team Header */}
            <div className={`relative aspect-4/3 w-full bg-gradient-to-br ${item.bgGradient} p-4 flex flex-col justify-between text-white overflow-hidden`}>
              <div className="flex items-center justify-between z-10">
                <span className="text-xs font-black tracking-wider uppercase drop-shadow-xs">
                  {item.teamsEn}
                </span>
                <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-extrabold tracking-widest text-amber-300 border border-white/20">
                  {item.badge}
                </span>
              </div>

              {/* Play Overlay */}
              <div className="self-center z-10">
                <button
                  type="button"
                  onClick={() => setIsPlaying(isPlaying === item.id ? null : item.id)}
                  className="h-12 w-12 rounded-full bg-white text-ink flex items-center justify-center shadow-lg group-hover:scale-110 active:scale-95 transition-transform duration-140 cursor-pointer"
                  aria-label="تشغيل"
                >
                  <span className="font-black text-sm translate-x-[-1px]">
                    {isPlaying === item.id ? "❚❚" : "▶"}
                  </span>
                </button>
              </div>

              <div className="text-[10px] font-bold text-white/80 z-10">
                TAQDEER MATCH HIGHLIGHTS
              </div>
            </div>

            {/* Info Footer */}
            <div className="p-3.5 space-y-1">
              <h3 className="type-section text-sm font-extrabold text-ink group-hover:text-accent transition-colors">
                {item.teams}
              </h3>
              <div className="flex items-center justify-between text-[11px] text-muted font-medium tabular">
                <span>{item.views}</span>
                <span>• {item.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

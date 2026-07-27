"use client";

interface Player {
  name: string;
  club: string;
  photoUrl: string;
  ringColor: string;
  delayStr: string;
}

const STAR_PLAYERS: Player[] = [
  {
    name: "سون هيونغ مين",
    club: "توتنهام",
    photoUrl: "/players/son.svg",
    ringColor: "ring-blue-500",
    delayStr: "0s",
  },
  {
    name: "إيرلينغ هالاند",
    club: "مانشستر سيتي",
    photoUrl: "/players/haaland.svg",
    ringColor: "ring-cyan-400",
    delayStr: "0.4s",
  },
  {
    name: "جود بيلينغهام",
    club: "ريال مدريد",
    photoUrl: "/players/bellingham.svg",
    ringColor: "ring-amber-400",
    delayStr: "0.8s",
  },
  {
    name: "كيليان مبابي",
    club: "ريال مدريد",
    photoUrl: "/players/mbappe.svg",
    ringColor: "ring-purple-500",
    delayStr: "1.2s",
  },
  {
    name: "فينيسيوس جونيور",
    club: "ريال مدريد",
    photoUrl: "/players/vinicius.svg",
    ringColor: "ring-emerald-400",
    delayStr: "1.6s",
  },
];

export function PlayerCascadeStack() {
  return (
    <div className="flex flex-col items-start sm:items-end gap-2">
      {/* Overlapping Animated Player Avatars */}
      <div className="flex items-center -space-x-4 space-x-reverse py-1">
        {STAR_PLAYERS.map((p, idx) => (
          <div
            key={idx}
            className={`group relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-full border-2 border-panel bg-zinc-900 shadow-xl transition-all duration-300 hover:scale-125 hover:z-30 hover:-translate-y-2 hover:rotate-3 cursor-pointer ring-2 ${p.ringColor}/50 hover:ring-blue-400`}
            title={`${p.name} — ${p.club}`}
            style={{
              zIndex: 10 - idx,
              animation: "floatSlow 4s ease-in-out infinite",
              animationDelay: p.delayStr,
            }}
          >
            {/* Player SVG Image */}
            <img
              src={p.photoUrl}
              alt={p.name}
              className="h-full w-full rounded-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {/* Glowing Live Pulse Dot */}
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-panel animate-pulse" />
          </div>
        ))}

        {/* Dynamic Plus Badge */}
        <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 border-panel bg-gradient-to-br from-blue-600 to-indigo-700 font-mono text-xs font-black text-white shadow-lg z-0 hover:scale-110 transition-all">
          +634
        </div>
      </div>

      <style jsx global>{`
        @keyframes floatSlow {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-6px);
          }
        }
      `}</style>
    </div>
  );
}

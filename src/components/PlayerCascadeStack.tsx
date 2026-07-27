interface Player {
  name: string;
  club: string;
  color: string;
  initials: string;
  photoUrl?: string;
}

const TOP_PLAYERS: Player[] = [
  { name: "Son Heung-min", club: "Tottenham", color: "from-blue-600 to-indigo-700", initials: "SON" },
  { name: "Erling Haaland", club: "Man City", color: "from-sky-500 to-blue-700", initials: "EHA" },
  { name: "Jude Bellingham", club: "Real Madrid", color: "from-amber-500 to-yellow-600", initials: "JBE" },
  { name: "Kylian Mbappé", club: "Real Madrid", color: "from-purple-600 to-indigo-800", initials: "KMB" },
  { name: "Vinícius Jr", club: "Real Madrid", color: "from-emerald-500 to-teal-700", initials: "VJR" },
];

export function PlayerCascadeStack() {
  return (
    <div className="flex flex-col items-start sm:items-end gap-2">
      {/* Overlapping Player Avatar Stack */}
      <div className="flex items-center -space-x-2.5 space-x-reverse">
        {TOP_PLAYERS.map((p, idx) => (
          <div
            key={idx}
            className="group relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-panel bg-zinc-900 shadow-md transition-all hover:-translate-y-1 hover:z-20 hover:border-blue-500 cursor-pointer"
            title={`${p.name} (${p.club})`}
            style={{ zIndex: 10 - idx }}
          >
            <div className={`h-full w-full rounded-full bg-gradient-to-br ${p.color} flex items-center justify-center font-mono text-[10px] font-bold text-white uppercase tracking-wider`}>
              {p.initials}
            </div>

            {/* Glowing online indicator */}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-panel" />
          </div>
        ))}

        {/* Dynamic Plus Badge */}
        <div className="flex h-10 items-center justify-center rounded-full border-2 border-panel bg-blue-600/20 px-3 text-[11px] font-bold text-blue-400 backdrop-blur-sm z-0">
          +634 فريق
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
        <span>تتبّع خوارزمي متواصل لـ 6 دوريات عالمية</span>
      </div>
    </div>
  );
}

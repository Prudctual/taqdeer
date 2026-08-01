import Link from "next/link";
import { Crest } from "./Crest";
import { crestInitials } from "@/lib/format";

type Props = {
  homeName: string;
  awayName: string;
  homeHref?: string;
  awayHref?: string;
  homeMeta?: string;
  awayMeta?: string;
  homeCrestUrl?: string | null;
  awayCrestUrl?: string | null;
  score?: string | null;
  /** نص الوسط عند غياب النتيجة — VS للمجدولة، انتهت للمنتهية بلا أهداف */
  placeholder?: string;
  isLive?: boolean;
};

export function TeamMatchup({
  homeName,
  awayName,
  homeHref,
  awayHref,
  homeCrestUrl,
  awayCrestUrl,
  score,
  placeholder = "VS",
  isLive = false,
}: Props) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 sm:p-7 shadow-xs">
      <div className="flex items-center justify-between gap-4">
        {/* Home Team */}
        <Link
          href={homeHref || "#"}
          className="flex flex-1 items-center gap-3 sm:gap-4 no-underline group"
        >
          <Crest
            src={homeCrestUrl}
            alt={homeName}
            size="lg"
            fallback={crestInitials(homeName)}
            tone="home"
          />
          <div className="min-w-0">
            <span className="text-xs font-bold text-home block">المضيف</span>
            <span className="text-base sm:text-xl font-black text-ink group-hover:text-accent transition-colors block truncate">
              {homeName}
            </span>
          </div>
        </Link>

        {/* Center Score / VS */}
        <div className="flex flex-col items-center justify-center shrink-0 px-3">
          {score ? (
            <span
              className={`text-2xl sm:text-4xl font-mono font-black tabular ${
                isLive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-ink"
              }`}
            >
              {score}
            </span>
          ) : (
            <span className="text-xs font-black text-white bg-accent px-3 py-1 rounded-full shadow-xs">
              {placeholder}
            </span>
          )}
          {isLive ? (
            <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              مباشر
            </span>
          ) : null}
        </div>

        {/* Away Team */}
        <Link
          href={awayHref || "#"}
          className="flex flex-1 items-center justify-end gap-3 sm:gap-4 text-end no-underline group"
        >
          <div className="min-w-0">
            <span className="text-xs font-bold text-away block">الضيف</span>
            <span className="text-base sm:text-xl font-black text-ink group-hover:text-accent transition-colors block truncate">
              {awayName}
            </span>
          </div>
          <Crest
            src={awayCrestUrl}
            alt={awayName}
            size="lg"
            fallback={crestInitials(awayName)}
            tone="away"
          />
        </Link>
      </div>
    </div>
  );
}

export function TeamNamesInline({
  homeName,
  awayName,
  homeCrestUrl,
  awayCrestUrl,
  score,
  placeholder = "VS",
}: {
  homeName: string;
  awayName: string;
  homeCrestUrl?: string | null;
  awayCrestUrl?: string | null;
  score?: string | null;
  placeholder?: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_3.25rem_1fr] items-center gap-1.5 text-xs font-bold w-full">
      {/* Home Team - Pushed close to VS badge in center */}
      <div className="flex items-center gap-1.5 min-w-0 justify-end">
        <Crest src={homeCrestUrl} alt={homeName} size="chip" fallback={crestInitials(homeName)} tone="home" />
        <span className="truncate text-ink font-black">{homeName}</span>
      </div>

      {/* VS / Score Badge - Exactly Centered Column */}
      <div className="w-13 shrink-0 text-center flex items-center justify-center mx-auto">
        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-panel border border-line font-mono font-black text-xs text-ink tabular min-w-[2.75rem]">
          {score || placeholder}
        </span>
      </div>

      {/* Away Team - Pushed close to VS badge in center */}
      <div className="flex items-center gap-1.5 min-w-0 justify-start">
        <span className="truncate text-ink font-black">{awayName}</span>
        <Crest src={awayCrestUrl} alt={awayName} size="chip" fallback={crestInitials(awayName)} tone="away" />
      </div>
    </div>
  );
}

import Link from "next/link";
import { Crest } from "./Crest";
import { crestInitials } from "@/lib/format";

const SIDES = {
  home: { glyph: "1", label: "مضيف", color: "var(--home)" },
  away: { glyph: "2", label: "ضيف", color: "var(--away)" },
} as const;

function TeamSide({
  name,
  href,
  side,
  meta,
  crestUrl,
}: {
  name: string;
  href?: string;
  side: "home" | "away";
  meta?: string;
  crestUrl?: string | null;
}) {
  const { glyph, label, color } = SIDES[side];

  const body = (
    <div className="flex h-full min-w-0 flex-col items-center justify-center gap-3 px-3 py-5 text-center sm:px-4 sm:py-6">
      <div className="transition-transform duration-200 ease-out group-hover:scale-105">
        <Crest
          src={crestUrl}
          alt={name}
          size="lg"
          fallback={crestInitials(name)}
          tone={side}
        />
      </div>
      <div className="min-w-0 w-full space-y-1">
        <p className="type-label flex items-center justify-center gap-1.5">
          <span
            className="tabular font-bold"
            style={{ color }}
            aria-hidden
          >
            {glyph}
          </span>
          <span className="font-medium text-muted">{label}</span>
        </p>
        <p
          className="line-clamp-2 text-base font-extrabold leading-snug text-ink sm:text-lg"
          title={name}
        >
          {name}
        </p>
        {meta ? (
          <p className="text-[11px] tabular font-medium text-muted/80">{meta}</p>
        ) : null}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group press-scale relative block h-full min-w-0 no-underline hover:bg-panel/60 focus-visible:relative focus-visible:z-10 rounded-lg overflow-hidden"
        aria-label={`${label} ${name}`}
      >
        <span
          className="absolute top-0 inset-x-0 h-[2px] opacity-70 transition-opacity group-hover:opacity-100"
          style={{ backgroundColor: color }}
        />
        {body}
      </Link>
    );
  }
  return (
    <div className="relative block h-full min-w-0 overflow-hidden">
      <span
        className="absolute top-0 inset-x-0 h-[2px] opacity-70"
        style={{ backgroundColor: color }}
      />
      {body}
    </div>
  );
}

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
};

/** المواجهة: عمودان متماثلان يفصلهما خط شعري، والنتيجة في المنتصف */
export function TeamMatchup({
  homeName,
  awayName,
  homeHref,
  awayHref,
  homeMeta,
  awayMeta,
  homeCrestUrl,
  awayCrestUrl,
  score,
}: Props) {
  return (
    <div className="card overflow-hidden shadow-sm">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch">
        <TeamSide
          name={homeName}
          href={homeHref}
          side="home"
          meta={homeMeta}
          crestUrl={homeCrestUrl}
        />

        <div className="flex flex-col items-center justify-center gap-1.5 border-x border-line px-4 py-5 sm:px-6 bg-panel/30">
          {score ? (
            <>
              <span className="type-label text-[11px] uppercase tracking-wider font-semibold text-faint">النتيجة</span>
              <span className="type-figure text-ink font-black text-2xl sm:text-3xl tracking-tight">{score}</span>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <span className="type-label text-[11px] font-medium text-faint">ضد</span>
              <span className="text-xs font-bold text-accent px-2 py-0.5 rounded-full bg-accent-dim/20 border border-accent-dim/30">
                VS
              </span>
            </div>
          )}
        </div>

        <TeamSide
          name={awayName}
          href={awayHref}
          side="away"
          meta={awayMeta}
          crestUrl={awayCrestUrl}
        />
      </div>
    </div>
  );
}

/** صف قائمة كثيف: الاسمان بجوار المنتصف والشعاران يحيطان النتيجة */
export function TeamNamesInline({
  homeName,
  awayName,
  homeCrestUrl,
  awayCrestUrl,
  score,
}: {
  homeName: string;
  awayName: string;
  homeCrestUrl?: string | null;
  awayCrestUrl?: string | null;
  score?: string | null;
}) {
  return (
    <div className="grid grid-cols-[1fr_2.25rem_2rem_2.25rem_1fr] items-center gap-1 text-[15px] sm:text-base sm:gap-2">
      {/* اسم المضيف */}
      <span
        className="min-w-0 truncate text-end font-bold leading-tight text-ink"
        title={homeName}
      >
        {homeName}
      </span>

      {/* شعار المضيف — محاذاة عمودية موحدة */}
      <span className="flex items-center justify-center">
        <Crest
          src={homeCrestUrl}
          alt={homeName}
          size="chip"
          fallback={crestInitials(homeName)}
          tone="home"
        />
      </span>

      {/* ضد / النتيجة — منتصف عمودي محاذى بالتمام */}
      {score ? (
        <span className="shrink-0 text-center font-bold tabular text-ink text-base">
          <span className="sr-only">النتيجة </span>
          {score}
        </span>
      ) : (
        <span className="shrink-0 text-center text-xs font-semibold text-muted" aria-hidden>
          ضد
        </span>
      )}

      {/* شعار الضيف — محاذاة عمودية موحدة */}
      <span className="flex items-center justify-center">
        <Crest
          src={awayCrestUrl}
          alt={awayName}
          size="chip"
          fallback={crestInitials(awayName)}
          tone="away"
        />
      </span>

      {/* اسم الضيف */}
      <span
        className="min-w-0 truncate text-start font-bold leading-tight text-ink"
        title={awayName}
      >
        {awayName}
      </span>
    </div>
  );
}

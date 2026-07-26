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
      <Crest
        src={crestUrl}
        alt={name}
        size="lg"
        fallback={crestInitials(name)}
        tone={side}
      />
      <div className="min-w-0 w-full">
        <p className="type-label flex items-center justify-center gap-1.5">
          <span
            className="tabular font-semibold"
            style={{ color }}
            aria-hidden
          >
            {glyph}
          </span>
          <span>{label}</span>
        </p>
        <p
          className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-ink sm:text-base"
          title={name}
        >
          {name}
        </p>
        {meta ? (
          <p className="mt-1.5 text-[11px] tabular text-muted">{meta}</p>
        ) : null}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="motion-colors block h-full min-w-0 no-underline hover:bg-panel focus-visible:relative focus-visible:z-10"
        aria-label={`${label} ${name}`}
      >
        {body}
      </Link>
    );
  }
  return <div className="block h-full min-w-0">{body}</div>;
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
    <div className="card overflow-hidden">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch">
        <TeamSide
          name={homeName}
          href={homeHref}
          side="home"
          meta={homeMeta}
          crestUrl={homeCrestUrl}
        />

        <div className="flex flex-col items-center justify-center gap-1.5 border-x border-line px-3 py-5 sm:px-5">
          {score ? (
            <>
              <span className="type-label">النتيجة</span>
              <span className="type-figure text-ink">{score}</span>
            </>
          ) : (
            <span className="type-label text-faint">ضد</span>
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
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 text-[13px] sm:gap-2">
      <span className="flex min-w-0 items-center justify-end gap-2">
        <span
          className="min-w-0 truncate text-end font-medium leading-tight text-ink"
          title={homeName}
        >
          {homeName}
        </span>
        <Crest
          src={homeCrestUrl}
          alt={homeName}
          size="chip"
          fallback={crestInitials(homeName)}
          tone="home"
        />
      </span>

      {score ? (
        <span className="shrink-0 px-1 font-semibold tabular text-ink">
          <span className="sr-only">النتيجة </span>
          {score}
        </span>
      ) : (
        <span className="shrink-0 px-1 text-[11px] text-faint" aria-hidden>
          ضد
        </span>
      )}

      <span className="flex min-w-0 items-center justify-start gap-2">
        <Crest
          src={awayCrestUrl}
          alt={awayName}
          size="chip"
          fallback={crestInitials(awayName)}
          tone="away"
        />
        <span
          className="min-w-0 truncate text-start font-medium leading-tight text-ink"
          title={awayName}
        >
          {awayName}
        </span>
      </span>
    </div>
  );
}

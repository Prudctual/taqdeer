import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronIcon } from "./ChevronIcon";

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
  display = false,
  leagueId,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  /** عنوان أكبر للصفحات المحورية */
  display?: boolean;
  /** لون تصنيف الدوري — نقطة فقط، لا خلفية */
  leagueId?: string | null;
}) {
  const tone = leagueId?.toLowerCase() || undefined;
  return (
    <header
      className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8"
      data-league={tone}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? (
          <p className="type-label flex items-center gap-1.5">
            {tone ? <span className="chip-dot" aria-hidden /> : null}
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={`text-balance text-ink ${display ? "type-display" : "type-page"}`}
        >
          {title}
        </h1>
        {description ? (
          <p className="max-w-[60ch] text-sm leading-relaxed text-muted text-pretty">
            {description}
          </p>
        ) : null}
        {meta ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] tabular text-faint">
            {meta}
          </div>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}

/** عنصر واحد في سطر بيانات الرأس */
export function MetaItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-faint">{label}</span>
      <span className="font-medium text-muted">{value}</span>
    </span>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="motion-colors inline-flex items-center gap-1.5 rounded-sm text-sm text-muted no-underline hover:text-ink"
    >
      <span className="text-faint" aria-hidden>
        <ChevronIcon className="-scale-x-100" size={12} />
      </span>
      <span>رجوع إلى {label}</span>
    </Link>
  );
}

export function BackBar({ links }: { links: { href: string; label: string }[] }) {
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-5 text-sm">
      {links.map((l) => (
        <BackLink key={l.href + l.label} href={l.href} label={l.label} />
      ))}
    </div>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: { href?: string; label: string }[];
}) {
  return (
    <nav
      aria-label="مسار الصفحة"
      className="flex flex-wrap items-center gap-1.5 text-xs text-faint"
    >
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span
            key={`${item.label}-${i}`}
            className="inline-flex items-center gap-1.5"
          >
            {i > 0 ? <span aria-hidden>/</span> : null}
            {item.href && !last ? (
              <Link
                href={item.href}
                className="motion-colors rounded-sm no-underline hover:text-ink"
              >
                {item.label}
              </Link>
            ) : (
              <span className={last ? "text-muted" : undefined}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function PageNav({
  backHref,
  backLabel,
  crumbs,
}: {
  backHref: string;
  backLabel: string;
  crumbs?: { href?: string; label: string }[];
}) {
  return (
    <div className="mb-4">
      {crumbs && crumbs.length > 0 ? (
        <Breadcrumbs items={crumbs} />
      ) : (
        <BackLink href={backHref} label={backLabel} />
      )}
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  children,
  headerRight,
  flush = false,
  quiet = false,
  leagueId,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  headerRight?: ReactNode;
  /** قائمة/جدول بلا حشو داخلي */
  flush?: boolean;
  /** عنوان ثانوي أخف */
  quiet?: boolean;
  leagueId?: string | null;
}) {
  const tone = leagueId?.toLowerCase() || undefined;
  return (
    <section className="card overflow-hidden" data-league={tone}>
      {(title || headerRight) && (
        <div className="card-head">
          <div className="min-w-0">
            {title ? (
              <h2
                className={
                  quiet
                    ? "text-sm font-medium text-muted"
                    : "type-section text-ink"
                }
              >
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className="card-head-sub max-w-[62ch]">{subtitle}</p>
            ) : null}
          </div>
          {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
        </div>
      )}
      {flush ? children : <div className="p-4 sm:p-5">{children}</div>}
    </section>
  );
}

const OUTCOMES = [
  { key: "H", short: "1", label: "مضيف", color: "var(--home)" },
  { key: "D", short: "X", label: "تعادل", color: "var(--draw)" },
  { key: "A", short: "2", label: "ضيف", color: "var(--away)" },
] as const;

/** مفتاح ألوان 1X2 — سطر واحد هادئ */
export function OutcomeLegend() {
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted"
      aria-label="مفتاح ألوان 1X2"
    >
      {OUTCOMES.map((o) => (
        <span key={o.key} className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-[2px]"
            style={{ background: o.color }}
            aria-hidden
          />
          <span>
            <span className="tabular font-medium text-ink">{o.short}</span>{" "}
            {o.label}
          </span>
        </span>
      ))}
    </div>
  );
}

/** صف 1X2 — الرمز والنسبة، الأرجح بخط علوي ملوّن */
export function OutcomeCards({
  pHome,
  pDraw,
  pAway,
  pickKey,
}: {
  pHome: number;
  pDraw: number;
  pAway: number;
  pickKey: "H" | "D" | "A";
}) {
  const values: Record<string, number> = { H: pHome, D: pDraw, A: pAway };
  return (
    <dl className="grid grid-cols-3 text-center" aria-label="احتمالات 1X2">
      {OUTCOMES.map((o, i) => {
        const active = pickKey === o.key;
        const value = values[o.key]!;
        return (
          <div
            key={o.key}
            className={`relative px-2 py-4 ${i > 0 ? "border-s border-line" : ""}`}
          >
            {active ? (
              <span
                className="absolute inset-x-0 top-0 h-0.5"
                style={{ background: o.color }}
                aria-hidden
              />
            ) : null}
            <dt className="text-[11px] text-muted">
              <span className="tabular font-medium">{o.short}</span> {o.label}
            </dt>
            <dd
              className="type-figure mt-2"
              style={{ color: active ? o.color : "var(--muted)" }}
            >
              {`${(value * 100).toFixed(0)}٪`}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export function Chip({
  href,
  active,
  icon,
  children,
  hint,
  leagueId,
}: {
  href: string;
  active?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  hint?: string;
  /** نقطة تصنيف بلون الدوري */
  leagueId?: string | null;
}) {
  const tone = leagueId?.toLowerCase() || undefined;
  return (
    <Link
      href={href}
      title={hint}
      data-league={tone}
      aria-current={active ? "page" : undefined}
      className="chip-filter"
    >
      {tone ? <span className="chip-dot" aria-hidden /> : icon}
      <span className="min-w-0 truncate">{children}</span>
    </Link>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="type-section text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted text-pretty">
        {body}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`skeleton-pulse rounded bg-panel ${className}`}
      aria-hidden
    />
  );
}

/** رقم مع تسميته — للسياق لا للاستعراض */
export function MetaStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="type-label">{label}</div>
      <div className="mt-1 text-sm font-semibold tabular text-ink">{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-faint">{hint}</div> : null}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="border-s border-line ps-3 first:border-s-0 first:ps-0">
      <div className="type-label">{label}</div>
      <div className="type-figure mt-1.5 text-ink">{value}</div>
      {hint ? <div className="mt-1 text-[11px] text-faint">{hint}</div> : null}
    </div>
  );
}

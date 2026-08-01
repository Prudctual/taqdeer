import React, { type ReactNode } from "react";


/* -------------------------------------------------------------------------- */
/*                                    CARD                                    */
/* -------------------------------------------------------------------------- */

export function Card({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface text-ink shadow-xs transition-all ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex flex-col space-y-1.5 p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-base font-bold tracking-tight text-ink ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs text-muted leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-5 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex items-center p-5 pt-0 border-t border-line mt-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    BADGE                                   */
/* -------------------------------------------------------------------------- */

export function Badge({
  variant = "default",
  className = "",
  children,
}: {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success";
  className?: string;
  children: ReactNode;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors focus:outline-none tabular";
  const variants = {
    default: "bg-accent text-on-fill hover:bg-accent/90",
    secondary: "bg-panel text-muted hover:bg-raised hover:text-ink border border-line",
    destructive: "bg-rose-500/10 text-rose-600 border border-rose-500/20",
    outline: "border border-line text-muted hover:text-ink",
    success: "bg-success-dim text-success border border-success/20",
  };

  return (
    <span className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   BUTTON                                   */
/* -------------------------------------------------------------------------- */

export function Button({
  variant = "default",
  size = "default",
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  const base =
    "press-scale inline-flex items-center justify-center font-bold text-xs transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50 select-none";

  const variants = {
    default: "bg-accent text-on-fill hover:bg-accent/90 rounded-xl shadow-xs",
    secondary: "bg-panel text-ink hover:bg-raised border border-line rounded-xl",
    outline: "border border-line bg-surface hover:bg-panel text-muted hover:text-ink rounded-xl",
    ghost: "hover:bg-panel text-muted hover:text-ink rounded-xl",
    destructive: "bg-danger text-on-fill hover:opacity-90 rounded-xl shadow-xs",
  };

  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 px-3 text-[11px]",
    lg: "h-11 px-6 text-sm",
    icon: "h-9 w-9 p-0",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import Link from "next/link";
import type { ReactNode } from "react";

export const cn = (...v: Parameters<typeof clsx>) => twMerge(clsx(v));

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm" | "lg";

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors select-none",
    "disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" && "min-h-9 px-3 text-sm",
    size === "md" && "min-h-11 px-4 text-base",
    size === "lg" && "min-h-12 px-6 text-lg",
    variant === "primary" && "bg-primary text-primary-ink hover:brightness-110",
    variant === "secondary" && "border border-line bg-surface text-ink hover:bg-sunken",
    variant === "ghost" && "text-ink hover:bg-sunken",
    variant === "danger" && "bg-bad text-white hover:brightness-110",
    extra,
  );
}

export function Button({ variant, size, className, type = "button", ...p }: React.ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...p} />;
}

export function LinkButton({ href, variant, size, className, children, ...p }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode } & Omit<React.ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...p}>
      {children}
    </Link>
  );
}

const control =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 min-h-11 text-base text-ink placeholder:text-muted/80 aria-[invalid=true]:border-bad";

export function Input({ className, ...p }: React.ComponentProps<"input">) {
  return <input className={cn(control, className)} {...p} />;
}
export function Textarea({ className, ...p }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24 py-2", className)} {...p} />;
}
export function Select({ className, ...p }: React.ComponentProps<"select">) {
  return <select className={cn(control, "pe-8", className)} {...p} />;
}

export function Field({ id, label, hint, error, optional, children }: { id: string; label: string; hint?: string; error?: string; optional?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {optional && <span className="ms-2 font-normal text-muted">{optional}</span>}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-sm text-muted">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="text-sm text-bad">{error}</p>}
    </div>
  );
}

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card border border-line bg-surface p-4 sm:p-5", className)} {...p} />;
}

export function Badge({ tone = "neutral", className, ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "primary" | "saffron" | "ok" | "bad" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-sunken text-muted",
        tone === "primary" && "bg-primary/15 text-primary",
        tone === "saffron" && "bg-saffron/25 text-ink",
        tone === "ok" && "bg-ok/15 text-ok",
        tone === "bad" && "bg-bad/15 text-bad",
        className,
      )}
      {...p}
    />
  );
}

export function Alert({ tone = "info", children, className }: { tone?: "info" | "error" | "success"; children: ReactNode; className?: string }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        tone === "info" && "border-line bg-sunken text-ink",
        tone === "error" && "border-bad/40 bg-bad/10 text-ink",
        tone === "success" && "border-ok/40 bg-ok/10 text-ink",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({ title, body, action, icon }: { title: string; body?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line px-6 py-12 text-center" data-testid="empty-state">
      {icon && <div className="text-muted" aria-hidden>{icon}</div>}
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {body && <p className="max-w-md text-muted">{body}</p>}
      {action}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-muted">
      <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" aria-hidden />
      {label}
    </span>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)} aria-label={label} className="h-2.5 w-full overflow-hidden rounded-full bg-sunken">
      <div className="h-full rounded-full bg-saffron" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PageHeader({ title, children, sub }: { title: string; children?: ReactNode; sub?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-muted">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

/** The review ladder: seven rungs, filled up to the word's current level. */
export function ReviewLadder({ level, label }: { level: number; label: string }) {
  return (
    <div role="img" aria-label={label} className="flex items-end gap-1" dir="ltr">
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} className={cn("w-3 rounded-sm", i <= level && level > 0 ? "bg-saffron" : "bg-sunken")} style={{ height: `${10 + i * 4}px` }} />
      ))}
    </div>
  );
}

/** English text is always left-to-right, Persian always right-to-left, whatever the interface language. */
export function En({ children, className }: { children: ReactNode; className?: string }) {
  return <span dir="ltr" lang="en" className={cn("inline-block text-start", className)}>{children}</span>;
}
export function Fa({ children, className }: { children: ReactNode; className?: string }) {
  return <span dir="rtl" lang="fa" className={cn("inline-block text-start", className)}>{children}</span>;
}

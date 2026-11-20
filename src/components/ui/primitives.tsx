import * as React from "react";
import Link from "next/link";
import { cn, initials } from "@/lib/utils";
import { SEVERITY_META, STATUS_META, TRADE_LABEL } from "@/lib/constants";
import type { Severity, SnagStatus, Trade, User } from "@/lib/types";

/* ---------- Button ---------- */

type Variant = "primary" | "secondary" | "ghost" | "dark" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] hover:bg-brand-700 active:bg-brand-800",
  secondary: "bg-surface text-ink ring-1 ring-line-strong hover:bg-sunken",
  ghost: "text-ink-2 hover:bg-sunken hover:text-ink",
  dark: "bg-ink text-white hover:bg-ink-2",
  danger: "bg-red-600 text-white hover:bg-red-700",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-xl",
};

export const buttonClass = (variant: Variant = "primary", size: Size = "md", className?: string) =>
  cn(
    "inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors select-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50 disabled:pointer-events-none",
    variants[variant],
    sizes[size],
    className,
  );

export function Button({
  variant,
  size,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/* ---------- Card ---------- */

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl bg-surface border border-line shadow-card", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-5 pt-5", className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Badges ---------- */

export function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium ring-1 ring-inset whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const m = SEVERITY_META[severity];
  return (
    <Pill className={m.badge}>
      <span className={cn("size-1.5 rounded-full", m.dot)} />
      {m.label}
    </Pill>
  );
}

export function StatusBadge({ status }: { status: SnagStatus }) {
  const m = STATUS_META[status];
  return (
    <Pill className={m.badge}>
      <span className={cn("size-1.5 rounded-full", m.dot)} />
      {m.label}
    </Pill>
  );
}

export function TradeLabel({ trade }: { trade: Trade }) {
  return <span className="text-[12.5px] text-muted">{TRADE_LABEL[trade]}</span>;
}

export function RefTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11.5px] font-medium tracking-tight text-ink-2 bg-sunken rounded-md px-1.5 py-0.5">
      {children}
    </span>
  );
}

/* ---------- Avatar ---------- */

export function Avatar({ user, size = 32, className }: { user?: Pick<User, "name" | "avatarColor">; size?: number; className?: string }) {
  if (!user) return null;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", className)}
      style={{ width: size, height: size, background: user.avatarColor, fontSize: size * 0.38 }}
      title={user.name}
    >
      {initials(user.name)}
    </span>
  );
}

/* ---------- Progress ---------- */

export function Progress({ value, className, tone = "brand" }: { value: number; className?: string; tone?: "brand" | "light" }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full", tone === "brand" ? "bg-sunken" : "bg-white/15", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-700", tone === "brand" ? "bg-brand-500" : "bg-highlight")}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/** Small circular progress ring. */
export function Ring({ value, size = 44, stroke = 5, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-sunken" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-brand-500 transition-[stroke-dashoffset] duration-700"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
        />
      </svg>
      <span className="absolute font-semibold tracking-tight tabular" style={{ fontSize: Math.max(9, size * 0.24) }}>{label ?? `${value}%`}</span>
    </div>
  );
}

/* ---------- Misc ---------- */

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-semibold uppercase tracking-[0.12em] text-muted", className)}>{children}</p>;
}

export function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-blueprint px-6 py-14 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-surface text-muted border border-line">{icon}</div>
      <p className="font-medium text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
    </div>
  );
}

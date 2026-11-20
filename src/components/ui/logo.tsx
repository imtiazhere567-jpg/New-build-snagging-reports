import { cn } from "@/lib/utils";

/** SnagSnap mark: a viewfinder with a check, i.e. "photo it, fix it". */
export function LogoMark({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" className={inverted ? "fill-highlight" : "fill-brand-600"} />
      <path
        d="M9 12.5V10a1 1 0 0 1 1-1h2.5M19.5 9H22a1 1 0 0 1 1 1v2.5M23 19.5V22a1 1 0 0 1-1 1h-2.5M12.5 23H10a1 1 0 0 1-1-1v-2.5"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        className={inverted ? "stroke-night" : "stroke-white"}
      />
      <path
        d="m12.5 16.2 2.4 2.4 4.6-4.9"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={inverted ? "stroke-night" : "stroke-highlight"}
      />
    </svg>
  );
}

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark inverted={inverted} />
      <span className={cn("text-[17px] font-semibold tracking-tight", inverted ? "text-white" : "text-ink")}>
        Snag<span className={inverted ? "text-highlight" : "text-brand-600"}>Snap</span>
      </span>
    </span>
  );
}

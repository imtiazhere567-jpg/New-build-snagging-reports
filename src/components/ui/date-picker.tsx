"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------- Date helpers (local time, values are "yyyy-mm-dd") ---------- */
const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s?: string | null) => {
  const m = s ? /^(\d{4})-(\d{2})-(\d{2})/.exec(s) : null;
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
const sameDay = (a: Date | null, b: Date | null) => !!a && !!b && toISO(a) === toISO(b);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => {
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  return new Date(t.getFullYear(), t.getMonth(), Math.min(d.getDate(), last));
};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]; // UK weeks start on Monday
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const display = (d: Date) => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;

/**
 * Custom date picker used instead of the browser's native calendar.
 * Keyboard: arrows move a day/week, PageUp/PageDown a month, Home/End the week, Enter picks, Esc closes.
 */
export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "Choose a date",
  label,
  error,
  clearable = true,
  size = "md",
  dark,
  className,
  triggerClassName,
}: {
  /** "yyyy-mm-dd" or "" */
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  /** Accessible name when there's no visible label element. */
  label?: string;
  error?: boolean;
  clearable?: boolean;
  /** md = 40px (forms in popups), lg = 48px (phone forms), sm = 28px (inline toolbars) */
  size?: "sm" | "md" | "lg";
  /** Trigger styled for dark surfaces. */
  dark?: boolean;
  className?: string;
  triggerClassName?: string;
}) {
  const selected = fromISO(value);
  const minD = fromISO(min);
  const maxD = fromISO(max);
  const [open, setOpen] = useState(false);
  const [today] = useState(() => new Date());
  const [cursor, setCursor] = useState<Date>(() => selected ?? today);
  const [view, setView] = useState<"days" | "months">("days");
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const disabled = useCallback((d: Date) => (!!minD && toISO(d) < toISO(minD)) || (!!maxD && toISO(d) > toISO(maxD)), [minD, maxD]);

  const openPicker = () => {
    setCursor(selected ?? (maxD && toISO(today) > toISO(maxD) ? maxD : today));
    setView("days");
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    setPos(null);
    if (refocus) triggerRef.current?.focus();
  };
  const pick = (d: Date) => {
    if (disabled(d)) return;
    onChange(toISO(d));
    close();
  };

  // Position the popover next to the trigger, flipping above when there's no room below
  const W = 300;
  const H = 360;
  const place = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const up = r.bottom + H + 8 > window.innerHeight && r.top - H - 8 > 0;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - W - 8));
    setPos({ top: up ? r.top - 8 : r.bottom + 8, left, up });
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  // Close on outside click or Escape (the calendar is the top overlay, so a popup behind it stays open)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!popRef.current?.contains(t) && !triggerRef.current?.contains(t)) close(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Keep keyboard focus on the cursor day
  useEffect(() => {
    if (open && pos && view === "days") gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${toISO(cursor)}"]`)?.focus({ preventScroll: true });
  }, [open, pos, view, cursor]);

  const weeks = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = addDays(first, -((first.getDay() + 6) % 7));
    return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  }, [cursor]);

  const onGridKey = (e: React.KeyboardEvent) => {
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(cursor, -1),
      ArrowRight: () => addDays(cursor, 1),
      ArrowUp: () => addDays(cursor, -7),
      ArrowDown: () => addDays(cursor, 7),
      PageUp: () => addMonths(cursor, -1),
      PageDown: () => addMonths(cursor, 1),
      Home: () => addDays(cursor, -((cursor.getDay() + 6) % 7)),
      End: () => addDays(cursor, 6 - ((cursor.getDay() + 6) % 7)),
    };
    if (moves[e.key]) {
      e.preventDefault();
      setCursor(moves[e.key]());
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(cursor);
    }
  };

  const heights = { sm: "h-7 rounded-lg px-2 text-[12.5px]", md: "h-10 rounded-xl px-3 text-[13.5px]", lg: "h-12 rounded-xl px-3.5 text-[15px]" };
  const canPrev = !minD || toISO(new Date(cursor.getFullYear(), cursor.getMonth(), 0)) >= toISO(minD);
  const canNext = !maxD || toISO(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) <= toISO(maxD);
  const todayOk = !disabled(today);

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : openPicker())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            openPicker();
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={label ? `${label}: ${selected ? display(selected) : "not set"}` : undefined}
        className={cn(
          "flex w-full items-center gap-2 border text-left outline-none transition-colors",
          heights[size],
          dark
            ? "border-white/15 bg-white/10 text-white hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/30"
            : cn(
                "bg-surface hover:border-faint focus-visible:ring-2",
                error ? "border-red-400 focus-visible:ring-red-500/15" : "border-line-strong focus-visible:border-brand-500 focus-visible:ring-brand-500/15",
                open && !error && "border-brand-500 ring-2 ring-brand-500/15",
              ),
          triggerClassName,
        )}
      >
        <CalendarDays className={cn("shrink-0", size === "sm" ? "size-3.5" : "size-4", dark ? "text-white/60" : "text-muted")} />
        <span className={cn("min-w-0 flex-1 truncate", !selected && (dark ? "text-white/55" : "text-faint"))}>{selected ? display(selected) : placeholder}</span>
        {clearable && selected && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear date"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className={cn("-mr-1 rounded-md p-0.5", dark ? "text-white/60 hover:bg-white/15" : "text-faint hover:bg-sunken hover:text-ink")}
          >
            <X className="size-3.5" />
          </span>
        )}
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={popRef}
            id={id}
            data-overlay
            role="dialog"
            aria-label={label ?? "Choose a date"}
            style={{ top: pos.top, left: pos.left, width: W, transform: pos.up ? "translateY(-100%)" : undefined }}
            className="fixed z-[85] rounded-2xl border border-line bg-surface p-3 text-ink shadow-[0_18px_50px_-12px_rgba(16,21,19,0.35)] animate-[fade-in_0.12s_ease-out]"
          >
            {/* Header */}
            <div className="mb-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setView((v) => (v === "days" ? "months" : "days"))}
                className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[14px] font-semibold hover:bg-sunken"
                aria-label={view === "days" ? "Choose month and year" : "Back to days"}
              >
                {view === "days" ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}` : cursor.getFullYear()}
                <ChevronRight className={cn("size-3.5 text-muted transition-transform", view === "months" ? "-rotate-90" : "rotate-90")} />
              </button>
              <div className="ml-auto flex items-center">
                <button
                  type="button"
                  onClick={() => setCursor((c) => (view === "days" ? addMonths(c, -1) : new Date(c.getFullYear() - 1, c.getMonth(), 1)))}
                  disabled={view === "days" && !canPrev}
                  className="rounded-lg p-1.5 text-ink-2 hover:bg-sunken disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label={view === "days" ? "Previous month" : "Previous year"}
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCursor((c) => (view === "days" ? addMonths(c, 1) : new Date(c.getFullYear() + 1, c.getMonth(), 1)))}
                  disabled={view === "days" && !canNext}
                  className="rounded-lg p-1.5 text-ink-2 hover:bg-sunken disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label={view === "days" ? "Next month" : "Next year"}
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            {view === "days" ? (
              <div ref={gridRef} role="grid" aria-label={`${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`} onKeyDown={onGridKey}>
                <div role="row" className="grid grid-cols-7">
                  {WEEKDAYS.map((w) => (
                    <span key={w} role="columnheader" className="py-1 text-center text-[11px] font-semibold text-faint">{w}</span>
                  ))}
                </div>
                {weeks.map((week, wi) => (
                  <div key={wi} role="row" className="grid grid-cols-7">
                    {week.map((d) => {
                      const iso = toISO(d);
                      const inMonth = d.getMonth() === cursor.getMonth();
                      const isSel = sameDay(d, selected);
                      const isToday = sameDay(d, today);
                      const off = disabled(d);
                      return (
                        <button
                          key={iso}
                          type="button"
                          role="gridcell"
                          data-day={iso}
                          tabIndex={sameDay(d, cursor) ? 0 : -1}
                          aria-selected={isSel}
                          aria-disabled={off}
                          aria-label={display(d)}
                          onClick={() => pick(d)}
                          className={cn(
                            "relative mx-auto my-0.5 flex size-9 items-center justify-center rounded-full text-[13px] tabular outline-none transition-colors",
                            isSel
                              ? "bg-brand-600 font-semibold text-white"
                              : off
                                ? "cursor-not-allowed text-line-strong"
                                : cn("hover:bg-sunken", inMonth ? "text-ink" : "text-faint"),
                            !isSel && isToday && "font-semibold text-brand-700",
                            "focus-visible:ring-2 focus-visible:ring-brand-500/50",
                          )}
                        >
                          {d.getDate()}
                          {isToday && !isSel && <span className="absolute bottom-1 size-1 rounded-full bg-brand-600" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 py-1">
                {MONTHS.map((m, i) => {
                  const monthStart = new Date(cursor.getFullYear(), i, 1);
                  const monthEnd = new Date(cursor.getFullYear(), i + 1, 0);
                  const off = (!!minD && toISO(monthEnd) < toISO(minD)) || (!!maxD && toISO(monthStart) > toISO(maxD));
                  const isCur = i === cursor.getMonth();
                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={off}
                      onClick={() => {
                        setCursor(new Date(cursor.getFullYear(), i, Math.min(cursor.getDate(), monthEnd.getDate())));
                        setView("days");
                      }}
                      className={cn(
                        "h-11 rounded-xl text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:text-line-strong",
                        isCur ? "bg-brand-600 text-white" : "hover:bg-sunken",
                      )}
                    >
                      {m.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            <div className="mt-2 flex items-center justify-between border-t border-line pt-2.5">
              {clearable ? (
                <button type="button" onClick={() => { onChange(""); close(); }} className="rounded-lg px-2 py-1 text-[12.5px] font-medium text-muted hover:bg-sunken hover:text-ink">
                  Clear
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                disabled={!todayOk}
                onClick={() => pick(today)}
                className="rounded-lg bg-brand-50 px-2.5 py-1 text-[12.5px] font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-40"
              >
                Today
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

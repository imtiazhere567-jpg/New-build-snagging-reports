"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DropdownOption {
  value: string;
  label: string;
  /** Second line under the label in the menu. */
  hint?: string;
  /** Leading visual in the menu and trigger (dot, avatar, icon). */
  leading?: React.ReactNode;
  /** Small section heading shown above this option. */
  group?: string;
}

/**
 * Custom select used across the app instead of the browser's native menu.
 * Keyboard: ↑/↓, Home/End, Enter/Space to choose, Esc to close, type to search (long lists).
 */
export function Dropdown({
  value,
  onChange,
  options,
  label,
  icon,
  highlightWhenSet,
  defaultValue,
  align = "left",
  menuWidth = 240,
  className,
  size = "md",
  placement = "bottom",
  dark,
}: {
  /** Open the menu above the trigger (for bars pinned to the bottom of the screen). */
  placement?: "bottom" | "top";
  /** Trigger styled for dark surfaces. */
  dark?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  label: string;
  icon?: React.ReactNode;
  /** Tint the trigger when the value differs from `defaultValue` (useful for filters). */
  highlightWhenSet?: boolean;
  defaultValue?: string;
  align?: "left" | "right";
  menuWidth?: number;
  className?: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const searchable = options.length > 7;
  const selected = options.find((o) => o.value === value) ?? options[0];
  const isSet = highlightWhenSet && value !== (defaultValue ?? options[0]?.value);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    (searchable ? searchRef.current : listRef.current)?.focus();
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, searchable]);

  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const openMenu = () => {
    setQuery("");
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };
  const choose = (v: string) => {
    onChange(v);
    close();
  };

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(shown.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(shown.length - 1);
    } else if (e.key === "Enter" || (e.key === " " && !searchable)) {
      e.preventDefault();
      if (shown[active]) choose(shown[active].value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${selected?.label}`}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => {
          if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
            e.preventDefault();
            openMenu();
          }
        }}
        className={cn(
          "group flex w-full min-w-0 items-center gap-2 rounded-xl border text-left font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25",
          size === "md" ? "h-10 pr-2.5 pl-3 text-[13px]" : "h-9 pr-2 pl-2.5 text-[13px]",
          dark
            ? "border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.12]"
            : isSet
            ? "border-brand-300 bg-brand-50 text-brand-800"
            : open
              ? "border-brand-500 bg-surface text-ink ring-2 ring-brand-500/15"
              : "border-line-strong bg-surface text-ink-2 hover:border-faint hover:bg-canvas",
        )}
      >
        {icon && <span className={cn("shrink-0", isSet ? "text-brand-600" : "text-muted")}>{icon}</span>}
        {selected?.leading && <span className="flex shrink-0 items-center">{selected.leading}</span>}
        <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
        <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180", dark ? "text-white/50" : isSet ? "text-brand-600" : "text-faint")} />
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 overflow-hidden rounded-2xl border border-line bg-surface shadow-lift animate-fade-up [animation-duration:150ms]",
            align === "right" ? "right-0" : "left-0",
            placement === "top" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+6px)]",
          )}
          style={{ width: menuWidth, maxWidth: "calc(100vw - 32px)" }}
        >
          <p className="px-3.5 pt-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-faint">{label}</p>
          {searchable && (
            <div className="mx-2 mb-1 flex items-center gap-2 rounded-lg bg-canvas px-2.5">
              <Search className="size-3.5 shrink-0 text-faint" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onMenuKey}
                placeholder="Search…"
                aria-label={`Search ${label}`}
                className="h-8 w-full bg-transparent text-[13px] outline-none placeholder:text-faint"
              />
            </div>
          )}
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-label={label}
            aria-activedescendant={shown[active] ? `${listId}-${active}` : undefined}
            onKeyDown={searchable ? undefined : onMenuKey}
            className="max-h-72 overflow-y-auto p-1.5 outline-none"
          >
            {shown.length === 0 && <p className="px-3 py-4 text-center text-[12.5px] text-muted">No matches</p>}
            {shown.map((o, i) => {
              const isSel = o.value === value;
              const showGroup = o.group && o.group !== shown[i - 1]?.group;
              return (
                <div key={o.value}>
                  {showGroup && (
                    <p className="mt-1 border-t border-line px-2.5 pt-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-faint first:mt-0 first:border-0 first:pt-1">
                      {o.group}
                    </p>
                  )}
                  <div
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={isSel}
                    data-i={i}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(o.value)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px]",
                      i === active ? "bg-sunken" : "",
                      isSel ? "font-semibold text-ink" : "text-ink-2",
                    )}
                  >
                    {o.leading && <span className="flex w-5 shrink-0 items-center justify-center">{o.leading}</span>}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{o.label}</span>
                      {o.hint && <span className="block truncate text-[11.5px] font-normal text-muted">{o.hint}</span>}
                    </span>
                    <Check className={cn("size-4 shrink-0 text-brand-600", isSel ? "opacity-100" : "opacity-0")} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Coloured dot for use as a `leading` visual. */
export const Dot = ({ className }: { className: string }) => <span className={cn("size-2 rounded-full", className)} />;

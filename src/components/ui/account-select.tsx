"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, HardHat, Home, Search, Wrench } from "lucide-react";
import { Avatar } from "./primitives";
import type { Role, User } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface AccountOption {
  user: User;
  subtitle: string;
  tag?: string;
}

const GROUPS: { role: Role; label: string; icon: typeof Home }[] = [
  { role: "contractor", label: "Contractor", icon: HardHat },
  { role: "owner", label: "Home owners", icon: Home },
  { role: "team", label: "Team members", icon: Wrench },
];

/**
 * Grouped, searchable account picker for the demo login.
 * Keyboard: ↑/↓ to move, Enter to choose, Esc to close, type to filter.
 */
export function AccountSelect({
  options,
  value,
  onChange,
  placeholder = "Choose a demo account…",
  searchPlaceholder = "Search by name, trade or address",
}: {
  options: AccountOption[];
  value: string | null;
  onChange: (userId: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.user.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter(
      (o) => !q || o.user.name.toLowerCase().includes(q) || o.subtitle.toLowerCase().includes(q),
    );
  }, [options, query]);

  // Flat order matching the grouped render, for keyboard navigation.
  const flat = useMemo(
    () => GROUPS.flatMap((g) => filtered.filter((o) => o.user.role === g.role)),
    [filtered],
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    searchRef.current?.focus();
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const openMenu = () => {
    const idx = flat.findIndex((o) => o.user.id === value);
    setActive(idx >= 0 ? idx : 0);
    setQuery("");
    setOpen(true);
  };

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flat[active]) choose(flat[active].user.id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            openMenu();
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          "flex h-14 w-full items-center gap-3 rounded-xl bg-surface px-3 text-left ring-1 transition-shadow outline-none",
          open ? "ring-2 ring-brand-500" : "ring-line-strong hover:ring-faint focus-visible:ring-2 focus-visible:ring-brand-500",
        )}
      >
        {selected ? (
          <>
            <Avatar user={selected.user} size={34} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14.5px] font-medium text-ink">{selected.user.name}</span>
              <span className="block truncate text-[12.5px] text-muted">{selected.subtitle}</span>
            </span>
          </>
        ) : (
          <span className="flex-1 pl-1 text-[14.5px] text-faint">{placeholder}</span>
        )}
        <ChevronsUpDown className="size-4 shrink-0 text-faint" />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl bg-surface shadow-lift border border-line animate-fade-up [animation-duration:180ms]">
          <div className="flex items-center gap-2 border-b border-line px-3.5">
            <Search className="size-4 shrink-0 text-faint" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKey}
              placeholder={searchPlaceholder}
              aria-label="Search demo accounts"
              aria-activedescendant={flat[active] ? `${listId}-${flat[active].user.id}` : undefined}
              className="h-11 w-full bg-transparent text-[14px] outline-none placeholder:text-faint"
            />
          </div>

          <div ref={listRef} id={listId} role="listbox" className="max-h-[min(380px,55dvh)] overflow-y-auto p-1.5">
            {flat.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-muted">No accounts match “{query}”.</p>}
            {GROUPS.map((g) => {
              const items = filtered.filter((o) => o.user.role === g.role);
              if (!items.length) return null;
              return (
                <div key={g.role} role="group" aria-label={g.label} className="mb-1 last:mb-0">
                  <p className="flex items-center gap-1.5 px-2.5 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-faint">
                    <g.icon className="size-3.5" /> {g.label}
                  </p>
                  {items.map((o) => {
                    const i = flat.indexOf(o);
                    const isSel = o.user.id === value;
                    return (
                      <div
                        key={o.user.id}
                        id={`${listId}-${o.user.id}`}
                        role="option"
                        aria-selected={isSel}
                        data-index={i}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => choose(o.user.id)}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2",
                          i === active ? "bg-sunken" : "",
                        )}
                      >
                        <Avatar user={o.user} size={32} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium text-ink">{o.user.name}</span>
                          <span className="block truncate text-[12px] text-muted">{o.subtitle}</span>
                        </span>
                        {o.tag && (
                          <span className="shrink-0 rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-2 border border-line">
                            {o.tag}
                          </span>
                        )}
                        <Check className={cn("size-4 shrink-0 text-brand-600", isSel ? "opacity-100" : "opacity-0")} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

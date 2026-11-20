"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Home, Search, SlidersHorizontal, UserX, Users, Wrench, X } from "lucide-react";
import { Dot, Dropdown, type DropdownOption } from "@/components/ui/dropdown";
import { Avatar, RefTag, SeverityBadge } from "@/components/ui/primitives";
import { useStore } from "@/lib/data/store";
import { SEVERITIES, SEVERITY_META, TRADE_LABEL } from "@/lib/constants";
import type { Severity, Snag, Trade } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- */
/* Filter model                                                      */
/* ---------------------------------------------------------------- */

export interface DashFilters {
  propertyId: string; // "all" | id
  severity: Severity | "all";
  trade: Trade | "all";
  assigneeId: string; // "all" | "unassigned" | id
  period: "all" | "7" | "30" | "90";
}

export const DEFAULT_FILTERS: DashFilters = { propertyId: "all", severity: "all", trade: "all", assigneeId: "all", period: "all" };

export interface Scope {
  active: boolean;
  snag: (s: Snag) => boolean;
  property: (propertyId: string) => boolean;
  inPeriod: (iso?: string) => boolean;
}

/** Turns the filter values into predicates the dashboard and its popups share. */
export function makeScope(f: DashFilters): Scope {
  const since = f.period === "all" ? 0 : Date.now() - Number(f.period) * 86_400_000;
  const inPeriod = (iso?: string) => !since || (!!iso && new Date(iso).getTime() >= since);
  const property = (id: string) => f.propertyId === "all" || f.propertyId === id;
  const snag = (s: Snag) =>
    property(s.propertyId) &&
    (f.severity === "all" || s.severity === f.severity) &&
    (f.trade === "all" || s.trade === f.trade) &&
    (f.assigneeId === "all" || (f.assigneeId === "unassigned" ? !s.assigneeId : s.assigneeId === f.assigneeId)) &&
    inPeriod(s.createdAt);
  const active = JSON.stringify(f) !== JSON.stringify(DEFAULT_FILTERS);
  return { active, snag, property, inPeriod };
}

export const FULL_SCOPE: Scope = makeScope(DEFAULT_FILTERS);

/* ---------------------------------------------------------------- */
/* Filter bar                                                        */
/* ---------------------------------------------------------------- */

export type SearchHit =
  | { kind: "home"; id: string }
  | { kind: "snag"; id: string }
  | { kind: "member"; id: string };

export function FilterBar({
  filters,
  onChange,
  onPick,
}: {
  filters: DashFilters;
  onChange: (f: DashFilters) => void;
  onPick: (hit: SearchHit) => void;
}) {
  const properties = useStore((s) => s.properties);
  // Select stable slices from the store, then derive (selectors must not build new arrays).
  const users = useStore((s) => s.users);
  const allSnags = useStore((s) => s.snags);
  const team = useMemo(() => users.filter((u) => u.role === "team"), [users]);
  const usedTrades = useMemo(() => [...new Set(allSnags.map((x) => x.trade))].sort(), [allSnags]);
  const [showFilters, setShowFilters] = useState(false);
  const set = <K extends keyof DashFilters>(k: K, v: DashFilters[K]) => onChange({ ...filters, [k]: v });
  const activeCount = (Object.keys(DEFAULT_FILTERS) as (keyof DashFilters)[]).filter((k) => filters[k] !== DEFAULT_FILTERS[k]).length;

  const homeOptions: DropdownOption[] = [
    { value: "all", label: "All homes", leading: <Home className="size-4 text-muted" /> },
    ...properties.map((p) => ({ value: p.id, label: `${p.addressLine1}, ${p.town}`, hint: users.find((u) => u.id === p.ownerId)?.name })),
  ];
  const severityOptions: DropdownOption[] = [
    { value: "all", label: "All severities", leading: <Dot className="bg-line-strong" /> },
    ...SEVERITIES.map((s) => ({ value: s, label: SEVERITY_META[s].label, leading: <Dot className={SEVERITY_META[s].dot} /> })),
  ];
  const tradeOptions: DropdownOption[] = [
    { value: "all", label: "All trades", leading: <Wrench className="size-4 text-muted" /> },
    ...usedTrades.map((t) => ({ value: t, label: TRADE_LABEL[t] })),
  ];
  const assigneeOptions: DropdownOption[] = [
    { value: "all", label: "Anyone", leading: <Users className="size-4 text-muted" /> },
    { value: "unassigned", label: "Unassigned", leading: <UserX className="size-4 text-muted" /> },
    ...team.map((m) => ({ value: m.id, label: m.name, hint: TRADE_LABEL[m.trade!], leading: <Avatar user={m} size={20} />, group: "Team" })),
  ];
  const periodOptions: DropdownOption[] = [
    { value: "all", label: "All time" },
    { value: "7", label: "Last 7 days" },
    { value: "30", label: "Last 30 days" },
    { value: "90", label: "Last 90 days" },
  ];

  const selects = (
    <>
      <Dropdown label="Home" value={filters.propertyId} onChange={(v) => set("propertyId", v)} options={homeOptions} highlightWhenSet menuWidth={300} className="xl:w-[170px]" />
      <Dropdown label="Severity" value={filters.severity} onChange={(v) => set("severity", v as DashFilters["severity"])} options={severityOptions} highlightWhenSet className="xl:w-[150px]" />
      <Dropdown label="Trade" value={filters.trade} onChange={(v) => set("trade", v as DashFilters["trade"])} options={tradeOptions} highlightWhenSet className="xl:w-[150px]" />
      <Dropdown label="Assigned to" value={filters.assigneeId} onChange={(v) => set("assigneeId", v)} options={assigneeOptions} highlightWhenSet menuWidth={260} align="right" className="xl:w-[150px]" />
      <Dropdown label="Period" value={filters.period} onChange={(v) => set("period", v as DashFilters["period"])} options={periodOptions} highlightWhenSet icon={<CalendarDays className="size-4" />} align="right" menuWidth={200} className="xl:w-[150px]" />
    </>
  );

  return (
    <div className="mb-6 rounded-2xl border border-line bg-surface p-2 shadow-card">
      <div className="flex items-center gap-2">
        <GlobalSearch onPick={onPick} />
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            "relative inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-[13px] font-medium transition-colors xl:hidden",
            showFilters || activeCount ? "border-ink bg-ink text-white" : "border-line-strong text-ink-2 hover:bg-sunken",
          )}
        >
          <SlidersHorizontal className="size-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeCount > 0 && <span className="rounded-full bg-highlight px-1.5 text-[11px] font-bold text-night">{activeCount}</span>}
        </button>
        <div className="hidden items-center gap-1.5 xl:flex">{selects}</div>
        {activeCount > 0 && (
          <button
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="hidden h-10 shrink-0 items-center gap-1 rounded-xl px-2.5 text-[13px] font-medium text-brand-700 hover:bg-brand-50 xl:inline-flex"
          >
            <X className="size-3.5" /> Clear
          </button>
        )}
      </div>
      {showFilters && (
        <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-line pt-2 sm:grid-cols-3 xl:hidden">
          {selects}
          {activeCount > 0 && (
            <button onClick={() => onChange(DEFAULT_FILTERS)} className="h-10 rounded-xl text-[13px] font-medium text-brand-700 hover:bg-brand-50">
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Global search                                                     */
/* ---------------------------------------------------------------- */

function GlobalSearch({ onPick }: { onPick: (hit: SearchHit) => void }) {
  const state = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" focuses search, like most dashboards.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return { homes: [], snags: [], people: [] };
    const has = (...v: (string | undefined)[]) => v.some((x) => x?.toLowerCase().includes(term));
    const homes = state.properties
      .filter((p) => {
        const owner = state.users.find((u) => u.id === p.ownerId);
        return has(p.addressLine1, p.town, p.postcode, p.development, p.plot, owner?.name, owner?.email);
      })
      .slice(0, 4);
    const snags = state.snags.filter((s) => has(s.ref, s.title, s.category, TRADE_LABEL[s.trade], s.locationInRoom)).slice(0, 5);
    const people = state.users.filter((u) => u.role === "team" && has(u.name, u.email, u.trade && TRADE_LABEL[u.trade])).slice(0, 4);
    return { homes, snags, people };
  }, [q, state]);

  const flat: SearchHit[] = [
    ...results.homes.map((p) => ({ kind: "home" as const, id: p.id })),
    ...results.snags.map((s) => ({ kind: "snag" as const, id: s.id })),
    ...results.people.map((u) => ({ kind: "member" as const, id: u.id })),
  ];

  const pick = (hit: SearchHit) => {
    onPick(hit);
    setOpen(false);
    setQ("");
    inputRef.current?.blur();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && flat[active]) {
      e.preventDefault();
      pick(flat[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const isActive = (hit: SearchHit) => flat[active]?.kind === hit.kind && flat[active]?.id === hit.id;
  const showPanel = open && q.trim().length > 0;

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder="Search homes, snags or team"
        aria-label="Search"
        className="h-10 w-full rounded-xl border border-transparent bg-canvas pr-10 pl-10 text-[14px] outline-none placeholder:text-faint focus:border-brand-500 focus:bg-surface focus:ring-2 focus:ring-brand-500/15"
      />
      {q ? (
        <button onClick={() => setQ("")} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-faint hover:text-ink" aria-label="Clear search">
          <X className="size-4" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border border-line bg-surface px-1.5 font-mono text-[11px] text-faint sm:block">/</kbd>
      )}

      {showPanel && (
        <div className="absolute inset-x-0 top-[calc(100%+8px)] z-40 max-h-[70dvh] overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-lift animate-fade-up [animation-duration:160ms]">
          {flat.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-muted">Nothing matches “{q}”.</p>}

          {results.homes.length > 0 && (
            <Group icon={Home} label="Homes">
              {results.homes.map((p) => {
                const owner = state.users.find((u) => u.id === p.ownerId);
                const hit = { kind: "home" as const, id: p.id };
                return (
                  <Item key={p.id} active={isActive(hit)} onClick={() => pick(hit)}>
                    <Avatar user={owner} size={28} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium">{p.addressLine1}, {p.town}</span>
                      <span className="block truncate text-[12px] text-muted">{owner?.name} · {p.postcode}</span>
                    </span>
                  </Item>
                );
              })}
            </Group>
          )}

          {results.snags.length > 0 && (
            <Group icon={Search} label="Snags">
              {results.snags.map((s) => {
                const p = state.properties.find((x) => x.id === s.propertyId);
                const hit = { kind: "snag" as const, id: s.id };
                return (
                  <Item key={s.id} active={isActive(hit)} onClick={() => pick(hit)}>
                    <RefTag>{s.ref}</RefTag>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium">{s.title}</span>
                      <span className="block truncate text-[12px] text-muted">{p?.addressLine1}, {p?.town}</span>
                    </span>
                    <SeverityBadge severity={s.severity} />
                  </Item>
                );
              })}
            </Group>
          )}

          {results.people.length > 0 && (
            <Group icon={Wrench} label="Team">
              {results.people.map((u) => {
                const hit = { kind: "member" as const, id: u.id };
                return (
                  <Item key={u.id} active={isActive(hit)} onClick={() => pick(hit)}>
                    <Avatar user={u} size={28} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium">{u.name}</span>
                      <span className="block truncate text-[12px] text-muted">{TRADE_LABEL[u.trade!]}</span>
                    </span>
                  </Item>
                );
              })}
            </Group>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ icon: Icon, label, children }: { icon: typeof Home; label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1 last:mb-0">
      <p className="flex items-center gap-1.5 px-2.5 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-faint">
        <Icon className="size-3.5" /> {label}
      </p>
      {children}
    </div>
  );
}

function Item({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left", active ? "bg-sunken" : "hover:bg-canvas")}>
      {children}
    </button>
  );
}

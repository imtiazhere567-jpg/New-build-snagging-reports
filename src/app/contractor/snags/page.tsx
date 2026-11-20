"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Check,
  CheckCheck,
  Columns3,
  Download,
  Hammer,
  Home,
  Layers,
  Rows3,
  Search,
  UserX,
  Users,
  Wand2,
  Wrench,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/shell/contractor-shell";
import { Avatar, Button, RefTag, SeverityBadge, StatusBadge } from "@/components/ui/primitives";
import { SnagPhoto } from "@/components/ui/snag-photo";
import { Paginated } from "@/components/ui/pagination";
import { Dot, Dropdown, type DropdownOption } from "@/components/ui/dropdown";
import { DatePicker } from "@/components/ui/date-picker";
import { DashboardDrawer, type DrawerView } from "@/components/contractor/dashboard-overlays";
import { useAssigneeOptions, useStatusOptions } from "@/components/contractor/snag-controls";
import { useStore } from "@/lib/data/store";
import { isOverdue } from "@/lib/data/queries";
import { OPEN_WORK, SEVERITIES, SEVERITY_META, STATUS_META, TRADE_LABEL } from "@/lib/constants";
import type { Snag, SnagStatus } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

/* ---------------------------------------------------------------- */
/* Workflow columns, left to right                                   */
/* ---------------------------------------------------------------- */

const COLUMNS: { key: string; label: string; hint: string; statuses: SnagStatus[]; drop: SnagStatus; bar: string; dot: string }[] = [
  { key: "submitted", label: "To quote", hint: "Sent in by the owner", statuses: ["submitted"], drop: "submitted", bar: "bg-slate-400", dot: "bg-slate-400" },
  { key: "quoted", label: "Quoted", hint: "Owner deciding", statuses: ["quoted"], drop: "quoted", bar: "bg-indigo-500", dot: "bg-indigo-500" },
  { key: "accepted", label: "To assign", hint: "Accepted, nobody on it", statuses: ["accepted"], drop: "accepted", bar: "bg-blue-500", dot: "bg-blue-500" },
  { key: "assigned", label: "Assigned", hint: "Waiting to start", statuses: ["assigned", "reopened"], drop: "assigned", bar: "bg-sky-500", dot: "bg-sky-500" },
  { key: "in_progress", label: "In progress", hint: "Being fixed", statuses: ["in_progress"], drop: "in_progress", bar: "bg-amber-500", dot: "bg-amber-500" },
  { key: "fixed", label: "Awaiting owner", hint: "Marked fixed", statuses: ["fixed"], drop: "fixed", bar: "bg-teal-500", dot: "bg-teal-500" },
  { key: "verified", label: "Verified", hint: "Owner confirmed", statuses: ["verified"], drop: "verified", bar: "bg-emerald-600", dot: "bg-emerald-600" },
];

const SEV_STRIPE: Record<string, string> = {
  safety: "before:bg-sev-safety",
  major: "before:bg-sev-major",
  minor: "before:bg-sev-minor",
  cosmetic: "before:bg-sev-cosmetic",
};

const CARD_LIMIT = 6;

/* ---------------------------------------------------------------- */
/* Quick views (the cards along the top). Exactly one is active.     */
/* ---------------------------------------------------------------- */

type Stage = "all" | "open" | "unassigned" | "overdue" | "awaiting";

const STAGES: { key: Stage; label: string; hint: string; icon: typeof Hammer; match: (s: Snag) => boolean }[] = [
  { key: "all", label: "All snags", hint: "Every stage", icon: Layers, match: () => true },
  { key: "open", label: "Open jobs", hint: "Assigned, in progress or reopened", icon: Hammer, match: (s) => OPEN_WORK.includes(s.status) },
  { key: "unassigned", label: "To assign", hint: "Accepted, nobody on it", icon: UserX, match: (s) => s.status === "accepted" && !s.assigneeId },
  { key: "overdue", label: "Overdue", hint: "Past the target date", icon: AlertTriangle, match: (s) => isOverdue(s) },
  { key: "awaiting", label: "Awaiting owner", hint: "Marked fixed, owner to check", icon: CheckCheck, match: (s) => s.status === "fixed" },
];

interface Filters {
  stage: Stage;
  q: string;
  propertyId: string;
  severity: string;
  trade: string;
  assigneeId: string;
  showDeclined: boolean;
}
const DEFAULTS: Filters = { stage: "all", q: "", propertyId: "all", severity: "all", trade: "all", assigneeId: "all", showDeclined: false };

type SortKey = "ref" | "title" | "home" | "severity" | "trade" | "assignee" | "status" | "due";

export default function SnagBoardPage() {
  const state = useStore();
  const { setSnagStatus, assignSnags, autoAssign, setDueDate } = state;
  const [view, setView] = useState<"board" | "table">("board");
  const [f, setF] = useState<Filters>(DEFAULTS);
  const [drawer, setDrawer] = useState<DrawerView | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "severity", dir: 1 });
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600);
  };
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((x) => ({ ...x, [k]: v }));

  /* ---------- Lookups ---------- */
  const propertyById = useMemo(() => new Map(state.properties.map((p) => [p.id, p])), [state.properties]);
  const roomById = useMemo(() => new Map(state.rooms.map((r) => [r.id, r])), [state.rooms]);
  const userById = useMemo(() => new Map(state.users.map((u) => [u.id, u])), [state.users]);

  /* ---------- Filtering ---------- */
  const visible = state.snags.filter((s) => s.status !== "ai_draft" && (f.showDeclined || s.status !== "declined"));
  const term = f.q.trim().toLowerCase();
  // Everything except the quick view, so the quick-view counts react to the other filters.
  const base = visible.filter((s) => {
    if (f.propertyId !== "all" && s.propertyId !== f.propertyId) return false;
    if (f.severity !== "all" && s.severity !== f.severity) return false;
    if (f.trade !== "all" && s.trade !== f.trade) return false;
    if (f.assigneeId === "unassigned" ? !!s.assigneeId : f.assigneeId !== "all" && s.assigneeId !== f.assigneeId) return false;
    if (term) {
      const p = propertyById.get(s.propertyId);
      const hay = [s.ref, s.title, s.category, s.locationInRoom, p?.addressLine1, p?.town, userById.get(s.assigneeId ?? "")?.name];
      if (!hay.some((v) => v?.toLowerCase().includes(term))) return false;
    }
    return true;
  });
  const stage = STAGES.find((x) => x.key === f.stage)!;
  const filtered = base.filter(stage.match);

  /* ---------- Active filter chips ---------- */
  const chips: { label: string; clear: () => void }[] = [];
  if (f.stage !== "all") chips.push({ label: stage.label, clear: () => set("stage", "all") });
  if (f.q.trim()) chips.push({ label: `“${f.q.trim()}”`, clear: () => set("q", "") });
  if (f.propertyId !== "all") chips.push({ label: propertyById.get(f.propertyId)?.addressLine1 ?? "Home", clear: () => set("propertyId", "all") });
  if (f.severity !== "all") chips.push({ label: SEVERITY_META[f.severity as keyof typeof SEVERITY_META].label, clear: () => set("severity", "all") });
  if (f.trade !== "all") chips.push({ label: TRADE_LABEL[f.trade as keyof typeof TRADE_LABEL], clear: () => set("trade", "all") });
  if (f.assigneeId !== "all")
    chips.push({ label: f.assigneeId === "unassigned" ? "Unassigned" : userById.get(f.assigneeId)?.name ?? "Person", clear: () => set("assigneeId", "all") });
  if (f.showDeclined) chips.push({ label: "Including declined", clear: () => set("showDeclined", false) });

  /* ---------- Options ---------- */
  const usedTrades = useMemo(() => [...new Set(state.snags.map((s) => s.trade))].sort(), [state.snags]);
  const homeOptions: DropdownOption[] = [
    { value: "all", label: "All homes", leading: <Home className="size-4 text-muted" /> },
    ...state.properties.map((p) => ({ value: p.id, label: `${p.addressLine1}, ${p.town}`, hint: userById.get(p.ownerId)?.name })),
  ];
  const severityOptions: DropdownOption[] = [
    { value: "all", label: "All severities", leading: <Dot className="bg-line-strong" /> },
    ...SEVERITIES.map((s) => ({ value: s, label: SEVERITY_META[s].label, leading: <Dot className={SEVERITY_META[s].dot} /> })),
  ];
  const tradeOptions: DropdownOption[] = [
    { value: "all", label: "All trades", leading: <Wrench className="size-4 text-muted" /> },
    ...usedTrades.map((t) => ({ value: t, label: TRADE_LABEL[t] })),
  ];
  const teamOptions = useAssigneeOptions();
  const assigneeFilterOptions: DropdownOption[] = [
    { value: "all", label: "Anyone", leading: <Users className="size-4 text-muted" /> },
    ...teamOptions.map((o) => (o.value === "" ? { ...o, value: "unassigned" } : o)),
  ];
  const statusOptions = useStatusOptions();

  /* ---------- Board move ---------- */
  const moveTo = (snagId: string, col: (typeof COLUMNS)[number]) => {
    const s = state.snags.find((x) => x.id === snagId);
    if (!s || col.statuses.includes(s.status)) return;
    if (col.drop === "assigned" && !s.assigneeId) {
      autoAssign([s.id]);
      setSnagStatus([s.id], "assigned");
    } else if (col.drop === "accepted") {
      if (s.assigneeId) assignSnags([s.id], null); // "To assign" means nobody owns it yet
      setSnagStatus([s.id], "accepted");
    } else {
      setSnagStatus([s.id], col.drop);
    }
    flash(`${s.ref} moved to ${col.label}`);
  };

  /* ---------- Sorting (table) ---------- */
  const sevRank = (s: Snag) => SEVERITIES.indexOf(s.severity);
  const statusRank = (s: Snag) => COLUMNS.findIndex((c) => c.statuses.includes(s.status));
  const sorted = [...filtered].sort((a, b) => {
    const k = sort.key;
    const val = (s: Snag): string | number =>
      k === "ref" ? s.ref
      : k === "title" ? s.title
      : k === "home" ? propertyById.get(s.propertyId)?.addressLine1 ?? ""
      : k === "severity" ? sevRank(s)
      : k === "trade" ? TRADE_LABEL[s.trade]
      : k === "assignee" ? userById.get(s.assigneeId ?? "")?.name ?? "~"
      : k === "status" ? statusRank(s)
      : s.dueDate ?? "9999";
    const va = val(a);
    const vb = val(b);
    return (typeof va === "number" ? va - (vb as number) : va.localeCompare(vb as string)) * sort.dir;
  });
  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));

  /* ---------- Selection (table) ---------- */
  const allSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map((s) => s.id)));
  const toggleOne = (id: string) =>
    setSelected((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const selIds = [...selected];

  /* ---------- Export ---------- */
  const exportCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const head = ["Ref", "Title", "Home", "Town", "Room", "Category", "Severity", "Trade", "Assigned to", "Status", "Due", "Price ex VAT"];
    const rows = sorted.map((s) => {
      const p = propertyById.get(s.propertyId);
      return [
        s.ref, s.title, p?.addressLine1 ?? "", p?.town ?? "", roomById.get(s.roomId)?.name ?? "", s.category,
        SEVERITY_META[s.severity].label, TRADE_LABEL[s.trade], userById.get(s.assigneeId ?? "")?.name ?? "",
        STATUS_META[s.status].label, s.dueDate ? formatDate(s.dueDate) : "", s.price != null ? s.price.toFixed(2) : "",
      ].map(String).map(esc).join(",");
    });
    const blob = new Blob([[head.map(esc).join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `snags-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    flash(`Exported ${rows.length} snags`);
  };

  // While a quick view or search is narrowing things down, hide empty columns.
  const narrowing = f.stage !== "all" || chips.length > 0;
  const columns = COLUMNS.map((col) => ({
    col,
    items: filtered.filter((s) => col.statuses.includes(s.status)).sort((a, b) => sevRank(a) - sevRank(b)),
  })).filter(({ items }) => !narrowing || dragging || items.length > 0);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Snag board"
        description="Every snag across every home, from first report to verified fix."
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv}>
              <Download className="size-4" /> <span className="hidden sm:inline">Export CSV</span>
            </Button>
            <div className="flex rounded-xl border border-line-strong bg-surface p-0.5" role="group" aria-label="View">
              {(
                [
                  ["board", "Board", Columns3],
                  ["table", "Table", Rows3],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  aria-pressed={view === key}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-medium transition-colors",
                    view === key ? "bg-ink text-white" : "text-ink-2 hover:bg-sunken",
                  )}
                >
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>
          </>
        }
      />

      {/* ---------------- Quick views ---------------- */}
      <div className="-mx-4 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0" role="tablist" aria-label="Quick views">
        <div className="grid min-w-[760px] grid-cols-5 gap-2.5">
          {STAGES.map((st) => {
            const count = base.filter(st.match).length;
            const active = f.stage === st.key;
            const warn = st.key === "overdue" && count > 0;
            const showAuto = st.key === "unassigned" && count > 0;
            return (
              <div
                key={st.key}
                className={cn(
                  "relative rounded-2xl border p-3.5 transition-all",
                  active ? "border-night bg-night text-white shadow-lift" : "border-line bg-surface shadow-card hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift",
                )}
              >
                <button
                  role="tab"
                  aria-selected={active}
                  onClick={() => set("stage", active && st.key !== "all" ? "all" : st.key)}
                  className="absolute inset-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                >
                  <span className="sr-only">Show {st.label}</span>
                </button>
                <div className="pointer-events-none relative flex items-center gap-2">
                  <st.icon className={cn("size-4", active ? "text-highlight" : warn ? "text-sev-major" : "text-faint")} />
                  <span className={cn("text-[12.5px] font-medium", active ? "text-white/75" : "text-muted")}>{st.label}</span>
                  {active && (
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-highlight px-1.5 py-px text-[10.5px] font-bold text-night">
                      <Check className="size-3" strokeWidth={3} /> Showing
                    </span>
                  )}
                </div>
                <div className="pointer-events-none relative mt-2 flex items-end justify-between gap-2">
                  <p className={cn("text-[26px] leading-none font-semibold tracking-tight tabular", !active && warn && "text-sev-major")}>{count}</p>
                  {showAuto && (
                    <button
                      onClick={() => {
                        const ids = base.filter(st.match).map((s) => s.id);
                        const n = autoAssign(ids);
                        flash(`Auto-assigned ${n} ${n === 1 ? "job" : "jobs"} by trade`);
                      }}
                      className={cn(
                        "pointer-events-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-medium",
                        active ? "bg-highlight text-night hover:bg-[#cbe55c]" : "bg-brand-600 text-white hover:bg-brand-700",
                      )}
                    >
                      <Wand2 className="size-3" /> Auto-assign
                    </button>
                  )}
                </div>
                <p className={cn("pointer-events-none relative mt-1.5 truncate text-[11.5px]", active ? "text-white/50" : "text-faint")}>{st.hint}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------- Filter bar (sticky) ---------------- */}
      <div className="sticky top-14 z-20 -mx-4 mt-4 bg-canvas/90 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="rounded-2xl border border-line bg-surface p-2 shadow-card">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
              <input
                value={f.q}
                onChange={(e) => set("q", e.target.value)}
                placeholder="Search ref, snag, address or person"
                aria-label="Search snags"
                className="h-10 w-full rounded-xl border border-transparent bg-canvas pr-9 pl-10 text-[14px] outline-none placeholder:text-faint focus:border-brand-500 focus:bg-surface focus:ring-2 focus:ring-brand-500/15"
              />
              {f.q && (
                <button onClick={() => set("q", "")} className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-faint hover:text-ink" aria-label="Clear search">
                  <X className="size-4" />
                </button>
              )}
            </div>
            <Dropdown label="Home" value={f.propertyId} onChange={(v) => set("propertyId", v)} options={homeOptions} highlightWhenSet menuWidth={300} className="w-[calc(50%-4px)] sm:w-[170px]" />
            <Dropdown label="Severity" value={f.severity} onChange={(v) => set("severity", v)} options={severityOptions} highlightWhenSet className="w-[calc(50%-4px)] sm:w-[150px]" />
            <Dropdown label="Trade" value={f.trade} onChange={(v) => set("trade", v)} options={tradeOptions} highlightWhenSet className="w-[calc(50%-4px)] sm:w-[150px]" />
            <Dropdown label="Assigned to" value={f.assigneeId} onChange={(v) => set("assigneeId", v)} options={assigneeFilterOptions} highlightWhenSet menuWidth={260} align="right" className="w-[calc(50%-4px)] sm:w-[150px]" />
            <button
              onClick={() => set("showDeclined", !f.showDeclined)}
              aria-pressed={f.showDeclined}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-medium transition-colors",
                f.showDeclined ? "border-brand-300 bg-brand-50 text-brand-800" : "border-line-strong bg-surface text-ink-2 hover:bg-canvas",
              )}
            >
              {f.showDeclined && <Check className="size-3.5" />} Declined
            </button>
          </div>

          {/* What's being shown */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-line px-1 pt-2">
            <span className="mr-1 text-[12.5px] text-muted">
              Showing <b className="font-semibold text-ink tabular">{filtered.length}</b> of {visible.length}
            </span>
            {chips.length === 0 ? (
              <span className="text-[12.5px] text-faint">· all snags, no filters</span>
            ) : (
              <>
                {chips.map((c) => (
                  <span key={c.label} className="inline-flex h-7 items-center gap-1 rounded-full border border-brand-200 bg-brand-50 pr-1 pl-2.5 text-[12px] font-medium text-brand-800">
                    {c.label}
                    <button onClick={c.clear} className="rounded-full p-0.5 hover:bg-brand-100" aria-label={`Remove filter ${c.label}`}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <button onClick={() => setF(DEFAULTS)} className="ml-1 text-[12.5px] font-medium text-brand-700 hover:underline">
                  Clear all
                </button>
              </>
            )}
            {view === "board" && <span className="ml-auto hidden text-[12px] text-faint md:inline">Drag a card to another column to change its status</span>}
          </div>
        </div>
      </div>

      {/* ---------------- Board ---------------- */}
      {view === "board" &&
        (columns.length === 0 ? (
          <EmptyResult onClear={() => setF(DEFAULTS)} />
        ) : (
          <div className="relative mt-3">
            <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <div className="flex gap-3">
                {columns.map(({ col, items }) => {
                  const isOpen = expanded.has(col.key);
                  const shown = isOpen ? items : items.slice(0, CARD_LIMIT);
                  const over = dragOver === col.key;
                  return (
                    <section
                      key={col.key}
                      aria-label={`${col.label} column`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(col.key);
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver((c) => (c === col.key ? null : c));
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(null);
                        setDragging(false);
                        const id = e.dataTransfer.getData("text/snag");
                        if (id) moveTo(id, col);
                      }}
                      className={cn(
                        "flex w-[288px] shrink-0 flex-col overflow-hidden rounded-2xl border transition-colors",
                        over ? "border-brand-400 bg-brand-50/80 ring-2 ring-brand-500/20" : "border-line bg-[#efede6]",
                      )}
                    >
                      <div className={cn("h-1", col.bar)} />
                      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
                        <h2 className="text-[13.5px] font-semibold">{col.label}</h2>
                        <span className="rounded-md bg-surface px-1.5 py-px text-[11.5px] font-semibold text-ink-2 tabular shadow-card">{items.length}</span>
                      </header>
                      <p className="-mt-1 px-3 pb-2.5 text-[11.5px] text-muted">{col.hint}</p>
                      <div className="flex min-h-28 flex-1 flex-col gap-2 px-2 pb-2">
                        {shown.map((s) => (
                          <BoardCard
                            key={s.id}
                            snag={s}
                            home={propertyById.get(s.propertyId)?.addressLine1}
                            room={roomById.get(s.roomId)?.name}
                            assignee={userById.get(s.assigneeId ?? "")}
                            onOpen={() => setDrawer({ kind: "snag", id: s.id })}
                            onDragState={setDragging}
                          />
                        ))}
                        {items.length === 0 && (
                          <div className={cn("flex flex-1 items-center justify-center rounded-xl border border-dashed px-3 py-8 text-center text-[12px]", over ? "border-brand-400 text-brand-700" : "border-line-strong text-faint")}>
                            {over ? "Drop to move here" : "Nothing here"}
                          </div>
                        )}
                        {items.length > CARD_LIMIT && (
                          <button
                            onClick={() =>
                              setExpanded((cur) => {
                                const n = new Set(cur);
                                if (n.has(col.key)) n.delete(col.key);
                                else n.add(col.key);
                                return n;
                              })
                            }
                            className="rounded-xl py-2 text-[12.5px] font-medium text-brand-700 hover:bg-surface"
                          >
                            {isOpen ? "Show fewer" : `Show ${items.length - CARD_LIMIT} more`}
                          </button>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
            {/* Fade hinting that the board scrolls sideways */}
            <div className="pointer-events-none absolute top-0 right-[-2rem] bottom-4 hidden w-16 bg-gradient-to-l from-canvas to-transparent lg:block" />
          </div>
        ))}

      {/* ---------------- Table ---------------- */}
      {view === "table" && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          <div className="hidden grid-cols-[36px_88px_minmax(0,2fr)_minmax(0,1.3fr)_100px_minmax(0,1fr)_minmax(0,1.2fr)_120px_96px] items-center gap-3 border-b border-line bg-canvas px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted lg:grid">
            <Checkbox checked={allSelected} indeterminate={!allSelected && selected.size > 0} onChange={toggleAll} label="Select all" />
            <SortHead k="ref" sort={sort} onSort={toggleSort}>Ref</SortHead>
            <SortHead k="title" sort={sort} onSort={toggleSort}>Snag</SortHead>
            <SortHead k="home" sort={sort} onSort={toggleSort}>Home</SortHead>
            <SortHead k="severity" sort={sort} onSort={toggleSort}>Severity</SortHead>
            <SortHead k="trade" sort={sort} onSort={toggleSort}>Trade</SortHead>
            <SortHead k="assignee" sort={sort} onSort={toggleSort}>Assigned</SortHead>
            <SortHead k="status" sort={sort} onSort={toggleSort}>Status</SortHead>
            <SortHead k="due" sort={sort} onSort={toggleSort}>Due</SortHead>
          </div>
          <Paginated
            key={`${JSON.stringify(f)}|${sort.key}${sort.dir}`}
            items={sorted}
            pageSize={10}
            className="divide-y divide-line"
            empty={<EmptyResult onClear={() => setF(DEFAULTS)} flat />}
            render={(s) => {
              const p = propertyById.get(s.propertyId);
              const a = userById.get(s.assigneeId ?? "");
              const late = isOverdue(s);
              const isSel = selected.has(s.id);
              return (
                <div
                  key={s.id}
                  className={cn(
                    "grid cursor-pointer grid-cols-[36px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-canvas lg:grid-cols-[36px_88px_minmax(0,2fr)_minmax(0,1.3fr)_100px_minmax(0,1fr)_minmax(0,1.2fr)_120px_96px]",
                    isSel && "bg-brand-50/60 hover:bg-brand-50",
                  )}
                  onClick={() => setDrawer({ kind: "snag", id: s.id })}
                >
                  <span onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={isSel} onChange={() => toggleOne(s.id)} label={`Select ${s.ref}`} />
                  </span>
                  <div className="min-w-0 lg:hidden">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <RefTag>{s.ref}</RefTag>
                      <SeverityBadge severity={s.severity} />
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="mt-1 truncate text-[13.5px] font-medium">{s.title}</p>
                    <p className="truncate text-[12px] text-muted">{p?.addressLine1} · {a?.name ?? "Unassigned"}{late ? " · overdue" : ""}</p>
                  </div>
                  <span className="hidden lg:block"><RefTag>{s.ref}</RefTag></span>
                  <div className="hidden min-w-0 lg:block">
                    <p className="truncate text-[13.5px] font-medium">{s.title}</p>
                    <p className="truncate text-[12px] text-muted">{roomById.get(s.roomId)?.name}</p>
                  </div>
                  <p className="hidden truncate text-[13px] text-ink-2 lg:block">{p?.addressLine1}, {p?.town}</p>
                  <span className="hidden lg:block"><SeverityBadge severity={s.severity} /></span>
                  <p className="hidden truncate text-[13px] text-ink-2 lg:block">{TRADE_LABEL[s.trade]}</p>
                  <div className="hidden min-w-0 items-center gap-2 lg:flex">
                    {a ? (
                      <>
                        <Avatar user={a} size={22} />
                        <span className="truncate text-[13px]">{a.name}</span>
                      </>
                    ) : (
                      <span className="text-[12.5px] text-faint">Unassigned</span>
                    )}
                  </div>
                  <span className="hidden lg:block"><StatusBadge status={s.status} /></span>
                  <span className={cn("hidden text-[12.5px] tabular lg:block", late ? "font-semibold text-sev-major" : "text-muted")}>
                    {s.dueDate ? formatDate(s.dueDate) : "–"}
                  </span>
                </div>
              );
            }}
          />
        </div>
      )}

      {/* ---------------- Bulk actions ---------------- */}
      {view === "table" && selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 lg:pl-64">
          <div className="flex w-full max-w-4xl flex-wrap items-center gap-2 rounded-2xl bg-night px-3 py-2.5 text-white shadow-2xl animate-fade-up">
            <span className="px-1.5 text-[13px] font-semibold tabular">{selected.size} selected</span>
            <span className="h-5 w-px bg-white/15" />
            <Dropdown
              dark
              placement="top"
              label="Assign to"
              value="__"
              onChange={(v) => {
                if (v === "__") return;
                assignSnags(selIds, v || null);
                flash(`${selIds.length} ${selIds.length === 1 ? "snag" : "snags"} ${v ? `assigned to ${userById.get(v)?.name}` : "unassigned"}`);
              }}
              options={[{ value: "__", label: "Assign to…" }, ...teamOptions]}
              menuWidth={260}
              size="sm"
              className="w-[150px]"
            />
            <Dropdown
              dark
              placement="top"
              label="Set status"
              value="__"
              onChange={(v) => {
                if (v === "__") return;
                setSnagStatus(selIds, v as SnagStatus);
                flash(`${selIds.length} moved to ${STATUS_META[v as SnagStatus].label}`);
              }}
              options={[{ value: "__", label: "Set status…" }, ...statusOptions]}
              menuWidth={220}
              size="sm"
              className="w-[140px]"
            />
            <button
              onClick={() => {
                const n = autoAssign(selIds);
                flash(n ? `Auto-assigned ${n} by trade` : "Selected snags already have someone assigned");
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] px-3 text-[13px] font-medium hover:bg-white/[0.12]"
            >
              <Wand2 className="size-4" /> Auto-assign
            </button>
            <div className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] pr-1 pl-3 text-[13px] font-medium">
              <CalendarClock className="size-4 text-white/60" /> Due
              <DatePicker
                dark
                size="sm"
                clearable={false}
                label="Set target date"
                placeholder="Pick date"
                value=""
                className="w-[150px]"
                onChange={(v) => {
                  if (!v) return;
                  setDueDate(selIds, new Date(v + "T12:00:00").toISOString());
                  flash(`Target date set for ${selIds.length}`);
                }}
              />
            </div>
            <button onClick={() => setSelected(new Set())} className="ml-auto inline-flex h-9 items-center gap-1 rounded-xl px-2.5 text-[13px] text-white/70 hover:bg-white/10 hover:text-white">
              <X className="size-4" /> Clear
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className={cn(
            "fixed left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-[13px] font-medium text-white shadow-lift animate-fade-up lg:ml-32",
            view === "table" && selected.size ? "bottom-24" : "bottom-6",
          )}
        >
          <Check className="size-4 text-highlight" /> {toast}
        </div>
      )}

      <DashboardDrawer view={drawer} onClose={() => setDrawer(null)} openDrawer={setDrawer} />
    </div>
  );
}

/* ---------------------------------------------------------------- */

function BoardCard({
  snag,
  home,
  room,
  assignee,
  onOpen,
  onDragState,
}: {
  snag: Snag;
  home?: string;
  room?: string;
  assignee?: ReturnType<typeof useStore.getState>["users"][number];
  onOpen: () => void;
  onDragState: (dragging: boolean) => void;
}) {
  const late = isOverdue(snag);
  return (
    <button
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/snag", snag.id);
        e.dataTransfer.effectAllowed = "move";
        onDragState(true);
      }}
      onDragEnd={() => onDragState(false)}
      onClick={onOpen}
      className={cn(
        "group relative w-full cursor-grab overflow-hidden rounded-xl border border-line bg-surface py-2.5 pr-2.5 pl-3.5 text-left shadow-card transition-all hover:-translate-y-px hover:shadow-lift active:cursor-grabbing",
        "before:absolute before:inset-y-0 before:left-0 before:w-1",
        SEV_STRIPE[snag.severity],
      )}
    >
      <div className="flex gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <RefTag>{snag.ref}</RefTag>
            <SeverityBadge severity={snag.severity} />
          </div>
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug font-medium">{snag.title}</p>
          <p className="mt-1 truncate text-[11.5px] text-muted">{home} · {room}</p>
        </div>
        <SnagPhoto snag={snag} className="size-12 shrink-0" rounded="rounded-lg" showBox={false} />
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        {assignee ? (
          <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-ink-2">
            <Avatar user={assignee} size={18} /> <span className="truncate">{assignee.name.split(" ")[0]}</span>
          </span>
        ) : (
          <span className="rounded-full border border-dashed border-line-strong px-1.5 text-[11px] text-faint">Unassigned</span>
        )}
        {snag.status === "reopened" && <span className="rounded-full bg-rose-50 px-1.5 text-[10.5px] font-medium text-rose-700">Reopened</span>}
        {snag.dueDate && (
          <span
            className={cn(
              "ml-auto flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] tabular",
              late ? "bg-orange-50 font-semibold text-sev-major" : "text-muted",
            )}
          >
            <CalendarClock className="size-3" /> {late ? "Overdue" : formatDate(snag.dueDate).replace(/ \d{4}$/, "")}
          </span>
        )}
      </div>
    </button>
  );
}

function EmptyResult({ onClear, flat }: { onClear: () => void; flat?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", !flat && "mt-3 rounded-2xl border border-dashed border-line-strong bg-blueprint")}>
      <span className="flex size-11 items-center justify-center rounded-xl border border-line bg-surface text-muted">
        <Search className="size-5" />
      </span>
      <p className="mt-3 font-medium">No snags match</p>
      <p className="mt-1 text-[13px] text-muted">Try a different quick view or remove a filter.</p>
      <button onClick={onClear} className="mt-4 text-[13px] font-medium text-brand-700 hover:underline">Clear all filters</button>
    </div>
  );
}

function Checkbox({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate?: boolean; onChange: () => void; label: string }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = !!indeterminate;
      }}
      onChange={onChange}
      aria-label={label}
      className="size-4 cursor-pointer rounded accent-brand-600"
    />
  );
}

function SortHead({
  k,
  sort,
  onSort,
  children,
}: {
  k: SortKey;
  sort: { key: SortKey; dir: 1 | -1 };
  onSort: (k: SortKey) => void;
  children: React.ReactNode;
}) {
  const active = sort.key === k;
  return (
    <button onClick={() => onSort(k)} className={cn("flex items-center gap-1 text-left uppercase hover:text-ink", active && "text-ink")}>
      {children}
      {active && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
    </button>
  );
}

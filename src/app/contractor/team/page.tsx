"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, ChevronRight, Mail, Phone, Search, UserPlus, Users, Wrench, X } from "lucide-react";
import { PageHeader } from "@/components/shell/contractor-shell";
import { AddMemberModal } from "@/components/contractor/add-member-modal";
import { DashboardDrawer, DashboardModal, type DrawerView, type ModalView } from "@/components/contractor/dashboard-overlays";
import { Avatar, Button, Card, Progress } from "@/components/ui/primitives";
import { Paginated } from "@/components/ui/pagination";
import { Dropdown } from "@/components/ui/dropdown";
import { useStore } from "@/lib/data/store";
import { isOverdue } from "@/lib/data/queries";
import { OPEN_WORK, TRADE_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LOADS = [
  { key: "all", label: "Everyone" },
  { key: "busy", label: "Has open jobs" },
  { key: "free", label: "Free" },
  { key: "overdue", label: "Has overdue" },
] as const;
type Load = (typeof LOADS)[number]["key"];
type Sort = "open" | "name" | "verified";

export default function TeamPage() {
  const users = useStore((s) => s.users);
  const snags = useStore((s) => s.snags);
  const [addOpen, setAddOpen] = useState(false);
  const [modal, setModal] = useState<ModalView | null>(null);
  const [drawer, setDrawer] = useState<DrawerView | null>(null);
  const [q, setQ] = useState("");
  const [trade, setTrade] = useState("all");
  const [load, setLoad] = useState<Load>("all");
  const [sort, setSort] = useState<Sort>("open");

  const rows = useMemo(
    () =>
      users
        .filter((u) => u.role === "team")
        .map((m) => {
          const mine = snags.filter((s) => s.assigneeId === m.id);
          const open = mine.filter((s) => OPEN_WORK.includes(s.status));
          return {
            m,
            open: open.length,
            overdue: open.filter((s) => isOverdue(s)).length,
            fixed: mine.filter((s) => s.status === "fixed").length,
            verified: mine.filter((s) => s.status === "verified").length,
          };
        }),
    [users, snags],
  );
  const trades = useMemo(() => [...new Set(rows.map((r) => r.m.trade!))].sort(), [rows]);
  const maxOpen = Math.max(4, ...rows.map((r) => r.open));

  const term = q.trim().toLowerCase();
  const base = rows.filter(
    (r) =>
      (trade === "all" || r.m.trade === trade) &&
      (!term || [r.m.name, r.m.email, r.m.phone ?? "", TRADE_LABEL[r.m.trade!]].some((v) => v.toLowerCase().includes(term))),
  );
  const matchLoad = (r: (typeof rows)[number], l: Load) =>
    l === "all" || (l === "busy" ? r.open > 0 : l === "free" ? r.open === 0 : r.overdue > 0);
  const list = base
    .filter((r) => matchLoad(r, load))
    .sort((a, b) => (sort === "name" ? a.m.name.localeCompare(b.m.name) : sort === "verified" ? b.verified - a.verified : b.open - a.open));

  const filtersOn = !!term || trade !== "all" || load !== "all";
  const totalOpen = rows.reduce((a, r) => a + r.open, 0);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Team"
        description={`${rows.length} tradespeople · ${totalOpen} open jobs between them. Snags auto-assign to the matching trade; click anyone to see or assign their work.`}
        actions={<Button onClick={() => setAddOpen(true)}><UserPlus className="size-4" /> Add member</Button>}
      />

      {/* Toolbar */}
      <div className="rounded-2xl border border-line bg-surface p-2 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, trade, email or phone"
              aria-label="Search team"
              className="h-10 w-full rounded-xl border border-transparent bg-canvas pr-9 pl-10 text-[14px] outline-none placeholder:text-faint focus:border-brand-500 focus:bg-surface focus:ring-2 focus:ring-brand-500/15"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-faint hover:text-ink" aria-label="Clear search">
                <X className="size-4" />
              </button>
            )}
          </div>
          <Dropdown
            label="Trade"
            value={trade}
            onChange={setTrade}
            highlightWhenSet
            icon={<Wrench className="size-4" />}
            className="w-[calc(50%-4px)] sm:w-[180px]"
            menuWidth={220}
            options={[{ value: "all", label: "All trades" }, ...trades.map((t) => ({ value: t, label: TRADE_LABEL[t] }))]}
          />
          <Dropdown
            label="Sort by"
            value={sort}
            onChange={(v) => setSort(v as Sort)}
            icon={<ArrowUpDown className="size-3.5" />}
            align="right"
            menuWidth={200}
            className="w-[calc(50%-4px)] sm:w-[170px]"
            options={[
              { value: "open", label: "Most open jobs" },
              { value: "verified", label: "Most verified" },
              { value: "name", label: "Name A–Z" },
            ]}
          />
        </div>
        <div className="mt-2 flex gap-1 overflow-x-auto border-t border-line px-0.5 pt-2 scrollbar-none" role="tablist" aria-label="Workload">
          {LOADS.map((l) => {
            const active = load === l.key;
            const n = base.filter((r) => matchLoad(r, l.key)).length;
            return (
              <button
                key={l.key}
                role="tab"
                aria-selected={active}
                onClick={() => setLoad(l.key)}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium transition-colors",
                  active ? "bg-ink text-white" : "text-ink-2 hover:bg-sunken",
                )}
              >
                {l.label}
                <span className={cn("rounded px-1 text-[11px] tabular", active ? "bg-white/15" : "bg-sunken text-muted")}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 mb-4 flex items-center gap-2 text-[12.5px] text-muted">
        Showing <b className="font-semibold text-ink tabular">{list.length}</b> of {rows.length} members
        {filtersOn && (
          <button onClick={() => { setQ(""); setTrade("all"); setLoad("all"); }} className="font-medium text-brand-700 hover:underline">
            Clear filters
          </button>
        )}
      </div>

      <Paginated
        key={`${term}|${trade}|${load}|${sort}`}
        items={list}
        pageSize={6}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        empty={
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-blueprint px-6 py-16 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl border border-line bg-surface text-muted"><Users className="size-5" /></span>
            <p className="mt-3 font-medium">Nobody matches</p>
            <p className="mt-1 text-[13px] text-muted">Try another trade or clear the search.</p>
          </div>
        }
        render={({ m, open, overdue, fixed, verified }) => (
          <Card key={m.id} className="group transition-all hover:-translate-y-0.5 hover:shadow-lift">
            <button onClick={() => setModal({ kind: "member", id: m.id })} className="block w-full p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40" aria-label={`Open ${m.name}`}>
              <div className="flex items-center gap-3">
                <Avatar user={m} size={46} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold tracking-tight">{m.name}</p>
                  <p className="text-[13px] text-muted">{TRADE_LABEL[m.trade!]}</p>
                </div>
                {overdue > 0 ? (
                  <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-sev-major">{overdue} overdue</span>
                ) : (
                  <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", open ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
                    {open ? "Busy" : "Free"}
                  </span>
                )}
                <ChevronRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5" />
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-[12px]">
                  <span className="text-muted">Workload</span>
                  <span className="font-medium tabular">{open} open</span>
                </div>
                <Progress value={(open / maxOpen) * 100} className="h-1.5" />
              </div>

              <div className="mt-4 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-canvas py-3 text-center">
                {[
                  ["Open", open],
                  ["Awaiting check", fixed],
                  ["Verified", verified],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[18px] font-semibold tabular">{v}</p>
                    <p className="text-[11.5px] text-muted">{k}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1 text-[13px] text-ink-2">
                <p className="flex items-center gap-2 truncate"><Mail className="size-3.5 shrink-0 text-faint" /> {m.email}</p>
                {m.phone && <p className="flex items-center gap-2"><Phone className="size-3.5 shrink-0 text-faint" /> {m.phone}</p>}
              </div>
            </button>
          </Card>
        )}
      />

      <AddMemberModal open={addOpen} onClose={() => setAddOpen(false)} />
      <DashboardModal view={modal} onClose={() => setModal(null)} setView={setModal} openDrawer={setDrawer} />
      <DashboardDrawer view={drawer} onClose={() => setDrawer(null)} openDrawer={setDrawer} />
    </div>
  );
}

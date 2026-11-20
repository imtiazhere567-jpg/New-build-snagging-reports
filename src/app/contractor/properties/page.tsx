"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, CalendarDays, ChevronRight, Home, MapPin, Search, UserPlus, X } from "lucide-react";
import { InviteOwnerModal } from "@/components/contractor/invite-owner-modal";
import { DashboardDrawer, DashboardModal, type DrawerView, type ModalView } from "@/components/contractor/dashboard-overlays";
import { PageHeader } from "@/components/shell/contractor-shell";
import { StageTag } from "@/components/stage-tag";
import { Avatar, Button, Card, Progress } from "@/components/ui/primitives";
import { Paginated } from "@/components/ui/pagination";
import { Dropdown } from "@/components/ui/dropdown";
import { useStore } from "@/lib/data/store";
import { propertyProgress, propertyStage } from "@/lib/data/queries";
import { cn, formatDate } from "@/lib/utils";

const STAGES = ["All", "Waiting for snags", "New report", "Quote sent", "In progress", "Completed"] as const;
type Sort = "recent" | "address" | "progress" | "completion";

export default function PropertiesPage() {
  const state = useStore();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [modal, setModal] = useState<ModalView | null>(null);
  const [drawer, setDrawer] = useState<DrawerView | null>(null);
  const [stage, setStage] = useState<(typeof STAGES)[number]>("All");
  const [q, setQ] = useState("");
  const [town, setTown] = useState("all");
  const [sort, setSort] = useState<Sort>("recent");

  const rows = useMemo(
    () =>
      state.properties.map((p) => ({
        p,
        owner: state.users.find((u) => u.id === p.ownerId)!,
        stage: propertyStage(state, p.id) as string,
        prog: propertyProgress(state.snags.filter((s) => s.propertyId === p.id)),
      })),
    [state],
  );
  const towns = useMemo(() => [...new Set(state.properties.map((p) => p.town))].sort(), [state.properties]);

  const term = q.trim().toLowerCase();
  const base = rows.filter(
    (r) =>
      (town === "all" || r.p.town === town) &&
      (!term || [r.p.addressLine1, r.p.town, r.p.postcode, r.p.development, r.p.plot, r.owner.name, r.owner.email].some((v) => v.toLowerCase().includes(term))),
  );
  const list = base
    .filter((r) => stage === "All" || r.stage === stage)
    .sort((a, b) =>
      sort === "address" ? a.p.addressLine1.localeCompare(b.p.addressLine1)
      : sort === "progress" ? b.prog.percent - a.prog.percent
      : sort === "completion" ? b.p.completionDate.localeCompare(a.p.completionDate)
      : b.p.invitedAt.localeCompare(a.p.invitedAt),
    );

  const joined = rows.filter((r) => r.p.joinedAt).length;
  const filtersOn = stage !== "All" || term || town !== "all";

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Owners & homes"
        description={`${rows.length} homes under aftercare · ${joined} owners joined · ${rows.length - joined} invites pending`}
        actions={<Button onClick={() => setInviteOpen(true)}><UserPlus className="size-4" /> Invite home owner</Button>}
      />

      {/* Toolbar */}
      <div className="rounded-2xl border border-line bg-surface p-2 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search address, postcode, owner or email"
              aria-label="Search homes"
              className="h-10 w-full rounded-xl border border-transparent bg-canvas pr-9 pl-10 text-[14px] outline-none placeholder:text-faint focus:border-brand-500 focus:bg-surface focus:ring-2 focus:ring-brand-500/15"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-faint hover:text-ink" aria-label="Clear search">
                <X className="size-4" />
              </button>
            )}
          </div>
          <Dropdown
            label="Town"
            value={town}
            onChange={setTown}
            highlightWhenSet
            icon={<MapPin className="size-4" />}
            className="w-[calc(50%-4px)] sm:w-[160px]"
            options={[{ value: "all", label: "All towns" }, ...towns.map((t) => ({ value: t, label: t }))]}
          />
          <Dropdown
            label="Sort by"
            value={sort}
            onChange={(v) => setSort(v as Sort)}
            icon={<ArrowUpDown className="size-3.5" />}
            align="right"
            menuWidth={210}
            className="w-[calc(50%-4px)] sm:w-[170px]"
            options={[
              { value: "recent", label: "Recently invited" },
              { value: "completion", label: "Completion date" },
              { value: "progress", label: "Most progress" },
              { value: "address", label: "Address A–Z" },
            ]}
          />
        </div>
        <div className="mt-2 flex gap-1 overflow-x-auto border-t border-line px-0.5 pt-2 scrollbar-none" role="tablist" aria-label="Stage">
          {STAGES.map((s) => {
            const n = s === "All" ? base.length : base.filter((r) => r.stage === s).length;
            const active = stage === s;
            return (
              <button
                key={s}
                role="tab"
                aria-selected={active}
                onClick={() => setStage(s)}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium transition-colors",
                  active ? "bg-ink text-white" : "text-ink-2 hover:bg-sunken",
                )}
              >
                {s}
                <span className={cn("rounded px-1 text-[11px] tabular", active ? "bg-white/15" : "bg-sunken text-muted")}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 mb-4 flex items-center gap-2 text-[12.5px] text-muted">
        Showing <b className="font-semibold text-ink tabular">{list.length}</b> of {rows.length} homes
        {filtersOn && (
          <button onClick={() => { setStage("All"); setQ(""); setTown("all"); }} className="font-medium text-brand-700 hover:underline">
            Clear filters
          </button>
        )}
      </div>

      <Paginated
        key={`${stage}|${term}|${town}|${sort}`}
        items={list}
        pageSize={6}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        empty={
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-blueprint px-6 py-16 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl border border-line bg-surface text-muted"><Home className="size-5" /></span>
            <p className="mt-3 font-medium">No homes match</p>
            <p className="mt-1 text-[13px] text-muted">Try another stage or clear the search.</p>
          </div>
        }
        render={({ p, owner, stage: st, prog }) => (
          <Card key={p.id} className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lift">
            <button onClick={() => setModal({ kind: "home", id: p.id })} className="block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40" aria-label={`Open ${p.addressLine1}, ${p.town}`}>
              <div className="relative h-24" style={{ background: `linear-gradient(135deg, hsl(${p.coverHue} 35% 88%), hsl(${p.coverHue} 30% 76%))` }}>
                <svg viewBox="0 0 120 60" className="absolute right-4 bottom-0 h-20 text-white/70" fill="currentColor" aria-hidden>
                  <path d="M10 60V30L40 8l30 22v30H52V42H28v18z" />
                  <path d="M70 60V36l22-16 22 16v24z" opacity=".6" />
                </svg>
                <span className="absolute top-3 left-3"><StageTag stage={st} /></span>
                <span className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full bg-white/70 text-ink-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <ChevronRight className="size-4" />
                </span>
              </div>
              <div className="p-5">
                <p className="text-[12px] font-medium text-muted">{p.plot} · {p.development}</p>
                <p className="mt-0.5 text-[16px] font-semibold tracking-tight">{p.addressLine1}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted"><MapPin className="size-3.5" /> {p.town}, {p.postcode}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted"><CalendarDays className="size-3.5" /> Completed {formatDate(p.completionDate)}</p>
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-canvas p-3">
                  <Avatar user={owner} size={34} />
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium">{owner.name}</p>
                    <p className="truncate text-[12px] text-muted">{p.joinedAt ? owner.email : `Invited ${formatDate(p.invitedAt)} · not joined yet`}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-[12.5px]">
                    <span className="text-muted">Verified fixes</span>
                    <span className="font-medium tabular">{prog.total ? `${prog.verified}/${prog.total}` : "No snags yet"}</span>
                  </div>
                  <Progress value={prog.percent} />
                </div>
              </div>
            </button>
          </Card>
        )}
      />

      <InviteOwnerModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <DashboardModal view={modal} onClose={() => setModal(null)} setView={setModal} openDrawer={setDrawer} />
      <DashboardDrawer view={drawer} onClose={() => setDrawer(null)} openDrawer={setDrawer} />
    </div>
  );
}

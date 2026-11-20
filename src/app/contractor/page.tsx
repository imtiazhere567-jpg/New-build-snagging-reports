"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, ArrowUpRight, CheckCheck, ChevronRight, Clock, FileText, Hammer, PoundSterling, Sparkles, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/shell/contractor-shell";
import { StageTag } from "@/components/stage-tag";
import { Avatar, Button, Card, CardHeader, Progress, Ring, SeverityBadge } from "@/components/ui/primitives";
import { ActivityItem } from "@/components/contractor/shared";
import { InviteOwnerModal } from "@/components/contractor/invite-owner-modal";
import { DEFAULT_FILTERS, FilterBar, makeScope, type DashFilters, type SearchHit } from "@/components/contractor/dashboard-filters";
import { DashboardDrawer, DashboardModal, type DrawerView, type ModalView } from "@/components/contractor/dashboard-overlays";
import { useStore } from "@/lib/data/store";
import { isOverdue, propertyProgress, propertyStage, quoteTotals, userById } from "@/lib/data/queries";
import { OPEN_WORK, SEVERITIES, SEVERITY_META, TRADE_LABEL } from "@/lib/constants";
import { cn, formatGBP, timeAgo } from "@/lib/utils";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

const LinkBtn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} className="text-[13px] font-medium whitespace-nowrap text-brand-700 hover:underline">{children}</button>
);

export default function ContractorDashboard() {
  const state = useStore();
  const users = state.users;
  const me = users.find((u) => u.id === state.currentUserId)!;

  const [modal, setModal] = useState<ModalView | null>(null);
  const [drawer, setDrawer] = useState<DrawerView | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [filters, setFilters] = useState<DashFilters>(DEFAULT_FILTERS);

  // Everything below is computed from the filtered scope.
  const scope = makeScope(filters);
  const snagLevel = filters.severity !== "all" || filters.trade !== "all" || filters.assigneeId !== "all";
  const snagScope = makeScope({ ...filters, period: "all" });
  const snags = state.snags.filter(scope.snag);
  const reports = state.reports.filter(
    (r) => scope.property(r.propertyId) && scope.inPeriod(r.submittedAt ?? r.createdAt) && (!snagLevel || state.snags.some((s) => s.reportId === r.id && snagScope.snag(s))),
  );
  const properties = state.properties.filter((p) => scope.property(p.id) && (!snagLevel || state.snags.some((s) => s.propertyId === p.id && snagScope.snag(s))));
  const payments = state.payments.filter((p) => scope.property(p.propertyId) && scope.inPeriod(p.paidAt));
  const quotes = state.quotes.filter((q) => scope.property(q.propertyId));
  const updates = state.updates.filter((u) => {
    const s = state.snags.find((x) => x.id === u.snagId);
    return scope.property(u.propertyId) && scope.inPeriod(u.createdAt) && (!snagLevel || (!!s && snagScope.snag(s)));
  });
  const onPick = (hit: SearchHit) => (hit.kind === "snag" ? setDrawer({ kind: "snag", id: hit.id }) : setModal(hit));

  const newReports = reports.filter((r) => r.status === "submitted").sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));
  const openWork = snags.filter((s) => OPEN_WORK.includes(s.status));
  const overdue = snags.filter((s) => isOverdue(s));
  const awaitingVerify = snags.filter((s) => s.status === "fixed");
  const pendingQuotes = quotes.filter((q) => q.status === "sent");
  const collected = payments.reduce((a, p) => a + p.amount, 0);
  const pipeline = pendingQuotes.reduce((a, q) => a + quoteTotals(q).gross, 0);
  const team = users.filter(
    (u) =>
      u.role === "team" &&
      (filters.assigneeId === "all" || filters.assigneeId === u.id) &&
      (filters.trade === "all" || state.snags.some((s) => s.assigneeId === u.id && s.trade === filters.trade)),
  );
  // Homes still being worked on come first; finished ones drop to the end.
  const STAGE_ORDER = ["New report", "In progress", "Quote sent", "Waiting for snags", "Completed"];
  const activeHomes = [...properties]
    .sort((a, b) => STAGE_ORDER.indexOf(propertyStage(state, a.id)) - STAGE_ORDER.indexOf(propertyStage(state, b.id)) || b.invitedAt.localeCompare(a.invitedAt))
    .slice(0, 6);
  const activity = [...updates].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  const stats: { label: string; value: string | number; sub: string; icon: typeof FileText; view: ModalView; tone?: "highlight" | "warn" }[] = [
    { label: "New reports", value: newReports.length, sub: "Waiting for a quote", icon: FileText, view: { kind: "reports" }, tone: "highlight" },
    { label: "Open jobs", value: openWork.length, sub: `${awaitingVerify.length} awaiting owner check`, icon: Hammer, view: { kind: "openJobs" } },
    { label: "Overdue", value: overdue.length, sub: "Past their target date", icon: Clock, view: { kind: "overdue" }, tone: overdue.length ? "warn" : undefined },
    { label: "Payments collected", value: formatGBP(collected), sub: `${formatGBP(pipeline)} in quotes sent`, icon: PoundSterling, view: { kind: "payments" } },
  ];

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={`${greeting()}, ${me.name.split(" ")[0]}`}
        description={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        actions={<Button variant="secondary" onClick={() => setInviteOpen(true)}><UserPlus className="size-4" /> Invite a home owner</Button>}
      />

      <FilterBar filters={filters} onChange={setFilters} onPick={onPick} />
      {scope.active && (
        <p className="-mt-3 mb-4 text-[12.5px] text-muted">
          Showing filtered results: {snags.length} snags across {properties.length} {properties.length === 1 ? "home" : "homes"}.
        </p>
      )}

      {/* ---------- Stats ---------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={() => setModal(s.view)}
            className={cn(
              "group relative rounded-2xl p-4 text-left ring-1 transition-all hover:-translate-y-0.5 hover:shadow-lift sm:p-5",
              s.tone === "highlight" ? "bg-night text-white ring-night" : "bg-surface ring-line shadow-card",
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cn("text-[12.5px] font-medium", s.tone === "highlight" ? "text-white/60" : "text-muted")}>{s.label}</span>
              <s.icon className={cn("size-4", s.tone === "highlight" ? "text-highlight" : s.tone === "warn" ? "text-sev-major" : "text-faint")} />
            </div>
            <p className={cn("mt-3 text-[28px] font-semibold tracking-tight tabular", s.tone === "warn" && "text-sev-major")}>{s.value}</p>
            <p className={cn("mt-0.5 truncate pr-5 text-[12.5px]", s.tone === "highlight" ? "text-white/50" : "text-muted")}>{s.sub}</p>
            <ArrowUpRight className={cn("absolute right-4 bottom-4 size-4 opacity-0 transition-opacity group-hover:opacity-100", s.tone === "highlight" ? "text-highlight" : "text-muted")} />
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        {/* ---------- Left column ---------- */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader
              title="New snag reports"
              description="Submitted by home owners and ready to quote"
              action={newReports.length > 0 && <LinkBtn onClick={() => setModal({ kind: "reports" })}>View all ({newReports.length})</LinkBtn>}
            />
            <div className="space-y-3 p-3">
              {newReports.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted">No new reports. You&apos;re all caught up.</p>}
              {newReports.slice(0, 2).map((r) => {
                const p = properties.find((x) => x.id === r.propertyId)!;
                const owner = userById(state, p.ownerId);
                const rs = snags.filter((s) => s.reportId === r.id);
                return (
                  <div key={r.id} className="rounded-xl bg-canvas p-4 border border-line">
                    <div className="flex flex-wrap items-start gap-3">
                      <Avatar user={owner} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{p.addressLine1}, {p.town}</p>
                        <p className="text-[13px] text-muted">{owner?.name} · {p.plot}, {p.development} · {timeAgo(r.submittedAt!)}</p>
                      </div>
                      <Button size="sm" className="w-full sm:w-auto" onClick={() => setModal({ kind: "report", id: r.id })}>
                        Review & quote <ArrowRight className="size-3.5" />
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium">{rs.length} items</span>
                      <span className="text-line-strong">·</span>
                      {SEVERITIES.map((sev) => {
                        const n = rs.filter((s) => s.severity === sev).length;
                        return n ? (
                          <span key={sev} className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
                            <span className={cn("size-2 rounded-full", SEVERITY_META[sev].dot)} /> {n} {SEVERITY_META[sev].label.toLowerCase()}
                          </span>
                        ) : null;
                      })}
                    </div>
                    <p className="mt-3 flex gap-2 rounded-lg bg-surface p-3 text-[13px] leading-relaxed text-ink-2 border border-line">
                      <Sparkles className="mt-0.5 size-4 shrink-0 text-brand-500" />
                      <span className="line-clamp-2">{r.summary}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Homes"
              description="Most active homes first. Click a home for details."
              action={<Link href="/contractor/properties" className="text-[13px] font-medium whitespace-nowrap text-brand-700 hover:underline">View all ({properties.length})</Link>}
            />
            <ul className="px-3 pt-2 pb-3">
              {activeHomes.map((p) => {
                const owner = userById(state, p.ownerId);
                const prog = propertyProgress(snags.filter((s) => s.propertyId === p.id));
                return (
                  <li key={p.id}>
                    <button onClick={() => setModal({ kind: "home", id: p.id })} className="group flex w-full items-center gap-4 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-canvas">
                      <Ring value={prog.percent} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium">{p.addressLine1}, {p.town}</p>
                        <p className="truncate text-[12.5px] text-muted">{owner?.name} · {prog.total ? `${prog.verified}/${prog.total} verified` : "No snags yet"}</p>
                      </div>
                      <StageTag stage={propertyStage(state, p.id)} />
                      <ChevronRight className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Recent activity" action={<LinkBtn onClick={() => setModal({ kind: "activity" })}>View all ({updates.length})</LinkBtn>} />
            <ol className="px-5 pt-4 pb-5">
              {activity.map((u, i) => (
                <ActivityItem key={u.id} update={u} onOpenSnag={(id) => setDrawer({ kind: "snag", id })} last={i === activity.length - 1} compact />
              ))}
            </ol>
          </Card>
        </div>

        {/* ---------- Right column ---------- */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Waiting on home owners" description="Quotes to accept and fixes to confirm" />
            <ul className="px-3 pt-3 pb-3">
              {pendingQuotes.map((q) => {
                const p = properties.find((x) => x.id === q.propertyId)!;
                const owner = userById(state, p.ownerId);
                return (
                  <li key={q.id}>
                    <button onClick={() => setModal({ kind: "home", id: p.id })} className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-canvas">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><PoundSterling className="size-4" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium">Quote {q.number} · {formatGBP(quoteTotals(q).gross)}</p>
                        <p className="truncate text-[12px] text-muted">{owner?.name} · sent {timeAgo(q.sentAt!)}</p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </li>
                );
              })}
              <li>
                <button onClick={() => setModal({ kind: "awaiting" })} className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-canvas">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700"><CheckCheck className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{awaitingVerify.length} {awaitingVerify.length === 1 ? "fix" : "fixes"} awaiting confirmation</p>
                    <p className="truncate text-[12px] text-muted">Marked fixed by the team, owner to check</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" />
                </button>
              </li>
            </ul>
          </Card>

          <Card className="p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="text-[15px] font-semibold tracking-tight">Open work by severity</h3>
              <span className="text-[12.5px] text-muted tabular">{openWork.length} jobs</span>
            </div>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-sunken">
              {SEVERITIES.map((sev) => {
                const n = openWork.filter((s) => s.severity === sev).length;
                return n ? (
                  <button
                    key={sev}
                    onClick={() => setModal({ kind: "severity", severity: sev })}
                    className={cn(SEVERITY_META[sev].dot, "transition-opacity hover:opacity-80")}
                    style={{ width: `${(n / openWork.length) * 100}%` }}
                    aria-label={`${SEVERITY_META[sev].label}: ${n}`}
                  />
                ) : null;
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {SEVERITIES.map((sev) => (
                <button
                  key={sev}
                  onClick={() => setModal({ kind: "severity", severity: sev })}
                  className="group flex items-center justify-between rounded-lg bg-canvas px-3 py-2 border border-line transition-colors hover:bg-surface hover:border-line-strong"
                >
                  <SeverityBadge severity={sev} />
                  <span className="flex items-center gap-1 text-[15px] font-semibold tabular">
                    {openWork.filter((s) => s.severity === sev).length}
                    <ChevronRight className="size-3.5 text-faint transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              ))}
            </div>
            {overdue.length > 0 && (
              <button
                onClick={() => setModal({ kind: "overdue" })}
                className="mt-4 flex w-full items-start gap-2 rounded-lg bg-orange-50 p-3 text-left text-[13px] text-orange-800 border border-orange-200 hover:bg-orange-100/70"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span className="flex-1">
                  <b>{overdue.length} overdue:</b> {overdue.map((s) => `${s.ref} ${s.title.toLowerCase()}`).join(", ")}
                </span>
                <ChevronRight className="mt-0.5 size-4 shrink-0" />
              </button>
            )}
          </Card>

          <Card>
            <CardHeader title="Team workload" description="Click a member to see their jobs" />
            <ul className="px-3 pt-3 pb-3">
              {team.map((m) => {
                const jobs = openWork.filter((s) => s.assigneeId === m.id).length;
                return (
                  <li key={m.id}>
                    <button onClick={() => setModal({ kind: "member", id: m.id })} className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-canvas">
                      <Avatar user={m} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-[13.5px] font-medium">{m.name}</p>
                          <span className="text-[12.5px] text-muted tabular">{jobs} open</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="w-28 shrink-0 truncate text-[11.5px] text-muted">{TRADE_LABEL[m.trade!]}</span>
                          <Progress value={Math.min(100, jobs * 25)} className="h-1.5" />
                        </div>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>

      <DashboardModal scope={scope} view={modal} onClose={() => setModal(null)} setView={setModal} openDrawer={setDrawer} />
      <InviteOwnerModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <DashboardDrawer view={drawer} onClose={() => setDrawer(null)} openDrawer={setDrawer} />
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  CheckCheck,
  Clock,
  FileText,
  Hammer,
  Home,
  Mail,
  MapPin,
  Phone,
  PoundSterling,
  Send,
  Sparkles,
  TriangleAlert,
  User as UserIcon, ExternalLink
} from "lucide-react";
import { Drawer, Modal } from "@/components/ui/overlay";
import { Paginated } from "@/components/ui/pagination";
import { QuoteAction } from "./quote-action";
import { FULL_SCOPE, type Scope } from "./dashboard-filters";
import { Avatar, Button, RefTag, Ring, SeverityBadge, StatusBadge } from "@/components/ui/primitives";
import { SnagPhoto } from "@/components/ui/snag-photo";
import { StageTag } from "@/components/stage-tag";
import { ActivityItem, EmptyLine, KeyValue, SnagRow } from "./shared";
import { SnagControls } from "./snag-controls";
import { toast } from "@/components/ui/toast";
import { AssignJobPicker } from "./assign-job-picker";
import { useStore } from "@/lib/data/store";
import { ownerSlug } from "@/lib/data/queries";
import { isDemo } from "@/lib/config";
import { PaymentTimeline } from "@/components/contractor/payment-timeline";
import { currentReport, isOverdue, propertyProgress, propertyStage, quoteTotals } from "@/lib/data/queries";
import { OPEN_WORK, SEVERITIES, SEVERITY_META, STATUS_META, TRADE_LABEL } from "@/lib/constants";
import type { Severity, Snag, SnagStatus } from "@/lib/types";
import { cn, formatDate, formatDateTime, formatGBP, timeAgo } from "@/lib/utils";

export type ModalView =
  | { kind: "reports" }
  | { kind: "report"; id: string }
  | { kind: "openJobs" }
  | { kind: "overdue" }
  | { kind: "payments" }
  | { kind: "severity"; severity: Severity }
  | { kind: "home"; id: string }
  | { kind: "member"; id: string }
  | { kind: "activity" }
  | { kind: "awaiting" };

export type DrawerView = { kind: "report"; id: string } | { kind: "snag"; id: string };

const sevOrder = (a: Snag, b: Snag) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity);

/* =====================================================================
 * Modals
 * ===================================================================== */

export function DashboardModal({
  view,
  onClose,
  setView,
  openDrawer,
  scope = FULL_SCOPE,
}: {
  scope?: Scope;
  view: ModalView | null;
  onClose: () => void;
  setView: (v: ModalView) => void;
  openDrawer: (d: DrawerView) => void;
}) {
  const state = useStore();
  if (!view) return null;
  const openSnag = (id: string) => openDrawer({ kind: "snag", id });
  const key = JSON.stringify(view);

  switch (view.kind) {
    /* ---------- New reports ---------- */
    case "reports": {
      const list = state.reports.filter((r) => r.status === "submitted" && scope.property(r.propertyId) && scope.inPeriod(r.submittedAt)).sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));
      return (
        <Modal open onClose={onClose} icon={<FileText className="size-5" />} title="New snag reports" description={`${list.length} waiting for a quote`}>
          <Paginated
            key={key}
            items={list}
            className="space-y-2"
            empty={<EmptyLine>No new reports. You&apos;re all caught up.</EmptyLine>}
            render={(r) => {
              const p = state.properties.find((x) => x.id === r.propertyId)!;
              const owner = state.users.find((u) => u.id === p.ownerId);
              const n = state.snags.filter((s) => s.reportId === r.id).length;
              return (
                <button key={r.id} onClick={() => setView({ kind: "report", id: r.id })} className="flex w-full items-center gap-3 rounded-xl p-3 text-left border border-line hover:bg-canvas">
                  <Avatar user={owner} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{p.addressLine1}, {p.town}</p>
                    <p className="truncate text-[12.5px] text-muted">{owner?.name} · {n} items · {timeAgo(r.submittedAt!)}</p>
                  </div>
                  <ArrowRight className="size-4 text-faint" />
                </button>
              );
            }}
          />
        </Modal>
      );
    }

    /* ---------- Report quick view ---------- */
    case "report": {
      const r = state.reports.find((x) => x.id === view.id);
      if (!r) return null;
      const p = state.properties.find((x) => x.id === r.propertyId)!;
      const owner = state.users.find((u) => u.id === p.ownerId);
      const rs = state.snags.filter((s) => s.reportId === r.id);
      const priority = [...rs].filter((s) => s.severity === "safety" || s.severity === "major").sort(sevOrder).slice(0, 5);
      const roomCount = new Set(rs.map((s) => s.roomId)).size;
      return (
        <Modal
          open
          onClose={onClose}
          icon={<FileText className="size-5" />}
          title={`${p.addressLine1}, ${p.town}`}
          description={`Snag report v${r.version} · submitted ${timeAgo(r.submittedAt ?? r.createdAt)}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => openDrawer({ kind: "report", id: r.id })}>View more</Button>
              <QuoteAction reportId={r.id} />
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4 rounded-2xl bg-canvas p-4 border border-line sm:grid-cols-4">
            <KeyValue label="Home owner">{owner?.name}</KeyValue>
            <KeyValue label="Plot">{p.plot}</KeyValue>
            <KeyValue label="Items">{rs.length} in {roomCount} rooms</KeyValue>
            <KeyValue label="Completed">{formatDate(p.completionDate)}</KeyValue>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {SEVERITIES.map((sev) => (
              <div key={sev} className="rounded-xl p-3 text-center border border-line">
                <p className={cn("text-[20px] font-semibold tabular", SEVERITY_META[sev].text)}>{rs.filter((s) => s.severity === sev).length}</p>
                <p className="text-[11.5px] text-muted">{SEVERITY_META[sev].label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2.5 rounded-xl bg-brand-50/60 p-3.5 text-[13px] leading-relaxed text-ink-2 border border-brand-100">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-brand-600" />
            <p><span className="font-medium text-ink">AI summary. </span>{r.summary}</p>
          </div>

          {priority.length > 0 && (
            <div className="mt-5">
              <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">Priority items</p>
              <div className="-mx-2">
                {priority.map((s) => <SnagRow key={s.id} snag={s} onOpen={openSnag} showAddress={false} />)}
              </div>
            </div>
          )}
        </Modal>
      );
    }

    /* ---------- Open jobs ---------- */
    case "openJobs": {
      const list = state.snags.filter((s) => OPEN_WORK.includes(s.status) && scope.snag(s)).sort(sevOrder);
      const fixed = state.snags.filter((s) => s.status === "fixed" && scope.snag(s)).length;
      return (
        <Modal open onClose={onClose} icon={<Hammer className="size-5" />} title="Open jobs" description={`${list.length} jobs in progress or waiting to start · ${fixed} awaiting the owner's check`}>
          <StatusStrip snags={list} />
          <Paginated key={key} items={list} className="-mx-2" empty={<EmptyLine>No open jobs.</EmptyLine>} render={(s) => <SnagRow key={s.id} snag={s} onOpen={openSnag} />} />
        </Modal>
      );
    }

    /* ---------- Overdue ---------- */
    case "overdue": {
      const list = state.snags.filter((s) => isOverdue(s) && scope.snag(s)).sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
      return (
        <Modal open onClose={onClose} icon={<Clock className="size-5" />} title="Overdue jobs" description="Past their target date and not yet fixed">
          <Paginated
            key={key}
            items={list}
            className="-mx-2"
            empty={<EmptyLine>Nothing overdue. Great work.</EmptyLine>}
            render={(s) => (
              <div key={s.id}>
                <SnagRow snag={s} onOpen={openSnag} />
                <p className="mb-1 ml-[76px] text-[12px] font-medium text-sev-major">Due {formatDate(s.dueDate!)} · {timeAgo(s.dueDate!).replace(" ago", "")} late</p>
              </div>
            )}
          />
        </Modal>
      );
    }

    /* ---------- Payments ---------- */
    case "payments": {
      const pays = state.payments.filter((p) => scope.property(p.propertyId) && scope.inPeriod(p.paidAt)).sort((a, b) => b.paidAt.localeCompare(a.paidAt));
      const collected = pays.reduce((a, p) => a + p.amount, 0);
      const pending = state.quotes.filter((q) => q.status === "sent" && scope.property(q.propertyId));
      const unpaid = state.invoices.filter((i) => i.status === "unpaid" && scope.property(i.propertyId));
      return (
        <Modal open onClose={onClose} icon={<PoundSterling className="size-5" />} title="Payments" description="All card payments are Stripe test mode">
          <div className="grid grid-cols-3 gap-2">
            <Figure label="Collected" value={formatGBP(collected)} strong />
            <Figure label="In quotes sent" value={formatGBP(pending.reduce((a, q) => a + quoteTotals(q).gross, 0))} />
            <Figure label="Unpaid invoices" value={String(unpaid.length)} />
          </div>
          <p className="mt-5 mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">Recent payments</p>
          <Paginated
            key={key}
            items={pays}
            className="divide-y divide-line rounded-xl border border-line"
            empty={<EmptyLine>No payments yet.</EmptyLine>}
            render={(pay) => {
              const inv = state.invoices.find((i) => i.id === pay.invoiceId);
              const p = state.properties.find((x) => x.id === pay.propertyId);
              const owner = state.users.find((u) => u.id === p?.ownerId);
              return (
                <div key={pay.id} className="flex items-center gap-3 p-3">
                  <Avatar user={owner} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{owner?.name}</p>
                    <p className="truncate text-[12px] text-muted">
                      {inv?.number} · {inv?.kind === "deposit" ? "Deposit" : "Balance"} · •••• {pay.cardLast4} · {formatDate(pay.paidAt)}
                    </p>
                  </div>
                  <p className="text-[14px] font-semibold tabular">{formatGBP(pay.amount)}</p>
                </div>
              );
            }}
          />
        </Modal>
      );
    }

    /* ---------- Severity ---------- */
    case "severity": {
      const m = SEVERITY_META[view.severity];
      const list = state.snags.filter((s) => OPEN_WORK.includes(s.status) && s.severity === view.severity && scope.property(s.propertyId));
      return (
        <Modal
          open
          onClose={onClose}
          icon={<span className={cn("size-3 rounded-full", m.dot)} />}
          title={`${m.label} items`}
          description={`${list.length} open ${list.length === 1 ? "job" : "jobs"} rated ${m.label.toLowerCase()}`}
        >
          <div className="mb-3 flex flex-wrap gap-1.5">
            {SEVERITIES.map((sev) => (
              <button
                key={sev}
                onClick={() => setView({ kind: "severity", severity: sev })}
                className={cn(
                  "rounded-full px-3 py-1 text-[12.5px] font-medium ring-1 transition-colors",
                  sev === view.severity ? "bg-ink text-white ring-ink" : "text-ink-2 ring-line hover:bg-sunken",
                )}
              >
                {SEVERITY_META[sev].label} · {state.snags.filter((s) => OPEN_WORK.includes(s.status) && s.severity === sev && scope.property(s.propertyId)).length}
              </button>
            ))}
          </div>
          <Paginated key={key} items={list} className="-mx-2" empty={<EmptyLine>No open {m.label.toLowerCase()} items.</EmptyLine>} render={(s) => <SnagRow key={s.id} snag={s} onOpen={openSnag} />} />
        </Modal>
      );
    }

    /* ---------- Home ---------- */
    case "home": {
      const p = state.properties.find((x) => x.id === view.id);
      if (!p) return null;
      const owner = state.users.find((u) => u.id === p.ownerId)!;
      const snags = state.snags.filter((s) => s.propertyId === p.id && s.status !== "ai_draft").sort(sevOrder);
      const prog = propertyProgress(snags);
      const report = currentReport(state, p.id);
      const quote = state.quotes.find((q) => q.propertyId === p.id);
      const paid = state.payments.filter((x) => x.propertyId === p.id).reduce((a, x) => a + x.amount, 0);
      return (
        <Modal
          open
          size="lg"
          onClose={onClose}
          icon={<Home className="size-5" />}
          title={`${p.addressLine1}, ${p.town}`}
          description={`${p.plot} · ${p.development} · ${p.postcode}`}
          footer={
            <>
              {!p.joinedAt && <ResendInvite propertyId={p.id} />}
              {isDemo && <OwnerAppLink ownerId={p.ownerId} />}
              {report && <QuoteAction reportId={report.id} />}
              {report && <Button variant="secondary" onClick={() => openDrawer({ kind: "report", id: report.id })}>Open full report</Button>}
              {!report && p.joinedAt && <span className="mr-auto text-[12.5px] text-muted">Joined {formatDate(p.joinedAt)} · no snags submitted yet</span>}
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="flex items-center gap-3 rounded-2xl bg-canvas p-3.5 border border-line">
              <Avatar user={owner} size={42} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-semibold">{owner.name}</p>
                <p className="flex items-center gap-1.5 truncate text-[12.5px] text-muted"><Mail className="size-3.5" /> {owner.email}</p>
                <p className="flex items-center gap-1.5 truncate text-[12.5px] text-muted"><Phone className="size-3.5" /> {owner.phone}</p>
              </div>
              <StageTag stage={propertyStage(state, p.id)} />
            </div>
            <div className="flex items-center gap-3 rounded-2xl p-3.5 border border-line">
              <Ring value={prog.percent} size={52} />
              <div>
                <p className="text-[13.5px] font-semibold">{prog.verified}/{prog.total} verified</p>
                <p className="text-[12px] text-muted">{paid ? `${formatGBP(paid)} paid` : "No payments yet"}</p>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KeyValue label="Completion">{formatDate(p.completionDate)}</KeyValue>
            <KeyValue label="Invited">{formatDate(p.invitedAt)}</KeyValue>
            <KeyValue label="Report">{report ? `Submitted ${formatDate(report.submittedAt ?? report.createdAt)}` : "Not yet"}</KeyValue>
            <KeyValue label="Quote">{quote ? `${quote.number} · ${formatGBP(quoteTotals(quote).gross)}` : "Not yet"}</KeyValue>
          </div>

          {quote && (
            <>
              <p className="mt-5 mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">Payments</p>
              <PaymentTimeline quoteId={quote.id} />
            </>
          )}

          {snags.length > 0 ? (
            <>
              <StatusStrip snags={snags} className="mt-5" />
              <Paginated key={key} items={snags} className="-mx-2" render={(s) => <SnagRow key={s.id} snag={s} onOpen={openSnag} showAddress={false} />} />
            </>
          ) : (
            <div className="mt-5"><EmptyLine>{p.joinedAt ? "The owner hasn't sent any snags yet." : "Invite sent. The owner hasn't joined yet."}</EmptyLine></div>
          )}
        </Modal>
      );
    }

    /* ---------- Team member ---------- */
    case "member": {
      const m = state.users.find((u) => u.id === view.id);
      if (!m) return null;
      const mine = state.snags.filter((s) => s.assigneeId === m.id);
      const open = mine.filter((s) => OPEN_WORK.includes(s.status)).sort(sevOrder);
      const fixed = mine.filter((s) => s.status === "fixed");
      const verified = mine.filter((s) => s.status === "verified");
      const lastUpdate = state.updates.filter((u) => u.actorId === m.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      return (
        <Modal open size="lg" onClose={onClose} icon={<UserIcon className="size-5" />} title={m.name} description={TRADE_LABEL[m.trade!]}>
          <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-canvas p-4 border border-line">
            <Avatar user={m} size={52} />
            <div className="min-w-0 flex-1 space-y-0.5 text-[13px] text-ink-2">
              <p className="flex items-center gap-2"><Mail className="size-3.5 text-faint" /> {m.email}</p>
              {m.phone && <p className="flex items-center gap-2"><Phone className="size-3.5 text-faint" /> {m.phone}</p>}
              <p className="flex items-center gap-2"><Clock className="size-3.5 text-faint" /> {lastUpdate ? `Last update ${timeAgo(lastUpdate.createdAt)}` : "No updates yet"}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            <Figure label="Open" value={String(open.length)} strong />
            <Figure label="Overdue" value={String(open.filter((s) => isOverdue(s)).length)} />
            <Figure label="Awaiting check" value={String(fixed.length)} />
            <Figure label="Verified" value={String(verified.length)} />
          </div>
          <AssignJobPicker memberId={m.id} />
          <p className="mt-5 mb-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">Open jobs</p>
          <Paginated key={key} items={open} className="-mx-2" empty={<EmptyLine>No open jobs right now.</EmptyLine>} render={(s) => <SnagRow key={s.id} snag={s} onOpen={openSnag} />} />
        </Modal>
      );
    }

    /* ---------- Fixes awaiting the owner's check ---------- */
    case "awaiting": {
      const list = state.snags.filter((s) => s.status === "fixed" && scope.snag(s));
      return (
        <Modal open onClose={onClose} icon={<CheckCheck className="size-5" />} title="Awaiting owner confirmation" description="The team has marked these fixed. The home owner confirms or sends them back.">
          <Paginated key={key} items={list} className="-mx-2" empty={<EmptyLine>Nothing waiting for the owner.</EmptyLine>} render={(s) => <SnagRow key={s.id} snag={s} onOpen={openSnag} />} />
        </Modal>
      );
    }

    /* ---------- All activity ---------- */
    case "activity": {
      const list = state.updates.filter((u) => scope.property(u.propertyId) && scope.inPeriod(u.createdAt)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return (
        <Modal open onClose={onClose} icon={<Clock className="size-5" />} title="All activity" description={`${list.length} updates across every home`}>
          <Paginated
            key={key}
            items={list.map((u, i) => ({ u, last: (i + 1) % 5 === 0 || i === list.length - 1 }))}
            className="pt-1"
            render={({ u, last }) => (
              <ol key={u.id}>
                <ActivityItem update={u} onOpenSnag={openSnag} last={last} />
              </ol>
            )}
          />
        </Modal>
      );
    }
  }
}

function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("rounded-xl p-3", strong ? "bg-night text-white" : "border border-line")}>
      <p className="text-[18px] font-semibold tabular">{value}</p>
      <p className={cn("text-[11.5px]", strong ? "text-white/55" : "text-muted")}>{label}</p>
    </div>
  );
}

/** Thin stacked bar + legend showing how a list of snags splits by status. */
function StatusStrip({ snags, className }: { snags: Snag[]; className?: string }) {
  const counts = new Map<SnagStatus, number>();
  snags.forEach((s) => counts.set(s.status, (counts.get(s.status) ?? 0) + 1));
  const entries = [...counts.entries()];
  if (!entries.length) return null;
  return (
    <div className={cn("mb-3", className)}>
      <div className="flex h-2 overflow-hidden rounded-full bg-sunken">
        {entries.map(([st, n]) => <div key={st} className={STATUS_META[st].dot} style={{ width: `${(n / snags.length) * 100}%` }} />)}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {entries.map(([st, n]) => (
          <span key={st} className="flex items-center gap-1.5 text-[12px] text-ink-2">
            <span className={cn("size-2 rounded-full", STATUS_META[st].dot)} /> {STATUS_META[st].label} {n}
          </span>
        ))}
      </div>
    </div>
  );
}

/* =====================================================================
 * Drawers
 * ===================================================================== */

export function DashboardDrawer({ view, onClose, openDrawer }: { view: DrawerView | null; onClose: () => void; openDrawer: (d: DrawerView) => void }) {
  const state = useStore();
  if (!view) return null;

  if (view.kind === "report") {
    const r = state.reports.find((x) => x.id === view.id);
    if (!r) return null;
    const p = state.properties.find((x) => x.id === r.propertyId)!;
    const owner = state.users.find((u) => u.id === p.ownerId);
    const rs = state.snags.filter((s) => s.reportId === r.id);
    const rooms = state.rooms
      .filter((room) => room.propertyId === p.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((room) => ({ room, items: rs.filter((s) => s.roomId === room.id) }))
      .filter((g) => g.items.length);

    return (
      <Drawer
        open
        onClose={onClose}
        icon={<FileText className="size-5" />}
        title="Snag report"
        description={`${p.addressLine1}, ${p.town} · v${r.version}`}
        footer={<QuoteAction reportId={r.id} />}
      >
        <div className="rounded-2xl bg-night bg-blueprint-dark p-5 text-white">
          <p className="text-[12px] text-white/50">{p.plot} · {p.development}</p>
          <p className="mt-0.5 text-[18px] font-semibold tracking-tight">{p.addressLine1}, {p.town} {p.postcode}</p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-[12.5px]">
            <div><p className="text-white/45">Owner</p><p className="font-medium">{owner?.name}</p></div>
            <div><p className="text-white/45">Submitted</p><p className="font-medium">{formatDate(r.submittedAt ?? r.createdAt)}</p></div>
            <div><p className="text-white/45">Items</p><p className="font-medium">{rs.length}</p></div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {SEVERITIES.map((sev) => (
            <div key={sev} className="rounded-xl p-2.5 text-center border border-line">
              <p className={cn("text-[18px] font-semibold tabular", SEVERITY_META[sev].text)}>{rs.filter((s) => s.severity === sev).length}</p>
              <p className="text-[11px] text-muted">{SEVERITY_META[sev].label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2.5 rounded-xl bg-brand-50/60 p-3.5 text-[13px] leading-relaxed text-ink-2 border border-brand-100">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-brand-600" />
          <p>{r.summary}</p>
        </div>

        <div className="mt-6 space-y-6">
          {rooms.map(({ room, items }) => (
            <section key={room.id}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-[14.5px] font-semibold">{room.name}</h3>
                <span className="rounded-full bg-sunken px-2 text-[11.5px] font-medium text-ink-2">{items.length}</span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <div className="space-y-2.5">
                {items.map((s) => (
                  <button key={s.id} onClick={() => openDrawer({ kind: "snag", id: s.id })} className="flex w-full gap-3 rounded-xl p-3 text-left border border-line hover:bg-canvas">
                    <SnagPhoto snag={s} className="h-20 w-24 shrink-0" rounded="rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <RefTag>{s.ref}</RefTag>
                        <SeverityBadge severity={s.severity} />
                        <span className="text-[11.5px] text-muted">{TRADE_LABEL[s.trade]}</span>
                      </div>
                      <p className="mt-1 text-[13.5px] font-semibold leading-snug">{s.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted">{s.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Drawer>
    );
  }

  // Snag detail
  const s = state.snags.find((x) => x.id === view.id);
  if (!s) return null;
  const p = state.properties.find((x) => x.id === s.propertyId)!;
  const room = state.rooms.find((r) => r.id === s.roomId);
  const assignee = state.users.find((u) => u.id === s.assigneeId);
  const history = state.updates.filter((u) => u.snagId === s.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <Drawer
      open
      onClose={onClose}
      icon={<Hammer className="size-5" />}
      title={s.title}
      description={`${s.ref} · ${room?.name} · ${p.addressLine1}, ${p.town}`}
    >
      <SnagPhoto snag={s} className="aspect-[4/3] w-full" rounded="rounded-2xl" />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={s.status} />
        <SeverityBadge severity={s.severity} />
        <span className="rounded-full bg-sunken px-2 py-0.5 text-[11.5px] font-medium text-ink-2">{s.category}</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[12px] text-muted">
          <Sparkles className="size-3.5 text-brand-500" /> AI confidence {Math.round(s.confidence * 100)}%
        </span>
      </div>

      <SnagControls snag={s} />

      <div className="mt-4 grid grid-cols-2 gap-4 rounded-2xl bg-canvas p-4 border border-line">
        <KeyValue label="Trade">{TRADE_LABEL[s.trade]}</KeyValue>
        <KeyValue label="Assigned to">
          {assignee ? <span className="flex items-center gap-1.5"><Avatar user={assignee} size={18} /> {assignee.name}</span> : "Not assigned"}
        </KeyValue>
        <KeyValue label="Quoted price">{s.price != null ? `${formatGBP(s.price)} + VAT` : "Not quoted"}</KeyValue>
        <KeyValue label="Target date">
          {s.dueDate ? <span className={cn(isOverdue(s) && "text-sev-major")}>{formatDate(s.dueDate)}{isOverdue(s) && " · overdue"}</span> : "Not set"}
        </KeyValue>
      </div>

      <dl className="mt-5 space-y-4 text-[13.5px] leading-relaxed">
        <div>
          <dt className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted"><MapPin className="size-3.5" /> Location</dt>
          <dd className="mt-1 text-ink-2">{s.locationInRoom}</dd>
        </div>
        <div>
          <dt className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">Description</dt>
          <dd className="mt-1 text-ink-2">{s.description}</dd>
        </div>
        <div>
          <dt className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">Suggested fix</dt>
          <dd className="mt-1 text-ink-2">{s.suggestedFix}</dd>
        </div>
      </dl>

      {s.severity === "safety" && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-[13px] text-red-800 border border-red-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" /> Safety item: should be made safe as a priority.
        </p>
      )}

      <div className="mt-6">
        <p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted"><CalendarClock className="size-3.5" /> Timeline</p>
        {history.length ? (
          <ol>
            {history.map((u, i) => <ActivityItem key={u.id} update={u} last={i === history.length - 1} />)}
          </ol>
        ) : (
          <EmptyLine>No updates yet. Reported {formatDateTime(s.createdAt)}.</EmptyLine>
        )}
      </div>
    </Drawer>
  );
}

/** Opens this owner's app in a new window (demo shortcut for testing both sides side by side). */
function OwnerAppLink({ ownerId }: { ownerId: string }) {
  const slug = useStore((s) => ownerSlug(s, ownerId));
  return (
    <a
      href={`/home/${slug}`}
      target="_blank"
      rel="noopener"
      title={`Opens /home/${slug} in a new window`}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-[13.5px] font-semibold text-ink transition-colors hover:bg-sunken"
    >
      <ExternalLink className="size-4" /> Owner app
    </a>
  );
}

/** Re-sends the owner's sign-in link and confirms inline. */
function ResendInvite({ propertyId }: { propertyId: string }) {
  const resendInvite = useStore((s) => s.resendInvite);
  const invitedAt = useStore((s) => s.properties.find((p) => p.id === propertyId)?.invitedAt);
  const ownerId = useStore((s) => s.properties.find((p) => p.id === propertyId)?.ownerId);
  const owner = useStore((s) => s.users.find((u) => u.id === ownerId));
  const [justSent, setJustSent] = useState(false);
  return (
    <>
      <span className="mr-auto text-[12.5px] text-muted">{justSent ? "New invite sent just now" : `Invited ${invitedAt ? formatDate(invitedAt) : ""} · not joined yet`}</span>
      <Button
        onClick={() => {
          resendInvite(propertyId);
          setJustSent(true);
          toast({ title: `Invite sent to ${owner?.name}`, body: `A new sign-in link was emailed to ${owner?.email}.` });
        }}
        disabled={justSent}
      >
        <Send className="size-4" /> {justSent ? "Sent" : "Resend invite"}
      </Button>
    </>
  );
}

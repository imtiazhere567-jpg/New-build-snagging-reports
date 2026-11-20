"use client";

import { CheckCircle2, CircleDashed, Clock, CreditCard, XCircle } from "lucide-react";
import { Avatar, RefTag, SeverityBadge } from "@/components/ui/primitives";
import { useStore } from "@/lib/data/store";
import { quoteTotals } from "@/lib/data/queries";
import { PaymentTimeline } from "@/components/contractor/payment-timeline";
import type { QuoteItem } from "@/lib/types";
import { cn, formatDate, formatGBP } from "@/lib/utils";

const STATUS = {
  draft: { label: "Draft", cls: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  sent: { label: "Awaiting reply", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  accepted: { label: "Accepted", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  partially_accepted: { label: "Partly accepted", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  declined: { label: "Declined", cls: "bg-red-50 text-red-700 border-red-200" },
} as const;

const DECISION: Record<QuoteItem["decision"], { icon: typeof CheckCircle2; cls: string; label: string }> = {
  pending: { icon: CircleDashed, cls: "text-faint", label: "Awaiting owner" },
  accepted: { icon: CheckCircle2, cls: "text-emerald-600", label: "Accepted" },
  declined: { icon: XCircle, cls: "text-red-500", label: "Declined" },
};

/** Read-only view of a quote: items with the owner's decisions, totals, and deposit/balance payments. */
export function QuoteDetails({ quoteId, showHeader }: { quoteId: string; showHeader?: boolean }) {
  const state = useStore();
  const q = state.quotes.find((x) => x.id === quoteId);
  if (!q) return null;
  const p = state.properties.find((x) => x.id === q.propertyId)!;
  const owner = state.users.find((u) => u.id === p.ownerId)!;
  const t = quoteTotals(q);
  const invoices = state.invoices.filter((i) => i.quoteId === q.id);
  const st = STATUS[q.status];
  const accepted = q.items.filter((i) => i.decision === "accepted").length;
  const declined = q.items.filter((i) => i.decision === "declined").length;

  return (
    <div className={cn(showHeader && "animate-fade-up")}>
      {showHeader && (
        <div className="mb-5">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Quote {q.number}</h1>
          <p className="mt-1 text-[14px] text-muted">{p.addressLine1}, {p.town}</p>
        </div>
      )}

      {/* Top summary */}
      <div className="rounded-2xl bg-night bg-blueprint-dark p-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar user={owner} size={38} />
            <div>
              <p className="text-[14.5px] font-semibold">{owner.name}</p>
              <p className="text-[12.5px] text-white/50">Sent {formatDate(q.sentAt ?? q.createdAt)}{q.respondedAt ? ` · replied ${formatDate(q.respondedAt)}` : ""}</p>
            </div>
          </div>
          <span className={cn("rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium", st.cls)}>{st.label}</span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div>
            <p className="text-[11.5px] text-white/45">Total inc. VAT</p>
            <p className="mt-0.5 text-[20px] font-semibold tabular">{formatGBP(t.gross)}</p>
          </div>
          <div>
            <p className="text-[11.5px] text-white/45">Deposit {q.depositPercent}%</p>
            <p className="mt-0.5 text-[20px] font-semibold tabular">{formatGBP(t.deposit)}</p>
          </div>
          <div>
            <p className="text-[11.5px] text-white/45">Balance</p>
            <p className="mt-0.5 text-[20px] font-semibold tabular">{formatGBP(t.balance)}</p>
          </div>
        </div>
      </div>

      {/* Decisions */}
      <div className="mt-5 flex items-center justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">Items · {q.items.length}</p>
        <p className="text-[12px] text-muted">
          {q.status === "sent" ? "Owner hasn't replied yet" : `${accepted} accepted${declined ? ` · ${declined} declined` : ""}`}
        </p>
      </div>
      <div className="mt-2 divide-y divide-line rounded-2xl border border-line">
        {q.items.map((i) => {
          const s = state.snags.find((x) => x.id === i.snagId);
          if (!s) return null;
          const d = DECISION[i.decision];
          return (
            <div key={i.snagId} className="flex items-center gap-3 px-3.5 py-2.5">
              <d.icon className={cn("size-4 shrink-0", d.cls)} aria-label={d.label} />
              <RefTag>{s.ref}</RefTag>
              <p className={cn("min-w-0 flex-1 truncate text-[13.5px]", i.decision === "declined" && "text-faint line-through")}>{s.title}</p>
              <span className="hidden sm:inline-flex"><SeverityBadge severity={s.severity} /></span>
              <span className={cn("w-20 text-right text-[13.5px] font-medium tabular", i.decision === "declined" && "text-faint")}>
                {i.price === 0 ? "No charge" : formatGBP(i.price)}
              </span>
            </div>
          );
        })}
        <div className="space-y-1 bg-canvas px-3.5 py-3 text-[13px]">
          <Line label="Subtotal" value={formatGBP(t.net)} />
          <Line label={`VAT ${Math.round(q.vatRate * 100)}%`} value={formatGBP(t.vat)} />
          <Line label="Total" value={formatGBP(t.gross)} strong />
        </div>
      </div>

      {/* Payments */}
      <p className="mt-5 mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">Payments</p>
      {q.status !== "sent" && <PaymentTimeline quoteId={q.id} className="mb-3" />}
      {invoices.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl border border-dashed border-line-strong px-3.5 py-3 text-[13px] text-muted">
          <Clock className="size-4" /> The deposit invoice is created when the owner accepts.
        </p>
      ) : (
        <div className="divide-y divide-line rounded-2xl border border-line">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 px-3.5 py-3">
              <CreditCard className="size-4 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium">{inv.number} · {inv.kind === "deposit" ? "Deposit" : "Balance"}</p>
                <p className="text-[12px] text-muted">{inv.status === "paid" ? `Paid ${formatDate(inv.paidAt!)} · card ending 4242 (test)` : `Due ${formatDate(inv.dueAt)}`}</p>
              </div>
              <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", inv.status === "paid" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800")}>
                {inv.status === "paid" ? "Paid" : "Unpaid"}
              </span>
              <span className="w-20 text-right text-[13.5px] font-semibold tabular">{formatGBP(inv.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {q.message && (
        <div className="mt-5 rounded-xl bg-canvas px-4 py-3 text-[13px] leading-relaxed text-ink-2">
          <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-muted">Message sent</p>
          {q.message}
        </div>
      )}
    </div>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={strong ? "font-medium" : "text-muted"}>{label}</span>
      <span className={cn("tabular", strong ? "font-semibold" : "text-ink-2")}>{value}</span>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Camera, CheckCircle2, Clock, CreditCard, FileText, Receipt, Sparkles, XCircle } from "lucide-react";
import { Avatar, Button, ButtonLink, RefTag, SeverityBadge } from "@/components/ui/primitives";
import { SnagPhoto } from "@/components/ui/snag-photo";
import { ConfirmDialog } from "@/components/ui/confirm";
import { toast } from "@/components/ui/toast";
import { PaymentSheet } from "@/components/owner/payment-sheet";
import { useStore } from "@/lib/data/store";
import { quoteTotals } from "@/lib/data/queries";
import type { Quote } from "@/lib/types";
import { cn, formatDate, formatGBP } from "@/lib/utils";

export default function OwnerQuotePage() {
  const me = useStore((s) => s.users.find((u) => u.id === s.currentUserId))!;
  const property = useStore((s) => s.properties.find((p) => p.ownerId === me.id));
  const quotes = useStore((s) => s.quotes);
  const invoices = useStore((s) => s.invoices);
  const payments = useStore((s) => s.payments);
  const reports = useStore((s) => s.reports);
  const markInvoicePaid = useStore((s) => s.markInvoicePaid);
  const [paying, setPaying] = useState<string | null>(null);

  if (!property) return <p className="text-muted">No home is linked to this account.</p>;

  const mine = quotes.filter((q) => q.propertyId === property.id).sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? ""));
  const open = mine.find((q) => q.status === "sent");
  const answered = mine.filter((q) => q.status !== "sent" && q.status !== "draft");
  const myInvoices = invoices.filter((i) => i.propertyId === property.id).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  const unpaid = myInvoices.filter((i) => i.status === "unpaid");
  const waitingReport = reports.find((r) => r.propertyId === property.id && r.status === "submitted");
  const payingInvoice = myInvoices.find((i) => i.id === paying);

  return (
    <div className="animate-fade-up space-y-5 pb-10">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Quote &amp; payments</h1>
        <p className="text-[13px] text-muted">{property.addressLine1}, {property.town}</p>
      </div>

      {/* Money due now */}
      {unpaid.map((inv) => (
        <div key={inv.id} className="rounded-2xl border-2 border-brand-500/40 bg-surface p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white"><CreditCard className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">{inv.kind === "deposit" ? "Deposit to book your repairs" : "Final balance"}</p>
              <p className="text-[12.5px] text-muted">Invoice {inv.number} · due {formatDate(inv.dueAt)}</p>
            </div>
            <p className="text-[18px] font-semibold tabular">{formatGBP(inv.amount)}</p>
          </div>
          <Button size="lg" className="mt-3 w-full" onClick={() => setPaying(inv.id)}>
            <CreditCard className="size-4" /> Pay {formatGBP(inv.amount)}
          </Button>
        </div>
      ))}

      {/* Open quote */}
      {open && <QuoteReview quote={open} onDepositRaised={setPaying} />}

      {/* Nothing yet */}
      {!open && answered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line-strong bg-blueprint px-6 py-12 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-line bg-surface text-brand-600">
            {waitingReport ? <Clock className="size-6" /> : <FileText className="size-6" />}
          </span>
          <p className="mt-3 font-semibold">{waitingReport ? "Your quote is being prepared" : "No quote yet"}</p>
          <p className="mx-auto mt-1 max-w-xs text-[13px] text-muted">
            {waitingReport
              ? `You sent your snag list on ${formatDate(waitingReport.submittedAt!)}. You'll get an email when the quote is ready, usually within 2 working days.`
              : "Send your snag list first. Your builder prices the work and the quote appears here."}
          </p>
          {!waitingReport && (
            <ButtonLink href="/owner/capture" className="mt-5"><Camera className="size-4" /> Start capturing</ButtonLink>
          )}
        </div>
      )}

      {/* Earlier quotes */}
      {answered.map((q) => <AnsweredQuote key={q.id} quote={q} />)}

      {/* Invoices & receipts */}
      {myInvoices.length > 0 && (
        <section>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">Invoices &amp; receipts</p>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {myInvoices.map((inv) => {
              const pay = payments.find((p) => p.invoiceId === inv.id);
              return (
                <li key={inv.id} className="flex items-center gap-3 px-3.5 py-3">
                  <Receipt className="size-4 shrink-0 text-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium">{inv.number} · {inv.kind === "deposit" ? "Deposit" : "Balance"}</p>
                    <p className="truncate text-[12px] text-muted">
                      {pay ? `Paid ${formatDate(pay.paidAt)} · card ending ${pay.cardLast4}` : `Due ${formatDate(inv.dueAt)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13.5px] font-semibold tabular">{formatGBP(inv.amount)}</p>
                    <span className={cn("text-[11px] font-semibold", inv.status === "paid" ? "text-emerald-700" : "text-amber-700")}>{inv.status === "paid" ? "Paid" : "Unpaid"}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {payingInvoice && (
        <PaymentSheet
          amount={payingInvoice.amount}
          title={payingInvoice.kind === "deposit" ? "Pay your deposit" : "Pay the final balance"}
          description={`Invoice ${payingInvoice.number}`}
          onClose={() => setPaying(null)}
          onPaid={() => {
            markInvoicePaid(payingInvoice.id);
            setPaying(null);
            toast({
              title: `${formatGBP(payingInvoice.amount)} paid`,
              body: payingInvoice.kind === "deposit" ? "You're booked in. Your builder's team will start on the work." : "Thank you! Your account is now fully paid.",
            });
          }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Open quote: tick the items you want, see totals, accept & pay     */
/* ---------------------------------------------------------------- */

function QuoteReview({ quote, onDepositRaised }: { quote: Quote; onDepositRaised: (invoiceId: string) => void }) {
  const snags = useStore((s) => s.snags);
  const rooms = useStore((s) => s.rooms);
  const company = useStore((s) => s.settings.name);
  const contractor = useStore((s) => s.users.find((u) => u.role === "contractor"));
  const respondToQuote = useStore((s) => s.respondToQuote);
  const [chosen, setChosen] = useState<Record<string, boolean>>(() => Object.fromEntries(quote.items.map((i) => [i.snagId, true])));
  const [confirmDecline, setConfirmDecline] = useState(false);

  const preview = { ...quote, items: quote.items.map((i) => ({ ...i, decision: chosen[i.snagId] ? "accepted" : "declined" })) } as Quote;
  const t = quoteTotals(preview);
  const count = quote.items.filter((i) => chosen[i.snagId]).length;

  const accept = () => {
    const decisions = Object.fromEntries(quote.items.map((i) => [i.snagId, chosen[i.snagId] ? "accepted" : "declined"])) as Record<string, "accepted" | "declined">;
    const invoiceId = respondToQuote(quote.id, decisions);
    if (invoiceId) onDepositRaised(invoiceId);
    else toast({ title: "Quote accepted", body: "Your builder's team will be in touch to arrange the work." });
  };

  return (
    <section className="space-y-3">
      <div className="rounded-2xl bg-night bg-blueprint-dark p-4 text-white">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-highlight px-2 py-0.5 text-[11px] font-bold text-night">New</span>
          <p className="text-[12.5px] text-white/60">Quote {quote.number} · sent {formatDate(quote.sentAt ?? quote.createdAt)}</p>
        </div>
        <p className="mt-2 text-[18px] font-semibold tracking-tight">Your quote from {company}</p>
        {quote.message && (
          <div className="mt-3 flex gap-2.5 rounded-xl bg-white/[0.06] p-3">
            {contractor && <Avatar user={contractor} size={26} />}
            <p className="text-[12.5px] leading-relaxed text-white/75">“{quote.message}”</p>
          </div>
        )}
      </div>

      <p className="flex items-center gap-1.5 px-1 text-[12.5px] text-muted">
        <Sparkles className="size-3.5 text-brand-600" /> Untick anything you don&apos;t want fixed. The total updates as you go.
      </p>

      <ul className="space-y-2">
        {quote.items.map((i) => {
          const s = snags.find((x) => x.id === i.snagId);
          if (!s) return null;
          const on = !!chosen[i.snagId];
          return (
            <li key={i.snagId}>
              <label className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border bg-surface p-2.5 transition-colors", on ? "border-line" : "border-dashed border-line-strong bg-canvas opacity-60")}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => setChosen((c) => ({ ...c, [i.snagId]: e.target.checked }))}
                  className="size-5 shrink-0 accent-brand-600"
                  aria-label={`Include ${s.ref} ${s.title}`}
                />
                <SnagPhoto snag={s} className="size-12 shrink-0" rounded="rounded-lg" showBox={false} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <RefTag>{s.ref}</RefTag>
                    <SeverityBadge severity={s.severity} />
                  </div>
                  <p className={cn("mt-1 truncate text-[13.5px] font-medium", !on && "line-through")}>{s.title}</p>
                  <p className="truncate text-[11.5px] text-muted">{rooms.find((r) => r.id === s.roomId)?.name}</p>
                </div>
                <span className={cn("shrink-0 text-[13.5px] font-semibold tabular", !on && "text-faint")}>{i.price === 0 ? "Free" : formatGBP(i.price)}</span>
              </label>
            </li>
          );
        })}
      </ul>

      {/* Totals */}
      <div className="rounded-2xl border border-line bg-surface p-4">
        <dl className="space-y-1.5 text-[13.5px]">
          <div className="flex justify-between"><dt className="text-muted">{count} of {quote.items.length} items</dt><dd className="tabular">{formatGBP(t.net)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">VAT {Math.round(quote.vatRate * 100)}%</dt><dd className="tabular">{formatGBP(t.vat)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-[16px]"><dt className="font-semibold">Total</dt><dd className="font-semibold tabular">{formatGBP(t.gross)}</dd></div>
        </dl>
        {count > 0 && quote.depositPercent > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-canvas p-3 text-[12.5px]">
            <div><p className="text-muted">Deposit now ({quote.depositPercent}%)</p><p className="text-[15px] font-semibold tabular">{formatGBP(t.deposit)}</p></div>
            <div><p className="text-muted">When finished</p><p className="text-[15px] font-semibold tabular">{formatGBP(t.balance)}</p></div>
          </div>
        )}
        <Button size="lg" className="mt-4 w-full" disabled={count === 0} onClick={accept}>
          <CheckCircle2 className="size-4" />
          {count === 0 ? "Choose at least one item" : quote.depositPercent > 0 ? `Accept & pay ${formatGBP(t.deposit)} deposit` : "Accept quote"}
        </Button>
        <button onClick={() => setConfirmDecline(true)} className="mt-2 w-full py-2 text-[13px] font-medium text-muted hover:text-ink">
          Decline the whole quote
        </button>
      </div>

      <ConfirmDialog
        open={confirmDecline}
        icon={<XCircle className="size-5" />}
        title="Decline this quote?"
        description={`${company} will be told you don't want any of this work done. You can still message them if you change your mind.`}
        confirmLabel="Decline quote"
        onCancel={() => setConfirmDecline(false)}
        onConfirm={() => {
          respondToQuote(quote.id, Object.fromEntries(quote.items.map((i) => [i.snagId, "declined"])) as Record<string, "declined">);
          setConfirmDecline(false);
          toast({ title: "Quote declined", body: `${company} has been told.`, tone: "info" });
        }}
      />
    </section>
  );
}

function AnsweredQuote({ quote }: { quote: Quote }) {
  const t = quoteTotals(quote);
  const accepted = quote.items.filter((i) => i.decision === "accepted").length;
  const label = { accepted: "Accepted", partially_accepted: "Partly accepted", declined: "Declined", sent: "Awaiting reply", draft: "Draft" }[quote.status];
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[14px] font-semibold">Quote {quote.number}</p>
        <span className={cn("rounded-full border px-2 py-0.5 text-[11.5px] font-medium", quote.status === "declined" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>{label}</span>
      </div>
      <p className="mt-0.5 text-[12.5px] text-muted">
        {accepted} of {quote.items.length} items · replied {formatDate(quote.respondedAt ?? quote.sentAt ?? quote.createdAt)}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
        <div className="rounded-xl bg-canvas p-2.5"><p className="text-muted">Total</p><p className="text-[14px] font-semibold tabular">{formatGBP(t.gross)}</p></div>
        <div className="rounded-xl bg-canvas p-2.5"><p className="text-muted">Deposit</p><p className="text-[14px] font-semibold tabular">{formatGBP(t.deposit)}</p></div>
        <div className="rounded-xl bg-canvas p-2.5"><p className="text-muted">Balance</p><p className="text-[14px] font-semibold tabular">{formatGBP(t.balance)}</p></div>
      </div>
    </div>
  );
}

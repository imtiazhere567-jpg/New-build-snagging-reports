"use client";

import { useState } from "react";
import { CalendarClock, CheckCircle2, CreditCard, PartyPopper } from "lucide-react";
import { Modal } from "@/components/ui/overlay";
import { Button } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { PaymentSheet } from "@/components/owner/payment-sheet";
import { useStore } from "@/lib/data/store";
import { jobCompletion, quoteTotals } from "@/lib/data/queries";
import { formatDate, formatGBP } from "@/lib/utils";

/**
 * Shown to the owner straight after they confirm the last fix:
 * all the work is done, here's the final balance, pay it now by card (Stripe test mode) or later.
 */
export function BalanceDuePrompt({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const state = useStore();
  const markInvoicePaid = useStore((s) => s.markInvoicePaid);
  const [paying, setPaying] = useState(false);

  const inv = state.invoices.find((i) => i.id === invoiceId);
  const quote = state.quotes.find((q) => q.id === inv?.quoteId);
  if (!inv || !quote) return null;
  const t = quoteTotals(quote);
  const job = jobCompletion(state, quote);
  const depositPaid = state.invoices
    .filter((i) => i.quoteId === quote.id && i.kind === "deposit" && i.status === "paid")
    .reduce((a, i) => a + i.amount, 0);

  return (
    <>
      <Modal
        open={!paying}
        onClose={onClose}
        icon={<PartyPopper className="size-5 text-brand-700" />}
        title="All your snags are fixed"
        description={`${job.verified} ${job.verified === 1 ? "job" : "jobs"} confirmed by you. Only the final balance is left.`}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>Pay later</Button>
            <Button onClick={() => setPaying(true)}>
              <CreditCard className="size-4" /> Pay {formatGBP(inv.amount)} now
            </Button>
          </>
        }
      >
        <div className="rounded-2xl bg-night bg-blueprint-dark p-5 text-white">
          <p className="text-[12px] text-white/55">Final balance · invoice {inv.number}</p>
          <p className="mt-1 text-[32px] font-semibold tracking-[-0.02em] tabular">{formatGBP(inv.amount)}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-white/60">
            <CalendarClock className="size-3.5" /> Due by {formatDate(inv.dueAt)}
          </p>
        </div>
        <div className="mt-4 space-y-2 text-[13.5px]">
          <Row label="Total for the work (inc. VAT)" value={formatGBP(t.gross)} />
          <Row
            label={
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-600" /> Deposit you already paid
              </span>
            }
            value={`− ${formatGBP(depositPaid)}`}
          />
          <div className="border-t border-line pt-2">
            <Row label={<b className="font-semibold">Left to pay</b>} value={<b className="font-semibold">{formatGBP(inv.amount)}</b>} />
          </div>
        </div>
        <p className="mt-4 text-[12px] text-muted">
          Pay securely by card. You can also pay any time later from the <b className="font-medium text-ink-2">Quote</b> tab.
        </p>
      </Modal>

      {paying && (
        <PaymentSheet
          amount={inv.amount}
          title="Pay the final balance"
          description={`Invoice ${inv.number} · ${quote.number}`}
          onClose={() => setPaying(false)}
          onPaid={() => {
            markInvoicePaid(inv.id);
            toast({ title: `${formatGBP(inv.amount)} paid`, body: "Thank you! Your account is now fully paid." });
            onClose();
          }}
        />
      )}
    </>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-2">{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}

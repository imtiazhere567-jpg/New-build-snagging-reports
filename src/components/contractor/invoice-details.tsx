"use client";

import { useState } from "react";
import { BellRing, CheckCircle2, CreditCard, History, Receipt } from "lucide-react";
import { Modal } from "@/components/ui/overlay";
import { Button } from "@/components/ui/primitives";
import { LogoMark } from "@/components/ui/logo";
import { ConfirmDialog } from "@/components/ui/confirm";
import { ReminderDialog } from "./reminder-dialog";
import { ReminderHistory, useReminders } from "./reminder-history";
import type { EmailOverride } from "@/lib/data/store";
import { toast } from "@/components/ui/toast";
import { useStore } from "@/lib/data/store";
import { quoteTotals } from "@/lib/data/queries";
import { cn, formatDate, formatDateTime, formatGBP, timeAgo } from "@/lib/utils";

/** Invoice laid out like the document the owner receives. */
export function InvoiceDocument({ invoiceId }: { invoiceId: string }) {
  const state = useStore();
  const [now] = useState(() => Date.now());
  const inv = state.invoices.find((i) => i.id === invoiceId);
  if (!inv) return null;
  const q = state.quotes.find((x) => x.id === inv.quoteId);
  const p = state.properties.find((x) => x.id === inv.propertyId)!;
  const owner = state.users.find((u) => u.id === p.ownerId)!;
  const pay = state.payments.find((x) => x.invoiceId === inv.id);
  const t = q ? quoteTotals(q) : null;
  const overdue = inv.status === "unpaid" && Date.parse(inv.dueAt) < now;
  const net = inv.amount / (1 + (q?.vatRate ?? 0.2));
  const vat = inv.amount - net;
  const s = state.settings;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface">
      {/* Status stamp */}
      <div
        className={cn(
          "absolute top-6 right-[-44px] rotate-[35deg] px-14 py-1 text-[11px] font-bold tracking-[0.2em] uppercase",
          inv.status === "paid" ? "bg-emerald-500 text-white" : overdue ? "bg-sev-major text-white" : "bg-amber-400 text-ink",
        )}
      >
        {inv.status === "paid" ? "Paid" : overdue ? "Overdue" : "Due"}
      </div>

      <div className="p-6 sm:p-7">
        <div className="flex items-start gap-3">
          <LogoMark className="size-10" />
          <div className="text-[12.5px] leading-relaxed text-muted">
            <p className="text-[14px] font-semibold text-ink">{s.name}</p>
            <p>{s.address}</p>
            <p>{s.phone} · {s.email}</p>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Invoice</p>
            <p className="mt-0.5 text-[24px] font-semibold tracking-tight">{inv.number}</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12.5px]">
            <dt className="text-muted">Issued</dt>
            <dd className="font-medium">{formatDate(inv.issuedAt)}</dd>
            <dt className="text-muted">Due</dt>
            <dd className={cn("font-medium", overdue && "text-sev-major")}>{formatDate(inv.dueAt)}</dd>
            {q && (
              <>
                <dt className="text-muted">Quote</dt>
                <dd className="font-medium">{q.number}</dd>
              </>
            )}
          </dl>
        </div>

        <div className="mt-6 grid gap-4 rounded-xl bg-canvas p-4 text-[13px] sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Bill to</p>
            <p className="mt-1 font-medium">{owner.name}</p>
            <p className="text-ink-2">{owner.email}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Property</p>
            <p className="mt-1 font-medium">{p.addressLine1}</p>
            <p className="text-ink-2">{p.town} {p.postcode} · {p.plot}</p>
          </div>
        </div>

        <table className="mt-6 w-full text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-muted">
              <th className="pb-2 font-semibold">Description</th>
              <th className="pb-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-line">
              <td className="py-3 pr-4">
                <p className="font-medium">{inv.kind === "deposit" ? `Deposit (${q?.depositPercent ?? 30}%) to book snag repairs` : "Final balance for completed snag repairs"}</p>
                {q && t && (
                  <p className="mt-0.5 text-[12px] text-muted">
                    Quote {q.number} · {t.count} {t.count === 1 ? "item" : "items"} · quote total {formatGBP(t.gross)} inc. VAT
                  </p>
                )}
              </td>
              <td className="py-3 text-right font-medium tabular">{formatGBP(net)}</td>
            </tr>
          </tbody>
        </table>
        <dl className="mt-3 ml-auto max-w-[260px] space-y-1 text-[13px]">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular">{formatGBP(net)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">VAT {Math.round((q?.vatRate ?? 0.2) * 100)}%</dt><dd className="tabular">{formatGBP(vat)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-[15px]"><dt className="font-semibold">Total</dt><dd className="font-semibold tabular">{formatGBP(inv.amount)}</dd></div>
        </dl>

        <div className={cn("mt-6 flex items-start gap-3 rounded-xl border p-3.5 text-[12.5px]", inv.status === "paid" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-line bg-canvas text-ink-2")}>
          {inv.status === "paid" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <CreditCard className="mt-0.5 size-4 shrink-0 text-muted" />}
          {inv.status === "paid" && pay ? (
            <p>
              Paid {formatDateTime(pay.paidAt)} by card ending {pay.cardLast4}. Stripe reference <span className="font-mono">{pay.reference}</span> (test mode).
            </p>
          ) : (
            <p>Pay securely by card from the SnagSnap link in your email. Payments are processed by Stripe (test mode in this demo).</p>
          )}
        </div>
        <p className="mt-5 text-[11px] leading-relaxed text-faint">{s.reportFooter}</p>
      </div>
    </div>
  );
}

/** Popup wrapper with contractor actions. Each action asks for confirmation, then shows a success message. */
export function InvoiceModal({ invoiceId, onClose }: { invoiceId: string | null; onClose: () => void }) {
  const state = useStore();
  const [confirm, setConfirm] = useState<"remind" | "paid" | null>(null);
  const [reminded, setReminded] = useState<string | null>(null);
  const inv = state.invoices.find((i) => i.id === invoiceId);
  const reminders = useReminders(inv?.id);
  if (!inv) return null;
  const p = state.properties.find((x) => x.id === inv.propertyId);
  const owner = state.users.find((u) => u.id === p?.ownerId);
  const first = owner?.name.split(/\s|&/)[0] ?? "";

  const doRemind = (email: EmailOverride, edited: boolean) => {
    state.sendInvoiceReminder(inv.id, { ...email, edited });
    setReminded(inv.id);
    setConfirm(null);
    toast({
      title: `Reminder sent to ${owner?.name}`,
      body: `${edited ? "Your edited message" : `Invoice ${inv.number} for ${formatGBP(inv.amount)}`} · emailed to ${owner?.email}`,
    });
  };
  const doPaid = () => {
    state.markInvoicePaid(inv.id);
    setConfirm(null);
    toast({ title: `${inv.number} marked as paid`, body: `${formatGBP(inv.amount)} received by test card ending 4242. A receipt was emailed to ${owner?.name}.` });
  };

  return (
    <>
      <Modal
        open
        size="lg"
        onClose={() => {
          setReminded(null);
          onClose();
        }}
        icon={<Receipt className="size-5" />}
        title={`Invoice ${inv.number}`}
        description={inv.kind === "deposit" ? "Deposit invoice" : "Final balance invoice"}
        footer={
          inv.status === "unpaid" ? (
            <>
              <span className="mr-auto flex items-center gap-1.5 text-[12.5px] text-muted">
                {reminded === inv.id ? (
                  <>
                    <CheckCircle2 className="size-4 text-brand-600" /> Reminder sent to {owner?.email}
                  </>
                ) : reminders.length ? (
                  <>
                    <History className="size-4" /> {reminders.length} {reminders.length === 1 ? "reminder" : "reminders"} sent · last {timeAgo(reminders[0].sentAt)}
                  </>
                ) : (
                  "Stripe test card 4242 4242 4242 4242"
                )}
              </span>
              <Button variant="secondary" onClick={() => setConfirm("remind")}>
                <BellRing className="size-4" /> {reminded === inv.id || reminders.length ? "Send another" : "Send reminder"}
              </Button>
              <Button onClick={() => setConfirm("paid")}>
                <CreditCard className="size-4" /> Mark as paid (test)
              </Button>
            </>
          ) : (
            <Button onClick={onClose}>Close</Button>
          )
        }
      >
        <InvoiceDocument invoiceId={inv.id} />
        <ReminderHistory refId={inv.id} label="invoice" />
      </Modal>

      {confirm === "remind" && (
        <ReminderDialog
          title={`Send a reminder to ${owner?.name}?`}
          description={`Invoice ${inv.number} · ${formatGBP(inv.amount)} · due ${formatDate(inv.dueAt)}`}
          to={owner?.email ?? ""}
          defaultSubject={`Reminder: invoice ${inv.number} for ${formatGBP(inv.amount)}`}
          defaultBody={`Hi ${first},\n\nA friendly reminder that invoice ${inv.number} for ${formatGBP(inv.amount)} is due. You can pay securely by card from your SnagSnap account.\n\n${state.settings.name}`}
          onSend={doRemind}
          onCancel={() => setConfirm(null)}
        />
      )}

      <ConfirmDialog
        open={confirm === "paid"}
        icon={<CreditCard className="size-5" />}
        title={`Mark ${inv.number} as paid?`}
        description="This records a Stripe test-card payment. No real money moves."
        confirmLabel={`Record ${formatGBP(inv.amount)} payment`}
        confirmIcon={<CreditCard className="size-4" />}
        onConfirm={doPaid}
        onCancel={() => setConfirm(null)}
      >
        <dl className="space-y-2 rounded-xl border border-line bg-canvas p-4 text-[13px]">
          <div className="flex justify-between"><dt className="text-muted">From</dt><dd className="font-medium">{owner?.name}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Amount</dt><dd className="font-semibold tabular">{formatGBP(inv.amount)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Card</dt><dd className="font-medium">Visa •••• 4242 (test)</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Then</dt><dd className="text-ink-2">A receipt is emailed to the owner</dd></div>
        </dl>
      </ConfirmDialog>
    </>
  );
}

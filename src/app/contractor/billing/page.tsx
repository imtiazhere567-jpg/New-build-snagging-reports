"use client";

import { useState } from "react";
import { BellRing, ChartColumn, CheckCircle2, ChevronRight, CreditCard, FileText, FlaskConical, PoundSterling, Receipt, Search, Sparkles, X } from "lucide-react";
import { PageHeader } from "@/components/shell/contractor-shell";
import { Avatar, Button } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/overlay";
import { Paginated } from "@/components/ui/pagination";
import { QuoteDetails } from "@/components/contractor/quote-details";
import { InvoiceModal } from "@/components/contractor/invoice-details";
import { RevenueView } from "@/components/contractor/revenue-view";
import { ConfirmDialog } from "@/components/ui/confirm";
import { ReminderDialog } from "@/components/contractor/reminder-dialog";
import { ReminderHistory } from "@/components/contractor/reminder-history";
import { toast } from "@/components/ui/toast";
import { useStore } from "@/lib/data/store";
import { quoteTotals } from "@/lib/data/queries";
import { cn, formatDate, formatDateTime, formatGBP, timeAgo } from "@/lib/utils";

type Tab = "revenue" | "quotes" | "invoices" | "payments";

const QUOTE_FILTERS = [
  { key: "all", label: "All" },
  { key: "sent", label: "Awaiting reply" },
  { key: "accepted", label: "Accepted" },
  { key: "partially_accepted", label: "Partly accepted" },
  { key: "declined", label: "Declined" },
] as const;

const INVOICE_FILTERS = [
  { key: "all", label: "All" },
  { key: "unpaid", label: "Unpaid" },
  { key: "overdue", label: "Overdue" },
  { key: "paid", label: "Paid" },
] as const;

const QUOTE_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "border-zinc-200 bg-zinc-100 text-zinc-600" },
  sent: { label: "Awaiting reply", cls: "border-indigo-200 bg-indigo-50 text-indigo-700" },
  accepted: { label: "Accepted", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  partially_accepted: { label: "Partly accepted", cls: "border-amber-200 bg-amber-50 text-amber-800" },
  declined: { label: "Declined", cls: "border-red-200 bg-red-50 text-red-700" },
};

export default function BillingPage() {
  const state = useStore();
  const { createBalanceInvoice, sendQuoteReminder, markInvoicePaid } = state;
  const [now] = useState(() => Date.now());
  const [tab, setTab] = useState<Tab>("revenue");
  const [q, setQ] = useState("");
  const [quoteFilter, setQuoteFilter] = useState<(typeof QUOTE_FILTERS)[number]["key"]>("all");
  const [invFilter, setInvFilter] = useState<(typeof INVOICE_FILTERS)[number]["key"]>("all");
  const [quoteOpen, setQuoteOpen] = useState<string | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState<string | null>(null);
  const [reminded, setReminded] = useState<string | null>(null);
  const [confirmQuote, setConfirmQuote] = useState<string | null>(null);
  const [confirmPaid, setConfirmPaid] = useState<string | null>(null);

  const homeOf = (propertyId: string) => {
    const p = state.properties.find((x) => x.id === propertyId);
    return { p, owner: state.users.find((u) => u.id === p?.ownerId) };
  };
  const remindCount = (refId: string) => state.emails.filter((e) => e.refId === refId).length;
  const isOverdue = (i: (typeof state.invoices)[number]) => i.status === "unpaid" && Date.parse(i.dueAt) < now;

  /* ---------- KPIs ---------- */
  const awaiting = state.quotes.filter((x) => x.status === "sent");
  const acceptedQuotes = state.quotes.filter((x) => x.status === "accepted" || x.status === "partially_accepted");
  const collected = state.payments.reduce((a, x) => a + x.amount, 0);
  const unpaid = state.invoices.filter((i) => i.status === "unpaid");
  const overdueCount = unpaid.filter(isOverdue).length;

  /* ---------- Jobs ready for their final invoice ---------- */
  const ready = acceptedQuotes.filter((qt) => {
    const accepted = qt.items.filter((i) => i.decision === "accepted").map((i) => i.snagId);
    const done = accepted.length > 0 && accepted.every((id) => state.snags.find((s) => s.id === id)?.status === "verified");
    return done && !state.invoices.some((i) => i.quoteId === qt.id && i.kind === "balance");
  });

  /* ---------- Search ---------- */
  const term = q.trim().toLowerCase();
  const matchHome = (propertyId: string, ...extra: (string | undefined)[]) => {
    if (!term) return true;
    const { p, owner } = homeOf(propertyId);
    return [p?.addressLine1, p?.town, p?.postcode, owner?.name, ...extra].some((v) => v?.toLowerCase().includes(term));
  };

  const quotes = [...state.quotes].sort((a, b) => (b.sentAt ?? b.createdAt).localeCompare(a.sentAt ?? a.createdAt));
  const invoices = [...state.invoices].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  const payments = [...state.payments].sort((a, b) => b.paidAt.localeCompare(a.paidAt));

  const quoteList = quotes.filter((x) => (quoteFilter === "all" || x.status === quoteFilter) && matchHome(x.propertyId, x.number));
  const invList = invoices.filter(
    (i) =>
      (invFilter === "all" || (invFilter === "overdue" ? isOverdue(i) : invFilter === "unpaid" ? i.status === "unpaid" : i.status === "paid")) &&
      matchHome(i.propertyId, i.number),
  );
  const payList = payments.filter((x) => matchHome(x.propertyId, x.reference, state.invoices.find((i) => i.id === x.invoiceId)?.number));

  const openQuote = quoteOpen ? state.quotes.find((x) => x.id === quoteOpen) : null;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Quotes & invoices"
        description="Quotes you've sent, deposits and balances invoiced, and every card payment."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[12px] font-semibold text-brand-700">
            <FlaskConical className="size-3.5" /> Stripe test mode · no real money
          </span>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi dark label="Awaiting reply" value={formatGBP(awaiting.reduce((a, x) => a + quoteTotals(x).gross, 0))} sub={`${awaiting.length} ${awaiting.length === 1 ? "quote" : "quotes"} sent`} onClick={() => { setTab("quotes"); setQuoteFilter("sent"); }} />
        <Kpi label="Accepted work" value={formatGBP(acceptedQuotes.reduce((a, x) => a + quoteTotals(x).gross, 0))} sub={`${acceptedQuotes.length} accepted quotes`} onClick={() => { setTab("quotes"); setQuoteFilter("accepted"); }} />
        <Kpi label="Collected" value={formatGBP(collected)} sub={`${state.payments.length} card payments`} onClick={() => setTab("revenue")} />
        <Kpi
          label="Outstanding"
          value={formatGBP(unpaid.reduce((a, i) => a + i.amount, 0))}
          sub={overdueCount ? `${overdueCount} overdue` : `${unpaid.length} unpaid`}
          warn={overdueCount > 0}
          onClick={() => { setTab("invoices"); setInvFilter(overdueCount ? "overdue" : "unpaid"); }}
        />
      </div>

      {/* Ready to invoice */}
      {ready.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4">
          <Sparkles className="size-5 text-brand-600" />
          <p className="flex-1 text-[13.5px] text-brand-900">
            <b className="font-semibold">{ready.length} {ready.length === 1 ? "job is" : "jobs are"} complete.</b> Every accepted snag is verified, so the final balance can be invoiced.
          </p>
          {ready.map((qt) => (
            <Button
              key={qt.id}
              size="sm"
              onClick={() => {
                const id = createBalanceInvoice(qt.id);
                if (id) {
                  toast({ title: "Balance invoice sent", body: `Final invoice emailed to ${homeOf(qt.propertyId).owner?.name} for ${homeOf(qt.propertyId).p?.addressLine1}.` });
                  setTab("invoices");
                  setInvoiceOpen(id);
                }
              }}
            >
              Invoice {homeOf(qt.propertyId).p?.addressLine1}
            </Button>
          ))}
        </div>
      )}

      {/* Tabs + toolbar */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex max-w-full overflow-x-auto rounded-xl border border-line-strong bg-surface p-0.5 scrollbar-none" role="tablist">
          {(
            [
              ["revenue", "Revenue", ChartColumn, null],
              ["quotes", "Quotes", FileText, state.quotes.length],
              ["invoices", "Invoices", Receipt, state.invoices.length],
              ["payments", "Payments", CreditCard, state.payments.length],
            ] as const
          ).map(([key, label, Icon, n]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "inline-flex h-9 shrink-0 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-3.5 text-[13px] font-medium transition-colors lg:flex-none",
                tab === key ? "bg-ink text-white" : "text-ink-2 hover:bg-sunken",
              )}
            >
              <Icon className="size-4" /> {label}
              {n != null && <span className={cn("rounded px-1 text-[11px] tabular", tab === key ? "bg-white/15" : "bg-sunken text-muted")}>{n}</span>}
            </button>
          ))}
        </div>
        <div className={cn("relative lg:ml-auto lg:w-80", tab === "revenue" && "hidden")}>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Address, owner, or quote/invoice no."
            aria-label="Search billing"
            className="h-10 w-full rounded-xl border border-line-strong bg-surface pr-8 pl-9 text-[13.5px] outline-none placeholder:text-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
          />
          {q && (
            <button onClick={() => setQ("")} className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-faint hover:text-ink" aria-label="Clear search">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Status chips */}
      {(tab === "quotes" || tab === "invoices") && (
        <div className="mt-3 flex gap-1 overflow-x-auto scrollbar-none">
          {(tab === "quotes" ? QUOTE_FILTERS : INVOICE_FILTERS).map((fl) => {
            const active = tab === "quotes" ? quoteFilter === fl.key : invFilter === fl.key;
            const n =
              tab === "quotes"
                ? fl.key === "all" ? quotes.length : quotes.filter((x) => x.status === fl.key).length
                : fl.key === "all" ? invoices.length : fl.key === "overdue" ? invoices.filter(isOverdue).length : invoices.filter((i) => i.status === fl.key).length;
            return (
              <button
                key={fl.key}
                onClick={() => (tab === "quotes" ? setQuoteFilter(fl.key as typeof quoteFilter) : setInvFilter(fl.key as typeof invFilter))}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-medium transition-colors",
                  active ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-2 hover:bg-sunken",
                )}
              >
                {fl.label}
                <span className={cn("rounded px-1 text-[11px] tabular", active ? "bg-white/15" : "bg-sunken text-muted")}>{n}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        {tab === "revenue" && <RevenueView onOpenInvoice={setInvoiceOpen} />}

        {/* ---------- Quotes ---------- */}
        {tab === "quotes" && (
          <Table
            head={["Quote", "Home", "Items", "Total", "Status"]}
            cols="lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.1fr)_24px]"
          >
            <Paginated
              key={`q|${quoteFilter}|${term}`}
              items={quoteList}
              pageSize={8}
              className="divide-y divide-line"
              empty={<Empty text="No quotes match." />}
              render={(x) => {
                const { p, owner } = homeOf(x.propertyId);
                const t = quoteTotals(x);
                const acc = x.items.filter((i) => i.decision === "accepted").length;
                const st = QUOTE_STATUS[x.status];
                return (
                  <Row key={x.id} cols="lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.1fr)_24px]" onClick={() => setQuoteOpen(x.id)} label={`Open quote ${x.number}`}>
                    <div>
                      <p className="text-[13.5px] font-semibold">{x.number}</p>
                      <p className="text-[12px] text-muted">Sent {formatDate(x.sentAt ?? x.createdAt)}</p>
                    </div>
                    <HomeCell owner={owner} address={`${p?.addressLine1}, ${p?.town}`} />
                    <div>
                      <p className="text-[13px] text-ink-2">{x.status === "sent" ? `${x.items.length} quoted` : `${acc}/${x.items.length} accepted`}</p>
                      {remindCount(x.id) > 0 && (
                        <p className="flex items-center gap-1 text-[11.5px] text-muted"><BellRing className="size-3" /> Reminded {remindCount(x.id)}×</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[13.5px] font-semibold tabular">{formatGBP(t.gross)}</p>
                      <p className="text-[12px] text-muted">{x.depositPercent}% deposit · {formatGBP(t.deposit)}</p>
                    </div>
                    <span><span className={cn("rounded-full border px-2 py-0.5 text-[11.5px] font-medium", st.cls)}>{st.label}</span></span>
                  </Row>
                );
              }}
            />
          </Table>
        )}

        {/* ---------- Invoices ---------- */}
        {tab === "invoices" && (
          <Table head={["Invoice", "Home", "Due", "Amount", "Status"]} cols="lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.3fr)_24px]">
            <Paginated
              key={`i|${invFilter}|${term}`}
              items={invList}
              pageSize={8}
              className="divide-y divide-line"
              empty={<Empty text="No invoices match." />}
              render={(i) => {
                const { p, owner } = homeOf(i.propertyId);
                const late = isOverdue(i);
                return (
                  <Row key={i.id} cols="lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.3fr)_24px]" onClick={() => setInvoiceOpen(i.id)} label={`Open invoice ${i.number}`}>
                    <div>
                      <p className="text-[13.5px] font-semibold">{i.number}</p>
                      <p className="text-[12px] text-muted capitalize">{i.kind} · {formatDate(i.issuedAt)}</p>
                    </div>
                    <HomeCell owner={owner} address={`${p?.addressLine1}, ${p?.town}`} />
                    <div>
                      <p className={cn("text-[13px]", late ? "font-semibold text-sev-major" : "text-ink-2")}>
                        {i.status === "paid" ? `Paid ${formatDate(i.paidAt!)}` : late ? `${timeAgo(i.dueAt).replace(" ago", "")} late` : formatDate(i.dueAt)}
                      </p>
                      {remindCount(i.id) > 0 && (
                        <p className="flex items-center gap-1 text-[11.5px] text-muted"><BellRing className="size-3" /> Reminded {remindCount(i.id)}×</p>
                      )}
                    </div>
                    <p className="text-[13.5px] font-semibold tabular">{formatGBP(i.amount)}</p>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11.5px] font-medium",
                          i.status === "paid" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : late ? "border-orange-200 bg-orange-50 text-sev-major" : "border-amber-200 bg-amber-50 text-amber-800",
                        )}
                      >
                        {i.status === "paid" ? "Paid" : late ? "Overdue" : "Unpaid"}
                      </span>
                      {i.status === "unpaid" && (
                        <button
                          onClick={() => setConfirmPaid(i.id)}
                          className="hidden rounded-lg border border-line-strong px-2 py-1 text-[11.5px] font-medium text-ink-2 hover:bg-sunken xl:inline-flex"
                        >
                          Mark paid
                        </button>
                      )}
                    </div>
                  </Row>
                );
              }}
            />
          </Table>
        )}

        {/* ---------- Payments ---------- */}
        {tab === "payments" && (
          <Table head={["Paid", "Home", "Invoice", "Card", "Amount"]} cols="lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,0.8fr)_24px]">
            <Paginated
              key={`p|${term}`}
              items={payList}
              pageSize={8}
              className="divide-y divide-line"
              empty={<Empty text="No payments match." />}
              render={(x) => {
                const { p, owner } = homeOf(x.propertyId);
                const inv = state.invoices.find((i) => i.id === x.invoiceId);
                return (
                  <Row key={x.id} cols="lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,0.8fr)_24px]" onClick={() => inv && setInvoiceOpen(inv.id)} label={`Open invoice ${inv?.number}`}>
                    <p className="text-[13px] text-ink-2">{formatDateTime(x.paidAt)}</p>
                    <HomeCell owner={owner} address={`${p?.addressLine1}, ${p?.town}`} />
                    <p className="text-[13px]">
                      <span className="font-medium">{inv?.number}</span> <span className="text-muted capitalize">· {inv?.kind}</span>
                    </p>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[13px]"><CreditCard className="size-3.5 text-muted" /> •••• {x.cardLast4}</p>
                      <p className="truncate font-mono text-[11px] text-faint">{x.reference}</p>
                    </div>
                    <p className="text-[13.5px] font-semibold tabular text-emerald-700">+{formatGBP(x.amount)}</p>
                  </Row>
                );
              }}
            />
          </Table>
        )}
      </div>

      {/* Quote popup */}
      {openQuote && (
        <Modal
          open
          size="lg"
          onClose={() => setQuoteOpen(null)}
          icon={<PoundSterling className="size-5" />}
          title={`Quote ${openQuote.number}`}
          description={`${homeOf(openQuote.propertyId).p?.addressLine1}, ${homeOf(openQuote.propertyId).p?.town}`}
          footer={
            <>
              {openQuote.status === "sent" && (
                <>
                  {reminded === openQuote.id && (
                    <span className="mr-auto flex items-center gap-1.5 text-[12.5px] text-muted">
                      <CheckCircle2 className="size-4 text-brand-600" /> Reminder sent to {homeOf(openQuote.propertyId).owner?.email}
                    </span>
                  )}
                  <Button variant="secondary" onClick={() => setConfirmQuote(openQuote.id)}>
                    <BellRing className="size-4" /> {reminded === openQuote.id || remindCount(openQuote.id) ? "Send another" : "Send reminder"}
                  </Button>
                </>
              )}
              <Button onClick={() => setQuoteOpen(null)}>Close</Button>
            </>
          }
        >
          <QuoteDetails quoteId={openQuote.id} />
          <ReminderHistory refId={openQuote.id} label="quote" />
        </Modal>
      )}

      <InvoiceModal invoiceId={invoiceOpen} onClose={() => setInvoiceOpen(null)} />

      {/* Confirm: quote reminder */}
      {confirmQuote && (() => {
        const qt = state.quotes.find((x) => x.id === confirmQuote)!;
        const { p, owner } = homeOf(qt.propertyId);
        return (
          <ReminderDialog
            title={`Send a reminder to ${owner?.name}?`}
            description={`Quote ${qt.number} · ${formatGBP(quoteTotals(qt).gross)} · sent ${formatDate(qt.sentAt ?? qt.createdAt)}`}
            to={owner?.email ?? ""}
            defaultSubject={`Reminder: your quote ${qt.number} is waiting`}
            defaultBody={`Hi ${owner?.name.split(/\s|&/)[0]},\n\nJust a reminder that quote ${qt.number} for ${p?.addressLine1} is waiting for you. You can accept or decline each item individually.\n\n${state.settings.name}`}
            onCancel={() => setConfirmQuote(null)}
            onSend={(email, edited) => {
              sendQuoteReminder(qt.id, { ...email, edited });
              setReminded(qt.id);
              setConfirmQuote(null);
              toast({ title: `Reminder sent to ${owner?.name}`, body: `${edited ? "Your edited message" : `Quote ${qt.number}`} · emailed to ${owner?.email}` });
            }}
          />
        );
      })()}

      {/* Confirm: mark an invoice paid from the list */}
      {confirmPaid && (() => {
        const inv = state.invoices.find((i) => i.id === confirmPaid)!;
        const { owner } = homeOf(inv.propertyId);
        return (
          <ConfirmDialog
            open
            icon={<CreditCard className="size-5" />}
            title={`Mark ${inv.number} as paid?`}
            description="This records a Stripe test-card payment. No real money moves."
            confirmLabel={`Record ${formatGBP(inv.amount)} payment`}
            confirmIcon={<CreditCard className="size-4" />}
            onCancel={() => setConfirmPaid(null)}
            onConfirm={() => {
              markInvoicePaid(inv.id);
              setConfirmPaid(null);
              toast({ title: `${inv.number} marked as paid`, body: `${formatGBP(inv.amount)} from ${owner?.name} by test card ending 4242. Receipt emailed.` });
            }}
          >
            <dl className="space-y-2 rounded-xl border border-line bg-canvas p-4 text-[13px]">
              <div className="flex justify-between"><dt className="text-muted">From</dt><dd className="font-medium">{owner?.name}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Amount</dt><dd className="font-semibold tabular">{formatGBP(inv.amount)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Card</dt><dd className="font-medium">Visa •••• 4242 (test)</dd></div>
            </dl>
          </ConfirmDialog>
        );
      })()}
    </div>
  );
}

/* ---------------------------------------------------------------- */

function Kpi({ label, value, sub, dark, warn, onClick }: { label: string; value: string; sub: string; dark?: boolean; warn?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lift sm:p-5",
        dark ? "bg-night text-white" : "border border-line bg-surface shadow-card",
      )}
    >
      <p className={cn("text-[12.5px] font-medium", dark ? "text-white/60" : "text-muted")}>{label}</p>
      <p className={cn("mt-2.5 text-[24px] font-semibold tracking-tight tabular", warn && "text-sev-major")}>{value}</p>
      <p className={cn("mt-0.5 truncate text-[12.5px]", dark ? "text-white/50" : warn ? "font-medium text-sev-major" : "text-muted")}>{sub}</p>
    </button>
  );
}

function Table({ head, cols, children }: { head: string[]; cols: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className={cn("hidden items-center gap-4 border-b border-line bg-canvas px-5 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted lg:grid", cols)}>
        {head.map((h) => <span key={h}>{h}</span>)}
        <span />
      </div>
      {children}
    </div>
  );
}

function Row({ cols, onClick, label, children }: { cols: string; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick())}
      className={cn("group grid cursor-pointer grid-cols-2 items-center gap-x-4 gap-y-2 px-5 py-3.5 outline-none transition-colors hover:bg-canvas focus-visible:bg-canvas lg:gap-y-0", cols)}
    >
      {children}
      <ChevronRight className="hidden size-4 text-faint transition-transform group-hover:translate-x-0.5 lg:block" />
    </div>
  );
}

function HomeCell({ owner, address }: { owner?: ReturnType<typeof useStore.getState>["users"][number]; address: string }) {
  return (
    <div className="col-span-2 flex min-w-0 items-center gap-2.5 lg:col-span-1">
      <Avatar user={owner} size={30} />
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-medium">{owner?.name}</p>
        <p className="truncate text-[12px] text-muted">{address}</p>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-14 text-center text-[13.5px] text-muted">{text}</p>;
}

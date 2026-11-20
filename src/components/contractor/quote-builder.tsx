"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Inbox, RotateCcw, Send, Sparkles } from "lucide-react";
import { Avatar, Button, ButtonLink, Card, RefTag, SeverityBadge } from "@/components/ui/primitives";
import { SnagPhoto } from "@/components/ui/snag-photo";
import { Dropdown } from "@/components/ui/dropdown";
import { QuoteDetails } from "./quote-details";
import { useStore } from "@/lib/data/store";
import { quoteTotals } from "@/lib/data/queries";
import { ratePrice } from "@/lib/rate-card";
import { TRADE_LABEL } from "@/lib/constants";
import { cn, formatGBP, timeAgo } from "@/lib/utils";

const DEPOSIT_PRESETS = [0, 25, 30, 50, 100];

/* ---------------------------------------------------------------- */

export function QuoteBuilder({ reportId, onSent, embedded }: { reportId: string; onSent: (quoteId: string) => void; embedded?: boolean }) {
  const state = useStore();
  const report = state.reports.find((r) => r.id === reportId)!;
  const property = state.properties.find((p) => p.id === report.propertyId)!;
  const owner = state.users.find((u) => u.id === property.ownerId)!;
  const snags = state.snags.filter((s) => s.reportId === reportId);
  const first = owner.name.split(/\s|&/)[0];

  const ratePrices = useMemo(
    () => Object.fromEntries(snags.map((s) => [s.id, ratePrice(state.rateCard, s.category, s.severity)])),
    [snags, state.rateCard],
  );
  const [prices, setPrices] = useState<Record<string, number>>(ratePrices);
  const [noCharge, setNoCharge] = useState<Record<string, boolean>>({});
  const [deposit, setDeposit] = useState(state.settings.defaultDepositPercent);
  const [validDays, setValidDays] = useState(state.settings.quoteValidDays);
  const [message, setMessage] = useState(state.settings.quoteMessage);

  const groups = state.rooms
    .filter((r) => r.propertyId === property.id)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((room) => ({ room, items: snags.filter((s) => s.roomId === room.id) }))
    .filter((g) => g.items.length);

  const lineItems = snags.map((s) => ({ snagId: s.id, price: noCharge[s.id] ? 0 : Math.max(0, prices[s.id] || 0) }));
  const totals = quoteTotals({
    items: lineItems.map((i) => ({ ...i, decision: "pending" as const })),
    vatRate: state.settings.vatRate,
    depositPercent: deposit,
  } as never);
  const charged = lineItems.filter((i) => i.price > 0).length;
  const isDefaultDeposit = deposit === state.settings.defaultDepositPercent;

  const send = () => {
    const q = state.sendQuote({ reportId, items: lineItems, depositPercent: deposit, message, validDays });
    onSent(q.id);
  };

  return (
    <div className="@container animate-fade-up">
      {!embedded && (
        <Link href="/contractor" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
      )}
      <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", embedded ? "" : "mt-3")}>
        <div>
          {!embedded && <h1 className="text-[26px] font-semibold tracking-[-0.02em]">New quote</h1>}
          <p className={cn("text-[14px] text-muted", !embedded && "mt-1")}>
            {embedded
              ? `${snags.length} items · report submitted ${timeAgo(report.submittedAt ?? report.createdAt)}`
              : `${property.addressLine1}, ${property.town} · ${property.plot} · report submitted ${timeAgo(report.submittedAt ?? report.createdAt)}`}
          </p>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface py-2 pr-4 pl-2">
          <Avatar user={owner} size={32} />
          <div className="text-[12.5px] leading-tight">
            <p className="font-medium">{owner.name}</p>
            <p className="text-muted">{owner.email}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 @4xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Items */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight">Line items</h2>
              <p className="text-[12.5px] text-muted">Prices are auto-filled from your rate card. Edit any of them.</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setPrices(ratePrices);
                setNoCharge({});
              }}
            >
              <RotateCcw className="size-3.5" /> Reset to rate card
            </Button>
          </div>

          <div className="divide-y divide-line">
            {groups.map(({ room, items }) => (
              <section key={room.id} className="px-5 py-4">
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">
                  {room.name} <span className="font-normal normal-case tracking-normal">· {items.length}</span>
                </p>
                <ul className="space-y-2">
                  {items.map((s) => {
                    const free = !!noCharge[s.id];
                    const changed = !free && prices[s.id] !== ratePrices[s.id];
                    return (
                      <li key={s.id} className={cn("flex flex-wrap items-center gap-3 rounded-xl border border-line p-2.5 sm:flex-nowrap", free && "bg-canvas")}>
                        <SnagPhoto snag={s} className="size-12 shrink-0" rounded="rounded-lg" showBox={false} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <RefTag>{s.ref}</RefTag>
                            <SeverityBadge severity={s.severity} />
                            <span className="text-[11.5px] text-muted">{TRADE_LABEL[s.trade]}</span>
                          </div>
                          <p className={cn("mt-1 truncate text-[13.5px] font-medium", free && "text-muted")}>{s.title}</p>
                        </div>
                        <div className="ml-auto flex shrink-0 items-center gap-3">
                          <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-muted select-none">
                            <input
                              type="checkbox"
                              checked={free}
                              onChange={(e) => setNoCharge((n) => ({ ...n, [s.id]: e.target.checked }))}
                              className="size-3.5 accent-brand-600"
                            />
                            No charge
                          </label>
                          <div className="relative">
                            <span className={cn("pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[13px]", free ? "text-faint" : "text-muted")}>£</span>
                            <input
                              type="number"
                              min={0}
                              step={5}
                              disabled={free}
                              value={free ? 0 : prices[s.id]}
                              onChange={(e) => setPrices((p) => ({ ...p, [s.id]: Number(e.target.value) }))}
                              aria-label={`Price for ${s.ref}`}
                              className={cn(
                                "h-9 w-24 rounded-lg border bg-surface pr-2 pl-6 text-right text-[13.5px] font-medium tabular outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-canvas disabled:text-faint",
                                changed ? "border-brand-300" : "border-line-strong",
                              )}
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </Card>

        {/* Summary */}
        <div className={cn("@4xl:sticky @4xl:self-start", embedded ? "@4xl:top-0" : "@4xl:top-20")}>
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold tracking-tight">Summary</h2>
            <dl className="mt-4 space-y-2 text-[13.5px]">
              <Row label={`Subtotal (${charged} charged${snags.length - charged ? `, ${snags.length - charged} free` : ""})`} value={formatGBP(totals.net)} />
              <Row label={`VAT ${Math.round(state.settings.vatRate * 100)}%`} value={formatGBP(totals.vat)} />
              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <dt className="font-medium">Total</dt>
                <dd className="text-[24px] font-semibold tracking-tight tabular">{formatGBP(totals.gross)}</dd>
              </div>
            </dl>

            <div className="mt-5 rounded-xl border border-line bg-canvas p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-medium">Deposit to book</p>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", isDefaultDeposit ? "bg-sunken text-muted" : "bg-brand-50 text-brand-700")}>
                  {isDefaultDeposit ? "Your default" : `Custom · default ${state.settings.defaultDepositPercent}%`}
                </span>
              </div>
              <div className="mt-2.5 flex gap-1">
                {DEPOSIT_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setDeposit(p)}
                    className={cn(
                      "h-8 flex-1 rounded-lg text-[12.5px] font-medium tabular transition-colors",
                      deposit === p ? "bg-ink text-white" : "border border-line bg-surface text-ink-2 hover:bg-sunken",
                    )}
                  >
                    {p}%
                  </button>
                ))}
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={deposit}
                  onChange={(e) => setDeposit(Number(e.target.value))}
                  className="flex-1 accent-brand-600"
                  aria-label="Deposit percentage"
                />
                <span className="w-10 text-right text-[13px] font-semibold tabular">{deposit}%</span>
              </div>
              <dl className="mt-2 space-y-1 text-[12.5px]">
                <Row label="Due now" value={formatGBP(totals.deposit)} strong />
                <Row label="Balance on completion" value={formatGBP(totals.balance)} />
              </dl>
            </div>

            <label className="mt-5 block text-[13px] font-medium" htmlFor="msg">Message to {first}</label>
            <textarea
              id="msg"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1.5 w-full resize-none rounded-xl border border-line-strong bg-surface p-3 text-[13px] leading-relaxed outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />

            <div className="mt-3 flex items-center justify-between text-[13px]">
              <span className="text-muted">Quote valid for</span>
              <Dropdown
                label="Quote valid for"
                value={String(validDays)}
                onChange={(v) => setValidDays(Number(v))}
                size="sm"
                align="right"
                menuWidth={180}
                className="w-[120px]"
                options={[...new Set([7, 14, 30, state.settings.quoteValidDays])].sort((a, b) => a - b).map((n) => ({ value: String(n), label: `${n} days` }))}
              />
            </div>

            <Button size="lg" className="mt-5 w-full" onClick={send} disabled={!snags.length}>
              <Send className="size-4" /> Send quote to {first}
            </Button>
            <p className="mt-2.5 flex gap-1.5 text-[12px] leading-relaxed text-muted">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand-500" />
              {first} gets an email with a link to accept or decline each item and pay the deposit by card.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={cn("tabular", strong ? "font-semibold text-ink" : "font-medium text-ink-2")}>{value}</dd>
    </div>
  );
}

/* ---------------------------------------------------------------- */

export function QuoteSent({ quoteId, onDone }: { quoteId: string; onDone?: () => void }) {
  const router = useRouter();
  const state = useStore();
  const q = state.quotes.find((x) => x.id === quoteId)!;
  const p = state.properties.find((x) => x.id === q.propertyId)!;
  const owner = state.users.find((u) => u.id === p.ownerId)!;
  const t = quoteTotals(q);
  return (
    <div className="mx-auto max-w-lg animate-fade-up py-10 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 border border-brand-100">
        <CheckCircle2 className="size-8" />
      </div>
      <h1 className="mt-6 text-[28px] font-semibold tracking-[-0.02em]">Quote {q.number} sent</h1>
      <p className="mt-2 text-[15px] text-muted">
        We&apos;ve emailed {owner.name} a quote for <b className="font-medium text-ink">{formatGBP(t.gross)}</b> with a {q.depositPercent}% deposit of{" "}
        <b className="font-medium text-ink">{formatGBP(t.deposit)}</b>.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Button variant="secondary" onClick={() => router.push("/contractor/inbox")}><Inbox className="size-4" /> See the email</Button>
        {onDone ? <Button onClick={onDone}>Done</Button> : <ButtonLink href="/contractor">Back to dashboard</ButtonLink>}
      </div>
    </div>
  );
}

export function ExistingQuote({ quoteId }: { quoteId: string }) {
  return <QuoteDetails quoteId={quoteId} showHeader />;
}

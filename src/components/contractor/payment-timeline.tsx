"use client";

import { useState } from "react";
import { CheckCircle2, CircleDashed, Clock, CreditCard, Hammer, ThumbsUp } from "lucide-react";
import { useStore } from "@/lib/data/store";
import { daysBetween, jobCompletion, quoteTotals } from "@/lib/data/queries";
import { cn, formatDate, formatGBP } from "@/lib/utils";

type Tone = "done" | "pending" | "late" | "todo";

const DOT: Record<Tone, string> = {
  done: "bg-emerald-500 text-white",
  pending: "bg-amber-400 text-white",
  late: "bg-red-500 text-white",
  todo: "bg-sunken text-faint border border-line-strong",
};

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/**
 * Money story of one job for the contractor:
 * quote accepted → deposit paid → work completed → balance paid (and how long after completion), or still owed.
 */
export function PaymentTimeline({ quoteId, className }: { quoteId: string; className?: string }) {
  const state = useStore();
  const [now] = useState(() => Date.now());
  const q = state.quotes.find((x) => x.id === quoteId);
  if (!q || q.status === "draft") return null;
  const t = quoteTotals(q);
  const job = jobCompletion(state, q);
  const deposit = state.invoices.find((i) => i.quoteId === q.id && i.kind === "deposit");
  const balance = state.invoices.find((i) => i.quoteId === q.id && i.kind === "balance");
  const nowIso = new Date(now).toISOString();

  const steps: { icon: typeof CheckCircle2; tone: Tone; title: string; detail: string; amount?: string }[] = [];

  // 1. Quote
  steps.push(
    q.status === "sent"
      ? { icon: CircleDashed, tone: "pending", title: "Quote sent", detail: `${formatDate(q.sentAt ?? q.createdAt)} · waiting for the owner`, amount: formatGBP(t.gross) }
      : q.status === "declined"
        ? { icon: CircleDashed, tone: "late", title: "Quote declined", detail: formatDate(q.respondedAt ?? q.createdAt) }
        : { icon: ThumbsUp, tone: "done", title: "Quote accepted", detail: `${formatDate(q.respondedAt ?? q.createdAt)} · ${plural(job.total, "job")} accepted`, amount: formatGBP(t.gross) },
  );

  if (q.status === "accepted" || q.status === "partially_accepted") {
    // 2. Deposit
    if (deposit) {
      steps.push(
        deposit.status === "paid"
          ? { icon: CreditCard, tone: "done", title: `Deposit paid · ${q.depositPercent}%`, detail: `${formatDate(deposit.paidAt!)} · ${deposit.number}, before work started`, amount: formatGBP(deposit.amount) }
          : { icon: CreditCard, tone: Date.parse(deposit.dueAt) < now ? "late" : "pending", title: "Deposit not paid yet", detail: `${deposit.number} · due ${formatDate(deposit.dueAt)}`, amount: formatGBP(deposit.amount) },
      );
    }

    // 3. Work
    steps.push(
      job.done && job.completedAt
        ? { icon: Hammer, tone: "done", title: "Work completed", detail: `${formatDate(job.completedAt)} · all ${plural(job.total, "job")} confirmed by the owner` }
        : { icon: Hammer, tone: "pending", title: "Work in progress", detail: `${job.verified} of ${plural(job.total, "job")} confirmed fixed so far` },
    );

    // 4. Balance
    if (balance?.status === "paid") {
      const after = job.completedAt ? daysBetween(job.completedAt, balance.paidAt!) : null;
      steps.push({
        icon: CheckCircle2,
        tone: "done",
        title: "Balance paid",
        detail: `${formatDate(balance.paidAt!)} · ${balance.number}${after === null ? "" : after <= 0 ? " · same day the work was completed" : ` · ${plural(after, "day")} after completion`}`,
        amount: formatGBP(balance.amount),
      });
    } else if (balance) {
      const late = Date.parse(balance.dueAt) < now;
      const waited = job.completedAt ? daysBetween(job.completedAt, nowIso) : 0;
      steps.push({
        icon: Clock,
        tone: late ? "late" : "pending",
        title: late ? `Balance overdue · ${plural(daysBetween(balance.dueAt, nowIso), "day")}` : "Balance pending",
        detail: `${balance.number} · ${waited <= 0 ? "work completed today" : `${plural(waited, "day")} since completion`} · due ${formatDate(balance.dueAt)}`,
        amount: formatGBP(balance.amount),
      });
    } else {
      steps.push({ icon: Clock, tone: "todo", title: "Balance", detail: "Invoiced automatically when the owner confirms the last fix", amount: formatGBP(t.balance) });
    }
  }

  return (
    <ol className={cn("rounded-2xl border border-line p-4", className)}>
      {steps.map((s, i) => (
        <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
          {i < steps.length - 1 && <span className="absolute top-8 bottom-0 left-[13px] w-px bg-line" aria-hidden />}
          <span className={cn("relative flex size-7 shrink-0 items-center justify-center rounded-full", DOT[s.tone])}>
            <s.icon className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className={cn("text-[13.5px] font-semibold", s.tone === "late" && "text-red-700", s.tone === "todo" && "text-muted")}>{s.title}</p>
            <p className="text-[12.5px] leading-snug text-muted">{s.detail}</p>
          </div>
          {s.amount && <span className={cn("pt-0.5 text-[13.5px] font-semibold tabular", s.tone === "todo" && "text-faint")}>{s.amount}</span>}
        </li>
      ))}
    </ol>
  );
}

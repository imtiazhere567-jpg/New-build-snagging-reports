/** Pure helpers that derive numbers from the store state. */
import type { Quote, Snag } from "../types";
import type { DemoState } from "./seed";
import { OPEN_WORK } from "../constants";

export function propertyProgress(snags: Snag[]) {
  const counted = snags.filter((s) => !["declined", "ai_draft"].includes(s.status));
  const verified = counted.filter((s) => s.status === "verified").length;
  return {
    total: counted.length,
    verified,
    percent: counted.length ? Math.round((verified / counted.length) * 100) : 0,
  };
}

export function quoteTotals(q: Quote) {
  const accepted = q.items.filter((i) => i.decision !== "declined");
  const net = accepted.reduce((a, i) => a + i.price, 0);
  const vat = net * q.vatRate;
  const gross = net + vat;
  const deposit = gross * (q.depositPercent / 100);
  return { net, vat, gross, deposit, balance: gross - deposit, count: accepted.length };
}

/**
 * How far the accepted work on a quote has got, and when the last job was confirmed fixed.
 * completedAt is set only once every accepted snag is verified.
 */
export function jobCompletion(state: DemoState, q: Quote) {
  const ids = q.items.filter((i) => i.decision === "accepted").map((i) => i.snagId);
  const snags = ids.map((id) => state.snags.find((s) => s.id === id)).filter(Boolean) as Snag[];
  const verified = snags.filter((s) => s.status === "verified");
  const done = snags.length > 0 && verified.length === snags.length;
  const verifiedAt = (s: Snag) =>
    state.updates.filter((u) => u.snagId === s.id && u.toStatus === "verified").map((u) => u.createdAt).sort().pop() ?? s.updatedAt;
  const completedAt = done ? verified.map(verifiedAt).sort().pop() : undefined;
  return { total: snags.length, verified: verified.length, done, completedAt };
}

/** Whole days between two ISO dates (b minus a). */
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

export function isOverdue(s: Snag, now = Date.now()) {
  return !!s.dueDate && OPEN_WORK.includes(s.status) && new Date(s.dueDate).getTime() < now;
}

/**
 * The report that matters now for a home: one waiting for a quote first,
 * otherwise the newest one that has been sent (homes can send more snags later as a new version).
 */
export function currentReport(state: DemoState, propertyId: string) {
  const sent = state.reports.filter((r) => r.propertyId === propertyId && r.status !== "draft").sort((a, b) => b.version - a.version);
  return sent.find((r) => r.status === "submitted") ?? sent[0] ?? state.reports.find((r) => r.propertyId === propertyId);
}

/** Short link name for an owner's app, from their surname: /home/morgan */
export function ownerSlug(state: DemoState, ownerId: string) {
  const owners = state.users.filter((u) => u.role === "owner");
  const base = (u: (typeof owners)[number]) => (u.name.trim().split(/\s+/).pop() ?? "home").toLowerCase().replace(/[^a-z0-9]/g, "") || "home";
  const me = owners.find((u) => u.id === ownerId);
  if (!me) return ownerId;
  const same = owners.filter((u) => base(u) === base(me));
  const n = same.indexOf(me);
  return n > 0 ? `${base(me)}-${n + 1}` : base(me);
}

export function propertyStage(state: DemoState, propertyId: string) {
  const report = currentReport(state, propertyId);
  // Invited and capturing are one stage: no report sent yet.
  if (!report) return "Waiting for snags";
  return (
    {
      draft: "Waiting for snags",
      submitted: "New report",
      quoted: "Quote sent",
      in_progress: "In progress",
      completed: "Completed",
    } as const
  )[report.status];
}

export const userById = (state: DemoState, id?: string) => state.users.find((u) => u.id === id);

/**
 * Who can see and change what, in live mode.
 *  - contractor: everything
 *  - home owner: their own home's records and their own emails
 *  - team member: the jobs assigned to them, and the homes those jobs are in
 */
import "server-only";
import type { DemoState } from "../data/seed";
import type { User } from "../types";
import type { Change } from "./state-db";

const ownerHomes = (s: DemoState, user: User) => new Set(s.properties.filter((p) => p.ownerId === user.id).map((p) => p.id));

/** The slice of the data this person's browser receives. */
export function visibleState(s: DemoState, user: User): DemoState {
  if (user.role === "contractor") return s;
  const mineEmail = (e: { to: string }) => e.to.toLowerCase() === user.email.toLowerCase();

  if (user.role === "owner") {
    const homes = ownerHomes(s, user);
    const inHome = <T extends { propertyId: string }>(x: T) => homes.has(x.propertyId);
    return {
      ...s,
      users: s.users
        .filter((u) => u.id === user.id || u.role !== "owner")
        // Owners don't need the team's private contact details
        .map((u) => (u.role === "team" ? { ...u, email: "", phone: undefined } : u)),
      properties: s.properties.filter((p) => homes.has(p.id)),
      rooms: s.rooms.filter(inHome),
      reports: s.reports.filter(inHome),
      snags: s.snags.filter(inHome),
      updates: s.updates.filter(inHome),
      quotes: s.quotes.filter(inHome),
      invoices: s.invoices.filter(inHome),
      payments: s.payments.filter(inHome),
      emails: s.emails.filter(mineEmail),
      rateCard: [],
    };
  }

  // Team member
  const snags = s.snags.filter((x) => x.assigneeId === user.id);
  const snagIds = new Set(snags.map((x) => x.id));
  const homes = new Set(snags.map((x) => x.propertyId));
  const owners = new Set(s.properties.filter((p) => homes.has(p.id)).map((p) => p.ownerId));
  return {
    ...s,
    users: s.users.filter((u) => u.role !== "owner" || owners.has(u.id)),
    properties: s.properties.filter((p) => homes.has(p.id)),
    rooms: s.rooms.filter((r) => homes.has(r.propertyId)),
    reports: s.reports.filter((r) => homes.has(r.propertyId)),
    snags,
    updates: s.updates.filter((u) => snagIds.has(u.snagId)),
    quotes: [],
    invoices: [],
    payments: [],
    emails: s.emails.filter(mineEmail),
    rateCard: [],
  };
}

/** Returns a reason when the change is not allowed for this person, or null when it is. */
export function forbiddenChange(before: DemoState, user: User, ch: Change): string | null {
  if (user.role === "contractor") return null;
  const b = ch.before as Record<string, unknown> | undefined;
  const a = ch.after as Record<string, unknown> | undefined;

  // Anyone can send an email as part of an action, and mark their own emails read
  if (ch.collection === "emails") {
    if (!b) return null;
    const own = String(b.to).toLowerCase() === user.email.toLowerCase();
    const onlyRead = a && JSON.stringify({ ...b, read: true }) === JSON.stringify({ ...a, read: true });
    return own && onlyRead ? null : "emails";
  }
  if (ch.collection === "users" || ch.collection === "settings" || ch.collection === "ratecard") return ch.collection;

  if (user.role === "owner") {
    const homes = ownerHomes(before, user);
    const home = (x?: Record<string, unknown>) => (ch.collection === "properties" ? x?.id : x?.propertyId) as string | undefined;
    for (const x of [b, a]) if (x && !homes.has(home(x) ?? "")) return `${ch.collection} outside your home`;
    if (ch.collection === "properties" && a && b && a.ownerId !== b.ownerId) return "properties";
    return null;
  }

  // Team member: only their own jobs and the updates on them
  if (ch.collection === "snags") {
    if (!b || b.assigneeId !== user.id || a?.assigneeId !== user.id || ch.kind === "delete") return "snags";
    return null;
  }
  if (ch.collection === "updates") {
    if (b) return "updates";
    const snag = before.snags.find((x) => x.id === a?.snagId);
    return snag?.assigneeId === user.id ? null : "updates";
  }
  return ch.collection;
}

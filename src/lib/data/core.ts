
/**
 * The app's data and every action on it, shared by both modes:
 * - demo: runs in the browser on localStorage data (see store.ts)
 * - live: the browser runs it optimistically, and the server runs the same action on Postgres data
 *   (see src/lib/server), checks who may change what, and saves the result.
 */
import type { StoreApi } from "zustand";
import { createSeed, CONTRACTOR_ID, TRADE_TO_MEMBER, type DemoState } from "./seed";
import { ROOM_TEMPLATE } from "../constants";
import type { CompanySettings, Invoice, Quote, Snag, SnagStatus, SnagUpdate, Trade } from "../types";
import type { Analysis } from "../ai/schema";
import { DEFAULT_RATE_CARD, type RateRow } from "../rate-card";
import { OPEN_WORK, STATUS_META, TRADE_LABEL } from "../constants";
import { formatGBP, uid } from "../utils";
import { jobCompletion, quoteTotals } from "./queries";

export interface SendQuoteInput {
  reportId: string;
  items: { snagId: string; price: number }[];
  depositPercent: number;
  message: string;
  validDays: number;
}

export interface InviteOwnerInput {
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  town: string;
  postcode: string;
  plot: string;
  development: string;
  completionDate: string; // yyyy-mm-dd
  message: string;
}

export interface EmailOverride {
  subject: string;
  body: string;
  edited?: boolean;
}


/** One email per tradesperson listing the jobs just assigned to them. */
function assignmentEmails(s: DemoState, assigned: { snagId: string; memberId: string }[]) {
  const byMember = new Map<string, string[]>();
  for (const a of assigned) byMember.set(a.memberId, [...(byMember.get(a.memberId) ?? []), a.snagId]);
  const now = new Date().toISOString();
  return [...byMember.entries()].flatMap(([memberId, ids]) => {
    const member = s.users.find((u) => u.id === memberId);
    if (!member) return [];
    const jobs = ids.map((id) => s.snags.find((x) => x.id === id)).filter(Boolean) as Snag[];
    const lines = jobs.map((j) => "- " + j.ref + ": " + j.title + " (" + (s.properties.find((p) => p.id === j.propertyId)?.addressLine1 ?? "") + ")").join("\n");
    return [
      {
        id: uid("em"),
        to: member.email,
        subject: jobs.length === 1 ? "New job: " + jobs[0].ref + " " + jobs[0].title : jobs.length + " new jobs assigned to you",
        preview: jobs.map((j) => j.ref).join(", ") + " · tap to see the details",
        body: "Hi " + firstName(member.name) + ",\n\nYou've been given " + (jobs.length === 1 ? "a new job" : jobs.length + " new jobs") + ":\n\n" + lines + "\n\nOpen SnagSnap to see the photos and start work.\n\n" + s.settings.name,
        link: "/login?as=" + member.id,
        sentAt: now,
        read: false,
      },
    ];
  });
}

export const firstName = (name: string) => name.split(/\s|&/)[0];

const AVATAR_COLOURS = ["#0f766e", "#7c3aed", "#b45309", "#be123c", "#4338ca", "#0369a1", "#15803d", "#a21caf"];

export interface StoreState extends DemoState {
  currentUserId: string | null;
  seededAt: number;
  signIn: (userId: string) => void;
  signOut: () => void;
  resetDemo: () => void;
  sendQuote: (input: SendQuoteInput) => Quote;
  inviteOwner: (input: InviteOwnerInput) => { userId: string; propertyId: string };
  /**
   * A new home owner signs themselves up from the phone app (no invite).
   * Creates their account and home, marks them joined, signs them in and tells the contractor.
   */
  registerOwner: (input: Omit<InviteOwnerInput, "message">) => { userId: string; propertyId: string };
  /** Contractor override: set the status of one or more snags (always logged). */
  setSnagStatus: (ids: string[], status: SnagStatus, note?: string) => void;
  /** Assign snags to a team member, or null to unassign (always logged). */
  assignSnags: (ids: string[], assigneeId: string | null) => void;
  /** Assign each snag to the least-busy team member whose trade matches. Returns how many were assigned. */
  autoAssign: (ids: string[]) => number;
  setDueDate: (ids: string[], iso: string | null) => void;
  /** Send the owner a fresh sign-in link for their home. */
  resendInvite: (propertyId: string) => void;
  /** Add a tradesperson to the team and email them a sign-in link. */
  addTeamMember: (input: { name: string; email: string; phone: string; trade: Trade }) => string;
  /** Simulates the owner paying an invoice by Stripe test card. */
  markInvoicePaid: (invoiceId: string) => void;
  /** Optional custom subject/body; defaults are used when omitted. */
  sendInvoiceReminder: (invoiceId: string, custom?: EmailOverride) => void;
  sendQuoteReminder: (quoteId: string, custom?: EmailOverride) => void;
  /** Raises the final balance invoice for a quote. Returns the new invoice id. */
  createBalanceInvoice: (quoteId: string) => string | null;
  updateSettings: (patch: Partial<CompanySettings>) => void;
  /**
   * What the server would run daily: remind owners about unanswered quotes and overdue invoices,
   * following the Settings rules. Returns how many of each were sent.
   */
  runAutoReminders: () => { quotes: number; invoices: number };
  /** Save the whole rate card (used by the Rate card screen). */
  saveRateCard: (rows: RateRow[]) => void;
  resetRateCard: () => void;

  /* ---- Home owner: capture -> AI drafts -> review -> submit ---- */
  addAnalysedPhoto: (input: { propertyId: string; roomId: string; photoUrl: string; note?: string; analysis: Analysis; source: "claude" | "demo"; model: string }) => string[];
  addManualSnag: (input: {
    propertyId: string;
    roomId: string;
    title: string;
    description: string;
    locationInRoom: string;
    category: Snag["category"];
    severity: Snag["severity"];
    trade: Snag["trade"];
    photoUrl?: string;
  }) => string;
  updateSnag: (id: string, patch: Partial<Snag>) => void;
  deleteSnag: (id: string) => void;
  /** Sends every draft snag for the home to the contractor. Returns null when there is nothing to send. */
  submitDraft: (propertyId: string) => { reportId: string; count: number } | null;
  /**
   * Owner confirms a fix. When that was the last open job on the quote, the job is marked complete
   * and the final balance invoice is raised. Returns that unpaid balance invoice id, if one is now due.
   */
  confirmFix: (snagId: string) => string | null;
  /* ---- Team member ---- */
  startJob: (snagId: string) => void;
  postProgress: (snagId: string, note: string, photoUrl?: string) => void;
  /** Marks the job fixed and emails the owner to check it. */
  markFixed: (snagId: string, note: string, photoUrl?: string) => void;
  /**
   * Owner replies to a quote item by item. Accepted work is auto-assigned by trade and a deposit
   * invoice is raised. Returns the deposit invoice id (null when nothing was accepted or deposit is 0%).
   */
  respondToQuote: (quoteId: string, decisions: Record<string, "accepted" | "declined">) => string | null;
  reopenFix: (snagId: string, note: string) => void;
  markEmailsRead: (ids: string[]) => void;
}

export function createStoreState(set: StoreApi<StoreState>["setState"], get: () => StoreState): StoreState {
      /** The home's open draft report, created on first capture (a new version after earlier reports). */
      const ensureDraftReport = (propertyId: string) => {
        const s = get();
        const existing = s.reports.find((r) => r.propertyId === propertyId && r.status === "draft");
        if (existing) return existing.id;
        const version = s.reports.filter((r) => r.propertyId === propertyId).length + 1;
        const id = uid("r");
        set({ reports: [...s.reports, { id, propertyId, version, status: "draft", summary: "", createdAt: new Date().toISOString() }] });
        return id;
      };
      return {
      ...createSeed(),
      seededAt: Date.now(),
      currentUserId: null,
      signIn: (userId) =>
        set((s) => ({
          currentUserId: userId,
          // An owner's first sign-in means they've accepted the invite
          properties: s.properties.map((p) => (p.ownerId === userId && !p.joinedAt ? { ...p, joinedAt: new Date().toISOString() } : p)),
        })),
      signOut: () => set({ currentUserId: null }),
      resetDemo: () => set((s) => ({ ...createSeed(), seededAt: Date.now(), currentUserId: s.currentUserId })),

      sendQuote: ({ reportId, items, depositPercent, message, validDays }) => {
        const s = get();
        const report = s.reports.find((r) => r.id === reportId)!;
        const property = s.properties.find((p) => p.id === report.propertyId)!;
        const owner = s.users.find((u) => u.id === property.ownerId)!;
        const now = new Date().toISOString();
        const nextNo = Math.max(1040, ...s.quotes.map((q) => Number(q.number.replace(/\D/g, "")))) + 1;
        const prices = new Map(items.map((i) => [i.snagId, i.price]));

        const quote: Quote = {
          id: uid("q"),
          number: `Q-${nextNo}`,
          reportId,
          propertyId: property.id,
          items: items.map((i) => ({ snagId: i.snagId, price: i.price, decision: "pending" })),
          depositPercent,
          vatRate: s.settings.vatRate,
          message,
          status: "sent",
          sentAt: now,
          createdAt: now,
        };
        const t = quoteTotals(quote);
        const first = owner.name.split(/\s|&/)[0];

        set({
          quotes: [...s.quotes, quote],
          reports: s.reports.map((r) => (r.id === reportId ? { ...r, status: "quoted" } : r)),
          snags: s.snags.map((sn) =>
            prices.has(sn.id) ? { ...sn, status: "quoted", price: prices.get(sn.id), updatedAt: now } : sn,
          ),
          emails: [
            {
              id: uid("em"),
              to: owner.email,
              subject: `Quote ${quote.number} for ${property.addressLine1} is ready`,
              preview: `${quote.items.length} items · ${formatGBP(t.gross)} inc. VAT. Choose which items you'd like us to carry out.`,
              body:
                `Hi ${first},\n\n${message}\n\n` +
                `Total: ${formatGBP(t.gross)} inc. VAT (${quote.items.length} items)\n` +
                `Deposit to book: ${depositPercent}% (${formatGBP(t.deposit)})\n` +
                `This quote is valid for ${validDays} days. You can accept or decline each item individually.\n\n` +
                `${s.users.find((u) => u.id === CONTRACTOR_ID)?.name}\n${s.settings.name}`,
              link: `/login?as=${owner.id}`,
              sentAt: now,
              read: false,
            },
            ...s.emails,
          ],
        });
        return quote;
      },

      inviteOwner: (input) => {
        const s = get();
        const now = new Date().toISOString();
        const userId = uid("u");
        const propertyId = uid("p");
        const first = input.name.split(/\s|&/)[0];
        set({
          users: [
            ...s.users,
            {
              id: userId,
              role: "owner",
              name: input.name,
              email: input.email,
              phone: input.phone,
              avatarColor: AVATAR_COLOURS[s.users.length % AVATAR_COLOURS.length],
            },
          ],
          properties: [
            ...s.properties,
            {
              id: propertyId,
              ownerId: userId,
              plot: input.plot,
              addressLine1: input.addressLine1,
              town: input.town,
              postcode: input.postcode.toUpperCase(),
              development: input.development,
              completionDate: new Date(input.completionDate).toISOString(),
              invitedAt: now,
              coverHue: Math.floor(Math.random() * 360),
            },
          ],
          rooms: [
            ...s.rooms,
            ...ROOM_TEMPLATE.map((r, i) => ({ id: `${propertyId}_${r.code}`, propertyId, name: r.name, code: r.code, sortOrder: i })),
          ],
          emails: [
            {
              id: uid("em"),
              to: input.email,
              subject: `Your new home at ${input.addressLine1}: report any snags`,
              preview: `${s.settings.name} has set up your home. Tap the link to start.`,
              body: `Hi ${first},\n\n${input.message}\n\nTap the button below to get started. No password needed.\n\n${
                s.users.find((u) => u.id === CONTRACTOR_ID)?.name
              }\n${s.settings.name}`,
              link: `/login?as=${userId}`,
              sentAt: now,
              read: false,
            },
            ...s.emails,
          ],
        });
        return { userId, propertyId };
      },

      registerOwner: (input) => {
        const s = get();
        const company = s.settings.name;
        const ids = get().inviteOwner({
          ...input,
          message: "Welcome to SnagSnap. Your home is set up with " + company + ". Photograph anything that isn't quite right and our AI will write it up for you.",
        });
        const now = new Date().toISOString();
        const after = get();
        const contractor = after.users.find((u) => u.id === CONTRACTOR_ID);
        set({
          currentUserId: ids.userId,
          properties: after.properties.map((p) => (p.id === ids.propertyId ? { ...p, joinedAt: now } : p)),
          emails: [
            {
              id: uid("em"),
              to: contractor?.email ?? "",
              subject: "New home owner signed up: " + input.addressLine1 + ", " + input.town,
              preview: input.name + " added their home from the SnagSnap app.",
              body:
                "Hi " + firstName(contractor?.name ?? "") + ",\n\n" + input.name + " has signed up on the SnagSnap app and added their home:\n\n" +
                input.addressLine1 + ", " + input.town + " " + input.postcode.toUpperCase() + "\n" + input.plot + " · " + input.development +
                "\nEmail: " + input.email + (input.phone ? "\nMobile: " + input.phone : "") +
                "\n\nYou'll see their snags on your dashboard as soon as they send them.",
              link: "/login?as=" + CONTRACTOR_ID,
              sentAt: now,
              read: false,
            },
            ...after.emails,
          ],
        });
        return ids;
      },

      setSnagStatus: (ids, status, note) => {
        const s = get();
        const now = new Date().toISOString();
        const actor = s.currentUserId ?? CONTRACTOR_ID;
        const ups: SnagUpdate[] = [];
        const snags = s.snags.map((sn) => {
          if (!ids.includes(sn.id) || sn.status === status) return sn;
          ups.push({ id: uid("upd"), snagId: sn.id, propertyId: sn.propertyId, actorId: actor, kind: "status", fromStatus: sn.status, toStatus: status, note: note ?? `Status changed to ${STATUS_META[status].label.toLowerCase()} by the contractor`, createdAt: now });
          return { ...sn, status, updatedAt: now };
        });
        set({ snags, updates: [...s.updates, ...ups] });
      },

      assignSnags: (ids, assigneeId) => {
        const s = get();
        const now = new Date().toISOString();
        const actor = s.currentUserId ?? CONTRACTOR_ID;
        const member = s.users.find((u) => u.id === assigneeId);
        const ups: SnagUpdate[] = [];
        const snags = s.snags.map((sn) => {
          if (!ids.includes(sn.id) || sn.assigneeId === (assigneeId ?? undefined)) return sn;
          // Accepted work becomes "assigned" once someone owns it; unassigning sends it back.
          const status: SnagStatus = assigneeId && sn.status === "accepted" ? "assigned" : !assigneeId && sn.status === "assigned" ? "accepted" : sn.status;
          ups.push({ id: uid("upd"), snagId: sn.id, propertyId: sn.propertyId, actorId: actor, kind: "assign", fromStatus: sn.status, toStatus: status, note: member ? `Assigned to ${member.name}` : "Unassigned", createdAt: now });
          return { ...sn, assigneeId: assigneeId ?? undefined, status, updatedAt: now };
        });
        const mail = assigneeId ? assignmentEmails(s, ups.map((u) => ({ snagId: u.snagId, memberId: assigneeId }))) : [];
        set({ snags, updates: [...s.updates, ...ups], emails: [...mail, ...s.emails] });
      },

      autoAssign: (ids) => {
        const s = get();
        const team = s.users.filter((u) => u.role === "team");
        const load = new Map(team.map((m) => [m.id, s.snags.filter((x) => x.assigneeId === m.id && OPEN_WORK.includes(x.status)).length]));
        const pick = (sn: Snag) => {
          const matches = team.filter((m) => m.trade === sn.trade);
          const pool = matches.length ? matches : team.filter((m) => m.id === (TRADE_TO_MEMBER[sn.trade] ?? TRADE_TO_MEMBER.general));
          const best = [...pool].sort((a, b) => (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0))[0];
          if (best) load.set(best.id, (load.get(best.id) ?? 0) + 1);
          return best;
        };
        const now = new Date().toISOString();
        const ups: SnagUpdate[] = [];
        let count = 0;
        const snags = s.snags.map((sn) => {
          if (!ids.includes(sn.id) || sn.assigneeId) return sn;
          const m = pick(sn);
          if (!m) return sn;
          count += 1;
          const status: SnagStatus = sn.status === "accepted" ? "assigned" : sn.status;
          ups.push({ id: uid("upd"), snagId: sn.id, propertyId: sn.propertyId, actorId: "system", kind: "assign", fromStatus: sn.status, toStatus: status, note: `Auto-assigned to ${m.name} (${TRADE_LABEL[sn.trade]})`, createdAt: now });
          return { ...sn, assigneeId: m.id, status, updatedAt: now };
        });
        const mail = assignmentEmails(s, snags.filter((sn) => ids.includes(sn.id) && sn.assigneeId && ups.some((u) => u.snagId === sn.id)).map((sn) => ({ snagId: sn.id, memberId: sn.assigneeId! })));
        set({ snags, updates: [...s.updates, ...ups], emails: [...mail, ...s.emails] });
        return count;
      },

      resendInvite: (propertyId) => {
        const s = get();
        const p = s.properties.find((x) => x.id === propertyId);
        const owner = s.users.find((u) => u.id === p?.ownerId);
        if (!p || !owner) return;
        const now = new Date().toISOString();
        set({
          properties: s.properties.map((x) => (x.id === propertyId ? { ...x, invitedAt: now } : x)),
          emails: [
            {
              id: uid("em"),
              to: owner.email,
              subject: `Reminder: your new home at ${p.addressLine1}`,
              preview: "Your sign-in link is ready. Tap to start reporting any snags.",
              body: `Hi ${firstName(owner.name)},

Just a reminder that your home at ${p.addressLine1} is set up on SnagSnap. Tap the button below to start photographing anything that isn't quite right. No password needed.

${s.users.find((u) => u.id === CONTRACTOR_ID)?.name}
${s.settings.name}`,
              link: `/login?as=${owner.id}`,
              sentAt: now,
              read: false,
            },
            ...s.emails,
          ],
        });
      },

      addTeamMember: ({ name, email, phone, trade }) => {
        const s = get();
        const id = uid("u");
        const now = new Date().toISOString();
        set({
          users: [
            ...s.users,
            { id, role: "team", name, email, phone, trade, avatarColor: AVATAR_COLOURS[(s.users.length + 3) % AVATAR_COLOURS.length] },
          ],
          emails: [
            {
              id: uid("em"),
              to: email,
              subject: `You've been added to the ${s.settings.name} team`,
              preview: "Tap to see the jobs assigned to you.",
              body: `Hi ${name.split(" ")[0]},

${s.users.find((u) => u.id === CONTRACTOR_ID)?.name} has added you to the ${s.settings.name} team on SnagSnap as ${TRADE_LABEL[trade]}.

Jobs that match your trade will be assigned to you automatically. Tap the button below to see them. No password needed.`,
              link: `/login?as=${id}`,
              sentAt: now,
              read: false,
            },
            ...s.emails,
          ],
        });
        return id;
      },

      markInvoicePaid: (invoiceId) => {
        const s = get();
        const inv = s.invoices.find((i) => i.id === invoiceId);
        if (!inv || inv.status === "paid") return;
        const p = s.properties.find((x) => x.id === inv.propertyId);
        const owner = s.users.find((u) => u.id === p?.ownerId);
        const now = new Date().toISOString();
        set({
          invoices: s.invoices.map((i) => (i.id === invoiceId ? { ...i, status: "paid", paidAt: now } : i)),
          payments: [
            ...s.payments,
            { id: uid("pay"), invoiceId, propertyId: inv.propertyId, amount: inv.amount, cardLast4: "4242", reference: "pi_test_" + Math.random().toString(36).slice(2, 12), paidAt: now },
          ],
          emails: owner
            ? [
                {
                  id: uid("em"),
                  to: owner.email,
                  subject: "Receipt for " + inv.number + ": " + formatGBP(inv.amount) + " paid",
                  preview: "Thanks, your " + inv.kind + " payment has been received.",
                  body: "Hi " + firstName(owner.name) + ",\n\nThanks for your payment of " + formatGBP(inv.amount) + " for invoice " + inv.number + " (" + inv.kind + ").\nPaid by card ending 4242 (Stripe test mode).\n\n" + s.settings.name,
                  link: "/login?as=" + owner.id,
                  sentAt: now,
                  read: false,
                },
                ...s.emails,
              ]
            : s.emails,
        });
      },

      sendInvoiceReminder: (invoiceId, custom) => {
        const s = get();
        const inv = s.invoices.find((i) => i.id === invoiceId);
        const p = s.properties.find((x) => x.id === inv?.propertyId);
        const owner = s.users.find((u) => u.id === p?.ownerId);
        if (!inv || !owner) return;
        set({
          emails: [
            {
              id: uid("em"),
              to: owner.email,
              subject: custom?.subject ?? "Reminder: invoice " + inv.number + " for " + formatGBP(inv.amount),
              preview: custom ? custom.body.replace(/\s+/g, " ").slice(0, 110) : "Your " + inv.kind + " invoice for " + p?.addressLine1 + " is due. Pay securely by card.",
              body: custom?.body ?? "Hi " + firstName(owner.name) + ",\n\nA friendly reminder that invoice " + inv.number + " for " + formatGBP(inv.amount) + " is due. You can pay securely by card from your SnagSnap account.\n\n" + s.settings.name,
              link: "/login?as=" + owner.id,
              sentAt: new Date().toISOString(),
              read: false,
              kind: "invoice_reminder",
              refId: inv.id,
              edited: !!custom?.edited,
              sentById: s.currentUserId ?? CONTRACTOR_ID,
            },
            ...s.emails,
          ],
        });
      },

      sendQuoteReminder: (quoteId, custom) => {
        const s = get();
        const q = s.quotes.find((x) => x.id === quoteId);
        const p = s.properties.find((x) => x.id === q?.propertyId);
        const owner = s.users.find((u) => u.id === p?.ownerId);
        if (!q || !owner) return;
        set({
          emails: [
            {
              id: uid("em"),
              to: owner.email,
              subject: custom?.subject ?? "Reminder: your quote " + q.number + " is waiting",
              preview: custom ? custom.body.replace(/\s+/g, " ").slice(0, 110) : "Choose which items you'd like fixed and pay the deposit to book.",
              body: custom?.body ?? "Hi " + firstName(owner.name) + ",\n\nJust a reminder that quote " + q.number + " for " + p?.addressLine1 + " is waiting for you. You can accept or decline each item individually.\n\n" + s.settings.name,
              link: "/login?as=" + owner.id,
              sentAt: new Date().toISOString(),
              read: false,
              kind: "quote_reminder",
              refId: q.id,
              edited: !!custom?.edited,
              sentById: s.currentUserId ?? CONTRACTOR_ID,
            },
            ...s.emails,
          ],
        });
      },

      createBalanceInvoice: (quoteId) => {
        const s = get();
        const q = s.quotes.find((x) => x.id === quoteId);
        if (!q || s.invoices.some((i) => i.quoteId === quoteId && i.kind === "balance")) return null;
        const t = quoteTotals(q);
        const now = Date.now();
        const nextNo = Math.max(2000, ...s.invoices.map((i) => Number(i.number.replace(/\D/g, "")))) + 1;
        const inv: Invoice = {
          id: uid("inv"),
          number: "INV-" + nextNo,
          quoteId,
          propertyId: q.propertyId,
          kind: "balance",
          amount: Math.round(t.balance * 100) / 100,
          status: "unpaid",
          issuedAt: new Date(now).toISOString(),
          dueAt: new Date(now + s.settings.invoiceDueDays * 86_400_000).toISOString(),
        };
        const p = s.properties.find((x) => x.id === q.propertyId);
        const owner = s.users.find((u) => u.id === p?.ownerId);
        set({
          invoices: [...s.invoices, inv],
          emails: owner
            ? [
                {
                  id: uid("em"),
                  to: owner.email,
                  subject: "Invoice " + inv.number + ": final balance for " + p?.addressLine1,
                  preview: formatGBP(inv.amount) + " due within 14 days.",
                  body: "Hi " + firstName(owner.name) + ",\n\nAll the work on your snag list is complete. Your final balance of " + formatGBP(inv.amount) + " is now due within 14 days.\n\n" + s.settings.name,
                  link: "/login?as=" + owner.id,
                  sentAt: inv.issuedAt,
                  read: false,
                },
                ...s.emails,
              ]
            : s.emails,
        });
        return inv.id;
      },

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      addAnalysedPhoto: ({ propertyId, roomId, photoUrl, note, analysis, source, model }) => {
        const reportId = ensureDraftReport(propertyId);
        const now = new Date().toISOString();
        const fresh: Snag[] = analysis.snags.map((a) => ({
          id: uid("s"),
          propertyId,
          reportId,
          roomId,
          ref: "NEW",
          title: a.title,
          description: a.description,
          locationInRoom: a.location_in_room,
          category: a.category as Snag["category"],
          severity: a.severity,
          trade: a.trade,
          suggestedFix: a.suggested_fix,
          confidence: a.confidence,
          bbox: a.bbox,
          photoUrl,
          source: "ai",
          status: "ai_draft",
          createdAt: now,
          updatedAt: now,
          reviewed: false,
          aiSource: source,
          aiModel: model,
          ownerNote: note || undefined,
        }));
        set((s) => ({ snags: [...s.snags, ...fresh] }));
        return fresh.map((x) => x.id);
      },

      addManualSnag: ({ propertyId, roomId, title, description, locationInRoom, category, severity, trade, photoUrl }) => {
        const reportId = ensureDraftReport(propertyId);
        const now = new Date().toISOString();
        const id = uid("s");
        set((s) => ({
          snags: [
            ...s.snags,
            {
              id,
              propertyId,
              reportId,
              roomId,
              ref: "NEW",
              title,
              description,
              locationInRoom,
              category,
              severity,
              trade,
              suggestedFix: "",
              confidence: 1,
              photoUrl,
              source: "manual",
              status: "ai_draft",
              createdAt: now,
              updatedAt: now,
              reviewed: true,
            },
          ],
        }));
        return id;
      },

      updateSnag: (id, patch) =>
        set((s) => ({ snags: s.snags.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: new Date().toISOString() } : x)) })),

      deleteSnag: (id) => set((s) => ({ snags: s.snags.filter((x) => x.id !== id) })),

      submitDraft: (propertyId) => {
        const s = get();
        const report = s.reports.find((r) => r.propertyId === propertyId && r.status === "draft");
        if (!report) return null;
        const drafts = s.snags.filter((x) => x.reportId === report.id && x.status === "ai_draft");
        if (!drafts.length) return null;
        const now = new Date().toISOString();
        const property = s.properties.find((p) => p.id === propertyId)!;
        const owner = s.users.find((u) => u.id === property.ownerId)!;
        const roomCode = (roomId: string) => s.rooms.find((r) => r.id === roomId)?.code ?? "GEN";

        // Snag numbers continue per room across the home: KIT-03, BED1-07 ...
        const counters = new Map<string, number>();
        for (const x of s.snags) {
          if (x.propertyId !== propertyId || x.status === "ai_draft") continue;
          const n = Number(x.ref.split("-").pop());
          const code = x.ref.split("-").slice(0, -1).join("-");
          if (code && Number.isFinite(n)) counters.set(code, Math.max(counters.get(code) ?? 0, n));
        }
        const ordered = [...drafts].sort(
          (a, b) => (s.rooms.find((r) => r.id === a.roomId)?.sortOrder ?? 0) - (s.rooms.find((r) => r.id === b.roomId)?.sortOrder ?? 0),
        );
        const refs = new Map<string, string>();
        for (const x of ordered) {
          const code = roomCode(x.roomId);
          const n = (counters.get(code) ?? 0) + 1;
          counters.set(code, n);
          refs.set(x.id, code + "-" + String(n).padStart(2, "0"));
        }

        const count = (sev: Snag["severity"]) => drafts.filter((x) => x.severity === sev).length;
        const rooms = new Set(drafts.map((x) => x.roomId)).size;
        const priority = drafts.filter((x) => x.severity === "safety" || x.severity === "major").slice(0, 3).map((x) => x.title.toLowerCase());
        const summary =
          drafts.length + " snag" + (drafts.length === 1 ? "" : "s") + " recorded across " + rooms + " room" + (rooms === 1 ? "" : "s") + ". " +
          (count("safety") ? count("safety") + " safety item" + (count("safety") === 1 ? "" : "s") + " and " : "") +
          count("major") + " major item" + (count("major") === 1 ? "" : "s") +
          (priority.length ? " need priority attention (" + priority.join("; ") + "). " : ". ") +
          "The rest are minor and cosmetic finishing defects.";

        set({
          snags: s.snags.map((x) => (refs.has(x.id) ? { ...x, ref: refs.get(x.id)!, status: "submitted", reviewed: true, updatedAt: now } : x)),
          reports: s.reports.map((r) => (r.id === report.id ? { ...r, status: "submitted", submittedAt: now, summary } : r)),
          emails: [
            {
              id: uid("em"),
              to: s.users.find((u) => u.id === CONTRACTOR_ID)?.email ?? s.settings.email,
              subject: "New snag report: " + property.addressLine1 + " (" + drafts.length + " items)",
              preview: owner.name + " submitted a report with " + count("safety") + " safety and " + count("major") + " major items.",
              body:
                "A new snag report has been submitted for " + property.plot + ", " + property.addressLine1 + ", " + property.town + ".\n\n" +
                summary + "\n\nOpen SnagSnap to review it and send a quote.",
              link: "/login?as=" + CONTRACTOR_ID,
              sentAt: now,
              read: false,
            },
            ...s.emails,
          ],
        });
        return { reportId: report.id, count: drafts.length };
      },


      respondToQuote: (quoteId, decisions) => {
        const s = get();
        const q = s.quotes.find((x) => x.id === quoteId);
        if (!q || q.status !== "sent") return null;
        const now = new Date().toISOString();
        const items = q.items.map((i) => ({ ...i, decision: decisions[i.snagId] ?? "accepted" }));
        const acceptedIds = items.filter((i) => i.decision === "accepted").map((i) => i.snagId);
        const declinedIds = items.filter((i) => i.decision === "declined").map((i) => i.snagId);
        const status = acceptedIds.length === 0 ? "declined" : declinedIds.length ? "partially_accepted" : "accepted";
        const updated = { ...q, items, status, respondedAt: now } as Quote;
        const t = quoteTotals(updated);
        const property = s.properties.find((p) => p.id === q.propertyId)!;
        const owner = s.users.find((u) => u.id === property.ownerId)!;

        let invoiceId: string | null = null;
        const newInvoices: Invoice[] = [];
        if (acceptedIds.length && q.depositPercent > 0) {
          const nextNo = Math.max(2000, ...s.invoices.map((i) => Number(i.number.replace(/\D/g, "")))) + 1;
          invoiceId = uid("inv");
          newInvoices.push({
            id: invoiceId,
            number: "INV-" + nextNo,
            quoteId,
            propertyId: q.propertyId,
            kind: "deposit",
            amount: Math.round(t.deposit * 100) / 100,
            status: "unpaid",
            issuedAt: now,
            dueAt: now,
          });
        }

        set({
          quotes: s.quotes.map((x) => (x.id === quoteId ? updated : x)),
          snags: s.snags.map((x) =>
            acceptedIds.includes(x.id) ? { ...x, status: "accepted", updatedAt: now } : declinedIds.includes(x.id) ? { ...x, status: "declined", updatedAt: now } : x,
          ),
          reports: s.reports.map((r) => (r.id === q.reportId && acceptedIds.length ? { ...r, status: "in_progress" } : r)),
          invoices: [...s.invoices, ...newInvoices],
          emails: [
            {
              id: uid("em"),
              to: s.users.find((u) => u.id === CONTRACTOR_ID)?.email ?? s.settings.email,
              subject: "Quote " + q.number + " " + (status === "declined" ? "declined" : "accepted") + ": " + property.addressLine1,
              preview: owner.name + " accepted " + acceptedIds.length + " of " + items.length + " items (" + formatGBP(t.gross) + " inc. VAT).",
              body:
                owner.name + " has replied to quote " + q.number + " for " + property.addressLine1 + ".\n\n" +
                "Accepted: " + acceptedIds.length + " items\nDeclined: " + declinedIds.length + " items\nNew total: " + formatGBP(t.gross) + " inc. VAT\n\n" +
                (acceptedIds.length ? "The accepted jobs have been assigned to your team by trade." : "No work was accepted."),
              link: "/login?as=" + CONTRACTOR_ID,
              sentAt: now,
              read: false,
            },
            ...s.emails,
          ],
        });
        // Hand the accepted work to the right tradespeople straight away
        if (acceptedIds.length) get().autoAssign(acceptedIds);
        return invoiceId;
      },


      startJob: (snagId) => {
        const s = get();
        const x = s.snags.find((y) => y.id === snagId);
        if (!x || !["assigned", "reopened", "accepted"].includes(x.status)) return;
        const now = new Date().toISOString();
        set({
          snags: s.snags.map((y) => (y.id === snagId ? { ...y, status: "in_progress", updatedAt: now } : y)),
          updates: [...s.updates, { id: uid("upd"), snagId, propertyId: x.propertyId, actorId: s.currentUserId ?? "system", kind: "status", fromStatus: x.status, toStatus: "in_progress", note: "Started work on this job.", createdAt: now }],
        });
      },

      postProgress: (snagId, note, photoUrl) => {
        const s = get();
        const x = s.snags.find((y) => y.id === snagId);
        if (!x) return;
        const now = new Date().toISOString();
        set({
          snags: s.snags.map((y) => (y.id === snagId ? { ...y, updatedAt: now } : y)),
          updates: [...s.updates, { id: uid("upd"), snagId, propertyId: x.propertyId, actorId: s.currentUserId ?? "system", kind: "progress", note, photoUrl, createdAt: now }],
        });
      },

      markFixed: (snagId, note, photoUrl) => {
        const s = get();
        const x = s.snags.find((y) => y.id === snagId);
        if (!x || !["in_progress", "assigned", "reopened"].includes(x.status)) return;
        const now = new Date().toISOString();
        const property = s.properties.find((p) => p.id === x.propertyId);
        const owner = s.users.find((u) => u.id === property?.ownerId);
        const me = s.users.find((u) => u.id === s.currentUserId);
        set({
          snags: s.snags.map((y) => (y.id === snagId ? { ...y, status: "fixed", updatedAt: now } : y)),
          updates: [...s.updates, { id: uid("upd"), snagId, propertyId: x.propertyId, actorId: s.currentUserId ?? "system", kind: "status", fromStatus: x.status, toStatus: "fixed", note: note || "Completed and checked.", photoUrl, createdAt: now }],
          emails: owner
            ? [
                {
                  id: uid("em"),
                  to: owner.email,
                  subject: x.ref + " is fixed: please check it",
                  preview: (me?.name ?? "The team") + " has finished " + x.title.toLowerCase() + ".",
                  body:
                    "Hi " + firstName(owner.name) + ",\n\n" + (me?.name ?? "Our team") + " has fixed " + x.ref + ": " + x.title + ".\n\n" +
                    (note ? "Their note: " + note + "\n\n" : "") +
                    "Please have a look and confirm it's done, or tell us what's still wrong.\n\n" + s.settings.name,
                  link: "/login?as=" + owner.id,
                  sentAt: now,
                  read: false,
                },
                ...s.emails,
              ]
            : s.emails,
        });
      },

      confirmFix: (snagId) => {
        const s = get();
        const x = s.snags.find((y) => y.id === snagId);
        if (!x || x.status !== "fixed") return null;
        const now = new Date().toISOString();
        set({
          snags: s.snags.map((y) => (y.id === snagId ? { ...y, status: "verified", updatedAt: now } : y)),
          updates: [...s.updates, { id: uid("upd"), snagId, propertyId: x.propertyId, actorId: s.currentUserId ?? "system", kind: "status", fromStatus: "fixed", toStatus: "verified", note: "Confirmed fixed by the owner.", createdAt: now }],
        });

        // Was that the last job? Then the work is complete and the balance is due.
        const after = get();
        const quote = after.quotes.find(
          (q) => (q.status === "accepted" || q.status === "partially_accepted") && q.items.some((i) => i.snagId === snagId && i.decision === "accepted"),
        );
        if (!quote || !jobCompletion(after, quote).done) return null;
        set({ reports: after.reports.map((r) => (r.id === quote.reportId ? { ...r, status: "completed" } : r)) });
        get().createBalanceInvoice(quote.id);
        const balance = get().invoices.find((i) => i.quoteId === quote.id && i.kind === "balance" && i.status === "unpaid");
        return balance?.id ?? null;
      },

      reopenFix: (snagId, note) => {
        const s = get();
        const x = s.snags.find((y) => y.id === snagId);
        if (!x || x.status !== "fixed") return;
        const now = new Date().toISOString();
        set({
          snags: s.snags.map((y) => (y.id === snagId ? { ...y, status: "reopened", updatedAt: now } : y)),
          updates: [...s.updates, { id: uid("upd"), snagId, propertyId: x.propertyId, actorId: s.currentUserId ?? "system", kind: "status", fromStatus: "fixed", toStatus: "reopened", note, createdAt: now }],
          emails: (() => {
            const member = s.users.find((u) => u.id === x.assigneeId);
            if (!member) return s.emails;
            const prop = s.properties.find((p) => p.id === x.propertyId);
            return [
              {
                id: uid("em"),
                to: member.email,
                subject: x.ref + " sent back: not fixed yet",
                preview: "The owner says: " + note,
                body:
                  "Hi " + firstName(member.name) + ",\n\nThe owner at " + (prop?.addressLine1 ?? "") + " says " + x.ref + " (" + x.title + ") isn't fixed yet.\n\n" +
                  "Their note: " + note + "\n\nPlease take another look.\n\n" + s.settings.name,
                link: "/login?as=" + member.id,
                sentAt: now,
                read: false,
              },
              ...s.emails,
            ];
          })(),
        });
      },


      runAutoReminders: () => {
        const DAY = 86_400_000;
        const now = Date.now();
        const rules = get().settings.autoReminders;
        const lastReminder = (refId: string) =>
          get()
            .emails.filter((e) => e.refId === refId)
            .map((e) => Date.parse(e.sentAt))
            .sort((a, b) => b - a)[0];
        const sentIds: string[] = [];
        let quotes = 0;
        let invoices = 0;

        if (rules.quotes) {
          for (const q of get().quotes.filter((x) => x.status === "sent" && x.sentAt)) {
            const since = Math.max(Date.parse(q.sentAt!), lastReminder(q.id) ?? 0);
            if (now - since >= rules.quoteAfterDays * DAY) {
              get().sendQuoteReminder(q.id);
              sentIds.push(get().emails[0].id);
              quotes += 1;
            }
          }
        }
        if (rules.invoices) {
          for (const inv of get().invoices.filter((i) => i.status === "unpaid")) {
            const overdueFor = now - Date.parse(inv.dueAt);
            const last = lastReminder(inv.id);
            if (overdueFor >= rules.invoiceAfterDaysOverdue * DAY && (!last || now - last >= rules.invoiceAfterDaysOverdue * DAY)) {
              get().sendInvoiceReminder(inv.id);
              sentIds.push(get().emails[0].id);
              invoices += 1;
            }
          }
        }
        // Mark everything this run sent as automatic
        if (sentIds.length) set((s) => ({ emails: s.emails.map((e) => (sentIds.includes(e.id) ? { ...e, sentById: "system" } : e)) }));
        return { quotes, invoices };
      },

      saveRateCard: (rows) => set({ rateCard: rows.map((r) => ({ ...r, prices: { ...r.prices } })), rateCardUpdatedAt: new Date().toISOString() }),

      resetRateCard: () => set({ rateCard: DEFAULT_RATE_CARD.map((r) => ({ ...r, prices: { ...r.prices } })), rateCardUpdatedAt: undefined }),

      markEmailsRead: (ids) => set((s) => ({ emails: s.emails.map((e) => (ids.includes(e.id) && !e.read ? { ...e, read: true } : e)) })),

      setDueDate: (ids, iso) =>
        set((s) => ({ snags: s.snags.map((sn) => (ids.includes(sn.id) ? { ...sn, dueDate: iso ?? undefined } : sn)) })),
      };
}

/**
 * Email for live mode.
 * Every email the app writes is saved in the database (it shows in the inbox). When RESEND_API_KEY
 * is set it is also really sent, with a personal sign-in link for the recipient.
 * Without Resend, the sign-in link is kept on the saved email so the contractor can share it by hand.
 */
import "server-only";
import type { DemoState } from "../data/seed";
import type { DemoEmail, User } from "../types";
import type { Db } from "./db";
import { hashToken, newToken } from "./session";
import type { Change } from "./state-db";

const HOME: Record<User["role"], string> = { contractor: "/contractor", owner: "/owner", team: "/team" };
export const LOGIN_LINK_MINUTES = 15;
const NOTIFICATION_LINK_DAYS = 7;

export const emailConfigured = () => !!process.env.RESEND_API_KEY;

/** Create a sign-in link for a user. */
export async function createLoginLink(tx: Pick<Db, "query">, origin: string, user: User, next: string | null, ttlMs: number) {
  const token = newToken();
  await tx.query("insert into login_tokens (token_hash, user_id, next_path, expires_at) values ($1, $2, $3, $4)", [
    hashToken(token),
    user.id,
    next,
    new Date(Date.now() + ttlMs).toISOString(),
  ]);
  return `${origin}/api/auth/verify?token=${token}`;
}

export async function sendEmail(to: string, subject: string, text: string, link?: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const from = process.env.EMAIL_FROM || "SnagSnap <onboarding@resend.dev>";
  const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const html =
    `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#101513;max-width:520px">` +
    escape(text).replace(/\n/g, "<br>") +
    (link
      ? `<p style="margin:28px 0"><a href="${escape(link)}" style="background:#0f766e;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Open SnagSnap</a></p>`
      : "") +
    `</div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text: link ? `${text}\n\nOpen SnagSnap: ${link}` : text, html }),
  });
  if (!res.ok) console.error("Resend error", res.status, await res.text().catch(() => ""));
  return res.ok;
}

/**
 * For each new email an action wrote: give it a sign-in link for its recipient and send it.
 * Runs inside the save transaction; sending happens after the data is saved (see `flush`).
 */
export async function prepareEmails(tx: Pick<Db, "query">, state: DemoState, changes: Change[], origin: string) {
  const outbox: { to: string; subject: string; body: string; link?: string }[] = [];
  for (const ch of changes) {
    if (ch.collection !== "emails" || ch.kind !== "upsert" || ch.before) continue;
    const email = ch.after as unknown as DemoEmail;
    const user = state.users.find((u) => u.email.toLowerCase() === email.to.toLowerCase());
    let link: string | undefined;
    if (user && email.link) {
      const path = email.link.startsWith("/login") ? HOME[user.role] : email.link;
      link = await createLoginLink(tx, origin, user, path, NOTIFICATION_LINK_DAYS * 86_400_000);
    }
    outbox.push({ to: email.to, subject: email.subject, body: email.body, link });
    // With real email the saved copy just points at the app; without it, keep the personal link to share by hand.
    const saved = emailConfigured() ? (user ? HOME[user.role] : undefined) : link;
    ch.after = { ...ch.after!, link: saved };
  }
  return async function flush() {
    if (!emailConfigured()) return;
    await Promise.allSettled(outbox.map((m) => sendEmail(m.to, m.subject, m.body, m.link)));
  };
}

/** POST /api/auth/request { email }: email a sign-in link (live mode). */
import { getDb } from "@/lib/server/db";
import { liveGuard, originOf } from "@/lib/server/http";
import { createLoginLink, emailConfigured, LOGIN_LINK_MINUTES, sendEmail } from "@/lib/server/mail";
import { loadState } from "@/lib/server/state-db";

export async function POST(req: Request) {
  const blocked = liveGuard();
  if (blocked) return blocked;
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  const address = String(email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return Response.json({ error: "Enter a valid email address" }, { status: 400 });

  const dev = process.env.NODE_ENV !== "production";
  if (!emailConfigured() && !dev) {
    return Response.json({ error: "Email sign-in isn't set up yet. Ask your builder for a sign-in link." }, { status: 503 });
  }
  const db = await getDb();
  const state = await loadState(db);
  const user = state.users.find((u) => u.email.toLowerCase() === address);
  // Same answer whether or not the account exists, so addresses can't be checked from outside.
  if (!user) return Response.json({ ok: true });
  const link = await createLoginLink(db, originOf(req), user, null, LOGIN_LINK_MINUTES * 60_000);
  if (emailConfigured()) {
    await sendEmail(
      user.email,
      "Your SnagSnap sign-in link",
      `Hi ${user.name.split(/\s|&/)[0]},\n\nTap the button below to sign in. This link works for ${LOGIN_LINK_MINUTES} minutes.`,
      link,
    );
    return Response.json({ ok: true });
  }
  // Local development without Resend: hand the link back so it can be opened directly.
  return Response.json({ ok: true, devLink: link });
}

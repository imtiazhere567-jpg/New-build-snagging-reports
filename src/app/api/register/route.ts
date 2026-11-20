/** POST /api/register: a new home owner adds themselves and their home from /phone (live mode). */
import { z } from "zod";
import { getDb } from "@/lib/server/db";
import { liveGuard, originOf } from "@/lib/server/http";
import { prepareEmails } from "@/lib/server/mail";
import { serverStore } from "@/lib/server/run-action";
import { sessionCookie } from "@/lib/server/session";
import { diffState, loadState, writeChanges } from "@/lib/server/state-db";

const Body = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  phone: z.string().trim().max(30).default(""),
  addressLine1: z.string().trim().min(3).max(120),
  town: z.string().trim().min(2).max(60),
  postcode: z.string().trim().regex(/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i),
  plot: z.string().trim().max(30),
  development: z.string().trim().max(80),
  completionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: Request) {
  const blocked = liveGuard();
  if (blocked) return blocked;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Some details are missing or not valid" }, { status: 400 });
  const input = parsed.data;

  const db = await getDb();
  const before = await loadState(db);
  if (!before.users.some((u) => u.role === "contractor")) return Response.json({ error: "This system hasn't been set up yet" }, { status: 503 });
  if (before.users.some((u) => u.email.toLowerCase() === input.email)) {
    return Response.json({ error: "This email already has an account. Sign in instead." }, { status: 409 });
  }

  const store = serverStore(before, null);
  const { userId } = store.getState().registerOwner(input);
  const after = store.getState();
  const changes = diffState(before, after);
  // Only the new account, its home and rooms, and the welcome emails may be created here.
  if (changes.some((c) => c.before || !["users", "properties", "rooms", "emails"].includes(c.collection))) {
    return Response.json({ error: "Could not create the account" }, { status: 500 });
  }
  const flush = await db.begin(async (tx) => {
    const send = await prepareEmails(tx, after, changes, originOf(req));
    await writeChanges(tx, changes);
    return send;
  });
  await flush();
  return Response.json({ ok: true, userId }, { headers: { "Set-Cookie": sessionCookie(userId) } });
}

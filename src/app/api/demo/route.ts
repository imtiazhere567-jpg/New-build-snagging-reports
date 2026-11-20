/**
 * Demo sign-in on the live site (only when the database was filled with sample data from /setup).
 * GET  -> { enabled, accounts }   the sample accounts to pick from
 * POST -> { userId }              sign in as that account
 *
 * Real businesses set up without sample data never have this switched on.
 */
import { getDb } from "@/lib/server/db";
import { liveGuard } from "@/lib/server/http";
import { sessionCookie } from "@/lib/server/session";
import { loadState } from "@/lib/server/state-db";
import { TRADE_LABEL } from "@/lib/constants";

async function demoEnabled() {
  const db = await getDb();
  const [row] = await db.query<{ id: string }>("select id from records where collection = 'meta' and id = 'demo-login'");
  return { db, enabled: !!row };
}

export async function GET() {
  const blocked = liveGuard();
  if (blocked) return blocked;
  const { db, enabled } = await demoEnabled();
  if (!enabled) return Response.json({ enabled: false, accounts: [] });
  const s = await loadState(db);
  const accounts = s.users.map((u) => {
    const p = s.properties.find((x) => x.ownerId === u.id);
    const subtitle = u.role === "contractor" ? `${u.title ?? "Admin"} · ${s.settings.name}` : u.role === "team" ? TRADE_LABEL[u.trade!] : p ? `${p.addressLine1}, ${p.town}` : "";
    return { user: { id: u.id, role: u.role, name: u.name, email: "", avatarColor: u.avatarColor, trade: u.trade, title: u.title }, subtitle, tag: u.role === "contractor" ? "Admin" : undefined };
  });
  return Response.json({ enabled: true, accounts }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const blocked = liveGuard();
  if (blocked) return blocked;
  const { userId } = (await req.json().catch(() => ({}))) as { userId?: string };
  const { db, enabled } = await demoEnabled();
  if (!enabled) return Response.json({ error: "Demo sign-in is off" }, { status: 403 });
  const s = await loadState(db);
  const user = s.users.find((u) => u.id === userId);
  if (!user) return Response.json({ error: "No such account" }, { status: 404 });
  return Response.json({ ok: true, role: user.role }, { headers: { "Set-Cookie": sessionCookie(user.id) } });
}

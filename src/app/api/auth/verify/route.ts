/** GET /api/auth/verify?token=…: open a sign-in link, start the session and go to the right screen. */
import { getDb } from "@/lib/server/db";
import { liveGuard } from "@/lib/server/http";
import { hashToken, sessionCookie } from "@/lib/server/session";
import { loadState, writeChanges, type Change } from "@/lib/server/state-db";

const HOME = { contractor: "/contractor", owner: "/owner", team: "/team" } as const;

export async function GET(req: Request) {
  const blocked = liveGuard();
  if (blocked) return blocked;
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const fail = () => Response.redirect(new URL("/login?error=link", url), 303);
  if (!token) return fail();

  const db = await getDb();
  // Links can be opened more than once until they expire (email scanners often open them first).
  const [row] = await db.query<{ user_id: string; next_path: string | null }>(
    "update login_tokens set used_at = coalesce(used_at, now()) where token_hash = $1 and expires_at > now() returning user_id, next_path",
    [hashToken(token)],
  );
  if (!row) return fail();
  const state = await loadState(db);
  const user = state.users.find((u) => u.id === row.user_id);
  if (!user) return fail();

  // The first time an owner opens a link, they've joined
  const home = state.properties.find((p) => p.ownerId === user.id && !p.joinedAt);
  if (home) {
    const after = { ...home, joinedAt: new Date().toISOString() };
    await writeChanges(db, [{ collection: "properties", id: home.id, kind: "upsert", before: home, after } as unknown as Change]);
  }
  const next = row.next_path && row.next_path.startsWith("/") && !row.next_path.startsWith("//") ? row.next_path : HOME[user.role];
  return new Response(null, { status: 303, headers: { Location: new URL(next, url).toString(), "Set-Cookie": sessionCookie(user.id) } });
}

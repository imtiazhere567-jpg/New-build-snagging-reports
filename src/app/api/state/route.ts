/** GET /api/state: the signed-in person and the data they can see (live mode). */
import { liveGuard } from "@/lib/server/http";
import { stateFor } from "@/lib/server/run-action";
import { clearSessionCookie, sessionUserId } from "@/lib/server/session";

export async function GET(req: Request) {
  const blocked = liveGuard();
  if (blocked) return blocked;
  const userId = sessionUserId(req);
  if (!userId) return Response.json({ error: "signed_out" }, { status: 401 });
  const data = await stateFor(userId);
  if (!data) return Response.json({ error: "signed_out" }, { status: 401, headers: { "Set-Cookie": clearSessionCookie() } });
  return Response.json({ userId: data.user.id, state: data.state }, { headers: { "Cache-Control": "no-store" } });
}

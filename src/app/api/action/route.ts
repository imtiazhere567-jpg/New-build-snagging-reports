/** POST /api/action { name, args, ids }: run one app action on the server (live mode). */
import { liveGuard, originOf } from "@/lib/server/http";
import { ActionError, runAction, stateFor } from "@/lib/server/run-action";
import { sessionUserId } from "@/lib/server/session";

export async function POST(req: Request) {
  const blocked = liveGuard();
  if (blocked) return blocked;
  const userId = sessionUserId(req);
  if (!userId) return Response.json({ error: "signed_out" }, { status: 401 });
  let body: { name?: string; args?: unknown[]; ids?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const me = await stateFor(userId);
  if (!me) return Response.json({ error: "signed_out" }, { status: 401 });
  try {
    const out = await runAction({ user: me.user, name: String(body.name), args: body.args ?? [], ids: body.ids ?? [], origin: originOf(req) });
    return Response.json(out, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof ActionError) return Response.json({ error: e.message }, { status: e.status });
    console.error("action failed", body.name, e);
    return Response.json({ error: "Something went wrong saving that. Please try again." }, { status: 500 });
  }
}

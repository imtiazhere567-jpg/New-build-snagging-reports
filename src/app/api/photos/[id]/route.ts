/** GET /api/photos/:id: a stored snag photo, for people allowed to see that home. */
import { getDb } from "@/lib/server/db";
import { liveGuard } from "@/lib/server/http";
import { stateFor } from "@/lib/server/run-action";
import { sessionUserId } from "@/lib/server/session";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = liveGuard();
  if (blocked) return blocked;
  const userId = sessionUserId(req);
  if (!userId) return new Response("Not signed in", { status: 401 });
  const { id } = await ctx.params;
  const db = await getDb();
  const [photo] = await db.query<{ content_type: string; data: Uint8Array; property_id: string | null }>(
    "select content_type, data, property_id from photos where id = $1",
    [id],
  );
  if (!photo) return new Response("Not found", { status: 404 });
  const me = await stateFor(userId);
  const allowed = me && (me.user.role === "contractor" || !photo.property_id || me.state.properties.some((p) => p.id === photo.property_id));
  if (!allowed) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(photo.data), {
    headers: { "Content-Type": photo.content_type, "Cache-Control": "private, max-age=31536000, immutable" },
  });
}

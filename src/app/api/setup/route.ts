/**
 * First-time setup (live mode).
 * GET  -> { needed } : true while the database has no contractor yet
 * POST -> creates the contractor account and company settings, and signs them in.
 *         Requires SETUP_KEY (set in the environment) when running in production.
 */
import { z } from "zod";
import { createSeed, CONTRACTOR_ID } from "@/lib/data/seed";
import { DEFAULT_RATE_CARD } from "@/lib/rate-card";
import { getDb } from "@/lib/server/db";
import { liveGuard } from "@/lib/server/http";
import { sessionCookie } from "@/lib/server/session";
import { diffState, loadState, writeChanges, type Change } from "@/lib/server/state-db";
import { emptyState } from "@/lib/data/empty";

const Body = z.union([
  z.object({
    sample: z.literal(true),
    setupKey: z.string().default(""),
  }),
  z.object({
    sample: z.literal(false).optional(),
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().email().max(120),
    phone: z.string().trim().max(30).default(""),
    company: z.string().trim().min(2).max(80),
    setupKey: z.string().default(""),
  }),
]);

export async function GET() {
  const blocked = liveGuard();
  if (blocked) return blocked;
  const state = await loadState(await getDb());
  return Response.json({ needed: !state.users.some((u) => u.role === "contractor"), keyRequired: !!process.env.SETUP_KEY || process.env.NODE_ENV === "production" });
}

export async function POST(req: Request) {
  const blocked = liveGuard();
  if (blocked) return blocked;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please fill in every field correctly" }, { status: 400 });
  const input = parsed.data;

  const key = process.env.SETUP_KEY;
  if (key ? input.setupKey !== key : process.env.NODE_ENV === "production") {
    return Response.json({ error: key ? "The setup key is wrong" : "Add SETUP_KEY to the environment first" }, { status: 403 });
  }
  const db = await getDb();
  const state = await loadState(db);
  if (state.users.some((u) => u.role === "contractor")) return Response.json({ error: "Setup has already been done. Sign in instead." }, { status: 409 });

  if (input.sample) {
    // Sample company with every demo account, home, quote and payment, plus one-click demo sign-in.
    const changes = diffState(emptyState(), createSeed());
    await db.begin(async (tx) => {
      await writeChanges(tx, changes);
      await tx.query("insert into records (collection, id, data) values ('meta', 'demo-login', '{\"enabled\":true}'::jsonb) on conflict do nothing");
    });
    return Response.json({ ok: true, records: changes.length }, { headers: { "Set-Cookie": sessionCookie(CONTRACTOR_ID) } });
  }

  const defaults = createSeed().settings;
  const settings = { ...defaults, name: input.company, email: input.email, phone: input.phone, tagline: "", address: "", website: "" };
  const changes = [
    {
      collection: "users",
      id: CONTRACTOR_ID,
      kind: "upsert",
      after: { id: CONTRACTOR_ID, role: "contractor", name: input.name, email: input.email, phone: input.phone, avatarColor: "#0f766e", title: "Owner" },
    },
    { collection: "settings", id: "company", kind: "upsert", after: { id: "company", ...settings } },
    { collection: "ratecard", id: "card", kind: "upsert", after: { id: "card", rows: DEFAULT_RATE_CARD } },
  ] as unknown as Change[];
  await db.begin((tx) => writeChanges(tx, changes));
  return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(CONTRACTOR_ID) } });
}

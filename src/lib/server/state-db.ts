/**
 * Load the app state from Postgres, work out what an action changed, and save only that.
 */
import "server-only";
import type { DemoState } from "../data/seed";
import { emptyState } from "../data/empty";
import type { Db } from "./db";
import { uid } from "../utils";

/** The list collections, stored one record per item. */
export const COLLECTIONS = ["users", "properties", "rooms", "reports", "snags", "updates", "quotes", "invoices", "payments", "emails"] as const;
export type Collection = (typeof COLLECTIONS)[number];

type Item = { id: string; propertyId?: string } & Record<string, unknown>;

export interface Change {
  collection: Collection | "settings" | "ratecard";
  id: string;
  kind: "upsert" | "delete";
  before?: Item;
  after?: Item;
}

const propertyOf = (collection: Change["collection"], item?: Item) =>
  collection === "properties" ? item?.id : typeof item?.propertyId === "string" ? item.propertyId : null;

export async function loadState(db: Pick<Db, "query">): Promise<DemoState> {
  const rows = await db.query<{ collection: string; id: string; data: unknown }>("select collection, id, data from records order by seq");
  const state = emptyState();
  const lists = state as unknown as Record<Collection, Item[]>;
  for (const row of rows) {
    const data = (typeof row.data === "string" ? JSON.parse(row.data) : row.data) as Record<string, unknown>;
    if (row.collection === "settings") state.settings = { ...state.settings, ...(data as Partial<DemoState["settings"]>) };
    else if (row.collection === "ratecard") {
      state.rateCard = data.rows as DemoState["rateCard"];
      state.rateCardUpdatedAt = (data.updatedAt as string | undefined) ?? undefined;
    } else if ((COLLECTIONS as readonly string[]).includes(row.collection)) lists[row.collection as Collection].push(data as Item);
  }
  // The inbox shows newest first
  state.emails.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  return state;
}

/** Every record that differs between two states. */
export function diffState(before: DemoState, after: DemoState): Change[] {
  const changes: Change[] = [];
  for (const c of COLLECTIONS) {
    const prev = new Map((before[c] as unknown as Item[]).map((x) => [x.id, x]));
    const next = new Map((after[c] as unknown as Item[]).map((x) => [x.id, x]));
    for (const [id, item] of next) {
      const old = prev.get(id);
      if (!old || JSON.stringify(old) !== JSON.stringify(item)) changes.push({ collection: c, id, kind: "upsert", before: old, after: item });
    }
    for (const [id, item] of prev) if (!next.has(id)) changes.push({ collection: c, id, kind: "delete", before: item });
  }
  if (JSON.stringify(before.settings) !== JSON.stringify(after.settings)) {
    changes.push({ collection: "settings", id: "company", kind: "upsert", after: { id: "company", ...after.settings } });
  }
  if (JSON.stringify(before.rateCard) !== JSON.stringify(after.rateCard) || before.rateCardUpdatedAt !== after.rateCardUpdatedAt) {
    changes.push({ collection: "ratecard", id: "card", kind: "upsert", after: { id: "card", rows: after.rateCard, updatedAt: after.rateCardUpdatedAt } });
  }
  return changes;
}

const PHOTO = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

/**
 * Photos arrive inside records as data URLs. Store each in the photos table and keep only
 * a short /api/photos/<id> link in the record.
 */
export async function extractPhotos(tx: Pick<Db, "query">, changes: Change[]) {
  for (const ch of changes) {
    const item = ch.after;
    if (!item || typeof item.photoUrl !== "string" || !item.photoUrl.startsWith("data:")) continue;
    const m = PHOTO.exec(item.photoUrl);
    if (!m) throw new Error("Unsupported photo format");
    const bytes = Buffer.from(m[2], "base64");
    if (bytes.length > MAX_PHOTO_BYTES) throw new Error("Photo is too large");
    const id = uid("ph");
    await tx.query("insert into photos (id, content_type, data, property_id) values ($1, $2, $3, $4)", [id, m[1], bytes, propertyOf(ch.collection, item)]);
    ch.after = { ...item, photoUrl: `/api/photos/${id}` };
  }
}

export async function writeChanges(tx: Pick<Db, "query">, changes: Change[]) {
  for (const ch of changes) {
    if (ch.kind === "delete") {
      await tx.query("delete from records where collection = $1 and id = $2", [ch.collection, ch.id]);
      continue;
    }
    const data = { ...ch.after };
    if (ch.collection === "settings") delete data.id;
    await tx.query(
      `insert into records (collection, id, property_id, data) values ($1, $2, $3, $4::jsonb)
       on conflict (collection, id) do update set data = excluded.data, property_id = excluded.property_id, updated_at = now()`,
      [ch.collection, ch.id, propertyOf(ch.collection, ch.after) ?? null, JSON.stringify(data)],
    );
  }
}

/** Put the saved versions (e.g. photo links instead of data URLs) back into the state sent to the browser. */
export function applyChanges(state: DemoState, changes: Change[]): DemoState {
  const next = { ...state } as unknown as Record<string, unknown>;
  for (const ch of changes) {
    if (ch.kind !== "upsert" || !ch.after || ch.collection === "settings" || ch.collection === "ratecard") continue;
    const list = next[ch.collection] as Item[];
    next[ch.collection] = list.map((x) => (x.id === ch.id ? ch.after! : x));
  }
  return next as unknown as DemoState;
}

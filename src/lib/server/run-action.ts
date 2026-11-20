/**
 * Run one app action on the server against the database (live mode).
 * The same action code the browser runs (core.ts) runs here on the real data; the server then checks
 * the result only touched what this person may change, and saves it.
 */
import "server-only";
import { createStore } from "zustand/vanilla";
import { createStoreState, type StoreState } from "../data/core";
import { ACTION_ROLES, type ServerAction } from "../data/action-roles";
import type { DemoState } from "../data/seed";
import type { Snag, User } from "../types";
import { isValidId, replayIds } from "../utils";
import { getDb } from "./db";
import { prepareEmails } from "./mail";
import { forbiddenChange, visibleState } from "./scope";
import { applyChanges, COLLECTIONS, diffState, extractPhotos, loadState, writeChanges } from "./state-db";

export class ActionError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** Fields an owner may edit on a snag they haven't sent yet. */
const OWNER_EDITABLE: (keyof Snag)[] = ["title", "description", "locationInRoom", "category", "severity", "trade", "reviewed", "roomId", "ownerNote"];

/** A fresh in-memory store holding the database state. */
export function serverStore(state: DemoState, currentUserId: string | null) {
  return createStore<StoreState>()((set, get) => ({ ...createStoreState(set, get), ...state, currentUserId, seededAt: 0 }));
}

function checkArgs(name: ServerAction, args: unknown[], state: DemoState, user: User) {
  if (user.role !== "owner") return;
  if (name === "updateSnag" || name === "deleteSnag") {
    const snag = state.snags.find((x) => x.id === args[0]);
    if (!snag || snag.status !== "ai_draft") throw new ActionError("Only snags you haven't sent yet can be changed", 403);
    if (name === "updateSnag") {
      const patch = (args[1] ?? {}) as Record<string, unknown>;
      const bad = Object.keys(patch).filter((k) => !OWNER_EDITABLE.includes(k as keyof Snag));
      if (bad.length) throw new ActionError(`These fields can't be changed: ${bad.join(", ")}`, 403);
    }
  }
}

export async function runAction(opts: { user: User; name: string; args: unknown[]; ids: unknown[]; origin: string }) {
  const { user, args, origin } = opts;
  const name = opts.name as ServerAction;
  const roles = ACTION_ROLES[name] as readonly string[] | undefined;
  if (!roles) throw new ActionError("Unknown action", 404);
  if (!roles.includes(user.role)) throw new ActionError("You can't do that", 403);
  if (!Array.isArray(args) || JSON.stringify(args).length > 6_000_000) throw new ActionError("Bad request");

  const db = await getDb();
  const before = await loadState(db);
  if (!before.users.some((u) => u.id === user.id)) throw new ActionError("Your account no longer exists", 401);
  checkArgs(name, args, before, user);

  // Re-use the ids the browser made, unless any clash with existing records.
  const taken = new Set(COLLECTIONS.flatMap((c) => (before[c] as { id: string }[]).map((x) => x.id)));
  const ids = Array.isArray(opts.ids) && opts.ids.every(isValidId) && !opts.ids.some((id) => taken.has(id)) ? (opts.ids as string[]) : [];

  const store = serverStore(before, user.id);
  const fn = store.getState()[name] as (...a: unknown[]) => unknown;
  let result: unknown;
  try {
    result = replayIds(ids, () => fn(...args));
  } catch (e) {
    throw new ActionError(e instanceof Error ? e.message : "The action failed");
  }
  const after = store.getState();
  const changes = diffState(before, after);

  for (const ch of changes) {
    const reason = forbiddenChange(before, user, ch);
    if (reason) throw new ActionError(`Not allowed: ${reason}`, 403);
  }

  const flush = await db.begin(async (tx) => {
    await extractPhotos(tx, changes);
    const send = await prepareEmails(tx, after, changes, origin);
    await writeChanges(tx, changes);
    return send;
  });
  await flush();

  const saved = applyChanges(after, changes);
  return { result, state: visibleState(saved, user), userId: user.id };
}

/** The signed-in person and the data they can see. */
export async function stateFor(userId: string) {
  const db = await getDb();
  const state = await loadState(db);
  const user = state.users.find((u) => u.id === userId);
  if (!user) return null;
  return { user, state: visibleState(state, user) };
}

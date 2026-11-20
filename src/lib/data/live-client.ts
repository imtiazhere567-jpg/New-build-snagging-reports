"use client";

/**
 * Live mode in the browser.
 * - Loads the signed-in person's data from /api/state.
 * - Every action runs here first (so the screen updates instantly), then the same action is sent to
 *   /api/action, which runs it on the database. The server's answer then replaces the local data.
 * - Checks for changes made by other people every 15 seconds and when the tab comes back into view.
 */
import { create } from "zustand";
import { useStore, type StoreState } from "./store";
import { SERVER_ACTIONS } from "./action-roles";
import type { DemoState } from "./seed";
import { emptyState } from "./empty";
import { isLive } from "../config";
import { recordIds } from "../utils";
import { toast } from "@/components/ui/toast";

export const useLive = create<{ ready: boolean; demo: boolean }>(() => ({ ready: false, demo: false }));

let pending = 0;
let queue: Promise<unknown> = Promise.resolve();
let loading: Promise<void> | null = null;

function applyServerState(state: DemoState, userId: string | null) {
  useStore.setState({ ...state, currentUserId: userId });
}

/** Fetch the signed-in person's data. Safe to call often. */
export function loadLive(): Promise<void> {
  loading ??= (async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (pending > 0) return; // an action's answer will bring fresher data
      if (res.status === 401) applyServerState(emptyState(), null);
      else if (res.ok) {
        const { state, userId, demo } = (await res.json()) as { state: DemoState; userId: string; demo?: boolean };
        applyServerState(state, userId);
        useLive.setState({ demo: !!demo });
      }
    } catch {
      // Offline: keep what we have
    } finally {
      loading = null;
      useLive.setState({ ready: true });
    }
  })();
  return loading;
}

async function send(name: string, args: unknown[], ids: string[]) {
  const res = await fetch("/api/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, args, ids }),
  });
  const body = (await res.json().catch(() => ({}))) as { state?: DemoState; userId?: string; error?: string };
  if (!res.ok || !body.state) throw new Error(body.error || "Couldn't save your change");
  return body as { state: DemoState; userId: string };
}

function install() {
  const wrapped: Partial<Record<string, unknown>> = {};
  for (const name of SERVER_ACTIONS) {
    const local = useStore.getState()[name] as unknown as (...a: unknown[]) => unknown;
    wrapped[name] = (...args: unknown[]) => {
      const { result, ids } = recordIds(() => local(...args));
      pending += 1;
      queue = queue
        .then(() => send(name, args, ids))
        .then((out) => {
          pending -= 1;
          // Only take the server's copy once nothing else is waiting, to avoid the screen jumping back.
          if (pending === 0) applyServerState(out.state, out.userId);
        })
        .catch((e: unknown) => {
          pending -= 1;
          toast({ title: "Not saved", body: e instanceof Error ? e.message : "Please try again.", tone: "info" });
          void loadLive();
        });
      return result;
    };
  }
  // Signing in happens by emailed link; signing out clears the session cookie.
  wrapped.signIn = () => {};
  wrapped.resetDemo = () => {};
  wrapped.signOut = () => {
    void fetch("/api/auth/logout", { method: "POST" });
    applyServerState(emptyState(), null);
  };
  useStore.setState(wrapped as Partial<StoreState>);

  // Pick up other people's changes
  const refresh = () => {
    if (document.visibilityState === "visible" && pending === 0 && useStore.getState().currentUserId) void loadLive();
  };
  setInterval(refresh, 15_000);
  document.addEventListener("visibilitychange", refresh);
  window.addEventListener("focus", refresh);
}

if (isLive && typeof window !== "undefined") install();

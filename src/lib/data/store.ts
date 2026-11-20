"use client";

/**
 * The client store. Demo mode: data lives in this browser (localStorage).
 * Live mode: data comes from the server (Postgres); actions run optimistically here and on the server.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createStoreState, type StoreState } from "./core";
import { isLive } from "../config";
import { emptyState } from "./empty";

export * from "./core";

// Live data never touches browser storage (defined before the store, which reads it straight away)
const noStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };


export const useStore = create<StoreState>()(
  persist(
    (set, get) => (isLive ? { ...createStoreState(set, get), ...emptyState(), seededAt: 0 } : createStoreState(set, get)),
    {
      // Bump the version when the stored shape changes so old browsers reseed.
      name: "snagsnap-demo-v11",
      // Live data never touches browser storage
      storage: createJSONStorage(() => (isLive ? noStorage : localStorage)),
      skipHydration: true,
      // Demo data is shared by every window, but who is signed in is per window (sessionStorage),
      // so the owner app and the contractor dashboard can be open side by side.
      partialize: ({ currentUserId: _signedIn, ...shared }) => (void _signedIn, shared),
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<StoreState>), currentUserId: readWindowUser() }),
    },
  ),
);

const WINDOW_USER_KEY = "snagsnap-signed-in";
function readWindowUser(): string | null {
  try {
    return sessionStorage.getItem(WINDOW_USER_KEY);
  } catch {
    return null;
  }
}

if (typeof window !== "undefined" && !isLive) {
  // Remember this window's sign-in
  useStore.subscribe((s, prev) => {
    if (s.currentUserId === prev.currentUserId) return;
    try {
      if (s.currentUserId) sessionStorage.setItem(WINDOW_USER_KEY, s.currentUserId);
      else sessionStorage.removeItem(WINDOW_USER_KEY);
    } catch {}
  });
  // Live sync: when another window changes the demo data, reload it here
  window.addEventListener("storage", (e) => {
    if (e.key === useStore.persist.getOptions().name && useStore.persist.hasHydrated()) void useStore.persist.rehydrate();
  });
}

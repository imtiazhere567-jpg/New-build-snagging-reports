"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useStore } from "./store";
import { isLive } from "../config";
import { loadLive, useLive } from "./live-client";

const subscribe = (cb: () => void) => useStore.persist.onFinishHydration(cb);
const getSnapshot = () => useStore.persist.hasHydrated();
const getServerSnapshot = () => false;

/**
 * Ready when the data is loaded:
 * demo -> rehydrated from this browser's storage; live -> fetched from the server.
 */
export function useHydrated() {
  const demoReady = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const liveReady = useLive((s) => s.ready);
  useEffect(() => {
    if (isLive) {
      if (!useLive.getState().ready) void loadLive();
    } else if (!useStore.persist.hasHydrated()) void useStore.persist.rehydrate();
  }, []);
  return isLive ? liveReady : demoReady;
}

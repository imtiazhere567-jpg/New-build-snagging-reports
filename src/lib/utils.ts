import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNowStrict } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
export const formatGBP = (n: number) => gbp.format(n);

export const formatDate = (iso: string) => format(new Date(iso), "d MMM yyyy");
export const formatDateTime = (iso: string) => format(new Date(iso), "d MMM, HH:mm");
export const timeAgo = (iso: string) => `${formatDistanceToNowStrict(new Date(iso))} ago`;

export const initials = (name: string) =>
  name
    .replace(/&.*$/, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

/*
 * Record ids. In live mode the browser runs an action first (so the screen updates instantly)
 * and records the ids it made; the server then runs the same action with those ids,
 * so both sides agree on what was created.
 */
let idReplay: string[] | null = null;
let idRecord: string[] | null = null;
const ID_FORMAT = /^[a-z]{1,8}_[a-z0-9]{6,16}$/;

export const uid = (prefix = "id") => {
  if (idReplay) {
    const next = idReplay.shift();
    if (next && ID_FORMAT.test(next) && next.startsWith(prefix + "_")) return next;
  }
  const id = `${prefix}_${Math.random().toString(36).slice(2, 10).padEnd(8, "0")}`;
  idRecord?.push(id);
  return id;
};

/** Run fn and return the ids it created, in order. fn must be synchronous. */
export function recordIds<T>(fn: () => T): { result: T; ids: string[] } {
  const ids: string[] = [];
  idRecord = ids;
  try {
    return { result: fn(), ids };
  } finally {
    idRecord = null;
  }
}

/** Run fn re-using the given ids for anything it creates (falls back to fresh ids). fn must be synchronous. */
export function replayIds<T>(ids: string[], fn: () => T): T {
  idReplay = [...ids];
  try {
    return fn();
  } finally {
    idReplay = null;
  }
}

export const isValidId = (id: unknown): id is string => typeof id === "string" && ID_FORMAT.test(id);

import "server-only";
import { isLive } from "../config";
import { hasDatabase } from "./db";

/** Live-mode API routes answer 404 in demo mode, and 503 when no database is configured. */
export function liveGuard(): Response | null {
  if (!isLive) return Response.json({ error: "not_live" }, { status: 404 });
  if (!hasDatabase()) return Response.json({ error: "database_not_configured" }, { status: 503 });
  return null;
}

/** The site's public address, for links in emails. */
export function originOf(req: Request) {
  return (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, "");
}

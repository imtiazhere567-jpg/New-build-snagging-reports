/**
 * Signed-in sessions for live mode: an httpOnly cookie holding the user id, signed with AUTH_SECRET.
 * Sign-in itself is by emailed link (see tokens.ts).
 */
import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const COOKIE = "ss_session";
const MAX_AGE_DAYS = 30;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set (at least 32 characters)");
  return "snagsnap-local-development-secret-do-not-use-in-production";
}

const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");

export function sessionCookie(userId: string) {
  const expires = Date.now() + MAX_AGE_DAYS * 86_400_000;
  const value = `${userId}.${expires}`;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${value}.${sign(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_DAYS * 86400}${secure}`;
}

export const clearSessionCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

/** The signed-in user id from the request cookie, or null. */
export function sessionUserId(req: Request): string | null {
  const raw = req.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((c) => c.startsWith(COOKIE + "="))
    ?.slice(COOKIE.length + 1);
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [userId, expires, sig] = parts;
  const expected = Buffer.from(sign(`${userId}.${expires}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (Number(expires) < Date.now()) return null;
  return userId;
}

/* ---------- One-time sign-in links ---------- */

export const newToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

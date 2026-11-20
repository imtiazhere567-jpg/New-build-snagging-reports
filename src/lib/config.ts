/**
 * Demo / Live switch.
 *
 * NEXT_PUBLIC_APP_MODE=demo  -> seeded data in the browser, demo inbox for emails,
 *                               any account can be opened from the login dropdown.
 * NEXT_PUBLIC_APP_MODE=live  -> data in Postgres (DATABASE_URL), sign-in by emailed link,
 *                               real emails through Resend when RESEND_API_KEY is set.
 *
 * Switching mode is an environment change, not a code change.
 */
export type AppMode = "demo" | "live";

export const APP_MODE: AppMode = process.env.NEXT_PUBLIC_APP_MODE === "live" ? "live" : "demo";

export const isDemo = APP_MODE === "demo";
export const isLive = APP_MODE === "live";

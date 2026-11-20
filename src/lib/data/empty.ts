import { createSeed, type DemoState } from "./seed";
import { DEFAULT_RATE_CARD } from "../rate-card";

/** Starting point before live data loads: no records, default company settings. */
export function emptyState(): DemoState {
  return {
    // Shown on public pages before sign-in; replaced by the real company once loaded
    settings: { ...createSeed().settings, name: "your builder", tagline: "", address: "", phone: "", email: "", website: "" },
    users: [],
    properties: [],
    rooms: [],
    reports: [],
    snags: [],
    updates: [],
    quotes: [],
    invoices: [],
    payments: [],
    emails: [],
    rateCard: DEFAULT_RATE_CARD.map((r) => ({ ...r, prices: { ...r.prices } })),
    rateCardUpdatedAt: undefined,
  };
}

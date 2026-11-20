import type { Category, Severity } from "./types";
import { CATEGORIES } from "./constants";

/** One row of the contractor's rate card: price ex VAT for each severity. */
export interface RateRow {
  category: Category;
  prices: Record<Severity, number>;
}

const BASE: Record<Category, number> = {
  Cracks: 55,
  Paintwork: 45,
  "Plaster/Drylining": 70,
  Tiling: 60,
  "Sealant/Silicone": 35,
  "Carpentry/Joinery": 60,
  Doors: 60,
  Windows: 55,
  Flooring: 55,
  Plumbing: 65,
  Electrical: 60,
  "Kitchen units/Worktops": 40,
  Sanitaryware: 90,
  "Brickwork/Pointing": 65,
  Roofing: 120,
  "Drainage/External": 60,
  "Insulation/Loft": 45,
  "Cleaning/Debris": 50,
  Other: 50,
};

const MULT: Record<Severity, number> = { cosmetic: 0.6, minor: 1, major: 1.75, safety: 1.5 };
const round5 = (n: number) => Math.round(n / 5) * 5;

export const DEFAULT_RATE_CARD: RateRow[] = CATEGORIES.map((category) => ({
  category,
  prices: {
    cosmetic: round5(BASE[category] * MULT.cosmetic),
    minor: round5(BASE[category] * MULT.minor),
    major: round5(BASE[category] * MULT.major),
    safety: round5(BASE[category] * MULT.safety),
  },
}));

export function ratePrice(card: RateRow[], category: Category, severity: Severity) {
  return card.find((r) => r.category === category)?.prices[severity] ?? 50;
}

/**
 * The AI photo-analysis contract (spec section 5).
 * Shared by the server route (Claude) and the demo simulator so both return exactly the same shape.
 */
import { z } from "zod";
import { CATEGORIES } from "../constants";

export const SEVERITY_VALUES = ["cosmetic", "minor", "major", "safety"] as const;
export const TRADE_VALUES = [
  "painter",
  "plasterer",
  "tiler",
  "carpenter",
  "plumber",
  "electrician",
  "bricklayer",
  "roofer",
  "groundworker",
  "kitchen fitter",
  "cleaner",
  "general",
] as const;

export const AnalysedSnagSchema = z.object({
  title: z.string(),
  description: z.string(),
  location_in_room: z.string(),
  category: z.enum(CATEGORIES as [string, ...string[]]),
  severity: z.enum(SEVERITY_VALUES),
  trade: z.enum(TRADE_VALUES),
  suggested_fix: z.string(),
  /** Fractions of image width/height (0–1) so the app can draw the box on the photo. */
  bbox: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }),
  confidence: z.number(),
});

export const AnalysisSchema = z.object({
  no_defect_visible: z.boolean(),
  image_quality: z.enum(["good", "blurry", "too_dark", "too_far"]),
  snags: z.array(AnalysedSnagSchema),
});

export type AnalysedSnag = z.infer<typeof AnalysedSnagSchema>;
export type Analysis = z.infer<typeof AnalysisSchema>;

export interface AnalyseResponse {
  analysis: Analysis;
  /** "claude" when the real model ran, "demo" when the simulator answered. */
  source: "claude" | "demo";
  model: string;
}

/** Keep numbers in range whichever source produced them. */
export function normaliseAnalysis(a: Analysis): Analysis {
  const clamp = (n: number) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));
  return {
    ...a,
    snags: a.snags.map((s) => {
      const x = clamp(s.bbox.x);
      const y = clamp(s.bbox.y);
      return {
        ...s,
        confidence: clamp(s.confidence),
        bbox: { x, y, w: Math.min(clamp(s.bbox.w), 1 - x), h: Math.min(clamp(s.bbox.h), 1 - y) },
      };
    }),
  };
}

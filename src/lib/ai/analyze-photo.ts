"use client";

/**
 * analyzePhoto(): the single entry point the app uses for AI photo analysis (spec: keep the provider
 * swappable behind one function).
 *
 * It always tries the server route first, which calls Claude when an API key is configured.
 * If the AI isn't configured (or the call fails) and the app is in demo mode, it falls back to the
 * demo simulator so the portfolio demo works without any keys.
 */
import { isDemo } from "../config";
import { demoAnalyse } from "./demo-analyse";
import { normaliseAnalysis, type AnalyseResponse } from "./schema";

export class AnalyseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}

export async function analyzePhoto(image: string, roomName: string, note?: string): Promise<AnalyseResponse> {
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, roomName, note }),
    });
    if (res.ok) return (await res.json()) as AnalyseResponse;

    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.status === 422 && body.error === "refused") {
      throw new AnalyseError("The AI couldn't analyse this photo. You can add the snag by hand instead.", "refused");
    }
    // Live site without an AI key: use the demo AI (by choice), otherwise report the problem.
    if (!isDemo && body.error !== "ai_not_configured") throw new AnalyseError("Photo analysis is unavailable right now. Please try again.", body.error ?? "ai_error");
  } catch (err) {
    if (err instanceof AnalyseError) throw err;
    if (!isDemo) throw new AnalyseError("Couldn't reach the server. Check your connection and try again.", "network");
  }

  // Demo fallback: same shape, simulated
  const analysis = normaliseAnalysis(await demoAnalyse(image, roomName, note));
  return { analysis, source: "demo", model: "demo-simulator" };
}

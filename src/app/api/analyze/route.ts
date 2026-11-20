/**
 * POST /api/analyze: analyse one snag photo with Claude (spec section 5).
 *
 * Body: { image: "data:image/jpeg;base64,...", roomName: string, note?: string }
 * 200:  { analysis, source: "claude", model }
 * 503:  { error: "ai_not_configured" }  -> the client falls back to the demo simulator
 *
 * The provider sits behind this one route, so it can be swapped without touching the app.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AnalysisSchema, normaliseAnalysis, type AnalyseResponse } from "@/lib/ai/schema";
import { VISION_SYSTEM_PROMPT, visionUserPrompt } from "@/lib/ai/prompt";
import { analyseWithClaudeCode, claudeCodePath } from "@/lib/ai/claude-code-cli";
import { isLive } from "@/lib/config";
import { sessionUserId } from "@/lib/server/session";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

const hasCredentials = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

export async function POST(req: Request) {
  // On the live site only signed-in people can use the AI.
  if (isLive && !sessionUserId(req)) return Response.json({ error: "signed_out" }, { status: 401 });
  // Provider order: Anthropic API key -> Claude Code on this computer (local dev) -> not configured.
  const cli = hasCredentials() ? null : claudeCodePath();
  if (!hasCredentials() && !cli) {
    return Response.json({ error: "ai_not_configured" }, { status: 503 });
  }

  let body: { image?: string; roomName?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const match = /^data:(image\/[a-z]+);base64,(.+)$/.exec(body.image ?? "");
  if (!match || !MEDIA_TYPES.includes(match[1] as MediaType)) {
    return Response.json({ error: "image must be a JPEG, PNG, WebP or GIF data URL" }, { status: 400 });
  }
  const [, mediaType, data] = match;
  if ((data.length * 3) / 4 > MAX_IMAGE_BYTES) {
    return Response.json({ error: "image is larger than 5 MB" }, { status: 413 });
  }
  const roomName = (body.roomName ?? "Unknown room").slice(0, 60);
  const note = body.note?.slice(0, 500);

  if (cli) {
    try {
      const { analysis, model } = await analyseWithClaudeCode(cli, data, roomName, note);
      const payload: AnalyseResponse = { analysis, source: "claude", model };
      return Response.json(payload);
    } catch (error) {
      return Response.json({ error: "ai_error", detail: error instanceof Error ? error.message.slice(0, 300) : "Claude Code failed" }, { status: 502 });
    }
  }

  const client = new Anthropic();

  const ask = () =>
    client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // If the model declines a photo, the API re-runs it on a fallback model in the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(AnalysisSchema) },
      system: VISION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType as MediaType, data } },
            { type: "text", text: visionUserPrompt(roomName, note) },
          ],
        },
      ],
    });

  try {
    // Spec: validate against the schema and retry once on invalid output.
    let message = await ask();
    if (message.stop_reason !== "refusal" && !message.parsed_output) message = await ask();

    if (message.stop_reason === "refusal") {
      return Response.json({ error: "refused", detail: message.stop_details?.category ?? null }, { status: 422 });
    }
    if (!message.parsed_output) {
      return Response.json({ error: "invalid_ai_output" }, { status: 502 });
    }
    const payload: AnalyseResponse = { analysis: normaliseAnalysis(message.parsed_output), source: "claude", model: message.model };
    return Response.json(payload);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "ai_not_configured" }, { status: 503 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "rate_limited" }, { status: 429 });
    }
    if (error instanceof Anthropic.BadRequestError) {
      return Response.json({ error: "bad_request", detail: error.message }, { status: 400 });
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json({ error: "ai_error", detail: error.message }, { status: 502 });
    }
    return Response.json({ error: "ai_unreachable" }, { status: 502 });
  }
}

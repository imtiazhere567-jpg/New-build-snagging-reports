/**
 * Local-only AI provider: analyse a photo through the Claude Code program installed on this computer,
 * using the signed-in Claude subscription instead of an API key.
 *
 * Only works where that program and sign-in exist (your own PC running `npm run dev`).
 * A deployed server needs ANTHROPIC_API_KEY instead.
 */
import "server-only";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { AnalysisSchema, normaliseAnalysis, type Analysis } from "./schema";
import { VISION_SYSTEM_PROMPT, visionUserPrompt } from "./prompt";

const DEFAULT_PATHS = [
  path.join(os.homedir(), ".local", "bin", process.platform === "win32" ? "claude.exe" : "claude"),
];

/** Path to the Claude Code program, or null when this provider isn't available. */
export function claudeCodePath(): string | null {
  if (process.env.AI_PROVIDER !== "claude-code") return null;
  const candidates = [process.env.CLAUDE_CODE_PATH, ...DEFAULT_PATHS].filter(Boolean) as string[];
  return candidates.find((p) => existsSync(p)) ?? null;
}

// The CLI's validator doesn't know the draft-2020-12 meta-schema URL, so leave "$schema" out.
const { $schema: _metaSchema, ...schemaBody } = z.toJSONSchema(AnalysisSchema) as Record<string, unknown>;
void _metaSchema;
const SCHEMA_JSON = JSON.stringify(schemaBody);

export async function analyseWithClaudeCode(
  bin: string,
  imageBase64: string,
  roomName: string,
  note?: string,
): Promise<{ analysis: Analysis; model: string }> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "snagsnap-"));
  try {
    await writeFile(path.join(dir, "photo.jpg"), Buffer.from(imageBase64, "base64"));
    const args = [
      "-p",
      `Use the Read tool to view photo.jpg in the current directory, then analyse it.\n\n${visionUserPrompt(roomName, note)}`,
      "--output-format", "json",
      "--json-schema", SCHEMA_JSON,
      "--system-prompt", `${VISION_SYSTEM_PROMPT}\n\nThe photo is the file photo.jpg in the current directory; read it with the Read tool. Answer only through the structured output.`,
      // Keep each run lean: only the Read tool, no MCP servers, no slash commands, nothing saved.
      "--tools", "Read",
      "--allowedTools", "Read",
      "--strict-mcp-config",
      "--no-session-persistence",
      "--disable-slash-commands",
      "--max-turns", "4",
    ];

    const stdout = await new Promise<string>((resolve, reject) => {
      const child = execFile(bin, args, { cwd: dir, timeout: 180_000, maxBuffer: 10 * 1024 * 1024, windowsHide: true }, (err, out, errOut) => {
        if (err) reject(new Error(errOut?.trim() || err.message));
        else resolve(out);
      });
      child.stdin?.end(); // no piped input; stops the CLI waiting for stdin
    });

    const result = JSON.parse(stdout) as { is_error?: boolean; structured_output?: unknown; modelUsage?: Record<string, unknown>; result?: string };
    if (result.is_error) throw new Error(result.result || "Claude Code reported an error");
    const parsed = AnalysisSchema.safeParse(result.structured_output);
    if (!parsed.success) throw new Error("Claude Code returned data that doesn't match the schema");
    const model = Object.keys(result.modelUsage ?? {}).find((m) => !m.includes("haiku")) ?? "claude";
    return { analysis: normaliseAnalysis(parsed.data), model: `${model} (Claude Code)` };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

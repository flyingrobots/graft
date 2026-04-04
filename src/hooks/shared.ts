// ---------------------------------------------------------------------------
// Shared utilities for Claude Code hooks
// ---------------------------------------------------------------------------

import * as path from "node:path";

/** Maximum stdin bytes before rejecting (1 MB — generous for JSON). */
const MAX_STDIN_BYTES = 1_048_576;

export interface HookInput {
  session_id: string;
  cwd: string;
  hook_event_name: string;
  tool_name: string;
  tool_input: {
    file_path: string;
    offset?: number;
    limit?: number;
  };
  tool_result?: string;
}

export interface HookOutput {
  exitCode: number;
  stderr: string;
}

/**
 * Reads stdin with a size guard. Throws if input exceeds MAX_STDIN_BYTES.
 * Accumulates raw buffers to avoid corrupting multi-byte UTF-8 characters
 * that may be split across chunk boundaries.
 */
export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of process.stdin) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), "utf-8");
    totalBytes += buf.length;
    if (totalBytes > MAX_STDIN_BYTES) {
      throw new Error(
        `stdin exceeded ${String(MAX_STDIN_BYTES)} bytes — aborting`,
      );
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

/**
 * Parses and validates hook input from a raw JSON string.
 * Throws with a descriptive message if required fields are missing.
 */
export function parseHookInput(raw: string): HookInput {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Hook input must be a JSON object");
  }

  const obj = parsed as Record<string, unknown>;

  const sessionId = obj["session_id"];
  if (typeof sessionId !== "string") {
    throw new Error("Hook input missing session_id");
  }

  const cwd = obj["cwd"];
  if (typeof cwd !== "string") {
    throw new Error("Hook input missing cwd");
  }

  const rawToolInput = obj["tool_input"];
  if (typeof rawToolInput !== "object" || rawToolInput === null) {
    throw new Error("Hook input missing tool_input");
  }
  const toolInput = rawToolInput as Record<string, unknown>;

  const filePath = toolInput["file_path"];
  if (typeof filePath !== "string") {
    throw new Error("Hook input missing tool_input.file_path");
  }

  const hookEventName = obj["hook_event_name"];
  const toolName = obj["tool_name"];
  const toolResult = obj["tool_result"];
  const offset = toolInput["offset"];
  const limit = toolInput["limit"];

  return {
    session_id: sessionId,
    cwd,
    hook_event_name: typeof hookEventName === "string" ? hookEventName : "",
    tool_name: typeof toolName === "string" ? toolName : "",
    tool_input: {
      file_path: filePath,
      ...(typeof offset === "number" ? { offset } : {}),
      ...(typeof limit === "number" ? { limit } : {}),
    },
    ...(typeof toolResult === "string" ? { tool_result: toolResult } : {}),
  };
}

/**
 * Returns a cwd-relative path, or null if the path is outside the cwd.
 * Prevents path traversal attacks and handles the path.relative() edge case
 * where paths outside cwd produce absolute or '../' prefixed results.
 */
export function safeRelativePath(cwd: string, filePath: string): string | null {
  const rel = path.relative(cwd, filePath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return null;
  }
  return rel;
}

/**
 * Wraps a hook's main function with stdin reading, input parsing,
 * and error handling. Logs full stack traces on failure.
 */
export function runHook(
  handler: (input: HookInput) => HookOutput | Promise<HookOutput>,
  failExitCode: number,
): void {
  const run = async (): Promise<void> => {
    const raw = await readStdin();
    const input = parseHookInput(raw);
    const output = await handler(input);
    if (output.stderr.length > 0) process.stderr.write(output.stderr);
    process.exit(output.exitCode);
  };

  run().catch((err: unknown) => {
    const detail = err instanceof Error ? (err.stack ?? err.message) : String(err);
    process.stderr.write(`[graft] Hook error: ${detail}`);
    process.exit(failExitCode);
  });
}

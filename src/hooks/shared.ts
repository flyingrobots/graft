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
  if (typeof obj["session_id"] !== "string") {
    throw new Error("Hook input missing session_id");
  }
  if (typeof obj["cwd"] !== "string") {
    throw new Error("Hook input missing cwd");
  }
  if (typeof obj["tool_input"] !== "object" || obj["tool_input"] === null) {
    throw new Error("Hook input missing tool_input");
  }

  const toolInput = obj["tool_input"] as Record<string, unknown>;
  if (typeof toolInput["file_path"] !== "string") {
    throw new Error("Hook input missing tool_input.file_path");
  }

  // After type guards above, TS narrows these to string.
  // hook_event_name and tool_name may be absent — default to empty.
  const hookEventName = typeof obj["hook_event_name"] === "string"
    ? obj["hook_event_name"] : "";
  const toolName = typeof obj["tool_name"] === "string"
    ? obj["tool_name"] : "";

  return {
    session_id: obj["session_id"],
    cwd: obj["cwd"],
    hook_event_name: hookEventName,
    tool_name: toolName,
    tool_input: {
      file_path: toolInput["file_path"],
      offset: typeof toolInput["offset"] === "number" ? toolInput["offset"] : undefined,
      limit: typeof toolInput["limit"] === "number" ? toolInput["limit"] : undefined,
    },
    tool_result: typeof obj["tool_result"] === "string" ? obj["tool_result"] : undefined,
  } as HookInput;
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

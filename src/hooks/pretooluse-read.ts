// ---------------------------------------------------------------------------
// PreToolUse hook for Read — enforces graft policy on Claude Code reads
// ---------------------------------------------------------------------------
//
// Intercepts Claude Code's Read tool and evaluates graft policy:
//   - Content (small file): exit 0 — let native Read proceed normally
//   - Outline (large file): exit 2 — block and return structural outline
//   - Refused (banned file): exit 2 — block and return refusal
//
// Invoked as: node --import tsx src/hooks/pretooluse-read.ts
// Receives JSON on stdin from Claude Code hooks system.
// ---------------------------------------------------------------------------

import * as fs from "node:fs";
import * as path from "node:path";
import { evaluatePolicy } from "../policy/evaluate.js";
import { ContentResult, RefusedResult } from "../policy/types.js";
import { loadGraftignore } from "../policy/graftignore.js";

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
}

export interface HookOutput {
  exitCode: number;
  stderr: string;
}

export async function handleReadHook(input: HookInput): Promise<HookOutput> {
  const filePath = input.tool_input.file_path;

  // Read file
  let rawContent: string;
  try {
    rawContent = fs.readFileSync(filePath, "utf-8");
  } catch {
    return { exitCode: 2, stderr: `[graft] File not found: ${filePath}` };
  }

  const lines = rawContent.split("\n");
  const bytes = Buffer.byteLength(rawContent, "utf-8");

  // Load .graftignore patterns
  let graftignorePatterns: string[] | undefined;
  try {
    const ignoreFile = fs.readFileSync(path.join(input.cwd, ".graftignore"), "utf-8");
    graftignorePatterns = loadGraftignore(ignoreFile);
  } catch {
    // No .graftignore — that's fine
  }

  // Evaluate policy (stateless — no session depth)
  // Use relative path for graftignore pattern matching
  const relPath = path.relative(input.cwd, filePath);
  const policy = evaluatePolicy(
    { path: relPath, lines: lines.length, bytes },
    { graftignorePatterns },
  );

  // Refused — banned file
  if (policy instanceof RefusedResult) {
    const nextSteps = policy.next.map((n) => `  - ${n}`).join("\n");
    return {
      exitCode: 2,
      stderr: [
        `[graft] Refused: ${policy.reason}`,
        policy.reasonDetail,
        "",
        "Next steps:",
        nextSteps,
        "",
        "Graft tools: use file_outline to see the file's structure,",
        "or safe_read for a policy-aware read with caching.",
      ].join("\n"),
    };
  }

  // Content — small file, let native Read proceed
  if (policy instanceof ContentResult) {
    return { exitCode: 0, stderr: "" };
  }

  // Outline — large file, extract structure
  // Only extract outlines for supported languages (JS/TS). Other files
  // get content pass-through regardless of size.
  const { detectLang } = await import("../parser/lang.js");
  const lang = detectLang(filePath);
  if (lang === null) {
    // Unsupported language — no outline available, let native Read proceed
    return { exitCode: 0, stderr: "" };
  }

  const { extractOutline } = await import("../parser/outline.js");
  const result = extractOutline(rawContent, lang);

  const outlineJson = JSON.stringify({
    outline: result.entries,
    jumpTable: result.jumpTable,
    ...(result.partial === true ? { partial: true } : {}),
  }, null, 2);

  return {
    exitCode: 2,
    stderr: [
      `[graft] File exceeds policy threshold (${String(lines.length)} lines, ${String(bytes)} bytes).`,
      "Structural outline returned instead of full content.",
      "",
      "Use graft's read_range tool with the jump table line numbers",
      "below to read specific symbols. Use file_outline for a fresh",
      "outline, or safe_read for full policy-aware reads with caching.",
      "",
      outlineJson,
    ].join("\n"),
  };
}

// ---------------------------------------------------------------------------
// Script entry point — reads stdin, calls handler, writes stderr
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  let raw = "";
  for await (const chunk of process.stdin) {
    raw += String(chunk);
  }

  const input = JSON.parse(raw) as HookInput;
  const output = await handleReadHook(input);
  process.stderr.write(output.stderr);
  process.exit(output.exitCode);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[graft] Hook error: ${msg}`);
  process.exit(2);
});

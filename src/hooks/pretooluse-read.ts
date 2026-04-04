// ---------------------------------------------------------------------------
// PreToolUse hook for Read — blocks banned files only
// ---------------------------------------------------------------------------
//
// Intercepts Claude Code's Read tool and evaluates graft policy:
//   - Refused (banned file): exit 2 — hard block with refusal reason
//   - Everything else: exit 0 — let native Read proceed
//
// Banned files (.env, binaries, lockfiles, minified, build output,
// .graftignore matches) are the only hard enforcement. Large file
// governance is handled by the PostToolUse hook via education.
//
// Invoked as: node --import tsx src/hooks/pretooluse-read.ts
// Receives JSON on stdin from Claude Code hooks system.
// ---------------------------------------------------------------------------

import * as fs from "node:fs";
import * as path from "node:path";
import { evaluatePolicy } from "../policy/evaluate.js";
import { RefusedResult } from "../policy/types.js";
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

export function handleReadHook(input: HookInput): HookOutput {
  const filePath = input.tool_input.file_path;

  // Read file to get dimensions for policy
  let rawContent: string;
  try {
    rawContent = fs.readFileSync(filePath, "utf-8");
  } catch {
    // File not found — let Read handle the error natively
    return { exitCode: 0, stderr: "" };
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

  // Evaluate policy
  const relPath = path.relative(input.cwd, filePath);
  const policy = evaluatePolicy(
    { path: relPath, lines: lines.length, bytes },
    { graftignorePatterns },
  );

  // Only block refused files — everything else passes through
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

  // Content or outline — let Read proceed. PostToolUse will educate.
  return { exitCode: 0, stderr: "" };
}

// ---------------------------------------------------------------------------
// Script entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  let raw = "";
  for await (const chunk of process.stdin) {
    raw += String(chunk);
  }

  const input = JSON.parse(raw) as HookInput;
  const output = handleReadHook(input);
  if (output.stderr.length > 0) process.stderr.write(output.stderr);
  process.exit(output.exitCode);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[graft] Hook error: ${msg}`);
  process.exit(2);
});

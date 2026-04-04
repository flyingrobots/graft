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
import { HookInput, HookOutput, safeRelativePath, runHook } from "./shared.js";

export { HookInput, HookOutput };

export function handleReadHook(input: HookInput): HookOutput {
  const filePath = input.tool_input.file_path;

  // Path outside project — let Read handle it, not our concern
  const relPath = safeRelativePath(input.cwd, filePath);
  if (relPath === null) {
    return new HookOutput(0, "");
  }

  // Read file to get dimensions for policy
  let rawContent: string;
  try {
    rawContent = fs.readFileSync(filePath, "utf-8");
  } catch {
    // File errors (ENOENT, EACCES, EISDIR) — let Read handle natively
    return new HookOutput(0, "");
  }

  const lines = rawContent.split("\n");
  const bytes = Buffer.byteLength(rawContent, "utf-8");

  // Load .graftignore patterns
  let graftignorePatterns: string[] | undefined;
  try {
    const ignoreFile = fs.readFileSync(
      path.join(input.cwd, ".graftignore"),
      "utf-8",
    );
    graftignorePatterns = loadGraftignore(ignoreFile);
  } catch {
    // No .graftignore — that's fine
  }

  // Evaluate policy
  const policy = evaluatePolicy(
    { path: relPath, lines: lines.length, bytes },
    { graftignorePatterns },
  );

  // Only block refused files — everything else passes through
  if (policy instanceof RefusedResult) {
    const nextSteps = policy.next.map((n) => `  - ${n}`).join("\n");
    return new HookOutput(2, [
      `[graft] Refused: ${policy.reason}`,
      policy.reasonDetail,
      "",
      "Next steps:",
      nextSteps,
      "",
      "Graft tools: use file_outline to see the file's structure,",
      "or safe_read for a policy-aware read with caching.",
    ].join("\n"));
  }

  // Content or outline — let Read proceed. PostToolUse will educate.
  return new HookOutput(0, "");
}

// ---------------------------------------------------------------------------
// Script entry point — exit 2 on failure to block unsafe reads
// ---------------------------------------------------------------------------

runHook(handleReadHook, 2);

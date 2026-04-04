// ---------------------------------------------------------------------------
// PostToolUse hook for Read — educates the agent on context cost
// ---------------------------------------------------------------------------
//
// After a Read completes, evaluates what safe_read would have done and
// tells the agent the cost difference. Does not block — just feedback.
//
// The agent sees messages like:
//   "[graft] You just read 450 lines (18KB). safe_read would have
//    returned a 2KB outline, saving 16KB of context."
//
// This teaches the agent to prefer graft's MCP tools voluntarily.
//
// Invoked as: node --import tsx src/hooks/posttooluse-read.ts
// Receives JSON on stdin from Claude Code hooks system.
// ---------------------------------------------------------------------------

import * as fs from "node:fs";
import * as path from "node:path";
import { evaluatePolicy, STATIC_THRESHOLDS } from "../policy/evaluate.js";
import { ContentResult, RefusedResult } from "../policy/types.js";
import { loadGraftignore } from "../policy/graftignore.js";
import { HookInput, HookOutput, safeRelativePath, runHook } from "./shared.js";

export { HookInput, HookOutput };

export async function handlePostReadHook(input: HookInput): Promise<HookOutput> {
  const filePath = input.tool_input.file_path;

  // Path outside project — no feedback
  const relPath = safeRelativePath(input.cwd, filePath);
  if (relPath === null) {
    return new HookOutput(0, "");
  }

  // Read file to get dimensions
  let rawContent: string;
  try {
    rawContent = fs.readFileSync(filePath, "utf-8");
  } catch {
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
    // No .graftignore
  }

  // Evaluate what safe_read would have done
  const policy = evaluatePolicy(
    { path: relPath, lines: lines.length, bytes },
    { graftignorePatterns },
  );

  // Small file — no feedback needed, Read was the right call
  if (policy instanceof ContentResult) {
    return new HookOutput(0, "");
  }

  // Refused — PreToolUse should have caught this, but just in case
  if (policy instanceof RefusedResult) {
    return new HookOutput(0, "");
  }

  // Outline projection — the agent just dumped a large file into context
  // when safe_read would have returned a compact outline
  const { detectLang } = await import("../parser/lang.js");
  const lang = detectLang(filePath);
  if (lang === null) {
    // Non-JS/TS — no outline available, Read was reasonable
    return new HookOutput(0, "");
  }

  const { CanonicalJsonCodec } = await import("../adapters/canonical-json.js");
  const { extractOutline } = await import("../parser/outline.js");
  const codec = new CanonicalJsonCodec();
  const outline = extractOutline(rawContent, lang);
  const outlineBytes = Buffer.byteLength(codec.encode(outline), "utf-8");
  const saved = bytes - outlineBytes;
  const savedKb = (saved / 1024).toFixed(1);
  const bytesKb = (bytes / 1024).toFixed(1);

  return new HookOutput(0, [
    `[graft] You just read ${String(lines.length)} lines (${bytesKb}KB) into context.`,
    `safe_read would have returned a structural outline (${String(outlineBytes)} bytes),`,
    `saving ${savedKb}KB of context. Threshold: ${String(STATIC_THRESHOLDS.lines)} lines / ${String(STATIC_THRESHOLDS.bytes / 1024)}KB.`,
    "",
    "Consider using graft's safe_read tool for large files —",
    "it returns outlines with jump tables for targeted read_range.",
  ].join("\n"));
}

// ---------------------------------------------------------------------------
// Script entry point — exit 0 on failure, never block on post-hook errors
// ---------------------------------------------------------------------------

runHook(handlePostReadHook, 0);

// ---------------------------------------------------------------------------
// PostToolUse hook for Read — educates the agent on context cost
// ---------------------------------------------------------------------------
//
// After a Read completes, evaluates whether a large JS/TS file bypassed
// graft's governed path and tells the agent the cost difference.
// Does not block — just feedback.
//
// The agent sees messages like:
//   "[graft] This large code read bypassed graft's governed path ...
//    safe_read would have returned a 2KB outline, saving 16KB."
//
// This teaches the agent to prefer graft's MCP tools voluntarily.
//
// Invoked as: node node_modules/@flyingrobots/graft/dist/hooks/posttooluse-read.js
// Receives JSON on stdin from Claude Code hooks system.
// ---------------------------------------------------------------------------
import { HookInput, HookOutput, runHook } from "./shared.js";
import { renderOversizedReadEducation } from "./read-messages.js";
import {
  inspectHookRead,
} from "./read-governor.js";

export { HookInput, HookOutput };

export async function handlePostReadHook(input: HookInput): Promise<HookOutput> {
  const inspection = inspectHookRead(input);
  if (!inspection?.isGovernedCodeRead()) {
    return new HookOutput(0, "");
  }

  const { extractOutlineForFile } = await import("../parser/outline.js");
  const outline = extractOutlineForFile(
    inspection.absolutePath,
    inspection.rawContent,
  );
  if (outline === null) {
    return new HookOutput(0, "");
  }

  const { CanonicalJsonCodec } = await import("../adapters/canonical-json.js");
  const codec = new CanonicalJsonCodec();
  const outlineBytes = Buffer.byteLength(codec.encode(outline), "utf-8");
  return new HookOutput(
    0,
    renderOversizedReadEducation(inspection, outlineBytes),
  );
}

// ---------------------------------------------------------------------------
// Script entry point — exit 0 on failure, never block on post-hook errors
// ---------------------------------------------------------------------------

runHook(handlePostReadHook, 0);

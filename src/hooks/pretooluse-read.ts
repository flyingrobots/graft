// ---------------------------------------------------------------------------
// PreToolUse hook for Read — blocks banned files and redirects large code reads
// ---------------------------------------------------------------------------
//
// Intercepts Claude Code's Read tool and evaluates graft policy:
//   - Refused (banned file): exit 2 — hard block with refusal reason
//   - Oversized JS/TS file: exit 2 — redirect to graft's bounded-read path
//   - Everything else: exit 0 — let native Read proceed
//
// Banned files (.env, binaries, lockfiles, minified, build output,
// .graftignore matches) stay hard blocks. Large JS/TS files now route
// through graft's governed path before native Read can dump them into
// context. PostToolUse remains a backstop if an oversized code read
// still slips through.
//
// Invoked as: node --import tsx src/hooks/pretooluse-read.ts
// Receives JSON on stdin from Claude Code hooks system.
// ---------------------------------------------------------------------------
import { RefusedResult } from "../policy/types.js";
import {
  renderGovernedReadRedirect,
  renderRefusedReadMessage,
} from "./read-messages.js";
import {
  inspectHookRead,
} from "./read-governor.js";
import { HookInput, HookOutput, runHook } from "./shared.js";

export { HookInput, HookOutput };

export function handleReadHook(input: HookInput): HookOutput {
  const inspection = inspectHookRead(input);
  if (inspection === null) {
    return new HookOutput(0, "");
  }

  if (inspection.policy instanceof RefusedResult) {
    return new HookOutput(2, renderRefusedReadMessage(inspection.policy));
  }

  if (inspection.isGovernedCodeRead()) {
    return new HookOutput(2, renderGovernedReadRedirect(inspection));
  }

  return new HookOutput(0, "");
}

// ---------------------------------------------------------------------------
// Script entry point — exit 2 on failure to block unsafe reads
// ---------------------------------------------------------------------------

runHook(handleReadHook, 2);

import { STATIC_THRESHOLDS } from "../policy/evaluate.js";
import { RefusedResult } from "../policy/types.js";
import { HookReadInspection } from "./read-governor.js";

function formatKilobytes(bytes: number): string {
  return (bytes / 1024).toFixed(1);
}

export function renderRefusedReadMessage(policy: RefusedResult): string {
  const nextSteps = policy.next.map((step) => `  - ${step}`).join("\n");
  return [
    `[graft] Refused: ${policy.reason}`,
    policy.reasonDetail,
    "",
    "Next steps:",
    nextSteps,
    "",
    "Graft tools: use file_outline to see the file's structure,",
    "or safe_read for a policy-aware read with caching.",
  ].join("\n");
}

export function renderGovernedReadRedirect(
  inspection: HookReadInspection,
): string {
  return [
    `[graft] Governed read: ${inspection.relativePath}`,
    `Native Read would dump ${String(inspection.lines)} lines (${formatKilobytes(inspection.bytes)}KB) into context.`,
    "This large JS/TS file should go through graft's bounded-read path instead.",
    "",
    "Next steps:",
    `  - Call safe_read on ${inspection.relativePath}`,
    "  - Use read_range with jump table entries for the exact region you need",
    "  - Use file_outline if you only need symbol structure",
    "",
    `Threshold: ${String(STATIC_THRESHOLDS.lines)} lines / ${String(STATIC_THRESHOLDS.bytes / 1024)}KB.`,
  ].join("\n");
}

export function renderOversizedReadEducation(
  inspection: HookReadInspection,
  outlineBytes: number,
): string {
  const savedBytes = inspection.bytes - outlineBytes;
  return [
    `[graft] This large code read bypassed graft's governed path for ${inspection.relativePath}.`,
    `safe_read would have returned a structural outline (${String(outlineBytes)} bytes) instead of ${String(inspection.lines)} lines (${formatKilobytes(inspection.bytes)}KB),`,
    `saving ${formatKilobytes(savedBytes)}KB of context. Threshold: ${String(STATIC_THRESHOLDS.lines)} lines / ${String(STATIC_THRESHOLDS.bytes / 1024)}KB.`,
    "",
    "If this was unexpected, verify the Claude PreToolUse hook is installed and active.",
    "Use read_range with jump table entries after safe_read for targeted follow-up.",
  ].join("\n");
}

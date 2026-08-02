import type { ObservedFile } from "./workspace-read-view.js";

const MAX_RANGE_LINES = 250;

export interface ReadRangeResult {
  path: string;
  content?: string | undefined;
  startLine?: number | undefined;
  endLine?: number | undefined;
  reason?: string | undefined;
  truncated?: boolean | undefined;
  clipped?: boolean | undefined;
}

/**
 * Projects a line range from bytes already observed.
 *
 * Synchronous because it performs no I/O. The caller supplies the observation,
 * so the range returned is necessarily cut from the same bytes the caller
 * authorised.
 */
export function readRange(
  file: ObservedFile,
  start: number,
  end: number,
): ReadRangeResult {
  const filePath = file.path;
  if (file.utf8 === null) {
    return { path: filePath, reason: "INVALID_UTF8" };
  }
  const raw = file.utf8;

  if (start > end) {
    return { path: filePath, reason: "INVALID_RANGE" };
  }

  const allLines = raw.split("\n");
  const totalLines = allLines.length;

  let effectiveEnd = end;
  let truncated = false;
  let clipped = false;

  // Check if range exceeds 250 lines
  if (effectiveEnd - start + 1 > MAX_RANGE_LINES) {
    effectiveEnd = start + MAX_RANGE_LINES - 1;
    truncated = true;
  }

  // Clip to EOF
  if (effectiveEnd > totalLines) {
    effectiveEnd = totalLines;
    clipped = true;
  }

  // Extract lines (1-based to 0-based)
  const selected = allLines.slice(start - 1, effectiveEnd);
  const content = selected.join("\n");

  return {
    path: filePath,
    content,
    startLine: start,
    endLine: effectiveEnd,
    ...(truncated ? { truncated: true, reason: "RANGE_EXCEEDED" } : {}),
    ...(clipped && !truncated ? { clipped: true } : {}),
    ...(clipped && truncated ? { clipped: true } : {}),
  };
}

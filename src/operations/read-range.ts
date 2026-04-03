import type { FileSystem } from "../ports/filesystem.js";

const MAX_RANGE_LINES = 250;

export interface ReadRangeResult {
  [key: string]: unknown;
  path: string;
  content?: string | undefined;
  startLine?: number | undefined;
  endLine?: number | undefined;
  reason?: string | undefined;
  truncated?: boolean | undefined;
  clipped?: boolean | undefined;
}

export async function readRange(
  filePath: string,
  start: number,
  end: number,
  opts: { fs: FileSystem },
): Promise<ReadRangeResult> {
  let raw: string;
  try {
    raw = await opts.fs.readFile(filePath, "utf-8");
  } catch {
    return { path: filePath, reason: "NOT_FOUND" };
  }

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

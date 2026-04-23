// ---------------------------------------------------------------------------
// Teaching Hints — contextual guidance for suboptimal read decisions
// ---------------------------------------------------------------------------

/** Context about a projection decision for hint generation. */
export interface ProjectionContext {
  readonly projection: "content" | "outline" | "refused";
  readonly reason: string;
  readonly filePath: string;
  readonly fileLines: number;
  readonly fileBytes: number;
  readonly readCount: number;
  readonly changedSinceLastRead?: boolean;
}

const LARGE_FILE_THRESHOLD = 150;
const BUILD_OUTPUT_DIRS = ["dist/", "build/", "out/", ".next/", "coverage/"];

/**
 * Generate a teaching hint for a projection decision.
 *
 * Returns undefined when the decision was already optimal (no noise).
 * Pure function — no I/O, no latency impact.
 */
export function generateTeachingHint(ctx: ProjectionContext): string | undefined {
  // Refused — suggest the source location
  if (ctx.projection === "refused") {
    if (BUILD_OUTPUT_DIRS.some((dir) => ctx.filePath.startsWith(dir))) {
      return `This build output was refused. Source lives in src/, not ${ctx.filePath.split("/")[0] ?? "dist"}/. Read the source instead.`;
    }
    return `This file was refused (${ctx.reason}). Check if the content you need lives elsewhere.`;
  }

  // Outline-projected — suggest file_outline + read_range
  if (ctx.projection === "outline") {
    return `This file was outline-projected (${ctx.reason}). Try file_outline first to see the jump table, then read_range for the specific symbol you need.`;
  }


  // Re-read of unchanged file
  if (ctx.readCount > 1 && ctx.changedSinceLastRead === false) {
    return `You already read this file ${String(ctx.readCount)} times and it hasn't changed. Use changed_since to check before re-reading.`;
  }

  // Large file that could benefit from outline-first
  if (ctx.fileLines > LARGE_FILE_THRESHOLD) {
    return `This file is ${String(ctx.fileLines)} lines. Consider file_outline first for orientation, then read_range for the specific section you need.`;
  }

  // Optimal decision — no hint needed
  return undefined;
}

// ---------------------------------------------------------------------------
// Adaptive Projection Selection — structural auto-selection
// ---------------------------------------------------------------------------

/** Structural metrics for projection selection. */
export interface ProjectionCandidate {
  readonly fileLines: number;
  readonly fileBytes: number;
  readonly symbolCount: number;
  readonly outlineCompressionRatio: number;
  readonly targetSymbol?: string;
}

/** Selected projection with reasoning. */
export interface ProjectionSelection {
  readonly projection: "outline" | "content" | "range";
  readonly reason: string;
}

const SMALL_FILE_THRESHOLD = 50;
const HORIZON_RATIO = 0.7;

/**
 * Select the optimal projection based on structural metrics.
 *
 * - Dense large files → outline (saves the most context)
 * - Small or irreducibly complex files → content (outline doesn't help)
 * - Targeted symbol investigation → range (surgical read)
 */
export function selectProjection(candidate: ProjectionCandidate): ProjectionSelection {
  // If a specific symbol is targeted, use range
  if (candidate.targetSymbol !== undefined) {
    return {
      projection: "range",
      reason: `Targeted read for symbol "${candidate.targetSymbol}" — range is most efficient.`,
    };
  }

  // Small files or high compression ratio → content
  if (candidate.fileLines <= SMALL_FILE_THRESHOLD || candidate.outlineCompressionRatio >= HORIZON_RATIO) {
    return {
      projection: "content",
      reason: candidate.fileLines <= SMALL_FILE_THRESHOLD
        ? `Small file (${String(candidate.fileLines)} lines) — content fits easily.`
        : `Outline is ${String(Math.round(candidate.outlineCompressionRatio * 100))}% of content — outline provides negligible savings.`,
    };
  }

  // Default: outline for larger files with good compression
  return {
    projection: "outline",
    reason: `${String(candidate.fileLines)} lines, ${String(candidate.symbolCount)} symbols, ${String(Math.round(candidate.outlineCompressionRatio * 100))}% compression — outline is efficient.`,
  };
}

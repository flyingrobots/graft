// ---------------------------------------------------------------------------
// Horizon of Readability — detect when projection can't reduce further
// ---------------------------------------------------------------------------

/** Input metrics for horizon detection. */
export interface HorizonInput {
  readonly contentLines: number;
  readonly contentBytes: number;
  readonly outlineLines: number;
  readonly outlineBytes: number;
}

/** Result of horizon detection. */
export interface HorizonResult {
  readonly horizonReached: boolean;
  readonly compressionRatio: number;
  readonly recommendation: "outline" | "content";
  readonly message?: string;
}

/** Compression ratio threshold above which outline provides negligible savings. */
const HORIZON_THRESHOLD = 0.7;

/**
 * Detect whether the readability horizon has been reached.
 *
 * When the outline is nearly as large as the content (compression
 * ratio > threshold), the file is irreducibly complex for the
 * outline representation. Return full content instead.
 */
export function detectReadabilityHorizon(input: HorizonInput): HorizonResult {
  const { contentBytes, outlineBytes } = input;

  // Zero-size files are at the horizon (nothing to simplify)
  if (contentBytes === 0) {
    return {
      horizonReached: true,
      compressionRatio: 1,
      recommendation: "content",
      message: "Empty file — full content provided.",
    };
  }

  const compressionRatio = outlineBytes / contentBytes;

  if (compressionRatio >= HORIZON_THRESHOLD) {
    return {
      horizonReached: true,
      compressionRatio,
      recommendation: "content",
      message: `Outline is ${String(Math.round(compressionRatio * 100))}% of content — cannot simplify further. Full content provided.`,
    };
  }

  return {
    horizonReached: false,
    compressionRatio,
    recommendation: "outline",
  };
}

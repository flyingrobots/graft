// ---------------------------------------------------------------------------
// Session Filtration — accumulation-aware projection escalation
// ---------------------------------------------------------------------------

/** Input for filtration level computation. */
export interface FiltrationInput {
  readonly observedFiles: number;
  readonly totalFiles: number;
  readonly reReadCount: number;
}

/** Input for escalation decision. */
export interface EscalationInput {
  readonly filtrationLevel: number;
  readonly previousProjection: "outline" | "content";
  readonly readCount: number;
}

/** Result of escalation check. */
export interface EscalationResult {
  readonly escalate: boolean;
  readonly suggestedProjection: "outline" | "content";
  readonly reason?: string;
}

const ESCALATION_THRESHOLD = 0.5;

/**
 * Compute the filtration level for the current session.
 *
 * Ranges from 0 (fresh session) to 1 (fully saturated). Based on
 * the fraction of files observed and the number of re-reads.
 * As filtration grows, graft escalates detail — an agent that has
 * already explored the codebase should get richer projections.
 */
export function computeFiltrationLevel(input: FiltrationInput): number {
  const { observedFiles, totalFiles, reReadCount } = input;
  if (totalFiles === 0) return 0;

  const coverageFraction = observedFiles / totalFiles;
  const reReadBoost = Math.min(reReadCount / 20, 0.3);

  return Math.min(coverageFraction + reReadBoost, 1);
}

/**
 * Determine whether to escalate projection detail for a re-read.
 *
 * Monotone accumulation: as filtration grows, graft escalates.
 * An agent that outlined a directory and is now re-reading a file
 * in that directory should get content instead of another outline.
 */
export function shouldEscalateDetail(input: EscalationInput): EscalationResult {
  const { filtrationLevel, previousProjection, readCount } = input;

  // Never escalate on first read
  if (readCount <= 1) {
    return { escalate: false, suggestedProjection: previousProjection };
  }

  // Already at content — nothing to escalate to
  if (previousProjection === "content") {
    return { escalate: false, suggestedProjection: "content" };
  }

  // Escalate when filtration is high enough and this is a re-read
  if (filtrationLevel >= ESCALATION_THRESHOLD) {
    return {
      escalate: true,
      suggestedProjection: "content",
      reason: `Filtration level ${String(Math.round(filtrationLevel * 100))}% — escalating from outline to content for re-read.`,
    };
  }

  return { escalate: false, suggestedProjection: previousProjection };
}

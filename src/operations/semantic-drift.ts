// ---------------------------------------------------------------------------
// Semantic Drift Detection — flag interpretation shift during reading
// ---------------------------------------------------------------------------

/** A single entry in the reading path. */
export interface ReadingPathEntry {
  readonly filePath: string;
  readonly timestamp: string;
}

/** Warning about potential interpretation shift. */
export interface DriftWarning {
  readonly filePath: string;
  readonly firstReadIndex: number;
  readonly reReadIndex: number;
  readonly intervening: readonly string[];
  readonly message: string;
}

/**
 * Detect semantic drift in a reading path.
 *
 * When an agent re-reads a file after reading structurally related
 * files (files with cross-file reference edges), the re-read may
 * yield different understanding because the agent's context has
 * shifted. This is holonomy: translating through a chain of
 * observers and returning does not return to the same understanding.
 *
 * @param readingPath - Ordered sequence of file reads in the session
 * @param relatedFiles - Map of file → related files (from reference edges)
 */
export function detectSemanticDrift(
  readingPath: readonly ReadingPathEntry[],
  relatedFiles: ReadonlyMap<string, readonly string[]>,
): DriftWarning[] {
  const warnings: DriftWarning[] = [];
  const lastReadIndex = new Map<string, number>();

  for (let i = 0; i < readingPath.length; i++) {
    const entry = readingPath[i] ?? { filePath: "", timestamp: "" };
    const prevIndex = lastReadIndex.get(entry.filePath);

    if (prevIndex !== undefined) {
      // This is a re-read — check if related files were read in between
      const related = relatedFiles.get(entry.filePath) ?? [];
      const intervening: string[] = [];

      for (let j = prevIndex + 1; j < i; j++) {
        const interveningFile = (readingPath[j] ?? { filePath: "" }).filePath;
        if (related.includes(interveningFile)) {
          intervening.push(interveningFile);
        }
      }

      if (intervening.length > 0) {
        warnings.push({
          filePath: entry.filePath,
          firstReadIndex: prevIndex,
          reReadIndex: i,
          intervening,
          message: `Re-reading ${entry.filePath} after reading related files (${intervening.join(", ")}) may shift interpretation.`,
        });
      }
    }

    lastReadIndex.set(entry.filePath, i);
  }

  return warnings;
}

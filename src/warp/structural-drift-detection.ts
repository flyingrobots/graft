// ---------------------------------------------------------------------------
// Structural Drift Detection — verify doc claims against reality
// ---------------------------------------------------------------------------

/** Result of checking a single drift rule. */
export interface DriftResult {
  readonly drifted: boolean;
  readonly docPath: string;
  readonly claim: string;
  readonly expected: string;
  readonly actual: string;
}

/** Options for numeric claim checking. */
export interface NumericClaimOptions {
  readonly docPath: string;
  /** The text containing the numeric claim (e.g., "12 MCP tools"). */
  readonly claim: string;
  /** Regex with a capture group for the number. */
  readonly pattern: RegExp;
  /** The actual count from reality. */
  readonly actual: number;
}

/**
 * Check whether a numeric claim in a doc matches reality.
 *
 * Parses the claim text with the given pattern to extract the stated
 * number, then compares against the actual count.
 */
export function checkNumericClaim(options: NumericClaimOptions): DriftResult {
  const { docPath, claim, pattern, actual } = options;
  const match = pattern.exec(claim);

  if (match?.[1] === undefined) {
    return {
      drifted: true,
      docPath,
      claim,
      expected: "no match",
      actual: String(actual),
    };
  }

  const stated = parseInt(match[1], 10);
  return {
    drifted: stated !== actual,
    docPath,
    claim,
    expected: match[1],
    actual: String(actual),
  };
}

/** Result of checking a pattern prohibition. */
export interface PatternProhibitionResult {
  readonly drifted: boolean;
  readonly docPath: string;
  readonly rule: string;
  readonly violations: readonly string[];
}

/** Options for pattern prohibition checking. */
export interface PatternProhibitionOptions {
  readonly docPath: string;
  /** Human-readable description of the rule (e.g., "no getNodes calls in src/"). */
  readonly rule: string;
  /** Regex to search for in file contents. */
  readonly pattern: RegExp;
  /** Map of file path → content to check. */
  readonly files: Readonly<Record<string, string>>;
}

/**
 * Check whether a prohibited pattern appears in any of the given files.
 *
 * Returns the list of files that violate the prohibition.
 */
export function checkPatternProhibition(
  options: PatternProhibitionOptions,
): PatternProhibitionResult {
  const { docPath, rule, pattern, files } = options;
  const violations: string[] = [];

  for (const [filePath, content] of Object.entries(files)) {
    if (pattern.test(content)) {
      violations.push(filePath);
    }
  }

  return {
    drifted: violations.length > 0,
    docPath,
    rule,
    violations,
  };
}

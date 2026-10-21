// ---------------------------------------------------------------------------
// StructuralReadingPort — Graft-owned structural read boundary.
// ---------------------------------------------------------------------------

import type { StructuralEvidenceKind as GeneratedStructuralEvidenceKind } from "../generated/graft-structural-history.js";

export type StructuralReadingKind = "symbol-reference-count" | "dead-symbols";

export type StructuralReadingFreshness = "current" | "stale" | "incomparable";

export type StructuralReadingResidualPosture =
  | "complete"
  | "partial"
  | "plural"
  | "budget-limited"
  | "rights-limited"
  | "unavailable";

export const STRUCTURAL_READING_EVIDENCE_LABELS = [
  "echo-native",
  "git-warp-imported",
  "fallback-translated",
] as const;

export type StructuralReadingEvidenceLabel = typeof STRUCTURAL_READING_EVIDENCE_LABELS[number];

export type GitWarpStructuralReadingEvidenceLabel =
  | "git-warp-imported"
  | "fallback-translated";

const GENERATED_STRUCTURAL_EVIDENCE_KIND_BY_LABEL = {
  "echo-native": "ECHO_NATIVE",
  "git-warp-imported": "GIT_WARP_IMPORTED",
  "fallback-translated": "FALLBACK_TRANSLATED",
} satisfies Record<StructuralReadingEvidenceLabel, GeneratedStructuralEvidenceKind>;

export function toGeneratedStructuralEvidenceKind(
  label: StructuralReadingEvidenceLabel,
): GeneratedStructuralEvidenceKind {
  return GENERATED_STRUCTURAL_EVIDENCE_KIND_BY_LABEL[label];
}

export interface ContinuumReadingEnvelopeRef {
  readonly family: string;
  readonly readingId: string;
  readonly basis: Readonly<Record<string, unknown>>;
  readonly [key: string]: unknown;
}

export interface ContinuumWitnessedSuffixShellRef {
  readonly family: string;
  readonly witnessId: string;
  readonly suffixId: string;
  readonly [key: string]: unknown;
}

export interface ContinuumNativeEvidence {
  readonly kind: "continuum-native";
  readonly evidenceLabel: "echo-native";
  readonly nativeContinuumWitness: true;
  readonly envelope: ContinuumReadingEnvelopeRef;
  readonly witness?: ContinuumWitnessedSuffixShellRef | undefined;
}

export interface GitWarpCommittedBasis {
  readonly kind: "git-committed-history";
  readonly projectRoot: string;
  readonly ref?: string | undefined;
  readonly base?: string | undefined;
  readonly head?: string | undefined;
  readonly maxCommits?: number | undefined;
}

/**
 * The lazily built WARP graph, as the index observed it. A reading answered
 * from it is not at any one Git revision; `requestedRef` records what the
 * caller asked for without claiming it.
 */
export interface GitWarpIndexedGraphBasis {
  readonly kind: "warp-indexed-graph";
  readonly projectRoot: string;
  readonly requestedRef?: string | undefined;
}

export type GitWarpBasis = GitWarpCommittedBasis | GitWarpIndexedGraphBasis;

export type GitWarpEvidenceSource = "warp-graph" | "committed-reference-scan";

export type GitWarpEvidence =
  | {
      readonly kind: "symbol-reference-count";
      readonly source: GitWarpEvidenceSource;
      readonly symbolName: string;
      readonly filePath: string;
      readonly fallbackReason?: string | undefined;
    }
  | {
      readonly kind: "dead-symbols";
      readonly source: "warp-graph";
      readonly maxCommits?: number | undefined;
    };

export interface TranslatedSubstrateEvidence {
  readonly kind: "translated-substrate";
  readonly evidenceLabel: GitWarpStructuralReadingEvidenceLabel;
  readonly substrate: "git-warp";
  readonly basis: GitWarpBasis;
  readonly evidence: GitWarpEvidence;
  readonly nativeContinuumWitness: false;
}

export type StructuralReadingEvidence =
  | ContinuumNativeEvidence
  | TranslatedSubstrateEvidence;

export interface StructuralReadingResult<TPayload> {
  readonly kind: StructuralReadingKind;
  readonly freshness: StructuralReadingFreshness;
  readonly residualPosture: StructuralReadingResidualPosture;
  readonly payload: TPayload;
  readonly evidence: StructuralReadingEvidence;
}

export interface SymbolReferenceReadingRequest {
  readonly symbolName: string;
  readonly filePath: string;
  readonly ref?: string | undefined;
  readonly candidateTargetFilePaths?: readonly string[] | undefined;
}

export interface StructuralReferenceWarning {
  readonly code: string;
  readonly severity: "warning";
  readonly language: string;
  readonly filePath: string;
  readonly range: {
    readonly startLine: number;
    readonly startColumn: number;
    readonly endLine: number;
    readonly endColumn: number;
  };
  readonly binding: string;
  readonly targetFilePath: string;
  readonly shadowKind: string;
  readonly message: string;
}

export interface SymbolReferenceReadingPayload {
  readonly symbol: string;
  readonly referenceCount: number;
  readonly referencingFiles: readonly string[];
  readonly referenceWarnings?: readonly StructuralReferenceWarning[] | undefined;
  readonly referenceConfidence?: "complete" | "partial" | undefined;
}

export interface DeadSymbolsReadingRequest {
  readonly maxCommits?: number | undefined;
}

export interface DeadSymbolReadingPayload {
  readonly name: string;
  readonly kind: string;
  readonly filePath: string;
  readonly exported: boolean;
  /**
   * The last examined index boundary where the symbol existed. Absent when
   * the substrate does not report it.
   */
  readonly lastObservedPresentAt?: string | undefined;
  /**
   * The first examined index boundary where the symbol was absent. The
   * removal happened at or before it; it is not necessarily the commit that
   * removed the symbol.
   */
  readonly firstObservedAbsentAt: string;
}

/** What observing only indexed commit boundaries cannot see. */
export type ObservedIndexHistoryGap =
  | "changes-between-boundaries"
  | "history-before-earliest-boundary";

/**
 * The history a dead-symbol reading examined. Dead symbols are derived from
 * symbol sets observed at indexed commit boundaries, not from every Git
 * commit; this is separate from current-tree coverage.
 */
export interface ObservedIndexHistoryTerms {
  readonly domain: "observed-index-history";
  readonly indexedBoundaries: number;
  readonly examinedBoundaries: number;
  readonly earliestExamined: string | null;
  readonly latestExamined: string | null;
  readonly limitedByMaxCommits: boolean;
  readonly unobserved: readonly ObservedIndexHistoryGap[];
}

/**
 * Why material is outside a reading's declared domain. Excluded material is
 * left out deliberately, so it does not make a reading partial; it is counted
 * so the answer says what it does not cover.
 */
export type StructuralCoverageExclusionReason =
  | "unsupported-language"
  | "submodule";

/**
 * Why material the declared domain requires is not covered. Any missing
 * material makes a reading partial.
 *
 * - `not-indexed`: an indexable file at the basis commit has never been
 *   indexed.
 * - `indexed-content-differs`: the file was last indexed at a commit whose
 *   content for that path differs from the basis commit's.
 * - `deleted-since-indexed`: the index still holds a file that is not at the
 *   basis commit, so its symbols' removal was never recorded.
 */
export type StructuralCoverageMissingReason =
  | "not-indexed"
  | "indexed-content-differs"
  | "deleted-since-indexed";

/** Maximum number of missing paths a coverage report names. */
export const STRUCTURAL_COVERAGE_MISSING_PATH_LIMIT = 100;

/**
 * How much of a declared domain a reading's evidence covers. A reading is
 * complete only when `missingFiles` is zero; it never depends on `excluded`.
 */
export interface StructuralReadingCoverage {
  /** The commit the domain is declared against. */
  readonly basisCommit: string;
  /**
   * The declared domain. `indexable-files-at-basis`: every file tracked at the
   * basis commit whose language the structural index parses.
   */
  readonly domain: "indexable-files-at-basis";
  readonly domainFiles: number;
  /** Domain files whose indexed content equals the basis commit's. */
  readonly coveredFiles: number;
  /** Material deliberately outside the domain, counted by reason. */
  readonly excluded: readonly {
    readonly reason: StructuralCoverageExclusionReason;
    readonly files: number;
  }[];
  /** Number of files the domain requires that the evidence does not cover. */
  readonly missingFiles: number;
  /**
   * The missing files, sorted by path. At most
   * STRUCTURAL_COVERAGE_MISSING_PATH_LIMIT are named; `missingFiles` is the
   * full count.
   */
  readonly missing: readonly {
    readonly path: string;
    readonly reason: StructuralCoverageMissingReason;
  }[];
}

export interface DeadSymbolsReadingPayload {
  readonly symbols: readonly DeadSymbolReadingPayload[];
  readonly total: number;
  /**
   * How much of the current tree the evidence covers. Present when the
   * substrate can state it. Says nothing about history.
   */
  readonly currentTreeCoverage?: StructuralReadingCoverage | undefined;
  /** The history examined. Present when the substrate can state it. */
  readonly history?: ObservedIndexHistoryTerms | undefined;
}

export interface StructuralReadingPort {
  countSymbolReferences(
    request: SymbolReferenceReadingRequest,
  ): Promise<StructuralReadingResult<SymbolReferenceReadingPayload>>;

  findDeadSymbols(
    request?: DeadSymbolsReadingRequest,
  ): Promise<StructuralReadingResult<DeadSymbolsReadingPayload>>;
}

export function isContinuumNativeEvidence(
  evidence: StructuralReadingEvidence,
): evidence is ContinuumNativeEvidence {
  const candidate = evidence as {
    readonly kind: unknown;
    readonly evidenceLabel: unknown;
    readonly nativeContinuumWitness: unknown;
  };

  return candidate.kind === "continuum-native" &&
    candidate.evidenceLabel === "echo-native" &&
    candidate.nativeContinuumWitness === true;
}

export function isEchoNativeEvidence(
  evidence: StructuralReadingEvidence,
): evidence is ContinuumNativeEvidence {
  return isContinuumNativeEvidence(evidence);
}

export function isTranslatedSubstrateEvidence(
  evidence: StructuralReadingEvidence,
): evidence is TranslatedSubstrateEvidence {
  return evidence.kind === "translated-substrate";
}

export function isGitWarpImportedEvidence(
  evidence: StructuralReadingEvidence,
): evidence is TranslatedSubstrateEvidence & { readonly evidenceLabel: "git-warp-imported" } {
  const candidate = evidence as {
    readonly kind: unknown;
    readonly evidenceLabel: unknown;
    readonly nativeContinuumWitness: unknown;
  };

  return candidate.kind === "translated-substrate" &&
    candidate.evidenceLabel === "git-warp-imported" &&
    candidate.nativeContinuumWitness === false;
}

export function isFallbackTranslatedEvidence(
  evidence: StructuralReadingEvidence,
): evidence is TranslatedSubstrateEvidence & { readonly evidenceLabel: "fallback-translated" } {
  const candidate = evidence as {
    readonly kind: unknown;
    readonly evidenceLabel: unknown;
    readonly nativeContinuumWitness: unknown;
  };

  return candidate.kind === "translated-substrate" &&
    candidate.evidenceLabel === "fallback-translated" &&
    candidate.nativeContinuumWitness === false;
}

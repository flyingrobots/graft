// ---------------------------------------------------------------------------
// StructuralReadingPort — Graft-owned structural read boundary.
// ---------------------------------------------------------------------------

export type StructuralReadingKind = "symbol-reference-count" | "dead-symbols";

export type StructuralReadingFreshness = "current" | "stale" | "incomparable";

export type StructuralReadingResidualPosture =
  | "complete"
  | "partial"
  | "plural"
  | "budget-limited"
  | "rights-limited"
  | "unavailable";

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

export type GitWarpEvidenceSource = "warp-graph" | "committed-import-scan";

export type GitWarpEvidence =
  | {
      readonly kind: "symbol-reference-count";
      readonly source: GitWarpEvidenceSource;
      readonly symbolName: string;
      readonly filePath: string;
    }
  | {
      readonly kind: "dead-symbols";
      readonly source: "warp-graph";
      readonly maxCommits?: number | undefined;
    };

export interface TranslatedSubstrateEvidence {
  readonly kind: "translated-substrate";
  readonly substrate: "git-warp";
  readonly basis: GitWarpCommittedBasis;
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
}

export interface SymbolReferenceReadingPayload {
  readonly symbol: string;
  readonly referenceCount: number;
  readonly referencingFiles: readonly string[];
}

export interface DeadSymbolsReadingRequest {
  readonly maxCommits?: number | undefined;
}

export interface DeadSymbolReadingPayload {
  readonly name: string;
  readonly kind: string;
  readonly filePath: string;
  readonly exported: boolean;
  readonly removedInCommit: string;
}

export interface DeadSymbolsReadingPayload {
  readonly symbols: readonly DeadSymbolReadingPayload[];
  readonly total: number;
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
  return evidence.kind === "continuum-native";
}

export function isTranslatedSubstrateEvidence(
  evidence: StructuralReadingEvidence,
): evidence is TranslatedSubstrateEvidence {
  return evidence.kind === "translated-substrate";
}

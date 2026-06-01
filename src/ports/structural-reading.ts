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
  readonly evidenceLabel: GitWarpStructuralReadingEvidenceLabel;
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
  return evidence.evidenceLabel === "echo-native";
}

export function isEchoNativeEvidence(
  evidence: StructuralReadingEvidence,
): evidence is ContinuumNativeEvidence {
  return evidence.evidenceLabel === "echo-native";
}

export function isTranslatedSubstrateEvidence(
  evidence: StructuralReadingEvidence,
): evidence is TranslatedSubstrateEvidence {
  return evidence.kind === "translated-substrate";
}

export function isGitWarpImportedEvidence(
  evidence: StructuralReadingEvidence,
): evidence is TranslatedSubstrateEvidence & { readonly evidenceLabel: "git-warp-imported" } {
  return evidence.evidenceLabel === "git-warp-imported";
}

export function isFallbackTranslatedEvidence(
  evidence: StructuralReadingEvidence,
): evidence is TranslatedSubstrateEvidence & { readonly evidenceLabel: "fallback-translated" } {
  return evidence.evidenceLabel === "fallback-translated";
}

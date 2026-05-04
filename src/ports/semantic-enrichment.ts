export const DEFAULT_SEMANTIC_FACT_LIMIT = 64;

export type SemanticEnrichmentStatus =
  | "not_configured"
  | "skipped_not_explicit"
  | "available"
  | "unavailable";

export interface SemanticEnrichmentRequest {
  readonly repoRoot: string;
  readonly filePath: string;
  readonly language: string;
  readonly content: string;
  readonly headSha: string;
  readonly maxFacts: number;
}

export interface SemanticCallFact {
  readonly kind: "call";
  readonly fromSymbolId: string;
  readonly toSymbolId: string;
}

export interface SemanticTypeofFact {
  readonly kind: "typeof";
  readonly symbolId: string;
  readonly typeName: string;
}

export type SemanticEnrichmentFact = SemanticCallFact | SemanticTypeofFact;

export interface SemanticEnrichmentAvailableResult {
  readonly status: "available";
  readonly facts: readonly SemanticEnrichmentFact[];
  readonly factsRejected?: number | undefined;
}

export interface SemanticEnrichmentUnavailableResult {
  readonly status: "unavailable";
  readonly reason: string;
}

export type SemanticEnrichmentProviderResult =
  | SemanticEnrichmentAvailableResult
  | SemanticEnrichmentUnavailableResult;

export interface SemanticEnrichmentProvider {
  enrichFile(
    request: SemanticEnrichmentRequest,
  ): SemanticEnrichmentProviderResult | Promise<SemanticEnrichmentProviderResult>;
}

export interface SemanticEnrichmentUnavailableFile {
  readonly filePath: string;
  readonly reason: string;
}

export interface SemanticEnrichmentSummary {
  readonly status: SemanticEnrichmentStatus;
  readonly filesAttempted: number;
  readonly factsAccepted: number;
  readonly factsRejected: number;
  readonly unavailable: readonly SemanticEnrichmentUnavailableFile[];
}

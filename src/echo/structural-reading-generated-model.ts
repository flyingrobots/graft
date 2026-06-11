// ---------------------------------------------------------------------------
// StructuralReadingPort ↔ Wesley-generated structural-history model mapping.
//
// Pure, deterministic, no I/O. Maps git-warp-backed StructuralReadingResult
// values onto the generated (StructuralReading, StructuralReadingEvidence,
// StructuralBasis) triple and back, loss-free.
//
// Folding contract: the generated v0.1 schema has no typed columns for the
// port's translated-substrate residue (GitWarpCommittedBasis projectRoot /
// base / maxCommits, and the GitWarpEvidence discriminant). That residue is
// re-expressed verbatim as canonical JSON in the evidence `summary` field, so
// the (reading, evidence) pair alone reconstructs the port result.
//
// This mapping is the git-warp import path. It never emits ECHO_NATIVE:
// schema invariant `fallback_translated_is_not_native_continuum`.
//
// Design packet: docs/design/CORE_structural-reading-port-generated-model-parity.md
// ---------------------------------------------------------------------------

import { createHash } from "node:crypto";
import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import type {
  Hash,
  Json,
  StructuralBasis,
  StructuralReading,
  StructuralReadingEvidence as GeneratedStructuralReadingEvidence,
  StructuralReadingFreshness as GeneratedStructuralReadingFreshness,
  StructuralReadingKind as GeneratedStructuralReadingKind,
  StructuralReadingResidualPosture as GeneratedStructuralReadingResidualPosture,
} from "../generated/graft-structural-history.js";
import {
  isTranslatedSubstrateEvidence,
  toGeneratedStructuralEvidenceKind,
  type GitWarpCommittedBasis,
  type GitWarpEvidence,
  type GitWarpStructuralReadingEvidenceLabel,
  type StructuralReadingFreshness,
  type StructuralReadingKind,
  type StructuralReadingResidualPosture,
  type StructuralReadingResult,
  type TranslatedSubstrateEvidence,
} from "../ports/structural-reading.js";

export type GeneratedModelMappingErrorCode =
  | "ECHO_NATIVE_REFUSED"
  | "UNSUPPORTED_READING_KIND"
  | "UNSUPPORTED_FRESHNESS"
  | "UNSUPPORTED_RESIDUAL_POSTURE"
  | "UNSUPPORTED_SUBSTRATE"
  | "EVIDENCE_MISMATCH"
  | "MISSING_PAYLOAD_JSON"
  | "PAYLOAD_DIGEST_MISMATCH"
  | "MALFORMED_EVIDENCE_SUMMARY";

export class GeneratedModelMappingError extends Error {
  readonly code: GeneratedModelMappingErrorCode;

  constructor(code: GeneratedModelMappingErrorCode, message: string) {
    super(message);
    this.name = "GeneratedModelMappingError";
    this.code = code;
  }
}

export interface StructuralReadingMappingContext {
  readonly repositoryId: string;
}

export interface GeneratedStructuralReadingBundle {
  readonly reading: StructuralReading;
  readonly evidence: GeneratedStructuralReadingEvidence;
  readonly basis: StructuralBasis;
}

const codec = new CanonicalJsonCodec();

function sha256Hex(value: unknown): string {
  return createHash("sha256").update(codec.encode(value)).digest("hex");
}

function deriveId(entity: "reading" | "evidence" | "basis", facts: unknown): string {
  return `${entity}:${sha256Hex({ entity, facts })}`;
}

const ECHO_NATIVE_REFUSAL_MESSAGE =
  "The git-warp import mapping refuses to emit ECHO_NATIVE evidence: schema " +
  "invariant fallback_translated_is_not_native_continuum requires native " +
  "continuum witnesses to originate from Echo, never from translated substrates.";

const READING_KIND_TO_GENERATED: Record<StructuralReadingKind, GeneratedStructuralReadingKind> = {
  "symbol-reference-count": "SYMBOL_REFERENCE_COUNT",
  "dead-symbols": "DEAD_SYMBOLS",
};

const READING_KIND_FROM_GENERATED: Partial<Record<GeneratedStructuralReadingKind, StructuralReadingKind>> = {
  SYMBOL_REFERENCE_COUNT: "symbol-reference-count",
  DEAD_SYMBOLS: "dead-symbols",
};

const FRESHNESS_TO_GENERATED: Record<StructuralReadingFreshness, GeneratedStructuralReadingFreshness> = {
  current: "CURRENT",
  stale: "STALE",
  incomparable: "INCOMPARABLE",
};

const FRESHNESS_FROM_GENERATED: Partial<Record<GeneratedStructuralReadingFreshness, StructuralReadingFreshness>> = {
  CURRENT: "current",
  STALE: "stale",
  INCOMPARABLE: "incomparable",
};

const POSTURE_TO_GENERATED: Record<StructuralReadingResidualPosture, GeneratedStructuralReadingResidualPosture> = {
  complete: "COMPLETE",
  partial: "PARTIAL",
  plural: "PLURAL",
  "budget-limited": "BUDGET_LIMITED",
  "rights-limited": "RIGHTS_LIMITED",
  unavailable: "UNAVAILABLE",
};

const POSTURE_FROM_GENERATED: Partial<Record<GeneratedStructuralReadingResidualPosture, StructuralReadingResidualPosture>> = {
  COMPLETE: "complete",
  PARTIAL: "partial",
  PLURAL: "plural",
  BUDGET_LIMITED: "budget-limited",
  RIGHTS_LIMITED: "rights-limited",
  UNAVAILABLE: "unavailable",
};

const GIT_WARP_EVIDENCE_LABELS: readonly GitWarpStructuralReadingEvidenceLabel[] = [
  "git-warp-imported",
  "fallback-translated",
];

function requireTranslatedSubstrateEvidence(
  result: StructuralReadingResult<unknown>,
): TranslatedSubstrateEvidence {
  const evidence = result.evidence;
  if (
    !isTranslatedSubstrateEvidence(evidence) ||
    !GIT_WARP_EVIDENCE_LABELS.includes(evidence.evidenceLabel) ||
    (evidence as { readonly nativeContinuumWitness: unknown }).nativeContinuumWitness !== false
  ) {
    throw new GeneratedModelMappingError("ECHO_NATIVE_REFUSED", ECHO_NATIVE_REFUSAL_MESSAGE);
  }
  return evidence;
}

interface TranslatedSubstrateFacts {
  readonly basis: GitWarpCommittedBasis;
  readonly evidence: GitWarpEvidence;
}

function parseTranslatedSubstrateFacts(summary: string): TranslatedSubstrateFacts {
  const malformed = (): GeneratedModelMappingError =>
    new GeneratedModelMappingError(
      "MALFORMED_EVIDENCE_SUMMARY",
      "Evidence summary does not carry canonical-JSON translated-substrate facts " +
        "({ basis: GitWarpCommittedBasis, evidence: GitWarpEvidence }).",
    );

  let parsed: unknown;
  try {
    parsed = JSON.parse(summary);
  } catch {
    throw malformed();
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw malformed();
  }
  const candidate = parsed as { readonly basis?: unknown; readonly evidence?: unknown };
  const basis = candidate.basis as
    | { readonly kind?: unknown; readonly projectRoot?: unknown }
    | undefined;
  if (basis?.kind !== "git-committed-history" || typeof basis.projectRoot !== "string") {
    throw malformed();
  }
  const evidence = candidate.evidence as { readonly kind?: unknown } | undefined;
  if (evidence?.kind !== "symbol-reference-count" && evidence?.kind !== "dead-symbols") {
    throw malformed();
  }
  return {
    basis: candidate.basis as GitWarpCommittedBasis,
    evidence: candidate.evidence as GitWarpEvidence,
  };
}

export function toGeneratedStructuralReading<TPayload>(
  result: StructuralReadingResult<TPayload>,
  ctx: StructuralReadingMappingContext,
): GeneratedStructuralReadingBundle {
  const sourceEvidence = requireTranslatedSubstrateEvidence(result);
  const basisFacts = sourceEvidence.basis;
  const payloadDigest = sha256Hex(result.payload);

  const basisId = deriveId("basis", {
    repositoryId: ctx.repositoryId,
    basis: basisFacts,
  });
  const evidenceId = deriveId("evidence", {
    repositoryId: ctx.repositoryId,
    basisId,
    evidenceLabel: sourceEvidence.evidenceLabel,
    basis: basisFacts,
    evidence: sourceEvidence.evidence,
  });
  const readingId = deriveId("reading", {
    repositoryId: ctx.repositoryId,
    basisId,
    evidenceId,
    readingKind: result.kind,
    freshness: result.freshness,
    residualPosture: result.residualPosture,
    payloadDigest,
  });

  const basis: StructuralBasis = {
    basisId,
    repositoryId: ctx.repositoryId,
    basisKind: basisFacts.head !== undefined ? "GIT_COMMIT" : "GIT_REF",
    commitId: basisFacts.head ?? null,
    refName: basisFacts.ref ?? null,
    echoHeadId: null,
    importBatchId: null,
    summary: `git-warp committed-history basis for ${basisFacts.projectRoot}`,
  };

  const evidence: GeneratedStructuralReadingEvidence = {
    evidenceId,
    evidenceKind: toGeneratedStructuralEvidenceKind(sourceEvidence.evidenceLabel),
    substrate: "GIT_WARP",
    basisId,
    sourceRef: basisFacts.ref ?? null,
    migrationBatchId: null,
    nativeContinuumWitness: false,
    parity: "NOT_CHECKED",
    summary: codec.encode({
      basis: basisFacts,
      evidence: sourceEvidence.evidence,
    }),
  };

  const reading: StructuralReading = {
    readingId,
    repositoryId: ctx.repositoryId,
    basisId,
    evidenceId,
    readingKind: READING_KIND_TO_GENERATED[result.kind],
    freshness: FRESHNESS_TO_GENERATED[result.freshness],
    residualPosture: POSTURE_TO_GENERATED[result.residualPosture],
    payloadDigest: payloadDigest as Hash,
    payloadJson: result.payload as Json,
    summary: `${result.kind} reading via git-warp (${sourceEvidence.evidenceLabel})`,
  };

  return { reading, evidence, basis };
}

export function fromGeneratedStructuralReading(
  reading: StructuralReading,
  evidence: GeneratedStructuralReadingEvidence,
): StructuralReadingResult<unknown> {
  if (evidence.evidenceKind === "ECHO_NATIVE" || evidence.nativeContinuumWitness) {
    throw new GeneratedModelMappingError("ECHO_NATIVE_REFUSED", ECHO_NATIVE_REFUSAL_MESSAGE);
  }
  if (evidence.substrate !== "GIT_WARP") {
    throw new GeneratedModelMappingError(
      "UNSUPPORTED_SUBSTRATE",
      `The git-warp import mapping cannot reconstruct ${evidence.substrate}-substrate evidence.`,
    );
  }
  if (reading.evidenceId !== evidence.evidenceId || reading.basisId !== evidence.basisId) {
    throw new GeneratedModelMappingError(
      "EVIDENCE_MISMATCH",
      "Reading and evidence do not reference each other " +
        `(reading ${reading.readingId} expects evidence ${reading.evidenceId}).`,
    );
  }

  const kind = READING_KIND_FROM_GENERATED[reading.readingKind];
  if (kind === undefined) {
    throw new GeneratedModelMappingError(
      "UNSUPPORTED_READING_KIND",
      `StructuralReadingPort has no reading kind for generated ${reading.readingKind}.`,
    );
  }
  const freshness = FRESHNESS_FROM_GENERATED[reading.freshness];
  if (freshness === undefined) {
    throw new GeneratedModelMappingError(
      "UNSUPPORTED_FRESHNESS",
      `StructuralReadingPort has no freshness for generated ${reading.freshness}.`,
    );
  }
  const residualPosture = POSTURE_FROM_GENERATED[reading.residualPosture];
  if (residualPosture === undefined) {
    throw new GeneratedModelMappingError(
      "UNSUPPORTED_RESIDUAL_POSTURE",
      `StructuralReadingPort has no residual posture for generated ${reading.residualPosture}.`,
    );
  }

  if (reading.payloadJson === null || reading.payloadJson === undefined) {
    throw new GeneratedModelMappingError(
      "MISSING_PAYLOAD_JSON",
      `Reading ${reading.readingId} carries no payloadJson; the port result cannot be reconstructed.`,
    );
  }
  const payloadDigest = sha256Hex(reading.payloadJson);
  if (reading.payloadDigest !== payloadDigest) {
    throw new GeneratedModelMappingError(
      "PAYLOAD_DIGEST_MISMATCH",
      `Reading ${reading.readingId} payloadJson does not match its payloadDigest.`,
    );
  }

  const facts = parseTranslatedSubstrateFacts(evidence.summary);
  const evidenceLabel: GitWarpStructuralReadingEvidenceLabel =
    evidence.evidenceKind === "GIT_WARP_IMPORTED" ? "git-warp-imported" : "fallback-translated";

  return {
    kind,
    freshness,
    residualPosture,
    payload: reading.payloadJson,
    evidence: {
      kind: "translated-substrate",
      evidenceLabel,
      substrate: "git-warp",
      basis: facts.basis,
      evidence: facts.evidence,
      nativeContinuumWitness: false,
    },
  };
}

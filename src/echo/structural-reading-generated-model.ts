// ---------------------------------------------------------------------------
// StructuralReadingPort ↔ Wesley-generated structural-history model mapping.
//
// Pure, deterministic, no I/O. Maps git-warp-backed StructuralReadingResult
// values onto the generated (StructuralReading, StructuralReadingEvidence,
// StructuralBasis) triple and back, loss-free.
//
// Folding contract: the generated v0.2 schema has no typed columns for the
// port's translated-substrate residue (GitWarpCommittedBasis projectRoot /
// base / maxCommits, and the GitWarpEvidence discriminant). That residue is
// re-expressed verbatim as canonical JSON in the evidence `summary` field, so
// the (reading, evidence) pair alone reconstructs the port result. The same
// canonical bytes feed the evidenceId derivation, pinning the id to the
// persisted residue.
//
// Representability limits of the contract: payloads and basis facts must be
// canonical-JSON-representable (no undefined-valued keys, no non-finite
// numbers — JSON cannot carry them, so round-trip equality cannot hold for
// them); a `null` payload is refused on the forward path because the
// generated `payloadJson: Json | null` reserves null for "absent".
// `payloadJson` carries the payload object by reference — callers must not
// mutate a result after mapping it, or payloadDigest will no longer match.
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
  StructuralEvidenceKind,
  StructuralReading,
  StructuralReadingEvidence as GeneratedStructuralReadingEvidence,
  StructuralReadingFreshness as GeneratedStructuralReadingFreshness,
  StructuralReadingKind as GeneratedStructuralReadingKind,
  StructuralReadingResidualPosture as GeneratedStructuralReadingResidualPosture,
} from "../generated/graft-structural-history.js";
import {
  isFallbackTranslatedEvidence,
  isGitWarpImportedEvidence,
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
  | "UNSUPPORTED_EVIDENCE_LABEL"
  | "UNSUPPORTED_READING_KIND"
  | "UNSUPPORTED_FRESHNESS"
  | "UNSUPPORTED_RESIDUAL_POSTURE"
  | "UNSUPPORTED_SUBSTRATE"
  | "UNSERIALIZABLE_PAYLOAD"
  | "EVIDENCE_MISMATCH"
  | "MISSING_PAYLOAD_JSON"
  | "PAYLOAD_DIGEST_MISMATCH"
  | "MALFORMED_PAYLOAD"
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

function sha256Hex(canonicalJson: string): string {
  return createHash("sha256").update(canonicalJson).digest("hex");
}

function deriveId(entity: "reading" | "evidence" | "basis", facts: unknown): string {
  return `${entity}:${sha256Hex(codec.encode(facts))}`;
}

function normalizeBasisString(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized === undefined || normalized.length === 0 ? null : normalized;
}

function toGeneratedStructuralBasisKind(
  basis: { readonly commitId: string | null; readonly refName: string | null },
): StructuralBasis["basisKind"] {
  if (basis.commitId !== null) {
    return "GIT_COMMIT";
  }
  if (basis.refName !== null) {
    return "GIT_REF";
  }
  return "UNPINNED_COMMITTED";
}

const ECHO_NATIVE_REFUSAL_MESSAGE =
  "The git-warp import mapping refuses to emit ECHO_NATIVE evidence: schema " +
  "invariant fallback_translated_is_not_native_continuum requires native " +
  "continuum witnesses to originate from Echo, never from translated substrates.";

function invertRecord<K extends string, V extends string>(
  record: Record<K, V>,
): Partial<Record<V, K>> {
  const inverted: Partial<Record<V, K>> = {};
  for (const [key, value] of Object.entries(record) as [K, V][]) {
    inverted[value] = key;
  }
  return inverted;
}

const READING_KIND_TO_GENERATED: Record<StructuralReadingKind, GeneratedStructuralReadingKind> = {
  "symbol-reference-count": "SYMBOL_REFERENCE_COUNT",
  "dead-symbols": "DEAD_SYMBOLS",
};

const READING_KIND_FROM_GENERATED = invertRecord(READING_KIND_TO_GENERATED);

const FRESHNESS_TO_GENERATED: Record<StructuralReadingFreshness, GeneratedStructuralReadingFreshness> = {
  current: "CURRENT",
  stale: "STALE",
  incomparable: "INCOMPARABLE",
};

const FRESHNESS_FROM_GENERATED = invertRecord(FRESHNESS_TO_GENERATED);

const POSTURE_TO_GENERATED: Record<StructuralReadingResidualPosture, GeneratedStructuralReadingResidualPosture> = {
  complete: "COMPLETE",
  partial: "PARTIAL",
  plural: "PLURAL",
  "budget-limited": "BUDGET_LIMITED",
  "rights-limited": "RIGHTS_LIMITED",
  unavailable: "UNAVAILABLE",
};

const POSTURE_FROM_GENERATED = invertRecord(POSTURE_TO_GENERATED);

const EVIDENCE_LABEL_FROM_GENERATED: Partial<Record<StructuralEvidenceKind, GitWarpStructuralReadingEvidenceLabel>> = {
  GIT_WARP_IMPORTED: "git-warp-imported",
  FALLBACK_TRANSLATED: "fallback-translated",
};

function requireTranslatedSubstrateEvidence(
  result: StructuralReadingResult<unknown>,
): TranslatedSubstrateEvidence {
  const evidence = result.evidence;
  if (isGitWarpImportedEvidence(evidence) || isFallbackTranslatedEvidence(evidence)) {
    return evidence;
  }
  const candidate = evidence as {
    readonly kind?: unknown;
    readonly evidenceLabel?: unknown;
    readonly nativeContinuumWitness?: unknown;
  };
  if (
    candidate.kind === "continuum-native" ||
    candidate.evidenceLabel === "echo-native" ||
    candidate.nativeContinuumWitness === true
  ) {
    throw new GeneratedModelMappingError("ECHO_NATIVE_REFUSED", ECHO_NATIVE_REFUSAL_MESSAGE);
  }
  throw new GeneratedModelMappingError(
    "UNSUPPORTED_EVIDENCE_LABEL",
    "Evidence is not a recognized git-warp translated-substrate shape " +
      `(label ${String(candidate.evidenceLabel)}).`,
  );
}

interface TranslatedSubstrateFacts {
  readonly basis: GitWarpCommittedBasis;
  readonly evidence: GitWarpEvidence;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || typeof value === "number";
}

function parseTranslatedSubstrateFacts(summary: string): TranslatedSubstrateFacts {
  const malformed = (detail: string): GeneratedModelMappingError =>
    new GeneratedModelMappingError(
      "MALFORMED_EVIDENCE_SUMMARY",
      "Evidence summary does not carry canonical-JSON translated-substrate facts " +
        `({ basis: GitWarpCommittedBasis, evidence: GitWarpEvidence }): ${detail}.`,
    );

  let parsed: unknown;
  try {
    parsed = JSON.parse(summary);
  } catch {
    throw malformed("summary is not JSON");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw malformed("summary is not an object");
  }
  const candidate = parsed as { readonly basis?: unknown; readonly evidence?: unknown };

  const basis = candidate.basis as
    | {
        readonly kind?: unknown;
        readonly projectRoot?: unknown;
        readonly ref?: unknown;
        readonly base?: unknown;
        readonly head?: unknown;
        readonly maxCommits?: unknown;
      }
    | undefined;
  if (
    basis?.kind !== "git-committed-history" ||
    typeof basis.projectRoot !== "string" ||
    !isOptionalString(basis.ref) ||
    !isOptionalString(basis.base) ||
    !isOptionalString(basis.head) ||
    !isOptionalNumber(basis.maxCommits)
  ) {
    throw malformed("basis facts are not a GitWarpCommittedBasis");
  }

  const evidence = candidate.evidence as
    | {
        readonly kind?: unknown;
        readonly source?: unknown;
        readonly symbolName?: unknown;
        readonly filePath?: unknown;
        readonly maxCommits?: unknown;
      }
    | undefined;
  const validEvidence =
    (evidence?.kind === "symbol-reference-count" &&
      (evidence.source === "warp-graph" || evidence.source === "committed-import-scan") &&
      typeof evidence.symbolName === "string" &&
      typeof evidence.filePath === "string") ||
    (evidence?.kind === "dead-symbols" &&
      evidence.source === "warp-graph" &&
      isOptionalNumber(evidence.maxCommits));
  if (!validEvidence) {
    throw malformed("evidence facts are not a GitWarpEvidence");
  }

  return {
    basis: candidate.basis as GitWarpCommittedBasis,
    evidence: candidate.evidence as GitWarpEvidence,
  };
}

function validatePayloadShape(kind: StructuralReadingKind, payload: unknown): void {
  const malformed = (detail: string): GeneratedModelMappingError =>
    new GeneratedModelMappingError(
      "MALFORMED_PAYLOAD",
      `payloadJson is not a valid ${kind} payload: ${detail}.`,
    );

  if (typeof payload !== "object" || payload === null) {
    throw malformed("payload is not an object");
  }

  if (kind === "symbol-reference-count") {
    const candidate = payload as {
      readonly symbol?: unknown;
      readonly referenceCount?: unknown;
      readonly referencingFiles?: unknown;
    };
    if (
      typeof candidate.symbol !== "string" ||
      typeof candidate.referenceCount !== "number" ||
      !Array.isArray(candidate.referencingFiles) ||
      !candidate.referencingFiles.every((file) => typeof file === "string")
    ) {
      throw malformed("expected { symbol, referenceCount, referencingFiles[] }");
    }
    return;
  }

  const candidate = payload as { readonly symbols?: unknown; readonly total?: unknown };
  if (
    !Array.isArray(candidate.symbols) ||
    typeof candidate.total !== "number" ||
    !candidate.symbols.every((symbol) => {
      const entry = symbol as {
        readonly name?: unknown;
        readonly kind?: unknown;
        readonly filePath?: unknown;
        readonly exported?: unknown;
        readonly removedInCommit?: unknown;
      };
      return (
        typeof entry.name === "string" &&
        typeof entry.kind === "string" &&
        typeof entry.filePath === "string" &&
        typeof entry.exported === "boolean" &&
        typeof entry.removedInCommit === "string"
      );
    })
  ) {
    throw malformed("expected { symbols: DeadSymbolReadingPayload[], total }");
  }
}

export function toGeneratedStructuralReading<TPayload>(
  result: StructuralReadingResult<TPayload>,
  ctx: StructuralReadingMappingContext,
): GeneratedStructuralReadingBundle {
  const sourceEvidence = requireTranslatedSubstrateEvidence(result);

  const readingKind = READING_KIND_TO_GENERATED[result.kind] as
    | GeneratedStructuralReadingKind
    | undefined;
  if (readingKind === undefined) {
    throw new GeneratedModelMappingError(
      "UNSUPPORTED_READING_KIND",
      `The generated mapping has no reading kind for ${result.kind}.`,
    );
  }
  const freshness = FRESHNESS_TO_GENERATED[result.freshness] as
    | GeneratedStructuralReadingFreshness
    | undefined;
  if (freshness === undefined) {
    throw new GeneratedModelMappingError(
      "UNSUPPORTED_FRESHNESS",
      `The generated mapping has no freshness for ${result.freshness}.`,
    );
  }
  const residualPosture = POSTURE_TO_GENERATED[result.residualPosture] as
    | GeneratedStructuralReadingResidualPosture
    | undefined;
  if (residualPosture === undefined) {
    throw new GeneratedModelMappingError(
      "UNSUPPORTED_RESIDUAL_POSTURE",
      `The generated mapping has no residual posture for ${result.residualPosture}.`,
    );
  }
  if (sourceEvidence.evidence.kind !== result.kind) {
    throw new GeneratedModelMappingError(
      "EVIDENCE_MISMATCH",
      `Reading kind ${result.kind} disagrees with evidence facts kind ` +
        `${sourceEvidence.evidence.kind}.`,
    );
  }

  if (result.payload === null) {
    throw new GeneratedModelMappingError(
      "UNSERIALIZABLE_PAYLOAD",
      "A null payload cannot enter the generated model: payloadJson null is " +
        "reserved for absent payloads, so the round-trip would not be loss-free.",
    );
  }
  const payloadCanonicalJson = codec.encode(result.payload) as string | undefined;
  if (payloadCanonicalJson === undefined) {
    throw new GeneratedModelMappingError(
      "UNSERIALIZABLE_PAYLOAD",
      "The payload is not canonical-JSON-representable.",
    );
  }
  const payloadDigest = sha256Hex(payloadCanonicalJson);

  const basisFacts = sourceEvidence.basis;
  const residueCanonicalJson = codec.encode({
    basis: basisFacts,
    evidence: sourceEvidence.evidence,
  });

  const basisId = deriveId("basis", {
    repositoryId: ctx.repositoryId,
    basis: basisFacts,
  });
  const evidenceId = deriveId("evidence", {
    repositoryId: ctx.repositoryId,
    basisId,
    evidenceLabel: sourceEvidence.evidenceLabel,
    residue: residueCanonicalJson,
  });
  const commitId = normalizeBasisString(basisFacts.head);
  const refName = normalizeBasisString(basisFacts.ref);
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
    basisKind: toGeneratedStructuralBasisKind({ commitId, refName }),
    commitId,
    refName,
    echoHeadId: null,
    importBatchId: null,
    summary: `git-warp committed-history basis for ${basisFacts.projectRoot}`,
  };

  const evidence: GeneratedStructuralReadingEvidence = {
    evidenceId,
    evidenceKind: toGeneratedStructuralEvidenceKind(sourceEvidence.evidenceLabel),
    substrate: "GIT_WARP",
    basisId,
    sourceRef: refName,
    migrationBatchId: null,
    nativeContinuumWitness: false,
    parity: "NOT_CHECKED",
    summary: residueCanonicalJson,
  };

  const reading: StructuralReading = {
    readingId,
    repositoryId: ctx.repositoryId,
    basisId,
    evidenceId,
    readingKind,
    freshness,
    residualPosture,
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
  const evidenceLabel = EVIDENCE_LABEL_FROM_GENERATED[evidence.evidenceKind];
  if (evidenceLabel === undefined) {
    throw new GeneratedModelMappingError(
      "UNSUPPORTED_EVIDENCE_LABEL",
      `StructuralReadingPort has no git-warp label for generated ${evidence.evidenceKind}.`,
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
  const payloadDigest = sha256Hex(codec.encode(reading.payloadJson));
  if (reading.payloadDigest !== payloadDigest) {
    throw new GeneratedModelMappingError(
      "PAYLOAD_DIGEST_MISMATCH",
      `Reading ${reading.readingId} payloadJson does not match its payloadDigest.`,
    );
  }

  validatePayloadShape(kind, reading.payloadJson);

  const facts = parseTranslatedSubstrateFacts(evidence.summary);
  if (facts.evidence.kind !== kind) {
    throw new GeneratedModelMappingError(
      "EVIDENCE_MISMATCH",
      `Reading kind ${kind} disagrees with evidence facts kind ${facts.evidence.kind}.`,
    );
  }

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

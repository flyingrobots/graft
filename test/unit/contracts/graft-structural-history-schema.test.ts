import { describe, expect, it } from "vitest";
import {
  checkStructuralHistorySchemaArtifacts,
  readStructuralHistorySchemaManifest,
} from "../../../scripts/check-structural-history-schema-artifacts.js";
import {
  queryGitWarpImportBatchesOperation,
  queryStructuralReadingEvidenceOperation,
  queryStructuralReadingsOperation,
  type StructuralEvidenceKind,
  type StructuralReading,
  type StructuralReadingEvidence,
} from "../../../src/generated/graft-structural-history.js";

describe("Graft structural history schema authority", () => {
  it("keeps the GraphQL schema and Wesley-generated TypeScript artifact in lockstep", () => {
    expect(checkStructuralHistorySchemaArtifacts().violations).toEqual([]);
  });

  it("names the evidence states needed for Echo migration without changing Echo or Wesley", () => {
    const manifest = readStructuralHistorySchemaManifest();

    expect(manifest.requiredEvidenceLabels).toEqual([
      "ECHO_NATIVE",
      "GIT_WARP_IMPORTED",
      "FALLBACK_TRANSLATED",
    ]);
    expect(manifest.wesleyCliVersion).toBe("0.0.4");
  });

  it("exposes structural reading and import operations from the generated contract", () => {
    expect(queryStructuralReadingsOperation.directives.wes_footprint.reads).toEqual([
      "StructuralReading",
      "StructuralReadingEvidence",
    ]);
    expect(queryStructuralReadingEvidenceOperation.directives.wes_footprint.reads).toEqual([
      "StructuralReadingEvidence",
    ]);
    expect(queryGitWarpImportBatchesOperation.directives.wes_footprint.reads).toEqual([
      "GitWarpImportBatch",
    ]);
  });

  it("keeps generated structural reading values behaviorally typed", () => {
    const evidenceKind: StructuralEvidenceKind = "FALLBACK_TRANSLATED";
    const evidence: StructuralReadingEvidence = {
      evidenceId: "evidence:1",
      evidenceKind,
      substrate: "GIT_WARP",
      basisId: "basis:head",
      sourceRef: "HEAD",
      migrationBatchId: null,
      nativeContinuumWitness: false,
      parity: "NOT_CHECKED",
      summary: "fallback git-warp compatibility evidence",
    };
    const reading: StructuralReading = {
      readingId: "reading:1",
      repositoryId: "repo:fixture",
      basisId: evidence.basisId,
      evidenceId: evidence.evidenceId,
      readingKind: "SYMBOL_REFERENCE_COUNT",
      freshness: "CURRENT",
      residualPosture: "COMPLETE",
      payloadDigest: "hash:payload",
      payloadJson: { referenceCount: 2 },
      summary: "symbol reference count",
    };

    expect(evidence.nativeContinuumWitness).toBe(false);
    expect(reading.evidenceId).toBe(evidence.evidenceId);
    expect(reading.readingKind).toBe("SYMBOL_REFERENCE_COUNT");
  });
});

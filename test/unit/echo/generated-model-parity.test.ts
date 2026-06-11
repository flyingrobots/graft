// ---------------------------------------------------------------------------
// Slice 4 RED suite — StructuralReadingPort generated-model parity.
//
// Proves git-warp-backed structural reads can enter the Wesley-generated
// structural-history model and come back out with byte-equal public behavior.
// Design packet: docs/design/CORE_structural-reading-port-generated-model-parity.md
// ---------------------------------------------------------------------------

import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";
import type { GitClient } from "../../../src/ports/git.js";
import type { PathOps } from "../../../src/ports/paths.js";
import type {
  StructuralReadingPort,
  StructuralReadingResult,
  SymbolReferenceReadingPayload,
  DeadSymbolsReadingPayload,
  TranslatedSubstrateEvidence,
} from "../../../src/ports/structural-reading.js";
import type {
  StructuralReading,
  StructuralReadingEvidence as GeneratedStructuralReadingEvidence,
} from "../../../src/generated/graft-structural-history.js";
import type { ToolContext } from "../../../src/mcp/context.js";
import type { WarpContext } from "../../../src/warp/context.js";
import { createGitWarpStructuralReadingPort } from "../../../src/warp/structural-reading-adapter.js";
import { deadSymbolsTool } from "../../../src/mcp/tools/dead-symbols.js";
import {
  GeneratedModelMappingError,
  fromGeneratedStructuralReading,
  toGeneratedStructuralReading,
} from "../../../src/echo/structural-reading-generated-model.js";

const codec = new CanonicalJsonCodec();

function sha256Hex(value: unknown): string {
  return createHash("sha256").update(codec.encode(value)).digest("hex");
}

const ctx = { repositoryId: "repo:graft-test" } as const;

function expectMappingError(fn: () => unknown, code: string): void {
  expect(fn).toThrow(GeneratedModelMappingError);
  try {
    fn();
    expect.unreachable(`expected mapping error ${code}`);
  } catch (error) {
    expect((error as GeneratedModelMappingError).code).toBe(code);
  }
}

// --- stub plumbing for the real git-warp adapter (same pattern as ---------
// --- test/unit/warp/structural-reading-adapter.test.ts) -------------------

const git = {
  run: vi.fn(),
} satisfies GitClient;

const pathOps = {
  normalize: (p: string) => p,
  isWithin: (filePath: string, directory: string) =>
    filePath === directory || filePath.startsWith(`${directory}/`),
  join: (...segments: string[]) => segments.join("/").replaceAll("//", "/"),
} satisfies PathOps;

const warp = { app: {}, strandId: null } as unknown as WarpContext;

const deadSymbolFixtures = [
  {
    name: "legacyType",
    kind: "interface",
    filePath: "src/a.ts",
    exported: false,
    removedInCommit: "def4567",
  },
  {
    name: "oldHelper",
    kind: "function",
    filePath: "src/old.ts",
    exported: true,
    removedInCommit: "abc1234",
  },
] as const;

interface PortStubOverrides {
  readonly referenceCount?: number;
  readonly referencingFiles?: readonly string[];
  readonly fallbackThrows?: boolean;
  readonly deadSymbols?: readonly (typeof deadSymbolFixtures)[number][];
}

function makePort(overrides: PortStubOverrides = {}): StructuralReadingPort {
  const referenceCount = overrides.referenceCount ?? 2;
  const referencingFiles = overrides.referencingFiles ?? ["src/a.ts", "src/b.ts"];
  return createGitWarpStructuralReadingPort({
    projectRoot: "/repo",
    git,
    pathOps,
    getWarp: () => Promise.resolve(warp),
    countSymbolReferencesFromGraph: vi.fn(() => Promise.resolve({
      symbol: "buildThing",
      referenceCount,
      referencingFiles,
    })),
    countNamedImportReferencesAtRef: overrides.fallbackThrows
      ? vi.fn(() => Promise.reject(new Error("scan failed")))
      : vi.fn(() => Promise.resolve({ referenceCount: 0, referencingFiles: [] })),
    findDeadSymbols: vi.fn(() => Promise.resolve([...(overrides.deadSymbols ?? deadSymbolFixtures)])),
  });
}

async function symbolReferenceResult(
  overrides: PortStubOverrides = {},
): Promise<StructuralReadingResult<SymbolReferenceReadingPayload>> {
  return makePort(overrides).countSymbolReferences({
    symbolName: "buildThing",
    filePath: "src/api.ts",
    ref: "HEAD",
  });
}

async function deadSymbolsResult(
  overrides: PortStubOverrides = {},
  maxCommits?: number,
): Promise<StructuralReadingResult<DeadSymbolsReadingPayload>> {
  return makePort(overrides).findDeadSymbols(
    maxCommits !== undefined ? { maxCommits } : undefined,
  );
}

// A git-warp-imported result never comes out of the live adapter (it labels
// everything fallback-translated); it arrives via import batches. Hand-built.
const importedResult: StructuralReadingResult<SymbolReferenceReadingPayload> = {
  kind: "symbol-reference-count",
  freshness: "stale",
  residualPosture: "partial",
  payload: {
    symbol: "importedThing",
    referenceCount: 3,
    referencingFiles: ["src/x.ts"],
  },
  evidence: {
    kind: "translated-substrate",
    evidenceLabel: "git-warp-imported",
    substrate: "git-warp",
    basis: {
      kind: "git-committed-history",
      projectRoot: "/repo",
      ref: "main",
      head: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      maxCommits: 50,
    },
    evidence: {
      kind: "symbol-reference-count",
      source: "committed-import-scan",
      symbolName: "importedThing",
      filePath: "src/x.ts",
    },
    nativeContinuumWitness: false,
  },
};

describe("toGeneratedStructuralReading — mapping per reading kind", () => {
  it("maps symbol-reference-count results onto the generated model", async () => {
    const result = await symbolReferenceResult();
    const { reading, evidence, basis } = toGeneratedStructuralReading(result, ctx);

    expect(reading.readingKind).toBe("SYMBOL_REFERENCE_COUNT");
    expect(reading.freshness).toBe("CURRENT");
    expect(reading.residualPosture).toBe("COMPLETE");
    expect(reading.repositoryId).toBe(ctx.repositoryId);
    expect(reading.payloadJson).toEqual(result.payload);
    expect(reading.payloadDigest).toBe(sha256Hex(result.payload));

    expect(evidence.evidenceKind).toBe("FALLBACK_TRANSLATED");
    expect(evidence.substrate).toBe("GIT_WARP");
    expect(evidence.nativeContinuumWitness).toBe(false);
    expect(evidence.parity).toBe("NOT_CHECKED");
    expect(evidence.migrationBatchId).toBeNull();
    expect(evidence.sourceRef).toBe("HEAD");

    expect(basis.basisKind).toBe("GIT_REF");
    expect(basis.refName).toBe("HEAD");
    expect(basis.commitId).toBeNull();
    expect(basis.repositoryId).toBe(ctx.repositoryId);

    // linkage: the bundle is internally consistent
    expect(reading.evidenceId).toBe(evidence.evidenceId);
    expect(reading.basisId).toBe(basis.basisId);
    expect(evidence.basisId).toBe(basis.basisId);
  });

  it("maps dead-symbols results onto the generated model", async () => {
    const result = await deadSymbolsResult({}, 25);
    const { reading, evidence, basis } = toGeneratedStructuralReading(result, ctx);

    expect(reading.readingKind).toBe("DEAD_SYMBOLS");
    expect(reading.payloadJson).toEqual(result.payload);
    expect(reading.payloadDigest).toBe(sha256Hex(result.payload));
    expect(evidence.evidenceKind).toBe("FALLBACK_TRANSLATED");
    expect(evidence.nativeContinuumWitness).toBe(false);
    // dead-symbols basis has no ref/head — unpinned committed history
    expect(basis.basisKind).toBe("GIT_REF");
    expect(basis.refName).toBeNull();
    expect(basis.commitId).toBeNull();
    expect(evidence.sourceRef).toBeNull();
  });

  it("maps git-warp-imported evidence labels to GIT_WARP_IMPORTED", () => {
    const { reading, evidence, basis } = toGeneratedStructuralReading(importedResult, ctx);

    expect(evidence.evidenceKind).toBe("GIT_WARP_IMPORTED");
    expect(evidence.nativeContinuumWitness).toBe(false);
    expect(reading.freshness).toBe("STALE");
    expect(reading.residualPosture).toBe("PARTIAL");
    // head present → commit-pinned basis
    expect(basis.basisKind).toBe("GIT_COMMIT");
    expect(basis.commitId).toBe("deadbeefdeadbeefdeadbeefdeadbeefdeadbeef");
    expect(basis.refName).toBe("main");
  });

  it("keeps basis facts recoverable from the (reading, evidence) pair alone", async () => {
    const result = await symbolReferenceResult();
    const { reading, evidence } = toGeneratedStructuralReading(result, ctx);
    const restored = fromGeneratedStructuralReading(reading, evidence);

    expect(restored.evidence).toStrictEqual(result.evidence);
  });
});

describe("toGeneratedStructuralReading — ECHO_NATIVE refusal", () => {
  it("refuses translated-substrate evidence dressed up with an echo-native label", async () => {
    const result = await symbolReferenceResult();
    const forged = {
      ...result,
      evidence: {
        ...result.evidence,
        evidenceLabel: "echo-native",
      },
    } as unknown as StructuralReadingResult<SymbolReferenceReadingPayload>;

    expect(() => toGeneratedStructuralReading(forged, ctx))
      .toThrow(/fallback_translated_is_not_native_continuum/);
    expectMappingError(() => toGeneratedStructuralReading(forged, ctx), "ECHO_NATIVE_REFUSED");
  });

  it("refuses genuine continuum-native evidence: this mapping is the import path", async () => {
    const result = await symbolReferenceResult();
    const nativeDressed = {
      ...result,
      evidence: {
        kind: "continuum-native",
        evidenceLabel: "echo-native",
        nativeContinuumWitness: true,
        envelope: { family: "structural", readingId: "r1", basis: {} },
      },
    } as unknown as StructuralReadingResult<SymbolReferenceReadingPayload>;

    expectMappingError(() => toGeneratedStructuralReading(nativeDressed, ctx), "ECHO_NATIVE_REFUSED");
  });

  it("rejects unknown translated-substrate labels without misnaming them echo-native", async () => {
    const result = await symbolReferenceResult();
    const typoed = {
      ...result,
      evidence: { ...result.evidence, evidenceLabel: "git-warp" },
    } as unknown as StructuralReadingResult<SymbolReferenceReadingPayload>;

    expectMappingError(() => toGeneratedStructuralReading(typoed, ctx), "UNSUPPORTED_EVIDENCE_LABEL");
  });
});

describe("toGeneratedStructuralReading — forward obstruction errors", () => {
  it("refuses null payloads: payloadJson null means absent, not a null payload", async () => {
    const result = await symbolReferenceResult();
    const nulled = { ...result, payload: null } as unknown as StructuralReadingResult<unknown>;
    expectMappingError(() => toGeneratedStructuralReading(nulled, ctx), "UNSERIALIZABLE_PAYLOAD");
  });

  it("refuses payloads canonical JSON cannot represent", async () => {
    const result = await symbolReferenceResult();
    const unserializable = { ...result, payload: undefined } as unknown as StructuralReadingResult<unknown>;
    expectMappingError(() => toGeneratedStructuralReading(unserializable, ctx), "UNSERIALIZABLE_PAYLOAD");
  });

  it("refuses runtime-corrupt reading kinds instead of emitting undefined enums", async () => {
    const result = await symbolReferenceResult();
    const corrupt = { ...result, kind: "symbol-history" } as unknown as StructuralReadingResult<unknown>;
    expectMappingError(() => toGeneratedStructuralReading(corrupt, ctx), "UNSUPPORTED_READING_KIND");
  });

  it("refuses runtime-corrupt freshness values", async () => {
    const result = await symbolReferenceResult();
    const corrupt = { ...result, freshness: "fresh" } as unknown as StructuralReadingResult<unknown>;
    expectMappingError(() => toGeneratedStructuralReading(corrupt, ctx), "UNSUPPORTED_FRESHNESS");
  });

  it("refuses runtime-corrupt residual postures", async () => {
    const result = await symbolReferenceResult();
    const corrupt = { ...result, residualPosture: "fine" } as unknown as StructuralReadingResult<unknown>;
    expectMappingError(() => toGeneratedStructuralReading(corrupt, ctx), "UNSUPPORTED_RESIDUAL_POSTURE");
  });

  it("refuses results whose reading kind disagrees with their evidence facts", async () => {
    const result = await symbolReferenceResult();
    const mismatched = {
      ...result,
      kind: "dead-symbols",
    } as unknown as StructuralReadingResult<unknown>;
    expectMappingError(() => toGeneratedStructuralReading(mismatched, ctx), "EVIDENCE_MISMATCH");
  });

  it("pins payloadDigest to a known canonical-JSON sha256 oracle", () => {
    const importedEvidence = importedResult.evidence as TranslatedSubstrateEvidence;
    const pinned: StructuralReadingResult<SymbolReferenceReadingPayload> = {
      ...importedResult,
      payload: {
        symbol: "x",
        referencingFiles: [],
        referenceCount: 0,
      },
      evidence: {
        ...importedEvidence,
        evidence: {
          kind: "symbol-reference-count",
          source: "committed-import-scan",
          symbolName: "x",
          filePath: "src/x.ts",
        },
      },
    };

    const { reading } = toGeneratedStructuralReading(pinned, ctx);
    // sha256 of {"referenceCount":0,"referencingFiles":[],"symbol":"x"}
    expect(reading.payloadDigest).toBe(
      "c77d91399387641569df1eaaf68f3e73f4fe240f92c2397971f85c4f2118470b",
    );
  });
});

describe("fromGeneratedStructuralReading — round-trip", () => {
  function roundTrips(result: StructuralReadingResult<unknown>): void {
    const { reading, evidence } = toGeneratedStructuralReading(result, ctx);
    expect(fromGeneratedStructuralReading(reading, evidence)).toStrictEqual(result);
  }

  it("round-trips symbol-reference-count results loss-free", async () => {
    roundTrips(await symbolReferenceResult());
  });

  it("round-trips zero-reference counts with empty referencing files", async () => {
    roundTrips(await symbolReferenceResult({ referenceCount: 0, referencingFiles: [] }));
  });

  it("round-trips partial-posture results (fallback scan failed)", async () => {
    const result = await symbolReferenceResult({
      referenceCount: 0,
      referencingFiles: [],
      fallbackThrows: true,
    });
    expect(result.residualPosture).toBe("partial");
    roundTrips(result);
  });

  it("round-trips dead-symbols results loss-free", async () => {
    roundTrips(await deadSymbolsResult({}, 25));
  });

  it("round-trips empty dead-symbol sets without maxCommits", async () => {
    roundTrips(await deadSymbolsResult({ deadSymbols: [] }));
  });

  it("round-trips hand-built git-warp-imported results loss-free", () => {
    roundTrips(importedResult);
  });
});

describe("determinism", () => {
  it("produces identical ids and digests across two mapping passes", async () => {
    const result = await deadSymbolsResult({}, 25);
    const first = toGeneratedStructuralReading(result, ctx);
    const second = toGeneratedStructuralReading(result, ctx);
    expect(second).toStrictEqual(first);
  });

  it("payload key order does not affect payloadDigest", async () => {
    const base = await symbolReferenceResult();
    const reordered = {
      ...base,
      payload: {
        referencingFiles: base.payload.referencingFiles,
        referenceCount: base.payload.referenceCount,
        symbol: base.payload.symbol,
      },
    } as StructuralReadingResult<SymbolReferenceReadingPayload>;

    const fromBase = toGeneratedStructuralReading(base, ctx);
    const fromReordered = toGeneratedStructuralReading(reordered, ctx);
    expect(fromReordered.reading.payloadDigest).toBe(fromBase.reading.payloadDigest);
    expect(fromReordered.reading.readingId).toBe(fromBase.reading.readingId);
  });
});

describe("fromGeneratedStructuralReading — typed obstruction errors", () => {
  async function mappedPair(): Promise<{
    reading: StructuralReading;
    evidence: GeneratedStructuralReadingEvidence;
  }> {
    const { reading, evidence } = toGeneratedStructuralReading(await symbolReferenceResult(), ctx);
    return { reading, evidence };
  }

  it("refuses ECHO_NATIVE generated evidence", async () => {
    const { reading, evidence } = await mappedPair();
    const native = { ...evidence, evidenceKind: "ECHO_NATIVE", nativeContinuumWitness: true } as GeneratedStructuralReadingEvidence;
    expectMappingError(() => fromGeneratedStructuralReading(reading, native), "ECHO_NATIVE_REFUSED");
  });

  it("rejects generated reading kinds the port cannot express", async () => {
    const { reading, evidence } = await mappedPair();
    const widened = { ...reading, readingKind: "SYMBOL_HISTORY" } as StructuralReading;
    expectMappingError(() => fromGeneratedStructuralReading(widened, evidence), "UNSUPPORTED_READING_KIND");
  });

  it("rejects generated freshness values the port cannot express", async () => {
    const { reading, evidence } = await mappedPair();
    const widened = { ...reading, freshness: "UNKNOWN" } as StructuralReading;
    expectMappingError(() => fromGeneratedStructuralReading(widened, evidence), "UNSUPPORTED_FRESHNESS");
  });

  it("rejects generated residual postures the port cannot express", async () => {
    const { reading, evidence } = await mappedPair();
    const widened = { ...reading, residualPosture: "OBSTRUCTED" } as StructuralReading;
    expectMappingError(() => fromGeneratedStructuralReading(widened, evidence), "UNSUPPORTED_RESIDUAL_POSTURE");
  });

  it("rejects readings without payloadJson", async () => {
    const { reading, evidence } = await mappedPair();
    const stripped = { ...reading, payloadJson: null } as StructuralReading;
    expectMappingError(() => fromGeneratedStructuralReading(stripped, evidence), "MISSING_PAYLOAD_JSON");
  });

  it("rejects payload digests that do not match the payload", async () => {
    const { reading, evidence } = await mappedPair();
    const tampered = { ...reading, payloadDigest: sha256Hex({ tampered: true }) } as StructuralReading;
    expectMappingError(() => fromGeneratedStructuralReading(tampered, evidence), "PAYLOAD_DIGEST_MISMATCH");
  });

  it("rejects mismatched reading/evidence pairs", async () => {
    const { reading, evidence } = await mappedPair();
    const foreign = { ...evidence, evidenceId: "evidence:somebody-else" } as GeneratedStructuralReadingEvidence;
    expectMappingError(() => fromGeneratedStructuralReading(reading, foreign), "EVIDENCE_MISMATCH");
  });

  it("rejects ECHO-substrate evidence on the git-warp import path", async () => {
    const { reading, evidence } = await mappedPair();
    const echoSubstrate = { ...evidence, substrate: "ECHO" } as GeneratedStructuralReadingEvidence;
    expectMappingError(() => fromGeneratedStructuralReading(reading, echoSubstrate), "UNSUPPORTED_SUBSTRATE");
  });

  it("rejects evidence whose translated-substrate facts are malformed", async () => {
    const { reading, evidence } = await mappedPair();
    const malformed = { ...evidence, summary: "not json {" } as GeneratedStructuralReadingEvidence;
    expectMappingError(() => fromGeneratedStructuralReading(reading, malformed), "MALFORMED_EVIDENCE_SUMMARY");
  });

  it("rejects digest-valid payloads whose shape does not match the reading kind", async () => {
    const { reading, evidence } = await mappedPair();
    const empty = {
      ...reading,
      payloadJson: {},
      payloadDigest: sha256Hex({}),
    } as StructuralReading;
    expectMappingError(() => fromGeneratedStructuralReading(empty, evidence), "MALFORMED_PAYLOAD");
  });

  it("rejects digest-valid dead-symbols payloads with malformed symbol entries", async () => {
    const direct = await deadSymbolsResult({}, 25);
    const { reading, evidence } = toGeneratedStructuralReading(direct, ctx);
    const malformedPayload = { symbols: [{ name: 42 }], total: 1 };
    const tampered = {
      ...reading,
      payloadJson: malformedPayload,
      payloadDigest: sha256Hex(malformedPayload),
    } as StructuralReading;
    expectMappingError(() => fromGeneratedStructuralReading(tampered, evidence), "MALFORMED_PAYLOAD");
  });

  it("rejects evidence facts whose kind disagrees with the reading kind", async () => {
    const { reading, evidence } = await mappedPair();
    const swapped = {
      ...evidence,
      summary: codec.encode({
        basis: { kind: "git-committed-history", projectRoot: "/repo" },
        evidence: { kind: "dead-symbols", source: "warp-graph" },
      }),
    } as GeneratedStructuralReadingEvidence;
    expectMappingError(() => fromGeneratedStructuralReading(reading, swapped), "EVIDENCE_MISMATCH");
  });
});

// --- public-surface parity (the headline) ----------------------------------

function fakeToolContext(port: StructuralReadingPort): {
  ctx: ToolContext;
  responses: Record<string, unknown>[];
} {
  const responses: Record<string, unknown>[] = [];
  const fake = {
    getStructuralReadingPort: () => port,
    recordFootprint: () => undefined,
    respond: (_tool: string, data: Record<string, unknown>) => {
      responses.push(data);
      return { content: [] };
    },
  } as unknown as ToolContext;
  return { ctx: fake, responses };
}

function portReturning(result: StructuralReadingResult<unknown>): StructuralReadingPort {
  return {
    countSymbolReferences: () =>
      Promise.resolve(result as StructuralReadingResult<SymbolReferenceReadingPayload>),
    findDeadSymbols: () =>
      Promise.resolve(result as StructuralReadingResult<DeadSymbolsReadingPayload>),
  };
}

describe("public-surface parity through the generated model", () => {
  it("graft_dead_symbols output is deep-equal via direct port and generated-model round-trip", async () => {
    const handler = deadSymbolsTool.createHandler();

    const direct = await deadSymbolsResult({}, 25);
    const { ctx: directCtx, responses: directResponses } = fakeToolContext(portReturning(direct));
    await handler({ maxCommits: 25 }, directCtx);

    const { reading, evidence } = toGeneratedStructuralReading(direct, ctx);
    const roundTripped = fromGeneratedStructuralReading(reading, evidence);
    const { ctx: mappedCtx, responses: mappedResponses } = fakeToolContext(portReturning(roundTripped));
    await handler({ maxCommits: 25 }, mappedCtx);

    expect(mappedResponses).toStrictEqual(directResponses);
  });

  it("graft_review reference counts are deep-equal via direct port and generated-model round-trip", async () => {
    // Mirrors countReviewReferences in src/mcp/tools/structural-review.ts:
    // the review tool consumes exactly these payload fields.
    const project = (result: StructuralReadingResult<unknown>) => {
      const payload = result.payload as SymbolReferenceReadingPayload;
      return {
        referenceCount: payload.referenceCount,
        referencingFiles: payload.referencingFiles,
      };
    };

    const direct = await symbolReferenceResult();
    const { reading, evidence } = toGeneratedStructuralReading(direct, ctx);
    const roundTripped = fromGeneratedStructuralReading(reading, evidence);

    expect(project(roundTripped)).toStrictEqual(project(direct));
  });
});

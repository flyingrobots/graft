import { describe, expect, it } from "vitest";
import {
  OP_RECORD_GIT_WARP_IMPORT_BATCH,
  decodeRecordGitWarpImportBatchVars,
  encodeRecordGitWarpImportBatchVars,
} from "../../../src/generated/graft-structural-history.codec.generated.js";
import {
  decodeStructuralHistoryObserveRequest,
  encodeStructuralHistoryObserveRequest,
  packStructuralHistoryIntentV1,
} from "../../../src/echo/structural-history-envelope-codec.js";

const IMPORT_BATCH_VARS = {
  batch: {
    batchId: "batch-0001",
    repositoryId: "repo-graft",
    parity: "PENDING",
    facts: [],
  },
} as const;

describe("structural history codecs", () => {
  it("round-trips recordGitWarpImportBatch vars", () => {
    const encoded = encodeRecordGitWarpImportBatchVars(IMPORT_BATCH_VARS);
    expect(encoded).toBeInstanceOf(Uint8Array);
    const decoded = decodeRecordGitWarpImportBatchVars(encoded);
    expect(decoded).toEqual(IMPORT_BATCH_VARS);
  });

  it("encodes deterministically", () => {
    const first = encodeRecordGitWarpImportBatchVars(IMPORT_BATCH_VARS);
    const second = encodeRecordGitWarpImportBatchVars(IMPORT_BATCH_VARS);
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true);
  });

  it("packs intent envelopes around the stable op id", () => {
    const vars = encodeRecordGitWarpImportBatchVars(IMPORT_BATCH_VARS);
    const envelope = packStructuralHistoryIntentV1(
      OP_RECORD_GIT_WARP_IMPORT_BATCH,
      vars,
    );
    expect(envelope).toBeInstanceOf(Uint8Array);
    expect(envelope.byteLength).toBeGreaterThan(vars.byteLength);
  });

  it("round-trips observe requests", () => {
    const request = {
      operationName: "structuralReadings",
      vars: { basisId: "basis-1", readingKind: null },
    } as const;
    const decoded = decodeStructuralHistoryObserveRequest(
      encodeStructuralHistoryObserveRequest(request),
    );
    expect(decoded).toEqual(request);
  });

  it("surfaces malformed bytes as a typed codec obstruction", () => {
    const malformed = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    expect(() => decodeRecordGitWarpImportBatchVars(malformed)).toThrowError(
      /codec/i,
    );
  });
});

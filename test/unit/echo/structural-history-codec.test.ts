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
  input: {
    importBatchId: "batch-0001",
    repositoryId: "repo-graft",
    sourceRef: "refs/heads/main",
    importedBasisId: "basis-0001",
    parity: "NOT_CHECKED",
    importedReadingCount: 0,
    summary: "fixture import batch batch-0001",
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

  it("packs EINT v1 envelopes per SPEC-0009 ABI v3", () => {
    const vars = encodeRecordGitWarpImportBatchVars(IMPORT_BATCH_VARS);
    const envelope = packStructuralHistoryIntentV1(
      OP_RECORD_GIT_WARP_IMPORT_BATCH,
      vars,
    );
    const view = new DataView(
      envelope.buffer,
      envelope.byteOffset,
      envelope.byteLength,
    );
    expect(Buffer.from(envelope.slice(0, 4)).toString("ascii")).toBe("EINT");
    expect(view.getUint32(4, true)).toBe(OP_RECORD_GIT_WARP_IMPORT_BATCH);
    expect(view.getUint32(8, true)).toBe(vars.byteLength);
    expect(envelope.byteLength).toBe(12 + vars.byteLength);
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

  it("surfaces malformed bytes as a typed codec error", async () => {
    const { CodecError } = await import("../../../src/echo/codec-runtime.js");
    const malformed = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    expect(() => decodeRecordGitWarpImportBatchVars(malformed)).toThrow(CodecError);
  });
});

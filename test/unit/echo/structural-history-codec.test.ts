import { describe, expect, it } from "vitest";
import {
  decodeStructuralBasisKind,
  decodeRecordGitWarpImportBatchVars,
  encodeStructuralBasisKind,
  encodeRecordGitWarpImportBatchVars,
} from "../../../src/generated/graft-structural-history.codec.generated.js";
import {
  STRUCTURAL_HISTORY_WITNESS_INTENT_OPERATION_IDS,
  decodeStructuralHistoryObserveRequest,
  encodeStructuralHistoryObserveRequest,
  packStructuralHistoryIntentV1,
} from "../../../src/echo/structural-history-envelope-codec.js";
import { CodecError } from "../../../src/echo/codec-runtime.js";

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
    expect(decoded).toEqual({ ok: true, value: IMPORT_BATCH_VARS });
  });

  it("round-trips the unpinned committed basis kind", () => {
    const encoded = encodeStructuralBasisKind("UNPINNED_COMMITTED");
    expect(decodeStructuralBasisKind(encoded)).toEqual({
      ok: true,
      value: "UNPINNED_COMMITTED",
    });
  });

  it("encodes deterministically", () => {
    const first = encodeRecordGitWarpImportBatchVars(IMPORT_BATCH_VARS);
    const second = encodeRecordGitWarpImportBatchVars(IMPORT_BATCH_VARS);
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true);
  });

  it("packs EINT v1 envelopes per SPEC-0009 ABI v3", () => {
    const vars = encodeRecordGitWarpImportBatchVars(IMPORT_BATCH_VARS);
    const envelope = packStructuralHistoryIntentV1(
      STRUCTURAL_HISTORY_WITNESS_INTENT_OPERATION_IDS.recordGitWarpImportBatch,
      vars,
    );
    const view = new DataView(
      envelope.buffer,
      envelope.byteOffset,
      envelope.byteLength,
    );
    expect(Buffer.from(envelope.slice(0, 4)).toString("ascii")).toBe("EINT");
    expect(view.getUint32(4, true)).toBe(
      STRUCTURAL_HISTORY_WITNESS_INTENT_OPERATION_IDS.recordGitWarpImportBatch,
    );
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

  it("surfaces malformed bytes as a typed codec error", () => {
    const malformed = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const decoded = decodeRecordGitWarpImportBatchVars(malformed);
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) {
      expect(decoded.error).toBeInstanceOf(CodecError);
    }
  });
});

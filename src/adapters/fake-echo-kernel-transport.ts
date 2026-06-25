// ---------------------------------------------------------------------------
// Deterministic fake Echo kernel transport for tests and local development.
//
// Implements the app-safe byte seam only. Mirrors Echo's wire-level
// authority enforcement: the reserved control op id fails with ABI error 19
// FORBIDDEN_CONTROL_INTENT [echo crates/echo-wasm-abi/src/kernel_port.rs#320
// @2048da5c]. No durability claim: everything lives in process memory.
// ---------------------------------------------------------------------------

import { createHash } from "node:crypto";
import {
  CONTROL_INTENT_V1_OP_ID,
  type EchoKernelTransport,
} from "../ports/echo-kernel-transport.js";
import {
  ABI_ERROR_CODES,
  DEFAULT_STRUCTURAL_HISTORY_BASIS_ID,
  EchoEnvelopeCodecError,
  STRUCTURAL_HISTORY_WITNESS_INTENT_OPERATION_IDS,
  STRUCTURAL_HISTORY_OBSERVE_OPERATIONS,
  decodeStructuralHistoryObserveRequest,
  encodeStructuralHistoryErrorResponse,
  encodeStructuralHistoryOkResponse,
  unpackStructuralHistoryIntentV1,
} from "../echo/structural-history-envelope-codec.js";
import type { CborValue } from "../echo/canonical-cbor.js";
import {
  decodeRecordGitWarpImportBatchVars,
} from "../generated/graft-structural-history.codec.generated.js";

const FATAL_OR_EMPTY_OBSTRUCTIONS = new Set([
  "MISSING_RETENTION",
  "UNSUPPORTED_OPERATION",
  "UNSUPPORTED_QUERY",
  "RUNTIME_FAULT",
]);

export interface FakeDeadSymbolFixture {
  readonly name: string;
  readonly kind: string;
  readonly filePath: string;
  readonly exported: boolean;
  readonly removedInCommit: string;
}

export interface FakeSymbolReferenceFixture {
  readonly symbol: string;
  readonly filePath: string;
  readonly referenceCount: number;
  readonly referencingFiles: readonly string[];
}

export interface FakeQueryObstructionFixture {
  readonly code: string;
  readonly message: string;
  readonly recovery?: string;
}

export interface FakeEchoFixture {
  readonly basisId?: string;
  readonly deadSymbols?: readonly FakeDeadSymbolFixture[];
  readonly symbolReferences?: readonly FakeSymbolReferenceFixture[];
  readonly rejectImportBatchIds?: readonly string[];
  readonly admissionObstructedBatchIds?: readonly string[];
  readonly queryObstruction?: FakeQueryObstructionFixture;
  readonly retainedEvidencePosture?: "retained" | "missing" | "obstructed";
}

export interface CreateFakeEchoKernelTransportOptions {
  readonly fixture?: FakeEchoFixture;
}

interface FakeReadingRecord {
  readonly readingId: string;
  readonly readingKind: string;
  readonly payloadJson: CborValue;
}

function submissionIdFor(envelope: Uint8Array): string {
  return createHash("sha256").update(envelope).digest("hex");
}

function readingsFromFixture(fixture: FakeEchoFixture): FakeReadingRecord[] {
  const records: FakeReadingRecord[] = [];
  const deadSymbols = fixture.deadSymbols ?? [];
  records.push({
    readingId: "reading-dead-symbols-0001",
    readingKind: "DEAD_SYMBOLS",
    payloadJson: {
      symbols: deadSymbols.map((symbol) => ({ ...symbol })),
      total: deadSymbols.length,
    },
  });
  (fixture.symbolReferences ?? []).forEach((reference, index) => {
    records.push({
      readingId: `reading-symbol-reference-${String(index + 1).padStart(4, "0")}`,
      readingKind: "SYMBOL_REFERENCE_COUNT",
      payloadJson: {
        symbol: reference.symbol,
        filePath: reference.filePath,
        referenceCount: reference.referenceCount,
        referencingFiles: [...reference.referencingFiles],
      },
    });
  });
  return records;
}

export function createFakeEchoKernelTransport(
  options: CreateFakeEchoKernelTransportOptions = {},
): EchoKernelTransport {
  const fixture = options.fixture ?? {};
  const basisId = fixture.basisId ?? DEFAULT_STRUCTURAL_HISTORY_BASIS_ID;
  const outcomes = new Map<string, CborValue>();

  function handleIntent(intentBytes: Uint8Array): Uint8Array {
    let envelope;
    try {
      envelope = unpackStructuralHistoryIntentV1(intentBytes);
    } catch (error) {
      if (error instanceof EchoEnvelopeCodecError) {
        return encodeStructuralHistoryErrorResponse(ABI_ERROR_CODES.INVALID_INTENT, error.message);
      }
      throw error;
    }
    if (envelope.opId === CONTROL_INTENT_V1_OP_ID) {
      return encodeStructuralHistoryErrorResponse(
        ABI_ERROR_CODES.FORBIDDEN_CONTROL_INTENT,
        "application dispatch rejected scheduler control intent",
      );
    }
    if (envelope.opId !== STRUCTURAL_HISTORY_WITNESS_INTENT_OPERATION_IDS.recordGitWarpImportBatch) {
      return encodeStructuralHistoryErrorResponse(
        ABI_ERROR_CODES.NOT_SUPPORTED,
        `no installed operation for op id ${String(envelope.opId)}`,
      );
    }
    const decodedVars = decodeRecordGitWarpImportBatchVars(envelope.vars);
    if (!decodedVars.ok) {
      return encodeStructuralHistoryErrorResponse(
        ABI_ERROR_CODES.CODEC_ERROR,
        decodedVars.error.message,
      );
    }
    const vars = decodedVars.value;
    const submissionId = submissionIdFor(intentBytes);
    const receipt: CborValue = {
      submissionId,
      operationName: "recordGitWarpImportBatch",
      importBatchId: vars.input.importBatchId,
    };
    const batchId = vars.input.importBatchId;
    let outcome: CborValue;
    if ((fixture.admissionObstructedBatchIds ?? []).includes(batchId)) {
      outcome = {
        kind: "obstructed",
        obstruction: {
          code: "ADMISSION_OBSTRUCTION",
          message: `import batch ${batchId} was not admitted`,
        },
      };
    } else if ((fixture.rejectImportBatchIds ?? []).includes(batchId)) {
      outcome = {
        kind: "rejected",
        reason: `import batch ${batchId} rejected by fixture policy`,
        receipt,
      };
    } else {
      outcome = { kind: "applied", receipt };
    }
    outcomes.set(submissionId, outcome);
    return encodeStructuralHistoryOkResponse({ submissionId });
  }

  function handleObserve(requestBytes: Uint8Array): Uint8Array {
    let request;
    try {
      request = decodeStructuralHistoryObserveRequest(requestBytes);
    } catch (error) {
      if (error instanceof EchoEnvelopeCodecError) {
        return encodeStructuralHistoryErrorResponse(ABI_ERROR_CODES.CODEC_ERROR, error.message);
      }
      throw error;
    }
    const vars = (request.vars ?? {}) as Record<string, CborValue>;
    if (request.operationName === STRUCTURAL_HISTORY_OBSERVE_OPERATIONS.intentOutcome) {
      const submissionId = typeof vars["submissionId"] === "string" ? vars["submissionId"] : "";
      const outcome = outcomes.get(submissionId) ?? { kind: "unknown" };
      return encodeStructuralHistoryOkResponse({ outcome });
    }
    if (request.operationName === STRUCTURAL_HISTORY_OBSERVE_OPERATIONS.retainedEvidencePosture) {
      return encodeStructuralHistoryOkResponse({
        posture: fixture.retainedEvidencePosture ?? "retained",
      });
    }
    if (request.operationName === STRUCTURAL_HISTORY_OBSERVE_OPERATIONS.structuralReadings) {
      const requestedBasis =
        typeof vars["basisId"] === "string" ? vars["basisId"] : basisId;
      if (requestedBasis !== basisId) {
        return encodeStructuralHistoryOkResponse({
          readings: [],
          obstruction: {
            code: "MISSING_RETENTION",
            message: `basis ${requestedBasis} is not retained by this kernel`,
          },
        });
      }
      const readingKind = typeof vars["readingKind"] === "string" ? vars["readingKind"] : null;
      const obstruction = fixture.queryObstruction;
      const suppressReadings =
        obstruction !== undefined && FATAL_OR_EMPTY_OBSTRUCTIONS.has(obstruction.code);
      const readings = suppressReadings
        ? []
        : readingsFromFixture(fixture)
            .filter((record) => readingKind === null || record.readingKind === readingKind)
            .map((record) => ({
              readingId: record.readingId,
              readingKind: record.readingKind,
              basisId,
              payloadJson: record.payloadJson,
              evidence: {
                family: "graft-structural-history",
                readingId: record.readingId,
                basis: { basisId },
              },
            }));
      const fields: Record<string, CborValue> = { readings };
      if (obstruction !== undefined) {
        fields["obstruction"] = {
          code: obstruction.code,
          message: obstruction.message,
          ...(obstruction.recovery !== undefined ? { recovery: obstruction.recovery } : {}),
        };
      }
      return encodeStructuralHistoryOkResponse(fields);
    }
    return encodeStructuralHistoryOkResponse({
      obstruction: {
        code: "UNSUPPORTED_QUERY",
        message: `no installed observer supports ${request.operationName}`,
      },
    });
  }

  return {
    kernelInfo() {
      return {
        module: "fake-echo-structural-history",
        codecId: "graft-structural-history-le-v0",
      };
    },
    submitIntentBytes(intentBytes: Uint8Array): Uint8Array {
      return handleIntent(intentBytes);
    },
    observeBytes(requestBytes: Uint8Array): Uint8Array {
      return handleObserve(requestBytes);
    },
  };
}

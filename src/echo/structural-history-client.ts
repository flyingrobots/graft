// ---------------------------------------------------------------------------
// Typed structural-history client over the Echo kernel transport.
//
// Rides the generated operation codecs and the EINT v1 / CBOR wire
// envelopes. Outcome kinds mirror Echo's product-facing intent surface
// IntentOutcome::{Unknown, Pending, Applied, Rejected, Obstructed}
// [echo crates/warp-core/src/trusted_runtime_host.rs#740@2048da5c].
// ---------------------------------------------------------------------------

import type { EchoKernelTransport } from "../ports/echo-kernel-transport.js";
import { isCborArray, type CborValue } from "./canonical-cbor.js";
import {
  ABI_ERROR_NAMES,
  EchoEnvelopeCodecError,
  STRUCTURAL_HISTORY_OBSERVE_OPERATIONS,
  decodeStructuralHistoryIntentResponse,
  decodeStructuralHistoryObserveResponse,
  encodeStructuralHistoryObserveRequest,
  packStructuralHistoryIntentV1,
} from "./structural-history-envelope-codec.js";
import {
  OP_RECORD_GIT_WARP_IMPORT_BATCH,
  encodeRecordGitWarpImportBatchVars,
  type RecordGitWarpImportBatchVars,
} from "../generated/graft-structural-history.codec.generated.js";

export interface EchoContractObstruction {
  readonly code: string;
  readonly message: string;
  readonly recovery?: string;
}

export class EchoSubstrateObstructionError extends Error {
  readonly code: string;
  readonly recovery: string | undefined;

  constructor(obstruction: EchoContractObstruction) {
    super(`${obstruction.code}: ${obstruction.message}`);
    this.name = "EchoSubstrateObstructionError";
    this.code = obstruction.code;
    this.recovery = obstruction.recovery;
  }
}

export interface EchoIntentReceipt {
  readonly submissionId: string;
  readonly operationName: string;
}

export type EchoIntentOutcome =
  | { readonly kind: "applied"; readonly receipt: EchoIntentReceipt }
  | {
      readonly kind: "rejected";
      readonly reason: string;
      readonly receipt: EchoIntentReceipt;
    }
  | { readonly kind: "pending" }
  | { readonly kind: "unknown" }
  | { readonly kind: "obstructed"; readonly obstruction: EchoContractObstruction };

export interface EchoIntentSubmissionHandle {
  readonly submissionId: string;
}

export interface EchoStructuralReadingRecord {
  readonly readingId: string;
  readonly readingKind: string;
  readonly basisId: string;
  readonly payloadJson: CborValue;
  readonly evidence: {
    readonly family: string;
    readonly readingId: string;
    readonly basis: Readonly<Record<string, CborValue>>;
  };
}

export interface EchoStructuralReadingsObservation {
  readonly readings: readonly EchoStructuralReadingRecord[];
  readonly obstruction?: EchoContractObstruction;
}

export interface EchoStructuralReadingsRequest {
  readonly basisId: string;
  readonly readingKind?: string;
}

export interface EchoRetainedEvidenceRequest {
  readonly basisId: string;
}

export interface EchoRetainedEvidenceResult {
  readonly posture: "retained" | "missing" | "obstructed";
}

export interface EchoStructuralHistoryClient {
  recordGitWarpImportBatch(
    vars: RecordGitWarpImportBatchVars,
  ): Promise<EchoIntentSubmissionHandle>;
  observeIntentOutcome(submissionId: string): Promise<EchoIntentOutcome>;
  observeStructuralReadings(
    request: EchoStructuralReadingsRequest,
  ): Promise<EchoStructuralReadingsObservation>;
  inspectRetainedEvidence(
    request: EchoRetainedEvidenceRequest,
  ): Promise<EchoRetainedEvidenceResult>;
}

function asRecord(value: CborValue, label: string): Record<string, CborValue> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new EchoEnvelopeCodecError(`${label} is not a map`);
  }
  return value as Record<string, CborValue>;
}

function asString(value: CborValue, label: string): string {
  if (typeof value !== "string") {
    throw new EchoEnvelopeCodecError(`${label} is not a string`);
  }
  return value;
}

function parseObstruction(value: CborValue): EchoContractObstruction {
  const record = asRecord(value, "obstruction");
  const recovery = record["recovery"];
  return {
    code: asString(record["code"] ?? null, "obstruction.code"),
    message: asString(record["message"] ?? null, "obstruction.message"),
    ...(typeof recovery === "string" ? { recovery } : {}),
  };
}

function parseReceipt(value: CborValue): EchoIntentReceipt {
  const record = asRecord(value, "receipt");
  return {
    submissionId: asString(record["submissionId"] ?? null, "receipt.submissionId"),
    operationName: asString(record["operationName"] ?? null, "receipt.operationName"),
  };
}

function parseOutcome(value: CborValue): EchoIntentOutcome {
  const record = asRecord(value, "intent outcome");
  const kind = asString(record["kind"] ?? null, "outcome.kind");
  switch (kind) {
    case "applied":
      return { kind, receipt: parseReceipt(record["receipt"] ?? null) };
    case "rejected":
      return {
        kind,
        reason: asString(record["reason"] ?? null, "outcome.reason"),
        receipt: parseReceipt(record["receipt"] ?? null),
      };
    case "pending":
    case "unknown":
      return { kind };
    case "obstructed":
      return { kind, obstruction: parseObstruction(record["obstruction"] ?? null) };
    default:
      throw new EchoEnvelopeCodecError(`unknown intent outcome kind: ${kind}`);
  }
}

function throwWireError(code: number, message: string): never {
  throw new EchoSubstrateObstructionError({
    code: ABI_ERROR_NAMES[code] ?? `ABI_ERROR_${String(code)}`,
    message,
  });
}

export function createEchoStructuralHistoryClient(
  transport: EchoKernelTransport,
): EchoStructuralHistoryClient {
  function observe(operationName: string, vars: CborValue): Record<string, CborValue> {
    const response = decodeStructuralHistoryObserveResponse(
      transport.observeBytes(
        encodeStructuralHistoryObserveRequest({ operationName, vars }),
      ),
    );
    if (!response.ok) {
      throwWireError(response.code, response.message);
    }
    return { ...response.fields };
  }

  return {
    recordGitWarpImportBatch(vars) {
      const envelope = packStructuralHistoryIntentV1(
        OP_RECORD_GIT_WARP_IMPORT_BATCH,
        encodeRecordGitWarpImportBatchVars(vars),
      );
      const response = decodeStructuralHistoryIntentResponse(
        transport.submitIntentBytes(envelope),
      );
      if (!response.ok) {
        throwWireError(response.code, response.message);
      }
      return Promise.resolve({
        submissionId: asString(response.fields["submissionId"] ?? null, "submissionId"),
      });
    },

    observeIntentOutcome(submissionId) {
      const fields = observe(STRUCTURAL_HISTORY_OBSERVE_OPERATIONS.intentOutcome, { submissionId });
      return Promise.resolve(parseOutcome(fields["outcome"] ?? null));
    },

    observeStructuralReadings(request) {
      const fields = observe(STRUCTURAL_HISTORY_OBSERVE_OPERATIONS.structuralReadings, {
        basisId: request.basisId,
        readingKind: request.readingKind ?? null,
      });
      const rawReadings = fields["readings"] ?? null;
      const readings: EchoStructuralReadingRecord[] = [];
      if (isCborArray(rawReadings)) {
        for (const raw of rawReadings) {
          const record = asRecord(raw, "structural reading");
          const evidence = asRecord(record["evidence"] ?? null, "reading evidence");
          readings.push({
            readingId: asString(record["readingId"] ?? null, "reading.readingId"),
            readingKind: asString(record["readingKind"] ?? null, "reading.readingKind"),
            basisId: asString(record["basisId"] ?? null, "reading.basisId"),
            payloadJson: record["payloadJson"] ?? null,
            evidence: {
              family: asString(evidence["family"] ?? null, "evidence.family"),
              readingId: asString(evidence["readingId"] ?? null, "evidence.readingId"),
              basis: asRecord(evidence["basis"] ?? null, "evidence.basis"),
            },
          });
        }
      }
      const obstruction = fields["obstruction"];
      return Promise.resolve({
        readings,
        ...(obstruction !== undefined && obstruction !== null
          ? { obstruction: parseObstruction(obstruction) }
          : {}),
      });
    },

    inspectRetainedEvidence(request) {
      const fields = observe(STRUCTURAL_HISTORY_OBSERVE_OPERATIONS.retainedEvidencePosture, { basisId: request.basisId });
      const posture = asString(fields["posture"] ?? null, "retained evidence posture");
      if (posture !== "retained" && posture !== "missing" && posture !== "obstructed") {
        throw new EchoEnvelopeCodecError(`unknown retained posture: ${posture}`);
      }
      return Promise.resolve({ posture });
    },
  };
}

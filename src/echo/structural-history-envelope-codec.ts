// ---------------------------------------------------------------------------
// Structural-history wire envelopes over the Echo kernel transport.
//
// Intent intake follows the EINT v1 layout from SPEC-0009 ABI v3
// [echo docs/spec/SPEC-0009-wasm-abi-v3.md@2048da5c]:
//   "EINT" (4 bytes) + op_id (u32 LE) + vars_len (u32 LE) + vars bytes.
// Every transport return is a canonical-CBOR wire envelope with an `ok`
// discriminator: { ok: true, ...fields } | { ok: false, code, message }.
// ---------------------------------------------------------------------------

import {
  CborCodecError,
  decodeCanonicalCbor,
  encodeCanonicalCbor,
  type CborValue,
} from "./canonical-cbor.js";

const EINT_MAGIC = Uint8Array.from([0x45, 0x49, 0x4e, 0x54]);
const EINT_V1_HEADER_SIZE = 12;

/** ABI v3 error codes [echo docs/spec/SPEC-0009-wasm-abi-v3.md@2048da5c]. */
export const ABI_ERROR_CODES = {
  INVALID_INTENT: 2,
  NOT_SUPPORTED: 5,
  CODEC_ERROR: 6,
  UNSUPPORTED_QUERY: 11,
  FORBIDDEN_CONTROL_INTENT: 19,
} as const;

export const ABI_ERROR_NAMES: Readonly<Record<number, string>> = Object.fromEntries(
  Object.entries(ABI_ERROR_CODES).map(([name, code]) => [code, name]),
);

/** Envelope-level observe operation names (pre-observer-plan convention). */
export const STRUCTURAL_HISTORY_OBSERVE_OPERATIONS = {
  intentOutcome: "intentOutcome",
  structuralReadings: "structuralReadings",
  retainedEvidencePosture: "retainedEvidencePosture",
} as const;

/** Default basis id used by the witness fixture space. */
export const DEFAULT_STRUCTURAL_HISTORY_BASIS_ID = "basis-live";

export class EchoEnvelopeCodecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EchoEnvelopeCodecError";
  }
}

export function packStructuralHistoryIntentV1(
  opId: number,
  vars: Uint8Array,
): Uint8Array {
  const envelope = new Uint8Array(EINT_V1_HEADER_SIZE + vars.byteLength);
  envelope.set(EINT_MAGIC, 0);
  const view = new DataView(envelope.buffer, envelope.byteOffset, envelope.byteLength);
  view.setUint32(4, opId >>> 0, true);
  view.setUint32(8, vars.byteLength, true);
  envelope.set(vars, EINT_V1_HEADER_SIZE);
  return envelope;
}

export interface StructuralHistoryIntentEnvelope {
  readonly opId: number;
  readonly vars: Uint8Array;
}

export function unpackStructuralHistoryIntentV1(
  envelope: Uint8Array,
): StructuralHistoryIntentEnvelope {
  if (envelope.byteLength < EINT_V1_HEADER_SIZE) {
    throw new EchoEnvelopeCodecError("EINT envelope shorter than header");
  }
  for (let i = 0; i < EINT_MAGIC.length; i += 1) {
    if (envelope[i] !== EINT_MAGIC[i]) {
      throw new EchoEnvelopeCodecError("EINT magic mismatch");
    }
  }
  const view = new DataView(envelope.buffer, envelope.byteOffset, envelope.byteLength);
  const opId = view.getUint32(4, true);
  const varsLength = view.getUint32(8, true);
  if (EINT_V1_HEADER_SIZE + varsLength !== envelope.byteLength) {
    throw new EchoEnvelopeCodecError("EINT vars length mismatch");
  }
  return { opId, vars: envelope.subarray(EINT_V1_HEADER_SIZE) };
}

export interface StructuralHistoryObserveRequest {
  readonly operationName: string;
  readonly vars: CborValue;
}

export function encodeStructuralHistoryObserveRequest(
  request: StructuralHistoryObserveRequest,
): Uint8Array {
  return encodeCanonicalCbor({
    operationName: request.operationName,
    vars: request.vars,
  });
}

export function decodeStructuralHistoryObserveRequest(
  bytes: Uint8Array,
): StructuralHistoryObserveRequest {
  const decoded = decodeWireMap(bytes, "observe request");
  const operationName = decoded["operationName"];
  if (typeof operationName !== "string") {
    throw new EchoEnvelopeCodecError("observe request missing operationName");
  }
  return { operationName, vars: decoded["vars"] ?? null };
}

export type StructuralHistoryWireResponse =
  | { readonly ok: true; readonly fields: Readonly<Record<string, CborValue>> }
  | { readonly ok: false; readonly code: number; readonly message: string };

export function encodeStructuralHistoryOkResponse(
  fields: Readonly<Record<string, CborValue>>,
): Uint8Array {
  return encodeCanonicalCbor({ ...fields, ok: true });
}

export function encodeStructuralHistoryErrorResponse(
  code: number,
  message: string,
): Uint8Array {
  return encodeCanonicalCbor({ ok: false, code, message });
}

export function decodeStructuralHistoryIntentResponse(
  bytes: Uint8Array,
): StructuralHistoryWireResponse {
  return decodeWireResponse(bytes, "intent response");
}

export function decodeStructuralHistoryObserveResponse(
  bytes: Uint8Array,
): StructuralHistoryWireResponse {
  return decodeWireResponse(bytes, "observe response");
}

function decodeWireMap(
  bytes: Uint8Array,
  label: string,
): Record<string, CborValue> {
  let decoded: CborValue;
  try {
    decoded = decodeCanonicalCbor(bytes);
  } catch (error) {
    if (error instanceof CborCodecError) {
      throw new EchoEnvelopeCodecError(`${label}: ${error.message}`);
    }
    throw error;
  }
  if (decoded === null || typeof decoded !== "object" || Array.isArray(decoded)) {
    throw new EchoEnvelopeCodecError(`${label} is not a CBOR map`);
  }
  return decoded as Record<string, CborValue>;
}

function decodeWireResponse(
  bytes: Uint8Array,
  label: string,
): StructuralHistoryWireResponse {
  const decoded = decodeWireMap(bytes, label);
  const ok = decoded["ok"];
  if (ok === true) {
    const { ok: _discriminator, ...fields } = decoded;
    return { ok: true, fields };
  }
  if (ok === false) {
    const code = decoded["code"];
    const message = decoded["message"];
    if (typeof code !== "number" || typeof message !== "string") {
      throw new EchoEnvelopeCodecError(`${label} error envelope missing code/message`);
    }
    return { ok: false, code, message };
  }
  throw new EchoEnvelopeCodecError(`${label} missing ok discriminator`);
}

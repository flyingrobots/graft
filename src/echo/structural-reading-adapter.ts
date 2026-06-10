// ---------------------------------------------------------------------------
// Echo-backed StructuralReadingPort adapter — sibling to the git-warp
// adapter in src/warp/structural-reading-adapter.ts.
//
// Maps Echo contract obstructions into Graft freshness/residual posture per
// the witness design packet's mapping table. The taxonomy is Echo's
// ContractObstructionKind [echo crates/warp-core/src/contract_obstruction.rs
// #17@2048da5c] plus ABI-level observation rights. Not wired into any
// production context in this slice; tests enforce that.
// ---------------------------------------------------------------------------

import type {
  ContinuumNativeEvidence,
  DeadSymbolReadingPayload,
  DeadSymbolsReadingPayload,
  DeadSymbolsReadingRequest,
  StructuralReadingFreshness,
  StructuralReadingPort,
  StructuralReadingResidualPosture,
  StructuralReadingResult,
  SymbolReferenceReadingPayload,
  SymbolReferenceReadingRequest,
} from "../ports/structural-reading.js";
import { isCborArray, type CborValue } from "./canonical-cbor.js";
import { DEFAULT_STRUCTURAL_HISTORY_BASIS_ID } from "./structural-history-envelope-codec.js";
import {
  EchoSubstrateObstructionError,
  type EchoContractObstruction,
  type EchoStructuralHistoryClient,
  type EchoStructuralReadingRecord,
  type EchoStructuralReadingsObservation,
} from "./structural-history-client.js";

export interface CreateEchoStructuralReadingPortOptions {
  readonly basisId?: string;
}

interface MappedPosture {
  readonly freshness: StructuralReadingFreshness;
  readonly residualPosture: StructuralReadingResidualPosture;
}

export const OBSTRUCTION_POSTURE: Readonly<Record<string, MappedPosture>> = {
  STALE_BASIS: { freshness: "stale", residualPosture: "complete" },
  BUDGET_EXCEEDED: { freshness: "current", residualPosture: "budget-limited" },
  UNSUPPORTED_OBSERVATION_RIGHTS: {
    freshness: "current",
    residualPosture: "rights-limited",
  },
  MISSING_RETENTION: { freshness: "incomparable", residualPosture: "unavailable" },
  RESIDUAL_READING: { freshness: "current", residualPosture: "partial" },
};

function mapPosture(obstruction: EchoContractObstruction | undefined): MappedPosture {
  if (obstruction === undefined) {
    return { freshness: "current", residualPosture: "complete" };
  }
  const mapped = OBSTRUCTION_POSTURE[obstruction.code];
  if (mapped === undefined) {
    throw new EchoSubstrateObstructionError(obstruction);
  }
  return mapped;
}

function echoNativeEvidence(
  basisId: string,
  record: EchoStructuralReadingRecord | undefined,
): ContinuumNativeEvidence {
  return {
    kind: "continuum-native",
    evidenceLabel: "echo-native",
    nativeContinuumWitness: true,
    envelope: {
      family: record?.evidence.family ?? "graft-structural-history",
      readingId: record?.evidence.readingId ?? "reading-unavailable",
      basis: record?.evidence.basis ?? { basisId },
    },
  };
}

function textOf(value: CborValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function asRecordValue(value: CborValue): Record<string, CborValue> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, CborValue>;
}

function deadSymbolsPayload(
  record: EchoStructuralReadingRecord | undefined,
): DeadSymbolsReadingPayload {
  const payload = asRecordValue(record?.payloadJson ?? null);
  const rawSymbols = payload["symbols"] ?? null;
  const symbols: DeadSymbolReadingPayload[] = [];
  if (isCborArray(rawSymbols)) {
    for (const raw of rawSymbols) {
      const entry = asRecordValue(raw);
      symbols.push({
        name: textOf(entry["name"]),
        kind: textOf(entry["kind"]),
        filePath: textOf(entry["filePath"]),
        exported: entry["exported"] === true,
        removedInCommit: textOf(entry["removedInCommit"]),
      });
    }
  }
  return { symbols, total: symbols.length };
}

function symbolReferencePayload(
  symbolName: string,
  record: EchoStructuralReadingRecord | undefined,
): SymbolReferenceReadingPayload {
  const payload = asRecordValue(record?.payloadJson ?? null);
  const rawFiles = payload["referencingFiles"] ?? null;
  return {
    symbol: symbolName,
    referenceCount:
      typeof payload["referenceCount"] === "number" ? payload["referenceCount"] : 0,
    referencingFiles: isCborArray(rawFiles)
      ? rawFiles.filter((file): file is string => typeof file === "string")
      : [],
  };
}

export function createEchoStructuralReadingPort(
  client: EchoStructuralHistoryClient,
  options: CreateEchoStructuralReadingPortOptions = {},
): StructuralReadingPort {
  const basisId = options.basisId ?? DEFAULT_STRUCTURAL_HISTORY_BASIS_ID;

  async function observeKind(
    readingKind: string,
  ): Promise<EchoStructuralReadingsObservation> {
    return client.observeStructuralReadings({ basisId, readingKind });
  }

  return {
    async countSymbolReferences(
      request: SymbolReferenceReadingRequest,
    ): Promise<StructuralReadingResult<SymbolReferenceReadingPayload>> {
      const observation = await observeKind("SYMBOL_REFERENCE_COUNT");
      const posture = mapPosture(observation.obstruction);
      const record = observation.readings.find((candidate) => {
        const payload = asRecordValue(candidate.payloadJson);
        return (
          payload["symbol"] === request.symbolName &&
          payload["filePath"] === request.filePath
        );
      });
      return {
        kind: "symbol-reference-count",
        freshness: posture.freshness,
        residualPosture: posture.residualPosture,
        payload: symbolReferencePayload(request.symbolName, record),
        evidence: echoNativeEvidence(basisId, record),
      };
    },

    async findDeadSymbols(
      _request?: DeadSymbolsReadingRequest,
    ): Promise<StructuralReadingResult<DeadSymbolsReadingPayload>> {
      const observation = await observeKind("DEAD_SYMBOLS");
      const posture = mapPosture(observation.obstruction);
      const record = observation.readings.find(
        (candidate) => candidate.readingKind === "DEAD_SYMBOLS",
      );
      return {
        kind: "dead-symbols",
        freshness: posture.freshness,
        residualPosture: posture.residualPosture,
        payload: deadSymbolsPayload(record),
        evidence: echoNativeEvidence(basisId, record),
      };
    },
  };
}

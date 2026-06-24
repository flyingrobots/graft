import type { StructuralEvidenceKind, StructuralSubstrateKind } from "../generated/graft-structural-history.js";
import type { StructuralReadingEvidenceLabel } from "./structural-reading.js";

export type StructuralHistoryAdapterKind =
  | "echo"
  | "git-warp-import"
  | "git-warp-fallback";

export interface StructuralHistoryProviderDescriptor {
  readonly adapter: StructuralHistoryAdapterKind;
  readonly evidenceLabel: StructuralReadingEvidenceLabel;
  readonly generatedEvidenceKind: StructuralEvidenceKind;
  readonly substrate: "echo" | "git-warp";
  readonly generatedSubstrateKind: StructuralSubstrateKind;
}

export interface StructuralHistoryProviderStatus {
  readonly provider: StructuralHistoryProviderDescriptor;
  readonly available: boolean;
  readonly reason?: string | undefined;
}

export interface StructuralHistoryPort {
  describeProvider(): StructuralHistoryProviderDescriptor;
  status(): Promise<StructuralHistoryProviderStatus>;
}

export const ECHO_NATIVE_HISTORY_PROVIDER: StructuralHistoryProviderDescriptor = Object.freeze({
  adapter: "echo",
  evidenceLabel: "echo-native",
  generatedEvidenceKind: "ECHO_NATIVE",
  substrate: "echo",
  generatedSubstrateKind: "ECHO",
});

export const GIT_WARP_IMPORTED_HISTORY_PROVIDER: StructuralHistoryProviderDescriptor = Object.freeze({
  adapter: "git-warp-import",
  evidenceLabel: "git-warp-imported",
  generatedEvidenceKind: "GIT_WARP_IMPORTED",
  substrate: "git-warp",
  generatedSubstrateKind: "GIT_WARP",
});

export const GIT_WARP_FALLBACK_HISTORY_PROVIDER: StructuralHistoryProviderDescriptor = Object.freeze({
  adapter: "git-warp-fallback",
  evidenceLabel: "fallback-translated",
  generatedEvidenceKind: "FALLBACK_TRANSLATED",
  substrate: "git-warp",
  generatedSubstrateKind: "GIT_WARP",
});

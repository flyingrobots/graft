import { describe, expect, it } from "vitest";
import {
  STRUCTURAL_READING_EVIDENCE_LABELS,
  isEchoNativeEvidence,
  isFallbackTranslatedEvidence,
  isGitWarpImportedEvidence,
  isContinuumNativeEvidence,
  isTranslatedSubstrateEvidence,
  toGeneratedStructuralEvidenceKind,
  type ContinuumNativeEvidence,
  type StructuralReadingResult,
  type TranslatedSubstrateEvidence,
} from "../../../src/ports/structural-reading.js";

describe("StructuralReadingEvidence", () => {
  it("carries the Graft structural evidence label taxonomy", () => {
    expect(STRUCTURAL_READING_EVIDENCE_LABELS).toEqual([
      "echo-native",
      "git-warp-imported",
      "fallback-translated",
    ]);
    expect(toGeneratedStructuralEvidenceKind("echo-native")).toBe("ECHO_NATIVE");
    expect(toGeneratedStructuralEvidenceKind("git-warp-imported")).toBe("GIT_WARP_IMPORTED");
    expect(toGeneratedStructuralEvidenceKind("fallback-translated")).toBe("FALLBACK_TRANSLATED");
  });

  it("separates Echo-native evidence from translated substrate evidence", () => {
    const native = {
      kind: "continuum-native",
      evidenceLabel: "echo-native",
      nativeContinuumWitness: true,
      envelope: {
        family: "runtime-boundary",
        readingId: "reading:echo:frontier:1",
        basis: { kind: "echo-frontier", id: "frontier:1" },
      },
      witness: {
        family: "runtime-boundary",
        witnessId: "witness:suffix:1",
        suffixId: "suffix:1",
      },
    } satisfies ContinuumNativeEvidence;

    const translated = {
      kind: "translated-substrate",
      evidenceLabel: "fallback-translated",
      substrate: "git-warp",
      basis: {
        kind: "git-committed-history",
        projectRoot: "/repo",
        ref: "HEAD",
      },
      evidence: {
        kind: "symbol-reference-count",
        source: "warp-graph",
        symbolName: "buildThing",
        filePath: "src/api.ts",
      },
      nativeContinuumWitness: false,
    } satisfies TranslatedSubstrateEvidence;

    const imported = {
      ...translated,
      evidenceLabel: "git-warp-imported",
    } satisfies TranslatedSubstrateEvidence;

    expect(isContinuumNativeEvidence(native)).toBe(true);
    expect(isEchoNativeEvidence(native)).toBe(true);
    expect(isContinuumNativeEvidence(translated)).toBe(false);
    expect(isEchoNativeEvidence(translated)).toBe(false);
    expect(isTranslatedSubstrateEvidence(translated)).toBe(true);
    expect(isTranslatedSubstrateEvidence(native)).toBe(false);
    expect(isFallbackTranslatedEvidence(translated)).toBe(true);
    expect(isFallbackTranslatedEvidence(imported)).toBe(false);
    expect(isGitWarpImportedEvidence(imported)).toBe(true);
    expect(isGitWarpImportedEvidence(translated)).toBe(false);
    expect(translated.nativeContinuumWitness).toBe(false);
    expect(native.nativeContinuumWitness).toBe(true);
  });

  it("allows normalized Graft payloads to carry Echo-native evidence", () => {
    const reading = {
      kind: "symbol-reference-count",
      freshness: "current",
      residualPosture: "complete",
      payload: {
        symbol: "buildThing",
        referenceCount: 2,
        referencingFiles: ["src/a.ts", "src/b.ts"],
      },
      evidence: {
        kind: "continuum-native",
        evidenceLabel: "echo-native",
        nativeContinuumWitness: true,
        envelope: {
          family: "runtime-boundary",
          readingId: "reading:echo:references:buildThing",
          basis: { kind: "echo-frontier", id: "frontier:buildThing" },
        },
        witness: {
          family: "runtime-boundary",
          witnessId: "witness:references:buildThing",
          suffixId: "suffix:references:buildThing",
        },
      },
    } satisfies StructuralReadingResult<{
      readonly symbol: string;
      readonly referenceCount: number;
      readonly referencingFiles: readonly string[];
    }>;

    expect(reading.payload).toEqual({
      symbol: "buildThing",
      referenceCount: 2,
      referencingFiles: ["src/a.ts", "src/b.ts"],
    });
    expect(reading.evidence.kind).toBe("continuum-native");
    expect(reading.evidence.evidenceLabel).toBe("echo-native");
    expect(isContinuumNativeEvidence(reading.evidence)).toBe(true);
    expect(isEchoNativeEvidence(reading.evidence)).toBe(true);
  });
});

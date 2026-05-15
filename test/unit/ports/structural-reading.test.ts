import { describe, expect, it } from "vitest";
import {
  isContinuumNativeEvidence,
  isTranslatedSubstrateEvidence,
  type ContinuumNativeEvidence,
  type StructuralReadingResult,
  type TranslatedSubstrateEvidence,
} from "../../../src/ports/structural-reading.js";

describe("StructuralReadingEvidence", () => {
  it("separates Continuum-native evidence from translated substrate evidence", () => {
    const native = {
      kind: "continuum-native",
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

    expect(isContinuumNativeEvidence(native)).toBe(true);
    expect(isContinuumNativeEvidence(translated)).toBe(false);
    expect(isTranslatedSubstrateEvidence(translated)).toBe(true);
    expect(isTranslatedSubstrateEvidence(native)).toBe(false);
    expect(translated.nativeContinuumWitness).toBe(false);
    expect("nativeContinuumWitness" in native).toBe(false);
  });

  it("allows normalized Graft payloads to carry Continuum-native evidence", () => {
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
    expect(isContinuumNativeEvidence(reading.evidence)).toBe(true);
  });
});

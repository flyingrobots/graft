import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkStructuralHistorySchemaArtifacts,
  readStructuralHistorySchemaManifest,
} from "../../scripts/check-structural-history-schema-artifacts.js";
import {
  checkStructuralHistoryEchoPackageDescriptor,
  readStructuralHistoryEchoPackageDescriptor,
} from "../../scripts/check-structural-history-echo-package.js";
import {
  fromGeneratedStructuralReading,
  toGeneratedStructuralReading,
} from "../../src/echo/structural-reading-generated-model.js";
import type {
  DeadSymbolsReadingPayload,
  StructuralReadingResult,
  SymbolReferenceReadingPayload,
} from "../../src/ports/structural-reading.js";

const ctx = { repositoryId: "repo:graft-playback" } as const;

function unpinnedDeadSymbolsResult(): StructuralReadingResult<DeadSymbolsReadingPayload> {
  return {
    kind: "dead-symbols",
    freshness: "current",
    residualPosture: "complete",
    payload: {
      symbols: [
        {
          name: "oldHelper",
          kind: "function",
          filePath: "src/old-helper.ts",
          exported: true,
          removedInCommit: "abc1234",
        },
      ],
      total: 1,
    },
    evidence: {
      kind: "translated-substrate",
      evidenceLabel: "fallback-translated",
      substrate: "git-warp",
      basis: {
        kind: "git-committed-history",
        projectRoot: "/repo",
        maxCommits: 25,
      },
      evidence: {
        kind: "dead-symbols",
        source: "warp-graph",
        maxCommits: 25,
      },
      nativeContinuumWitness: false,
    },
  };
}

function refPinnedReferenceResult(): StructuralReadingResult<SymbolReferenceReadingPayload> {
  return {
    kind: "symbol-reference-count",
    freshness: "current",
    residualPosture: "complete",
    payload: {
      symbol: "buildThing",
      referenceCount: 2,
      referencingFiles: ["src/a.ts", "src/b.ts"],
    },
    evidence: {
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
    },
  };
}

describe("CORE_unpinned-basis-kind-for-structural-history playback", () => {
  it("Does the generated model stop asserting `GIT_REF` for dead-symbols readings that have no ref/head basis?", () => {
    const { basis } = toGeneratedStructuralReading(unpinnedDeadSymbolsResult(), ctx);

    expect(basis.basisKind).toBe("UNPINNED_COMMITTED");
    expect(basis.refName).toBeNull();
    expect(basis.commitId).toBeNull();
  });

  it("Does this remain a Graft-only schema/local adapter change, with no real Echo runtime dependency or new `echo-native` claim?", () => {
    const descriptor = readStructuralHistoryEchoPackageDescriptor();
    const { evidence } = toGeneratedStructuralReading(unpinnedDeadSymbolsResult(), ctx);

    expect(descriptor.echo.runtimeRequired).toBe(false);
    expect(descriptor.echo.packageInstallationRequired).toBe(false);
    expect(descriptor.echo.integrationStage).toBe("descriptor-only");
    expect(evidence.evidenceKind).toBe("FALLBACK_TRANSLATED");
    expect(evidence.nativeContinuumWitness).toBe(false);
  });

  it("Does the RED parity test fail before the mapper/schema change and pass afterward?", () => {
    const parityTestText = readFileSync(
      path.join(process.cwd(), "test/unit/echo/generated-model-parity.test.ts"),
      "utf8",
    );
    const { basis } = toGeneratedStructuralReading(unpinnedDeadSymbolsResult(), ctx);

    expect(parityTestText).toContain('expect(basis.basisKind).toBe("UNPINNED_COMMITTED")');
    expect(basis.basisKind).toBe("UNPINNED_COMMITTED");
  });

  it("Do the committed Wesley declarations, codec, manifest, and Echo package descriptor match the v0.2 schema?", () => {
    const schemaText = readFileSync(
      path.join(process.cwd(), "schemas/graft-structural-history.graphql"),
      "utf8",
    );
    const generatedText = readFileSync(
      path.join(process.cwd(), "src/generated/graft-structural-history.ts"),
      "utf8",
    );
    const codecText = readFileSync(
      path.join(process.cwd(), "src/generated/graft-structural-history.codec.generated.ts"),
      "utf8",
    );

    expect(checkStructuralHistorySchemaArtifacts().violations).toEqual([]);
    expect(checkStructuralHistoryEchoPackageDescriptor().violations).toEqual([]);
    expect(readStructuralHistorySchemaManifest().wesleyL1RegistryHash).toBe(
      "641017abf055a8276aacc92262f1efd63e2f02e182508f95eb70eb7d1def4e0b",
    );
    expect(schemaText).toContain("# Version: 0.2.0");
    expect(generatedText).toContain('"UNPINNED_COMMITTED"');
    expect(codecText).toContain("'UNPINNED_COMMITTED'");
  });

  it("Does every emitted `GIT_REF` basis still carry a semantically present `refName`?", () => {
    const { basis } = toGeneratedStructuralReading(refPinnedReferenceResult(), ctx);

    expect(basis.basisKind).toBe("GIT_REF");
    expect(basis.refName).toBe("HEAD");
    expect(basis.commitId).toBeNull();
  });

  it("Do existing public git-warp-backed results round-trip through the generated model without changing user-facing output?", () => {
    const result = unpinnedDeadSymbolsResult();
    const { reading, evidence } = toGeneratedStructuralReading(result, ctx);

    expect(fromGeneratedStructuralReading(reading, evidence)).toEqual(result);
  });
});

import { describe, expect, it, vi } from "vitest";
import type { GitClient } from "../../../src/ports/git.js";
import type { PathOps } from "../../../src/ports/paths.js";
import type { WarpContext } from "../../../src/warp/context.js";
import { createGitWarpStructuralReadingPort } from "../../../src/warp/structural-reading-adapter.js";

const git = {
  run: vi.fn(),
} satisfies GitClient;

const pathOps = {
  normalize: (p: string) => p,
  isWithin: (filePath: string, directory: string) =>
    filePath === directory || filePath.startsWith(`${directory}/`),
  join: (...segments: string[]) => segments.join("/").replaceAll("//", "/"),
} satisfies PathOps;

const warp = { app: {}, strandId: null } as unknown as WarpContext;

describe("git-warp structural reading adapter", () => {
  it("labels WARP graph reference counts as translated non-Continuum-native evidence", async () => {
    const port = createGitWarpStructuralReadingPort({
      projectRoot: "/repo",
      git,
      pathOps,
      getWarp: () => Promise.resolve(warp),
      countSymbolReferencesFromGraph: vi.fn(() => Promise.resolve({
        symbol: "buildThing",
        referenceCount: 2,
        referencingFiles: ["src/a.ts", "src/b.ts"],
      })),
      countNamedImportReferencesAtRef: vi.fn(),
      findDeadSymbols: vi.fn(),
    });

    const reading = await port.countSymbolReferences({
      symbolName: "buildThing",
      filePath: "src/api.ts",
      ref: "HEAD",
    });

    expect(reading.payload).toEqual({
      symbol: "buildThing",
      referenceCount: 2,
      referencingFiles: ["src/a.ts", "src/b.ts"],
    });
    expect(reading).toMatchObject({
      kind: "symbol-reference-count",
      freshness: "current",
      residualPosture: "complete",
      evidence: {
        kind: "translated-substrate",
        evidenceLabel: "fallback-translated",
        substrate: "git-warp",
        nativeContinuumWitness: false,
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
      },
    });
  });

  it("normalizes blank reference-count request refs to HEAD", async () => {
    const fallback = vi.fn(() => Promise.resolve({
      referenceCount: 1,
      referencingFiles: ["src/consumer.ts"],
    }));
    const port = createGitWarpStructuralReadingPort({
      projectRoot: "/repo",
      git,
      pathOps,
      getWarp: () => Promise.resolve(warp),
      countSymbolReferencesFromGraph: vi.fn(() => Promise.resolve({
        symbol: "buildThing",
        referenceCount: 0,
        referencingFiles: [],
      })),
      countNamedImportReferencesAtRef: fallback,
      findDeadSymbols: vi.fn(),
    });

    const reading = await port.countSymbolReferences({
      symbolName: "buildThing",
      filePath: "src/api.ts",
      ref: "   ",
    });

    expect(fallback).toHaveBeenCalledWith(expect.objectContaining({ ref: "HEAD" }));
    expect(reading.evidence).toMatchObject({
      basis: {
        ref: "HEAD",
      },
    });
  });

  it("labels committed import-scan fallback counts as translated substrate evidence", async () => {
    const port = createGitWarpStructuralReadingPort({
      projectRoot: "/repo",
      git,
      pathOps,
      getWarp: () => Promise.resolve(warp),
      countSymbolReferencesFromGraph: vi.fn(() => Promise.resolve({
        symbol: "buildThing",
        referenceCount: 0,
        referencingFiles: [],
      })),
      countNamedImportReferencesAtRef: vi.fn(() => Promise.resolve({
        referenceCount: 1,
        referencingFiles: ["src/consumer.ts"],
      })),
      findDeadSymbols: vi.fn(),
    });

    const reading = await port.countSymbolReferences({
      symbolName: "buildThing",
      filePath: "src/api.ts",
      ref: "HEAD",
    });

    expect(reading.payload).toEqual({
      symbol: "buildThing",
      referenceCount: 1,
      referencingFiles: ["src/consumer.ts"],
    });
    expect(reading.evidence).toMatchObject({
      kind: "translated-substrate",
      evidenceLabel: "fallback-translated",
      substrate: "git-warp",
      nativeContinuumWitness: false,
      evidence: {
        kind: "symbol-reference-count",
        source: "committed-import-scan",
        symbolName: "buildThing",
        filePath: "src/api.ts",
      },
    });
  });

  it("marks reference-count readings partial when committed fallback evidence is unavailable", async () => {
    const port = createGitWarpStructuralReadingPort({
      projectRoot: "/repo",
      git,
      pathOps,
      getWarp: () => Promise.resolve(warp),
      countSymbolReferencesFromGraph: vi.fn(() => Promise.resolve({
        symbol: "buildThing",
        referenceCount: 0,
        referencingFiles: [],
      })),
      countNamedImportReferencesAtRef: vi.fn(() => Promise.reject(new Error("git unavailable"))),
      findDeadSymbols: vi.fn(),
    });

    const reading = await port.countSymbolReferences({
      symbolName: "buildThing",
      filePath: "src/api.ts",
      ref: "HEAD",
    });

    expect(reading.payload).toEqual({
      symbol: "buildThing",
      referenceCount: 0,
      referencingFiles: [],
    });
    expect(reading.residualPosture).toBe("partial");
    expect(reading.evidence).toMatchObject({
      kind: "translated-substrate",
      evidenceLabel: "fallback-translated",
      substrate: "git-warp",
      nativeContinuumWitness: false,
      evidence: {
        kind: "symbol-reference-count",
        source: "warp-graph",
        symbolName: "buildThing",
        filePath: "src/api.ts",
      },
    });
  });

  it("labels dead-symbol readings as translated non-Continuum-native evidence", async () => {
    const port = createGitWarpStructuralReadingPort({
      projectRoot: "/repo",
      git,
      pathOps,
      getWarp: () => Promise.resolve(warp),
      countSymbolReferencesFromGraph: vi.fn(),
      countNamedImportReferencesAtRef: vi.fn(),
      findDeadSymbols: vi.fn(() => Promise.resolve([
        {
          name: "oldThing",
          kind: "function",
          filePath: "src/api.ts",
          exported: true,
          removedInCommit: "abc123",
        },
      ])),
    });

    const reading = await port.findDeadSymbols({ maxCommits: 3 });

    expect(reading.payload).toEqual({
      symbols: [
        {
          name: "oldThing",
          kind: "function",
          filePath: "src/api.ts",
          exported: true,
          removedInCommit: "abc123",
        },
      ],
      total: 1,
    });
    expect(reading).toMatchObject({
      kind: "dead-symbols",
      freshness: "current",
      residualPosture: "complete",
      evidence: {
        kind: "translated-substrate",
        evidenceLabel: "fallback-translated",
        substrate: "git-warp",
        nativeContinuumWitness: false,
        evidence: {
          kind: "dead-symbols",
          source: "warp-graph",
          maxCommits: 3,
        },
      },
    });
  });
});

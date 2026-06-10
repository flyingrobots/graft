import { describe, expect, it } from "vitest";
import { deadSymbolsTool } from "../../../src/mcp/tools/dead-symbols.js";
import { createFakeEchoKernelTransport } from "../../../src/adapters/fake-echo-kernel-transport.js";
import { createEchoStructuralHistoryClient } from "../../../src/echo/structural-history-client.js";
import { createEchoStructuralReadingPort } from "../../../src/echo/structural-reading-adapter.js";
import { isEchoNativeEvidence } from "../../../src/ports/structural-reading.js";

const DEAD_SYMBOLS = [
  {
    name: "zebraHelper",
    kind: "function",
    filePath: "src/zoo/zebra.ts",
    exported: true,
    removedInCommit: "fff0001",
  },
  {
    name: "aardvarkHelper",
    kind: "function",
    filePath: "src/zoo/aardvark.ts",
    exported: false,
    removedInCommit: "fff0002",
  },
] as const;

function echoBackedPort() {
  return createEchoStructuralReadingPort(
    createEchoStructuralHistoryClient(
      createFakeEchoKernelTransport({
        fixture: {
          deadSymbols: [...DEAD_SYMBOLS],
          symbolReferences: [
            {
              symbol: "usedEverywhere",
              filePath: "src/core/used.ts",
              referenceCount: 3,
              referencingFiles: ["src/a.ts", "src/b.ts", "src/c.ts"],
            },
          ],
        },
      }),
    ),
  );
}

describe("query flow through application code", () => {
  it("serves graft_dead_symbols through the echo-backed port", async () => {
    const port = echoBackedPort();
    const footprints: unknown[] = [];
    const handler = deadSymbolsTool.createHandler();
    const response = (await handler(
      {},
      {
        getStructuralReadingPort: () => port,
        recordFootprint: (footprint: unknown) => {
          footprints.push(footprint);
        },
        respond: (_tool: string, payload: Record<string, unknown>) => payload,
      } as never,
    )) as { symbols: ReadonlyArray<{ name: string }>; total: number };

    expect(response.total).toBe(2);
    expect(response.symbols.map((symbol) => symbol.name)).toEqual([
      "aardvarkHelper",
      "zebraHelper",
    ]);
    expect(footprints).toHaveLength(1);
  });

  it("returns current/complete echo-shaped readings for dead symbols", async () => {
    const reading = await echoBackedPort().findDeadSymbols({});
    expect(reading.kind).toBe("dead-symbols");
    expect(reading.freshness).toBe("current");
    expect(reading.residualPosture).toBe("complete");
    expect(reading.payload.total).toBe(2);
    expect(isEchoNativeEvidence(reading.evidence)).toBe(true);
    if (isEchoNativeEvidence(reading.evidence)) {
      expect(reading.evidence.envelope.family.length).toBeGreaterThan(0);
      expect(reading.evidence.envelope.readingId.length).toBeGreaterThan(0);
    }
  });

  it("serves symbol reference counts through the echo-backed port", async () => {
    const reading = await echoBackedPort().countSymbolReferences({
      symbolName: "usedEverywhere",
      filePath: "src/core/used.ts",
    });
    expect(reading.kind).toBe("symbol-reference-count");
    expect(reading.payload.referenceCount).toBe(3);
    expect(reading.payload.referencingFiles).toHaveLength(3);
    expect(isEchoNativeEvidence(reading.evidence)).toBe(true);
  });
});

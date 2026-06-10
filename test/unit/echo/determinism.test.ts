import { describe, expect, it } from "vitest";
import { createFakeEchoKernelTransport } from "../../../src/adapters/fake-echo-kernel-transport.js";
import { createEchoStructuralHistoryClient } from "../../../src/echo/structural-history-client.js";
import { createEchoStructuralReadingPort } from "../../../src/echo/structural-reading-adapter.js";

const FIXTURE = {
  deadSymbols: [
    {
      name: "legacyParser",
      kind: "function",
      filePath: "src/parser/legacy.ts",
      exported: true,
      removedInCommit: "abc9999",
    },
  ],
  symbolReferences: [
    {
      symbol: "evaluatePolicy",
      filePath: "src/policy/evaluate.ts",
      referenceCount: 7,
      referencingFiles: ["src/operations/safe-read.ts"],
    },
  ],
} as const;

async function runFullPass() {
  const port = createEchoStructuralReadingPort(
    createEchoStructuralHistoryClient(
      createFakeEchoKernelTransport({ fixture: structuredClone(FIXTURE) }),
    ),
  );
  const deadSymbols = await port.findDeadSymbols({});
  const references = await port.countSymbolReferences({
    symbolName: "evaluatePolicy",
    filePath: "src/policy/evaluate.ts",
  });
  return { deadSymbols, references };
}

describe("fake echo witness determinism", () => {
  it("produces deep-equal results across runs over the same fixture", async () => {
    const first = await runFullPass();
    const second = await runFullPass();
    expect(second).toEqual(first);
  });
});

import { describe, expect, it } from "vitest";
import { renderStructuralBlame } from "../../../src/cli/structural-blame-render.js";

describe("structural blame renderer", () => {
  it("renders the WARP symbol history timeline for humans", () => {
    const rendered = renderStructuralBlame({
      _schema: { id: "graft.cli.symbol_blame", version: "1.0.0" },
      symbol: "buildThing",
      filePath: "src/api.ts",
      changeCount: 2,
      createdInCommit: "1234567890abcdef",
      lastSignatureChange: "abcdef1234567890",
      referenceCount: 3,
      history: [
        {
          sha: "1234567890abcdef",
          tick: 1,
          changeKind: "added",
          present: true,
          path: "src/api.ts",
          startLine: 1,
          endLine: 1,
          signature: "buildThing(): string",
        },
        {
          sha: "abcdef1234567890",
          tick: 2,
          changeKind: "changed",
          present: true,
          path: "src/api.ts",
          startLine: 4,
          endLine: 6,
          signature: "buildThing(input: string): string",
        },
      ],
    });

    expect(rendered).toContain("Graft Symbol History");
    expect(rendered).toContain("symbol: buildThing");
    expect(rendered).toContain("path: src/api.ts");
    expect(rendered).toContain("references: 3");
    expect(rendered).toContain("created: 1234567890abcdef");
    expect(rendered).toContain("- 1234567890ab @ tick 1: added, present: true, src/api.ts:1-1, buildThing(): string");
    expect(rendered).toContain("- abcdef123456 @ tick 2: changed, present: true, src/api.ts:4-6, buildThing(input: string): string");
  });

  it("renders an unavailable timeline when history is empty", () => {
    const rendered = renderStructuralBlame({
      symbol: "deletedFn",
      filePath: "src/lib.ts",
      changeCount: 0,
      createdInCommit: null,
      lastSignatureChange: null,
      referenceCount: 0,
      history: [],
    });

    expect(rendered).toContain("Graft Symbol History");
    expect(rendered).toContain("symbol: deletedFn");
    expect(rendered).toContain("path: src/lib.ts");
    expect(rendered).toContain("created: unknown");
    expect(rendered).toContain("last signature change: none");
    expect(rendered).toContain("- unavailable: symbol was not found in the indexed WARP graph");
  });
});

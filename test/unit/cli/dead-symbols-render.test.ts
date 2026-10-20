import { describe, expect, it } from "vitest";
import { renderDeadSymbols } from "../../../src/cli/dead-symbols-render.js";

describe("dead symbols renderer", () => {
  it("renders dead symbol cleanup candidates", () => {
    const rendered = renderDeadSymbols({
      _schema: { id: "graft.cli.struct_dead_symbols", version: "1.0.0" },
      maxCommits: 5,
      symbols: [{
        name: "legacyUser",
        kind: "function",
        filePath: "src/legacy.ts",
        exported: true,
        removedInCommit: "abc123",
      }],
      total: 1,
      residualPosture: "complete",
      summary: "1 dead symbols found in indexed WARP history.",
    });

    expect(rendered).toContain("Graft Dead Symbols");
    expect(rendered).toContain("total: 1");
    expect(rendered).toContain("max commits: 5");
    expect(rendered).toContain("- src/legacy.ts: legacyUser (function, exported: true, removed: abc123)");
  });

  it("names the files a partial reading does not cover", () => {
    const rendered = renderDeadSymbols({
      symbols: [],
      total: 0,
      residualPosture: "partial",
      coverage: {
        basisCommit: "abc123",
        domain: "indexable-files-at-basis",
        domainFiles: 2,
        coveredFiles: 1,
        excluded: [{ reason: "unsupported-language", files: 1 }],
        missingFiles: 1,
        missing: [{ path: "src/b.ts", reason: "not-indexed" }],
      },
      summary: "0 dead symbols found in indexed WARP history.",
    });

    expect(rendered).toContain("completeness: partial");
    expect(rendered).toContain("coverage: 1 of 2 indexable files at abc123");
    expect(rendered).toContain("- src/b.ts (not-indexed)");
  });
});

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
      summary: "1 dead symbols found in indexed WARP history.",
    });

    expect(rendered).toContain("Graft Dead Symbols");
    expect(rendered).toContain("total: 1");
    expect(rendered).toContain("max commits: 5");
    expect(rendered).toContain("- src/legacy.ts: legacyUser (function, exported: true, removed: abc123)");
  });
});

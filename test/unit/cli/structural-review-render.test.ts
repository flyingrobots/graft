import { describe, expect, it } from "vitest";
import { renderStructuralReview } from "../../../src/cli/structural-review-render.js";

describe("structural review renderer", () => {
  it("renders a deterministic human summary from the review model only", () => {
    const rendered = renderStructuralReview({
      _schema: { id: "graft.cli.struct_review", version: "1.0.0" },
      base: "HEAD~1",
      head: "HEAD",
      totalFiles: 4,
      categories: {
        structural: 1,
        formatting: 1,
        test: 1,
        docs: 1,
        config: 0,
      },
      files: [
        {
          path: "src/api.ts",
          category: "structural",
          structuralChanges: { added: 1, removed: 0, changed: 1 },
        },
        { path: "src/format.ts", category: "formatting" },
        { path: "test/api.test.ts", category: "test" },
        { path: "README.md", category: "docs" },
      ],
      breakingChanges: [{
        symbol: "legacy",
        kind: "function",
        filePath: "src/api.ts",
        changeType: "removed_export",
        previousSignature: "legacy(): void",
        impactedFiles: 2,
        impactedFilePaths: ["src/a.ts", "src/b.ts"],
      }],
      summary: "ignored by renderer",
    });

    expect(rendered).toContain("Graft Review");
    expect(rendered).toContain("range: HEAD~1..HEAD");
    expect(rendered).toContain("files: 4");
    expect(rendered).toContain("structural: 1");
    expect(rendered).toContain("- src/api.ts: structural (+1 -0 ~1)");
    expect(rendered).toContain("- src/format.ts: formatting");
    expect(rendered).toContain("Breaking changes");
    expect(rendered).toContain("- src/api.ts: legacy removed_export, impacted files: 2");
    expect(rendered).not.toContain("ignored by renderer");
  });
});

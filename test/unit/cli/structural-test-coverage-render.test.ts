import { describe, expect, it } from "vitest";
import { renderStructuralTestCoverageMap } from "../../../src/cli/structural-test-coverage-render.js";

describe("structural test coverage renderer", () => {
  it("renders coverage counts, limitations, and per-symbol statuses", () => {
    const rendered = renderStructuralTestCoverageMap({
      _schema: { id: "graft.cli.struct_test_coverage", version: "1.0.0" },
      sourcePath: "src",
      testPath: "test",
      coverageKind: "structural_reference",
      totals: {
        sourceFiles: 1,
        testFiles: 1,
        exportedSymbols: 2,
        coveredSymbols: 1,
        uncoveredSymbols: 1,
      },
      limitations: [
        "This is structural/reference coverage, not execution coverage.",
        "Imports or mentions may count as references even if no assertion executes the symbol.",
      ],
      files: [{
        path: "src/api.ts",
        symbols: [
          {
            name: "coveredApi",
            kind: "function",
            status: "covered",
            referenceCount: 1,
            referencingTestFiles: ["test/api.test.ts"],
          },
          {
            name: "uncoveredApi",
            kind: "function",
            status: "uncovered",
            referenceCount: 0,
            referencingTestFiles: [],
          },
        ],
      }],
      summary: "ignored by renderer",
    });

    expect(rendered).toContain("Graft Structural Test Coverage");
    expect(rendered).toContain("kind: structural_reference");
    expect(rendered).toContain("source: src");
    expect(rendered).toContain("tests: test");
    expect(rendered).toContain("covered: 1");
    expect(rendered).toContain("uncovered: 1");
    expect(rendered).toContain("not execution coverage");
    expect(rendered).toContain("- src/api.ts: coveredApi covered (refs: 1, files: test/api.test.ts)");
    expect(rendered).toContain("- src/api.ts: uncoveredApi uncovered (refs: 0)");
    expect(rendered).not.toContain("ignored by renderer");
  });
});

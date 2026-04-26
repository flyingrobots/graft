import { describe, expect, it } from "vitest";
import type { GitGraftEnhanceModel } from "../../../src/cli/git-graft-enhance-model.js";
import { renderGitGraftEnhance } from "../../../src/cli/git-graft-enhance-render.js";

function model(): GitGraftEnhanceModel {
  return {
    range: { since: "HEAD~1", head: "HEAD" },
    structural: {
      changedFiles: 2,
      addedSymbols: 2,
      removedSymbols: 0,
      changedSymbols: 1,
      topFilesByChangeCount: [
        {
          path: "src/api.ts",
          status: "modified",
          changeCount: 3,
          summary: "src/api.ts | modified | +2 added, ~1 changed",
        },
      ],
    },
    exports: {
      changed: true,
      semverImpact: "minor",
      addedExports: 1,
      removedExports: 0,
      changedExports: 1,
    },
    warnings: [],
  };
}

describe("cli: git graft enhance renderer", () => {
  it("renders a deterministic human review summary from the model only", () => {
    const first = renderGitGraftEnhance(model());
    const second = renderGitGraftEnhance(model());

    expect(first).toBe(second);
    expect(first).toContain("Git Graft Enhance");
    expect(first).toContain("range: HEAD~1..HEAD");
    expect(first).toContain("files: 2");
    expect(first).toContain("symbols: +2 -0 ~1");
    expect(first).toContain("exports: changed");
    expect(first).toContain("semver impact: minor");
    expect(first).toContain("src/api.ts");
  });

  it("renders warnings without adding workflow advice", () => {
    const rendered = renderGitGraftEnhance({
      ...model(),
      warnings: ["No structural changes found for this range."],
    });

    expect(rendered).toContain("warnings:");
    expect(rendered).toContain("No structural changes found for this range.");
    expect(rendered).not.toContain("recommend");
    expect(rendered).not.toContain("should");
  });
});

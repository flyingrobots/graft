import { describe, expect, it } from "vitest";
import { buildGitGraftEnhanceModel } from "../../../src/cli/git-graft-enhance-model.js";

describe("cli: git graft enhance model", () => {
  it("composes graft_since and graft_exports output into a review model", () => {
    const model = buildGitGraftEnhanceModel({
      since: "HEAD~1",
      head: "HEAD",
      structural: {
        base: "HEAD~1",
        head: "HEAD",
        summary: "+2 added, -1 removed, ~1 changed across 2 files",
        layer: "ref_view",
        files: [
          {
            path: "src/api.ts",
            status: "modified",
            summary: "src/api.ts | modified | +1 added, ~1 changed, =1 unchanged",
            diff: {
              added: [{ name: "createUser", kind: "function", exported: true }],
              removed: [],
              changed: [{ name: "updateUser", kind: "function", exported: true }],
              unchangedCount: 1,
            },
          },
          {
            path: "src/old.ts",
            status: "deleted",
            summary: "src/old.ts | deleted | -1 removed",
            diff: {
              added: [],
              removed: [{ name: "legacyUser", kind: "function", exported: true }],
              changed: [],
              unchangedCount: 0,
            },
          },
        ],
      },
      exports: {
        base: "HEAD~1",
        head: "HEAD",
        added: [{ symbol: "createUser", filePath: "src/api.ts", kind: "function", changeType: "added" }],
        removed: [{ symbol: "legacyUser", filePath: "src/old.ts", kind: "function", changeType: "removed" }],
        changed: [{
          symbol: "updateUser",
          filePath: "src/api.ts",
          kind: "function",
          changeType: "signature_changed",
          previousSignature: "export function updateUser(id: string): User",
          signature: "export function updateUser(id: string, input: UserInput): User",
        }],
        semverImpact: "major",
        summary: "1 added, 1 removed, 1 changed; semver impact: major",
      },
    });

    expect(model).toEqual({
      range: { since: "HEAD~1", head: "HEAD" },
      structural: {
        changedFiles: 2,
        addedSymbols: 1,
        removedSymbols: 1,
        changedSymbols: 1,
        topFilesByChangeCount: [
          { path: "src/api.ts", status: "modified", changeCount: 2, summary: "src/api.ts | modified | +1 added, ~1 changed, =1 unchanged" },
          { path: "src/old.ts", status: "deleted", changeCount: 1, summary: "src/old.ts | deleted | -1 removed" },
        ],
      },
      exports: {
        changed: true,
        semverImpact: "major",
        addedExports: 1,
        removedExports: 1,
        changedExports: 1,
      },
      warnings: [],
    });
  });

  it("reports an empty structural range as a warning", () => {
    const model = buildGitGraftEnhanceModel({
      since: "HEAD",
      head: "HEAD",
      structural: {
        base: "HEAD",
        head: "HEAD",
        summary: "+0 added, -0 removed, ~0 changed across 0 files",
        layer: "ref_view",
        files: [],
      },
      exports: {
        base: "HEAD",
        head: "HEAD",
        added: [],
        removed: [],
        changed: [],
        semverImpact: "none",
        summary: "No public API changes.",
      },
    });

    expect(model.warnings).toEqual(["No structural changes found for this range."]);
  });
});

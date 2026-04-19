import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createRepoWorkspace } from "../../../src/index.js";
import { cleanupTestRepo, createCommittedTestRepo } from "../../helpers/git.js";

describe("repo workspace library API", () => {
  let repoDir: string | null = null;

  afterEach(() => {
    if (repoDir !== null) {
      cleanupTestRepo(repoDir);
      repoDir = null;
    }
  });

  it("provides governed repo-local reads without MCP receipts", async () => {
    repoDir = createCommittedTestRepo("graft-repo-workspace-", {
      "app.ts": "export function greet(name: string): string {\n  return `hello ${name}`;\n}\n",
    });

    const workspace = await createRepoWorkspace({ cwd: repoDir });

    const first = await workspace.safeRead({ path: "app.ts" });
    expect(first.projection).toBe("content");

    const second = await workspace.safeRead({ path: "app.ts" });
    expect(second.projection).toBe("cache_hit");

    fs.writeFileSync(
      path.join(repoDir, "app.ts"),
      "export function greet(name: string): string {\n  return `hi ${name}`;\n}\n",
    );

    const changed = await workspace.changedSince({ path: "app.ts" });
    expect("diff" in changed).toBe(true);
    if ("diff" in changed) {
      expect(changed.diff.changed.length).toBeGreaterThanOrEqual(0);
    }
  });

  it("applies graftignore policy on direct outline and range access", async () => {
    repoDir = createCommittedTestRepo("graft-repo-workspace-policy-", {
      ".graftignore": "generated/**\n",
      "generated/hidden.ts": "export const hidden = true;\n",
    });

    const workspace = await createRepoWorkspace({ cwd: repoDir });

    const outline = await workspace.fileOutline({ path: "generated/hidden.ts" });
    expect("projection" in outline && outline.projection).toBe("refused");

    const range = await workspace.readRange({ path: "generated/hidden.ts", start: 1, end: 1 });
    expect("projection" in range && range.projection).toBe("refused");
  });
});

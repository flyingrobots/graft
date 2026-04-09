import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";

let repoDir: string | null = null;

afterEach(() => {
  if (repoDir !== null) {
    cleanupTestRepo(repoDir);
    repoDir = null;
  }
});

describe("adapters: node git", () => {
  it("runs Git commands through the async GitClient port", async () => {
    repoDir = createTestRepo("graft-node-git-");
    fs.writeFileSync(path.join(repoDir, "app.ts"), "export const ready = true;\n");
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");

    const resultPromise = nodeGit.run({
      cwd: repoDir,
      args: ["rev-parse", "HEAD"],
    });

    expect(resultPromise).toBeInstanceOf(Promise);

    const result = await resultPromise;
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toMatch(/^[0-9a-f]{40}$/);
    expect(result.stderr).toBe("");
  });
});

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { git } from "../../helpers/git.js";

const ROOT = path.resolve(import.meta.dirname, "../../..");
const SCRUB_SCRIPT = path.join(ROOT, "scripts", "strip-copied-git-remotes.sh");
const cleanups: string[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    fs.rmSync(cleanups.pop()!, { recursive: true, force: true });
  }
});

function tempDir(prefix: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  cleanups.push(directory);
  return directory;
}

describe("copy-in Git scrub", () => {
  it("removes ordinary and bare remotes and severs copied worktree pointer files", () => {
    const copiedRoot = tempDir("graft-copy-scrub-");
    const ordinary = path.join(copiedRoot, "ordinary");
    const bare = path.join(copiedRoot, "nested-bare.git");
    const linked = path.join(copiedRoot, "linked-worktree-copy");
    fs.mkdirSync(ordinary);
    fs.mkdirSync(bare);
    fs.mkdirSync(linked);
    git(ordinary, "init --initial-branch main");
    git(ordinary, "remote add origin https://example.invalid/ordinary.git");
    git(bare, "init --bare");
    git(bare, "remote add upstream ssh://example.invalid/bare.git");
    fs.writeFileSync(path.join(linked, ".git"), "gitdir: /host/checkout/.git/worktrees/linked\n");

    const result = spawnSync("sh", [SCRUB_SCRIPT, copiedRoot], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(git(ordinary, "remote")).toBe("");
    expect(git(bare, "remote")).toBe("");
    expect(fs.existsSync(path.join(linked, ".git"))).toBe(false);
  });
});

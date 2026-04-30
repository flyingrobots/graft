import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createRepoPathResolver } from "../../src/adapters/repo-paths.js";

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

function tempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  cleanups.push(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}

function createRepoRoot(): string {
  const repoRoot = tempDir("graft-playback-path-root-");
  fs.mkdirSync(path.join(repoRoot, "src"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "src", "app.ts"), "export const ok = true;\n");
  return repoRoot;
}

describe("BADCODE_repo-path-resolver-symlink-parent-write-escape playback", () => {
  it("Can I see that non-existent writes through a symlinked parent are blocked before governed edit?", () => {
    const repoRoot = createRepoRoot();
    const outsideDir = tempDir("graft-playback-path-outside-");
    fs.symlinkSync(outsideDir, path.join(repoRoot, "escape-dir"));

    expect(() => createRepoPathResolver(repoRoot)("escape-dir/new-file.ts")).toThrow("Path traversal blocked");
  });

  it("Can I see that normal non-existent in-root paths still resolve without broad path refactor?", () => {
    const repoRoot = createRepoRoot();

    expect(createRepoPathResolver(repoRoot)("src/new-file.ts")).toBe(path.join(repoRoot, "src", "new-file.ts"));
  });

  it("Does createRepoPathResolver reject non-existent children under symlinked directories that escape the repo while preserving existing symlink and absolute outside rejection?", () => {
    const repoRoot = createRepoRoot();
    const outsideDir = tempDir("graft-playback-path-outside-");
    const outsideFile = path.join(outsideDir, "secret.ts");
    fs.writeFileSync(outsideFile, "export const secret = true;\n");
    fs.symlinkSync(outsideDir, path.join(repoRoot, "escape-dir"));
    fs.symlinkSync(outsideFile, path.join(repoRoot, "linked-secret.ts"));
    const resolve = createRepoPathResolver(repoRoot);

    expect(() => resolve("escape-dir/new-file.ts")).toThrow("Path traversal blocked");
    expect(() => resolve("escape-dir/secret.ts")).toThrow("Path traversal blocked");
    expect(() => resolve("linked-secret.ts")).toThrow("Path traversal blocked");
    expect(() => resolve(outsideFile)).toThrow("Path traversal blocked");
  });

  it("Does createRepoPathResolver behave consistently for logical projectRoot and canonical real projectRoot?", () => {
    const realRoot = createRepoRoot();
    const aliasParent = tempDir("graft-playback-path-alias-parent-");
    const aliasRoot = path.join(aliasParent, "repo-link");
    fs.symlinkSync(realRoot, aliasRoot);
    const outsideDir = tempDir("graft-playback-path-outside-");
    fs.symlinkSync(outsideDir, path.join(realRoot, "escape-dir"));

    expect(createRepoPathResolver(aliasRoot)("src/new-file.ts")).toBe(path.join(aliasRoot, "src", "new-file.ts"));
    expect(createRepoPathResolver(realRoot)("src/new-file.ts")).toBe(path.join(realRoot, "src", "new-file.ts"));
    expect(() => createRepoPathResolver(aliasRoot)("escape-dir/new-file.ts")).toThrow("Path traversal blocked");
    expect(() => createRepoPathResolver(realRoot)("escape-dir/new-file.ts")).toThrow("Path traversal blocked");
  });
});

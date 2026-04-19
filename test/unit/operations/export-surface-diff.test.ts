import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { exportSurfaceDiff } from "../../../src/operations/export-surface-diff.js";

describe("operations: export-surface-diff", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-export-surface-diff-");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  it("detects added exported function as minor semver impact", async () => {
    // Commit 1: empty module
    fs.writeFileSync(path.join(tmpDir, "api.ts"), "// empty\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'init'");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    // Commit 2: add exported function
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function greet(name: string): string { return name; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add greet'");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await exportSurfaceDiff({
      cwd: tmpDir,
      git: nodeGit,
      base: baseSha,
      head: headSha,
    });

    expect(result.added.length).toBe(1);
    expect(result.added[0]!.symbol).toBe("greet");
    expect(result.added[0]!.changeType).toBe("added");
    expect(result.removed.length).toBe(0);
    expect(result.changed.length).toBe(0);
    expect(result.semverImpact).toBe("minor");
  });

  it("detects removed exported function as major semver impact", async () => {
    // Commit 1: two exported functions
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function foo(): void {}\nexport function bar(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'init api'");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    // Commit 2: remove bar
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function foo(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'remove bar'");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await exportSurfaceDiff({
      cwd: tmpDir,
      git: nodeGit,
      base: baseSha,
      head: headSha,
    });

    expect(result.removed.length).toBe(1);
    expect(result.removed[0]!.symbol).toBe("bar");
    expect(result.removed[0]!.changeType).toBe("removed");
    expect(result.semverImpact).toBe("major");
  });

  it("detects changed exported signature", async () => {
    // Commit 1: exported function
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function process(input: string): string { return input; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'init'");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    // Commit 2: change signature
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function process(input: string, options: object): string { return input; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'change signature'");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await exportSurfaceDiff({
      cwd: tmpDir,
      git: nodeGit,
      base: baseSha,
      head: headSha,
    });

    expect(result.changed.length).toBe(1);
    expect(result.changed[0]!.symbol).toBe("process");
    expect(result.changed[0]!.changeType).toBe("signature_changed");
    expect(result.changed[0]!.previousSignature).toBeDefined();
    expect(result.changed[0]!.signature).toBeDefined();
    expect(result.changed[0]!.signature).not.toBe(result.changed[0]!.previousSignature);
  });

  it("ignores non-exported symbols", async () => {
    // Commit 1: non-exported function
    fs.writeFileSync(
      path.join(tmpDir, "internal.ts"),
      "function helper(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'init'");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    // Commit 2: add another non-exported function
    fs.writeFileSync(
      path.join(tmpDir, "internal.ts"),
      "function helper(): void {}\nfunction anotherHelper(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add helper'");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await exportSurfaceDiff({
      cwd: tmpDir,
      git: nodeGit,
      base: baseSha,
      head: headSha,
    });

    expect(result.added.length).toBe(0);
    expect(result.removed.length).toBe(0);
    expect(result.changed.length).toBe(0);
    expect(result.semverImpact).toBe("none");
    expect(result.summary).toBe("No exported API changes.");
  });
});

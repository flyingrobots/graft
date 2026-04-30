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

  it("classifies adding a required exported parameter as major semver impact", async () => {
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
    expect(result.semverImpact).toBe("major");
  });

  it("classifies adding an optional exported parameter as minor semver impact", async () => {
    // Commit 1: exported function
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function process(input: string): string { return input; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'init'");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    // Commit 2: add optional parameter
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function process(input: string, options?: object): string { return input; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add optional parameter'");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await exportSurfaceDiff({
      cwd: tmpDir,
      git: nodeGit,
      base: baseSha,
      head: headSha,
    });

    expect(result.changed.length).toBe(1);
    expect(result.changed[0]!.symbol).toBe("process");
    expect(result.semverImpact).toBe("minor");
  });

  it("classifies adding a default-valued exported parameter as minor semver impact", async () => {
    // Commit 1: exported function
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function process(input: string): string { return input; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'init'");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    // Commit 2: add parameter with a default value
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function process(input: string, fallback: string = \"ok\"): string { return input || fallback; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add default parameter'");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await exportSurfaceDiff({
      cwd: tmpDir,
      git: nodeGit,
      base: baseSha,
      head: headSha,
    });

    expect(result.changed.length).toBe(1);
    expect(result.changed[0]!.symbol).toBe("process");
    expect(result.semverImpact).toBe("minor");
  });

  it("classifies removed optional exported parameter as major semver impact", async () => {
    // Commit 1: exported function with optional parameter
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function process(input: string, options?: object): string { return input; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'init'");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    // Commit 2: remove optional parameter
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function process(input: string): string { return input; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'remove optional parameter'");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await exportSurfaceDiff({
      cwd: tmpDir,
      git: nodeGit,
      base: baseSha,
      head: headSha,
    });

    expect(result.changed.length).toBe(1);
    expect(result.changed[0]!.symbol).toBe("process");
    expect(result.semverImpact).toBe("major");
  });

  it("classifies parameter type changes as major semver impact", async () => {
    // Commit 1: exported function
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function process(input: string): string { return input; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'init'");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    // Commit 2: change parameter type
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function process(input: number): string { return String(input); }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'change parameter type'");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await exportSurfaceDiff({
      cwd: tmpDir,
      git: nodeGit,
      base: baseSha,
      head: headSha,
    });

    expect(result.changed.length).toBe(1);
    expect(result.changed[0]!.symbol).toBe("process");
    expect(result.semverImpact).toBe("major");
  });

  it("classifies exported return type changes as major semver impact", async () => {
    // Commit 1: exported function
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function process(input: string): string | number { return input; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'init'");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    // Commit 2: narrow return type
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function process(input: string): string { return input; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'change return type'");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await exportSurfaceDiff({
      cwd: tmpDir,
      git: nodeGit,
      base: baseSha,
      head: headSha,
    });

    expect(result.changed.length).toBe(1);
    expect(result.changed[0]!.symbol).toBe("process");
    expect(result.semverImpact).toBe("major");
  });

  it("classifies parameter rename-only signature changes as patch semver impact", async () => {
    // Commit 1: exported function
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function process(input: string): string { return input; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'init'");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    // Commit 2: rename parameter without changing type or arity
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function process(value: string): string { return value; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'rename parameter'");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await exportSurfaceDiff({
      cwd: tmpDir,
      git: nodeGit,
      base: baseSha,
      head: headSha,
    });

    expect(result.changed.length).toBe(1);
    expect(result.changed[0]!.symbol).toBe("process");
    expect(result.semverImpact).toBe("patch");
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

// --- Tests added for export-diff-base-ref-no-try-catch cycle ---

describe("operations: export-surface-diff — new/deleted file handling", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-export-newdel-");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  it("new file (not at base) produces added exports without throwing", async () => {
    // Base: no files
    fs.writeFileSync(path.join(tmpDir, "placeholder.ts"), "// empty\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m base");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    // Head: add a new file with exports
    fs.writeFileSync(
      path.join(tmpDir, "newmod.ts"),
      "export function greet(): string { return \"hi\"; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m add-newmod");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await exportSurfaceDiff({
      cwd: tmpDir,
      git: nodeGit,
      base: baseSha,
      head: headSha,
    });

    expect(result.added).toHaveLength(1);
    expect(result.added[0]!.symbol).toBe("greet");
    expect(result.removed).toHaveLength(0);
  });

  it("deleted file (not at head) produces removed exports without throwing", async () => {
    // Base: file with exports
    fs.writeFileSync(
      path.join(tmpDir, "oldmod.ts"),
      "export function legacy(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m base");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    // Head: delete the file
    fs.unlinkSync(path.join(tmpDir, "oldmod.ts"));
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m delete-oldmod");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await exportSurfaceDiff({
      cwd: tmpDir,
      git: nodeGit,
      base: baseSha,
      head: headSha,
    });

    expect(result.removed).toHaveLength(1);
    expect(result.removed[0]!.symbol).toBe("legacy");
    expect(result.added).toHaveLength(0);
  });

  it("does not swallow GitError for invalid head ref", async () => {
    fs.writeFileSync(path.join(tmpDir, "a.ts"), "export const x = 1;\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m base");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    await expect(
      exportSurfaceDiff({
        cwd: tmpDir,
        git: nodeGit,
        base: baseSha,
        head: "nonexistent-ref-abc123",
      }),
    ).rejects.toThrow();
  });
});

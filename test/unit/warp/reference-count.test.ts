import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { createTestRepo, cleanupTestRepo, git } from "../../helpers/git.js";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { nodeProcessRunner } from "../../../src/adapters/node-process-runner.js";
import { countSymbolReferences } from "../../../src/warp/reference-count.js";

describe("countSymbolReferences", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("ref-count-");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  it("counts references across multiple files, excluding the definition file", async () => {
    // File A: exports createUser
    fs.writeFileSync(
      path.join(tmpDir, "user.ts"),
      'export function createUser(name: string): { name: string } {\n  return { name };\n}\n',
    );

    // File B: imports and calls createUser
    fs.writeFileSync(
      path.join(tmpDir, "handler.ts"),
      'import { createUser } from "./user.js";\n\nconst u = createUser("alice");\nconsole.log(u);\n',
    );

    // File C: also imports createUser
    fs.writeFileSync(
      path.join(tmpDir, "service.ts"),
      'import { createUser } from "./user.js";\n\nexport function setup(): void {\n  createUser("bob");\n}\n',
    );

    git(tmpDir, "add -A");
    git(tmpDir, "commit -m init");

    const result = await countSymbolReferences("createUser", {
      projectRoot: tmpDir,
      git: nodeGit,
      process: nodeProcessRunner,
      filePath: "user.ts",
    });

    expect(result.symbol).toBe("createUser");
    expect(result.referenceCount).toBe(2);
    expect([...result.referencingFiles].sort()).toEqual(["handler.ts", "service.ts"]);
  });

  it("returns zero references when no other file uses the symbol", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "solo.ts"),
      'export function orphan(): void {}\n',
    );

    git(tmpDir, "add -A");
    git(tmpDir, "commit -m init");

    const result = await countSymbolReferences("orphan", {
      projectRoot: tmpDir,
      git: nodeGit,
      process: nodeProcessRunner,
      filePath: "solo.ts",
    });

    expect(result.referenceCount).toBe(0);
    expect(result.referencingFiles).toEqual([]);
  });

  it("includes the definition file when filePath is not provided", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "lib.ts"),
      'export function helper(): void {}\n',
    );
    fs.writeFileSync(
      path.join(tmpDir, "main.ts"),
      'import { helper } from "./lib.js";\nhelper();\n',
    );

    git(tmpDir, "add -A");
    git(tmpDir, "commit -m init");

    const result = await countSymbolReferences("helper", {
      projectRoot: tmpDir,
      git: nodeGit,
      process: nodeProcessRunner,
    });

    // Without filePath filter, the definition file is included
    expect(result.referenceCount).toBe(2);
    expect([...result.referencingFiles].sort()).toEqual(["lib.ts", "main.ts"]);
  });

  it("handles symbols that appear in non-word contexts (no false positives)", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "defs.ts"),
      'export function createUser(): void {}\n',
    );
    fs.writeFileSync(
      path.join(tmpDir, "other.ts"),
      'const createUserProfile = true;\n',
    );

    git(tmpDir, "add -A");
    git(tmpDir, "commit -m init");

    const result = await countSymbolReferences("createUser", {
      projectRoot: tmpDir,
      git: nodeGit,
      process: nodeProcessRunner,
      filePath: "defs.ts",
    });

    // "createUserProfile" should not match word-boundary search for "createUser"
    expect(result.referenceCount).toBe(0);
    expect(result.referencingFiles).toEqual([]);
  });
});

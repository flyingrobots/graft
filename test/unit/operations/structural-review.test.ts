import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { structuralReview } from "../../../src/operations/structural-review.js";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { nodeProcessRunner } from "../../../src/adapters/node-process-runner.js";
import { countSymbolReferences } from "../../../src/warp/reference-count.js";
import { realFs } from "../../helpers/real-fs.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";

describe("operations: structural review", () => {
  let tmpDir: string;

  function reviewOptions(
    overrides: Partial<Parameters<typeof structuralReview>[0]> = {},
  ) {
    return {
      cwd: tmpDir,
      fs: realFs,
      git: nodeGit,
      resolveWorkingTreePath: (filePath: string) => path.join(tmpDir, filePath),
      countReferences: async (symbolName: string, filePath: string) => {
        const refs = await countSymbolReferences(symbolName, {
          projectRoot: tmpDir,
          git: nodeGit,
          process: nodeProcessRunner,
          filePath,
        });
        return { referenceCount: refs.referenceCount, referencingFiles: refs.referencingFiles };
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    tmpDir = createTestRepo("struct-review-");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  it("categorizes structural vs formatting files", async () => {
    // Base commit: two source files
    fs.writeFileSync(
      path.join(tmpDir, "a.ts"),
      "export function foo(): void {}\n",
    );
    fs.writeFileSync(
      path.join(tmpDir, "b.ts"),
      "export function bar(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m base");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    // Head commit: structural change in a.ts, formatting-only change in b.ts
    fs.writeFileSync(
      path.join(tmpDir, "a.ts"),
      "export function foo(): void {}\nexport function baz(): string { return \"\"; }\n",
    );
    fs.writeFileSync(
      path.join(tmpDir, "b.ts"),
      "export function bar(): void {\n  // just a comment\n}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m head");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await structuralReview(
      reviewOptions({ base: baseSha, head: headSha }),
    );

    expect(result.totalFiles).toBe(2);

    const aFile = result.files.find((f) => f.path === "a.ts");
    expect(aFile).toBeDefined();
    expect(aFile!.category).toBe("structural");
    expect(aFile!.structuralChanges).toBeDefined();
    expect(aFile!.structuralChanges!.added).toBe(1);

    const bFile = result.files.find((f) => f.path === "b.ts");
    expect(bFile).toBeDefined();
    expect(bFile!.category).toBe("formatting");
  });

  it("categorizes test, docs, and config files", async () => {
    fs.writeFileSync(path.join(tmpDir, "src.ts"), "export const x = 1;\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m base");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    // Add test, docs, config
    fs.mkdirSync(path.join(tmpDir, "test"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "test/foo.test.ts"), "it('works', () => {});\n");
    fs.writeFileSync(path.join(tmpDir, "README.md"), "# Hello\n");
    fs.writeFileSync(path.join(tmpDir, "package.json"), '{ "name": "test" }\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m head");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await structuralReview(
      reviewOptions({ base: baseSha, head: headSha }),
    );

    expect(result.categories.test).toBe(1);
    expect(result.categories.docs).toBe(1);
    expect(result.categories.config).toBe(1);

    const testFile = result.files.find((f) => f.path === "test/foo.test.ts");
    expect(testFile!.category).toBe("test");

    const docsFile = result.files.find((f) => f.path === "README.md");
    expect(docsFile!.category).toBe("docs");

    const configFile = result.files.find((f) => f.path === "package.json");
    expect(configFile!.category).toBe("config");
  });

  it("detects breaking changes: removed export", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "lib.ts"),
      "export function alpha(): void {}\nexport function beta(): string { return \"\"; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m base");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    // Remove beta
    fs.writeFileSync(
      path.join(tmpDir, "lib.ts"),
      "export function alpha(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m head");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await structuralReview(
      reviewOptions({ base: baseSha, head: headSha }),
    );

    expect(result.breakingChanges).toHaveLength(1);
    expect(result.breakingChanges[0]!.symbol).toBe("beta");
    expect(result.breakingChanges[0]!.changeType).toBe("removed_export");
    expect(result.breakingChanges[0]!.filePath).toBe("lib.ts");
  });

  it("detects breaking changes: changed signature", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "svc.ts"),
      "export function create(name: string): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m base");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    // Change signature
    fs.writeFileSync(
      path.join(tmpDir, "svc.ts"),
      "export function create(name: string, opts: object): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m head");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await structuralReview(
      reviewOptions({ base: baseSha, head: headSha }),
    );

    expect(result.breakingChanges).toHaveLength(1);
    expect(result.breakingChanges[0]!.symbol).toBe("create");
    expect(result.breakingChanges[0]!.changeType).toBe("signature_changed");
    expect(result.breakingChanges[0]!.previousSignature).toBeDefined();
    expect(result.breakingChanges[0]!.newSignature).toBeDefined();
  });

  it("renders a human-readable summary", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "a.ts"),
      "export function foo(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m base");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    fs.writeFileSync(
      path.join(tmpDir, "a.ts"),
      "export function foo(): void {}\nexport function bar(): void {}\n",
    );
    fs.writeFileSync(path.join(tmpDir, "README.md"), "# Docs\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m head");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await structuralReview(
      reviewOptions({ base: baseSha, head: headSha }),
    );

    expect(result.summary).toContain("PR Review:");
    expect(result.summary).toContain("Structural:");
    expect(result.summary).toContain("Docs:");
  });
});

// --- Tests added for review-breaking-change-export-filter cycle ---
// These are appended outside the main describe block as a second suite
// that reuses the same imports.

describe("operations: structural review — export-aware breaking changes", () => {
  let tmpDir: string;

  function reviewOpts(
    overrides: Partial<Parameters<typeof structuralReview>[0]> = {},
  ) {
    return {
      cwd: tmpDir,
      fs: realFs,
      git: nodeGit,
      resolveWorkingTreePath: (filePath: string) => path.join(tmpDir, filePath),
      countReferences: async (symbolName: string, filePath: string) => {
        const refs = await countSymbolReferences(symbolName, {
          projectRoot: tmpDir,
          git: nodeGit,
          process: nodeProcessRunner,
          filePath,
        });
        return { referenceCount: refs.referenceCount, referencingFiles: refs.referencingFiles };
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    tmpDir = createTestRepo("review-export-");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  it("does NOT flag removal of non-exported symbol as breaking", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "lib.ts"),
      "export function alpha(): void {}\nfunction _helper(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m base");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    fs.writeFileSync(
      path.join(tmpDir, "lib.ts"),
      "export function alpha(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m head");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await structuralReview(
      reviewOpts({ base: baseSha, head: headSha }),
    );

    expect(result.breakingChanges).toHaveLength(0);
  });

  it("does NOT flag signature change of non-exported symbol as breaking", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "lib.ts"),
      "export function alpha(): void {}\nfunction _helper(x: number): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m base");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    fs.writeFileSync(
      path.join(tmpDir, "lib.ts"),
      "export function alpha(): void {}\nfunction _helper(x: number, y: string): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m head");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await structuralReview(
      reviewOpts({ base: baseSha, head: headSha }),
    );

    expect(result.breakingChanges).toHaveLength(0);
  });

  it("flags only exported removals in mixed exported/non-exported changes", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "lib.ts"),
      "export function pubFunc(): void {}\nfunction privFunc(): void {}\nexport function another(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m base");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    fs.writeFileSync(
      path.join(tmpDir, "lib.ts"),
      "export function another(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m head");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await structuralReview(
      reviewOpts({ base: baseSha, head: headSha }),
    );

    expect(result.breakingChanges).toHaveLength(1);
    expect(result.breakingChanges[0]!.symbol).toBe("pubFunc");
    expect(result.breakingChanges[0]!.changeType).toBe("removed_export");
  });
});

// --- Tests added for review-renamed-files-false-breaking cycle ---

describe("operations: structural review — renamed files", () => {
  let tmpDir: string;

  function reviewOpts2(
    overrides: Partial<Parameters<typeof structuralReview>[0]> = {},
  ) {
    return {
      cwd: tmpDir,
      fs: realFs,
      git: nodeGit,
      resolveWorkingTreePath: (filePath: string) => path.join(tmpDir, filePath),
      countReferences: async (symbolName: string, filePath: string) => {
        const refs = await countSymbolReferences(symbolName, {
          projectRoot: tmpDir,
          git: nodeGit,
          process: nodeProcessRunner,
          filePath,
        });
        return { referenceCount: refs.referenceCount, referencingFiles: refs.referencingFiles };
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    tmpDir = createTestRepo("review-rename-");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  it("renamed file produces ZERO breaking changes", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "lib.ts"),
      "export function alpha(): void {}\nexport function beta(): string { return \"\"; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m base");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    // Rename the file
    git(tmpDir, "mv lib.ts utils.ts");
    git(tmpDir, "commit -m rename");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await structuralReview(
      reviewOpts2({ base: baseSha, head: headSha }),
    );

    expect(result.breakingChanges).toHaveLength(0);
  });

  it("renamed file with actual symbol removal flags only the real removal", async () => {
    // Use enough content for git to detect the rename (>50% similarity)
    fs.writeFileSync(
      path.join(tmpDir, "lib.ts"),
      "export function alpha(): void {}\nexport function beta(): string { return \"\"; }\nexport function gamma(x: number): number { return x * 2; }\nexport function delta(s: string): boolean { return s.length > 0; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m base");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    // Rename AND remove beta (keeping enough content for rename detection)
    git(tmpDir, "mv lib.ts utils.ts");
    fs.writeFileSync(
      path.join(tmpDir, "utils.ts"),
      "export function alpha(): void {}\nexport function gamma(x: number): number { return x * 2; }\nexport function delta(s: string): boolean { return s.length > 0; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m rename-and-remove");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await structuralReview(
      reviewOpts2({ base: baseSha, head: headSha }),
    );

    expect(result.breakingChanges).toHaveLength(1);
    expect(result.breakingChanges[0]!.symbol).toBe("beta");
  });

  it("renamed file appears as single entry, not delete + add pair", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "lib.ts"),
      "export function alpha(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m base");
    const baseSha = git(tmpDir, "rev-parse HEAD");

    git(tmpDir, "mv lib.ts moved.ts");
    git(tmpDir, "commit -m rename");
    const headSha = git(tmpDir, "rev-parse HEAD");

    const result = await structuralReview(
      reviewOpts2({ base: baseSha, head: headSha }),
    );

    // Should NOT have separate entries for lib.ts (deleted) and moved.ts (added)
    const libEntry = result.files.find((f) => f.path === "lib.ts");
    expect(libEntry).toBeUndefined();

    // Should have one entry for moved.ts
    const movedEntry = result.files.find((f) => f.path === "moved.ts");
    expect(movedEntry).toBeDefined();
  });
});

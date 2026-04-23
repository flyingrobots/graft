import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { buildConversationPrimer } from "../../../src/operations/conversation-primer.js";

describe("operations: conversation-primer", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-primer-");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  it("generates a primer with directory structure for a repo", async () => {
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "src/app.ts"), "export function main(): void {}\n");
    fs.writeFileSync(path.join(tmpDir, "src/util.ts"), "export function helper(): string { return ''; }\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add src'");

    const primer = await buildConversationPrimer({ cwd: tmpDir });

    expect(primer.scope).toBeDefined();
    expect(primer.files.length).toBeGreaterThan(0);
    expect(primer.files.some((f) => f.includes("app.ts"))).toBe(true);
  });

  it("auto-detects src/ as the default scope", async () => {
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, "docs"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "src/index.ts"), "export const x = 1;\n");
    fs.writeFileSync(path.join(tmpDir, "docs/README.md"), "# Docs\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'structured repo'");

    const primer = await buildConversationPrimer({ cwd: tmpDir });

    expect(primer.scope).toBe("src");
  });

  it("falls back to repo root when no common scope exists", async () => {
    fs.writeFileSync(path.join(tmpDir, "main.ts"), "export const x = 1;\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'flat repo'");

    const primer = await buildConversationPrimer({ cwd: tmpDir });

    expect(primer.scope).toBe(".");
  });

  it("respects maxFiles budget", async () => {
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    for (let i = 0; i < 20; i++) {
      fs.writeFileSync(path.join(tmpDir, `src/file${String(i)}.ts`), `export const x${String(i)} = ${String(i)};\n`);
    }
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'many files'");

    const primer = await buildConversationPrimer({ cwd: tmpDir, maxFiles: 5 });

    expect(primer.files.length).toBeLessThanOrEqual(5);
    expect(primer.truncated).toBe(true);
  });

  it("returns empty primer for repo with no tracked files", async () => {
    const primer = await buildConversationPrimer({ cwd: tmpDir });

    expect(primer.files).toEqual([]);
  });

  it("accepts explicit scope override", async () => {
    fs.mkdirSync(path.join(tmpDir, "lib"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "lib/core.ts"), "export function core(): void {}\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add lib'");

    const primer = await buildConversationPrimer({ cwd: tmpDir, scope: "lib" });

    expect(primer.scope).toBe("lib");
    expect(primer.files.some((f) => f.includes("core.ts"))).toBe(true);
  });
});

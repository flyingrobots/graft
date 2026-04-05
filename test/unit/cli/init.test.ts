import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { runInit } from "../../../src/cli/init.js";

describe("cli: graft init", () => {
  let tmpDir: string;
  let origCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-init-"));
    origCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(origCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates .graftignore", () => {
    runInit();
    expect(fs.existsSync(path.join(tmpDir, ".graftignore"))).toBe(true);
    const content = fs.readFileSync(path.join(tmpDir, ".graftignore"), "utf-8");
    expect(content).toContain("Graft ignore patterns");
  });

  it("creates .gitignore with .graft/ entry", () => {
    runInit();
    const content = fs.readFileSync(path.join(tmpDir, ".gitignore"), "utf-8");
    expect(content).toContain(".graft/");
  });

  it("appends to existing .gitignore without duplicating", () => {
    fs.writeFileSync(path.join(tmpDir, ".gitignore"), "node_modules/\n");
    runInit();
    const content = fs.readFileSync(path.join(tmpDir, ".gitignore"), "utf-8");
    expect(content).toContain("node_modules/");
    expect(content).toContain(".graft/");
    // Run again — should not duplicate
    runInit();
    const after = fs.readFileSync(path.join(tmpDir, ".gitignore"), "utf-8");
    const count = (after.match(/\.graft\//g) ?? []).length;
    expect(count).toBe(1);
  });

  it("creates CLAUDE.md with agent instructions", () => {
    runInit();
    const content = fs.readFileSync(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("safe_read");
    expect(content).toContain("file_outline");
    expect(content).toContain("set_budget");
  });

  it("appends to existing CLAUDE.md without duplicating", () => {
    fs.writeFileSync(path.join(tmpDir, "CLAUDE.md"), "# My Project\n\nExisting content.\n");
    runInit();
    const content = fs.readFileSync(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("My Project");
    expect(content).toContain("safe_read");
    // Run again — should not duplicate
    runInit();
    const after = fs.readFileSync(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    const count = (after.match(/safe_read/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(1);
    // Only one snippet block
    const snippetCount = (after.match(/## File reads/g) ?? []).length;
    expect(snippetCount).toBe(1);
  });

  it("does not overwrite existing .graftignore", () => {
    fs.writeFileSync(path.join(tmpDir, ".graftignore"), "custom-pattern\n");
    runInit();
    const content = fs.readFileSync(path.join(tmpDir, ".graftignore"), "utf-8");
    expect(content).toBe("custom-pattern\n");
  });
});

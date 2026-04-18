import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPathResolver } from "../../../src/mcp/context.js";

describe("createPathResolver", () => {
  let tmpDir: string;
  let resolve: (input: string) => string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-path-resolver-"));
    // Create a subdirectory structure for tests
    fs.mkdirSync(path.join(tmpDir, "sub", "deep"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "file.txt"), "hello");
    fs.writeFileSync(path.join(tmpDir, "sub", "nested.txt"), "nested");
    resolve = createPathResolver(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── Relative paths ────────────────────────────────────────────────

  it("resolves a simple relative path inside the root", () => {
    const result = resolve("file.txt");
    expect(result).toBe(path.resolve(tmpDir, "file.txt"));
  });

  it("resolves a nested relative path inside the root", () => {
    const result = resolve("sub/nested.txt");
    expect(result).toBe(path.resolve(tmpDir, "sub", "nested.txt"));
  });

  it("throws on relative path that escapes root via ..", () => {
    expect(() => resolve("../../../etc/passwd")).toThrow("Path traversal blocked");
  });

  it("throws on relative path with embedded .. that escapes", () => {
    expect(() => resolve("sub/../../.." )).toThrow("Path traversal blocked");
  });

  it("allows relative paths with .. that stay inside root", () => {
    const result = resolve("sub/deep/../../file.txt");
    expect(result).toBe(path.resolve(tmpDir, "file.txt"));
  });

  // ── Absolute paths ────────────────────────────────────────────────

  it("allows absolute path inside the project root", () => {
    const absInside = path.join(tmpDir, "sub", "nested.txt");
    const result = resolve(absInside);
    expect(result).toBe(path.resolve(tmpDir, "sub", "nested.txt"));
  });

  it("throws on absolute path outside the project root", () => {
    expect(() => resolve("/etc/passwd")).toThrow("Path traversal blocked");
  });

  it("throws on absolute path to parent directory", () => {
    expect(() => resolve(path.dirname(tmpDir))).toThrow("Path traversal blocked");
  });

  it("throws on absolute path with .. that escapes root", () => {
    const escaping = path.join(tmpDir, "..", "..", "etc", "passwd");
    expect(() => resolve(escaping)).toThrow("Path traversal blocked");
  });

  // ── Symlink escapes ───────────────────────────────────────────────

  it("throws when a symlink inside root points outside root", () => {
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-symlink-target-"));
    fs.writeFileSync(path.join(outsideDir, "secret.txt"), "secret");
    const symlinkPath = path.join(tmpDir, "escape-link");

    try {
      fs.symlinkSync(outsideDir, symlinkPath);
      expect(() => resolve("escape-link/secret.txt")).toThrow("Path traversal blocked");
    } finally {
      fs.rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it("throws when a symlinked file inside root points outside root", () => {
    const outsideFile = path.join(os.tmpdir(), `graft-symlink-file-${String(Date.now())}.txt`);
    fs.writeFileSync(outsideFile, "secret");
    const symlinkPath = path.join(tmpDir, "linked-file.txt");

    try {
      fs.symlinkSync(outsideFile, symlinkPath);
      expect(() => resolve("linked-file.txt")).toThrow("Path traversal blocked");
    } finally {
      fs.unlinkSync(outsideFile);
    }
  });

  it("allows symlinks that resolve within the project root", () => {
    const symlinkPath = path.join(tmpDir, "internal-link");
    fs.symlinkSync(path.join(tmpDir, "sub"), symlinkPath);
    const result = resolve("internal-link/nested.txt");
    // Returns the logical path (with symlink), not the realpath
    expect(result).toBe(path.resolve(tmpDir, "internal-link", "nested.txt"));
  });

  // ── Non-existent paths ────────────────────────────────────────────

  it("allows non-existent paths inside root (logical resolution)", () => {
    const result = resolve("does-not-exist.txt");
    expect(result).toBe(path.resolve(tmpDir, "does-not-exist.txt"));
  });

  it("throws on non-existent absolute path outside root", () => {
    expect(() => resolve("/nonexistent/path/file.txt")).toThrow("Path traversal blocked");
  });
});

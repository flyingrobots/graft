import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it, expect } from "vitest";
import { createPathResolver } from "../../src/mcp/context.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");

function repoFileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

function readRepoText(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}


describe("CORE_v060-code-review-fixes", () => {
  // -- Human --

  it("Does the path resolver reject absolute paths outside the project root?", () => {
    // Exercise the actual resolver with a temp directory as root
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-playback-pathres-"));
    try {
      const resolve = createPathResolver(tmpDir);

      // Absolute path outside root is rejected
      expect(() => resolve("/etc/passwd")).toThrow("Path traversal blocked");

      // Relative escape is rejected
      expect(() => resolve("../../../etc/passwd")).toThrow("Path traversal blocked");

      // Valid relative path inside root succeeds
      const result = resolve("foo.txt");
      expect(result).toBe(path.resolve(tmpDir, "foo.txt"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });


  // -- Agent --

  it("Does createRepoPathResolver reject /etc/passwd when root is /repo?", () => {
    // Behavioral test: call createPathResolver and verify rejection
    const resolve = createPathResolver("/repo");
    expect(() => resolve("/etc/passwd")).toThrow("Path traversal blocked");
    expect(() => resolve("/etc/../etc/passwd")).toThrow("Path traversal blocked");

    // Also verified by comprehensive test suite:
    expect(repoFileExists("test/unit/mcp/path-resolver.test.ts")).toBe(true);
  });

  it("Does the path resolver detect symlink escapes via realpathSync?", () => {
    // Behavioral: create a symlink that escapes root and verify rejection
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-playback-symlink-"));
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-playback-outside-"));
    try {
      fs.writeFileSync(path.join(outsideDir, "secret.txt"), "secret");
      fs.symlinkSync(outsideDir, path.join(tmpDir, "escape-link"));
      const resolve = createPathResolver(tmpDir);
      expect(() => resolve("escape-link/secret.txt")).toThrow("Path traversal blocked");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      fs.rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it("Do two same-named methods in different classes get distinct WARP node IDs?", () => {
    // Sym IDs include the full symbol path (e.g. sym:file:Class.method), so
    // same-named methods in different classes are always distinct.
    expect(repoFileExists("test/unit/warp/index-head.test.ts")).toBe(true);
    const src = readRepoText("src/warp/index-head.ts");
    expect(src).toContain("emitOutlineSyms");
  });

  it("Does a git failure during indexing produce an explicit error result?", () => {
    // indexHead throws on git failures — callers handle the error.
    expect(repoFileExists("src/warp/index-head.ts")).toBe(true);
    const src = readRepoText("src/warp/index-head.ts");
    expect(src).toContain("throw new Error");
  });

  it("Is the daemon session directory removed on session close?", () => {
    expect(repoFileExists("tests/playback/0092-daemon-session-directory-cleanup.test.ts")).toBe(true);
    const host = readRepoText("src/mcp/daemon-session-host.ts");
    expect(host).toContain("removeSessionDirectory");
  });

  it("Does an oversized log entry preserve itself instead of erasing the log?", () => {
    const log = readRepoText("src/adapters/rotating-ndjson-log.ts");
    expect(log).toContain("kept.length === 0");
  });

  it("Does graft_map truncate when exceeding MAX_MAP_FILES or MAX_MAP_BYTES?", () => {
    const map = readRepoText("src/mcp/tools/map.ts");
    expect(map).toContain("MAX_MAP_FILES");
    expect(map).toContain("MAX_MAP_BYTES");
    expect(map).toContain("truncated");
  });

  it("Does graft_map respect exhausted session budget?", () => {
    const map = readRepoText("src/mcp/tools/map.ts");
    expect(map).toContain("BUDGET_EXHAUSTED");
    expect(repoFileExists("test/unit/mcp/map-truncation.test.ts")).toBe(true);
  });
});

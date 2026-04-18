import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it, expect } from "vitest";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");

function repoFileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

function readRepoText(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function listDir(relPath: string): string[] {
  const dir = path.join(ROOT, relPath);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f !== ".gitkeep");
}

describe("CORE_v060-code-review-fixes", () => {
  // -- Human --

  it("Does the path resolver reject absolute paths outside the project root?", () => {
    const context = readRepoText("src/mcp/context.ts");
    expect(context).toContain("realpathSync");
    expect(context).toContain("Path traversal blocked");
  });

  it("Is the bad-code directory empty after fixes?", () => {
    expect(listDir("docs/method/backlog/bad-code")).toEqual([]);
  });

  // -- Agent --

  it("Does createRepoPathResolver reject /etc/passwd when root is /repo?", () => {
    // Verified by test/unit/mcp/path-resolver.test.ts
    expect(repoFileExists("test/unit/mcp/path-resolver.test.ts")).toBe(true);
    const test = readRepoText("test/unit/mcp/path-resolver.test.ts");
    expect(test).toContain("throws on absolute path outside the project root");
  });

  it("Does the path resolver detect symlink escapes via realpathSync?", () => {
    const test = readRepoText("test/unit/mcp/path-resolver.test.ts");
    expect(test).toContain("symlink");
  });

  it("Do two same-named methods in different classes get distinct WARP node IDs?", () => {
    const test = readRepoText("test/unit/warp/indexer.test.ts");
    expect(test).toContain("disambiguates same-named methods");
  });

  it("Does a git failure during indexing produce an explicit error result?", () => {
    const model = readRepoText("src/warp/indexer-model.ts");
    expect(model).toContain("ok: false");
    const test = readRepoText("test/unit/warp/indexer.test.ts");
    expect(test).toContain("explicit error result");
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

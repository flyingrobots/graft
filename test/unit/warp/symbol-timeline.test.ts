import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexCommits, type IndexResult } from "../../../src/warp/indexer.js";
import { symbolTimeline } from "../../../src/warp/symbol-timeline.js";
import type { WarpHandle } from "../../../src/ports/warp.js";

function assertOk(result: IndexResult): asserts result is IndexResult & { ok: true } {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("unreachable");
}

function commitSha(cwd: string, ref = "HEAD"): string {
  return git(cwd, `rev-parse ${ref}`);
}

describe("warp: symbol-timeline", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-symbol-timeline-");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  async function indexRepo(): Promise<WarpHandle> {
    const warp = await openWarp({ cwd: tmpDir });
    const result = await indexCommits(warp, { cwd: tmpDir, git: nodeGit });
    assertOk(result);
    return warp;
  }

  it("returns a single version for a newly added symbol", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "math.ts"),
      "export function add(a: number, b: number): number { return a + b; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add math'");
    const sha1 = commitSha(tmpDir);

    const warp = await indexRepo();
    const timeline = await symbolTimeline(warp, "add");

    expect(timeline.symbol).toBe("add");
    expect(timeline.versions.length).toBe(1);

    const v = timeline.versions[0]!;
    expect(v.sha).toBe(sha1);
    expect(v.changeKind).toBe("added");
    expect(v.present).toBe(true);
    expect(v.signature).toContain("add");
    expect(typeof v.startLine).toBe("number");
    expect(typeof v.endLine).toBe("number");
    expect(typeof v.tick).toBe("number");
  });

  it("tracks signature changes across commits in tick order", async () => {
    // Commit 1: original
    fs.writeFileSync(
      path.join(tmpDir, "greet.ts"),
      "export function greet(name: string): string { return name; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add greet'");
    const sha1 = commitSha(tmpDir);

    // Commit 2: change signature
    fs.writeFileSync(
      path.join(tmpDir, "greet.ts"),
      "export function greet(name: string, greeting: string): string { return `${greeting} ${name}`; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'change greet'");
    const sha2 = commitSha(tmpDir);

    const warp = await indexRepo();
    const timeline = await symbolTimeline(warp, "greet");

    expect(timeline.versions.length).toBe(2);

    // Must be in tick order (sha1 first, sha2 second)
    expect(timeline.versions[0]!.sha).toBe(sha1);
    expect(timeline.versions[0]!.changeKind).toBe("added");
    expect(timeline.versions[0]!.present).toBe(true);

    expect(timeline.versions[1]!.sha).toBe(sha2);
    expect(timeline.versions[1]!.changeKind).toBe("changed");
    expect(timeline.versions[1]!.present).toBe(true);

    // Signatures should differ
    expect(timeline.versions[0]!.signature).not.toBe(timeline.versions[1]!.signature);
  });

  it("marks removal with present: false", async () => {
    // Commit 1: add two functions
    fs.writeFileSync(
      path.join(tmpDir, "utils.ts"),
      "export function foo(): void {}\nexport function bar(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add utils'");

    // Commit 2: remove bar
    fs.writeFileSync(
      path.join(tmpDir, "utils.ts"),
      "export function foo(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'remove bar'");

    const warp = await indexRepo();
    const timeline = await symbolTimeline(warp, "bar");

    expect(timeline.versions.length).toBe(2);

    // First version: added
    expect(timeline.versions[0]!.changeKind).toBe("added");
    expect(timeline.versions[0]!.present).toBe(true);

    // Second version: removed
    expect(timeline.versions[1]!.changeKind).toBe("removed");
    expect(timeline.versions[1]!.present).toBe(false);
  });

  it("filters by filePath when provided", async () => {
    // Same symbol name in two files
    fs.writeFileSync(
      path.join(tmpDir, "a.ts"),
      "export function init(): void {}\n",
    );
    fs.writeFileSync(
      path.join(tmpDir, "b.ts"),
      "export function init(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add init in both files'");

    const warp = await indexRepo();

    // Without filter — both files contribute versions
    const allTimeline = await symbolTimeline(warp, "init");
    expect(allTimeline.versions.length).toBe(2);

    // With filter — only a.ts
    const filteredTimeline = await symbolTimeline(warp, "init", "a.ts");
    expect(filteredTimeline.versions.length).toBe(1);
    expect(filteredTimeline.filePath).toBe("a.ts");
  });

  it("captures line range shifts across commits", async () => {
    // Commit 1: function at top of file
    fs.writeFileSync(
      path.join(tmpDir, "shift.ts"),
      "export function target(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add target'");

    // Commit 2: add content above, shifting target down — signature changes too
    fs.writeFileSync(
      path.join(tmpDir, "shift.ts"),
      "export function preamble(): void {}\nexport function extra(): void {}\nexport function target(x: number): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add preamble and change target'");

    const warp = await indexRepo();
    const timeline = await symbolTimeline(warp, "target");

    expect(timeline.versions.length).toBe(2);

    const v1 = timeline.versions[0]!;
    const v2 = timeline.versions[1]!;

    // Line range should differ (target moved down)
    expect(v2.startLine).toBeGreaterThan(v1.startLine!);
  });

  it("returns empty versions for a symbol that never existed", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "dummy.ts"),
      "export function exists(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add dummy'");

    const warp = await indexRepo();
    const timeline = await symbolTimeline(warp, "nonexistent");

    expect(timeline.symbol).toBe("nonexistent");
    expect(timeline.versions).toEqual([]);
  });
});

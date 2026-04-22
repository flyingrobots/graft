import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { runMonitorTickJob, type MonitorTickWorkerJob } from "../../../src/mcp/monitor-tick-job.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";

const cleanups: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    await cleanups.pop()!();
  }
});

function makeJob(
  worktreeRoot: string,
  lastIndexedCommit: string | null,
): MonitorTickWorkerJob {
  return {
    repoId: "test-repo",
    worktreeRoot,
    writerId: "writer-test",
    lastIndexedCommit,
  };
}

describe("monitor tick ceiling: skip re-index when HEAD unchanged", () => {
  it("short-circuits before openWarp when lastIndexedCommit equals HEAD", { timeout: 15_000 }, async () => {
    // Create a real repo just to get a valid HEAD sha, then destroy it.
    // Use a non-existent worktree path — if the short-circuit works,
    // readHeadCommit returns the sha via git (which will fail on a
    // non-existent path). Instead, we use a real repo but verify the
    // short-circuit by checking that no WARP artifacts are created.
    const repoDir = createTestRepo("graft-tick-ceiling-");
    cleanups.push(() => { cleanupTestRepo(repoDir); });

    fs.writeFileSync(path.join(repoDir, "app.ts"), "export const x = 1;\n");
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");
    const headSha = git(repoDir, "rev-parse HEAD");

    // Ensure no WARP refs exist before the tick
    const refsBeforeTick = git(repoDir, "for-each-ref refs/graft-ast");

    const result = await runMonitorTickJob(makeJob(repoDir, headSha));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(`expected ok, got error: ${result.error}`);
    expect(result.commitsIndexed).toBe(0);
    expect(result.patchesWritten).toBe(0);
    expect(result.lastIndexedCommit).toBe(headSha);
    expect(result.headAtStart).toBe(headSha);
    expect(result.currentHead).toBe(headSha);
    expect(result.backlogCommits).toBe(0);

    // Verify no WARP refs were created — proves openWarp was never called
    const refsAfterTick = git(repoDir, "for-each-ref refs/graft-ast");
    expect(refsAfterTick).toBe(refsBeforeTick);
  });

  it("indexes when HEAD has advanced past lastIndexedCommit", { timeout: 15_000 }, async () => {
    const repoDir = createTestRepo("graft-tick-ceiling-");
    cleanups.push(() => { cleanupTestRepo(repoDir); });

    fs.writeFileSync(path.join(repoDir, "app.ts"), "export const x = 1;\n");
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");
    const firstSha = git(repoDir, "rev-parse HEAD");

    // First tick: index the first commit
    const first = await runMonitorTickJob(makeJob(repoDir, null));
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error("unreachable");

    // Add a second commit
    fs.writeFileSync(path.join(repoDir, "b.ts"), "export const y = 2;\n");
    git(repoDir, "add -A");
    git(repoDir, "commit -m second");
    const secondSha = git(repoDir, "rev-parse HEAD");

    // Second tick: HEAD has moved, should index new commits
    const second = await runMonitorTickJob(makeJob(repoDir, firstSha));
    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error("unreachable");
    expect(second.commitsIndexed).toBeGreaterThan(0);
    expect(second.lastIndexedCommit).toBe(secondSha);
  });

  it("indexes when lastIndexedCommit is null (first run)", { timeout: 15_000 }, async () => {
    const repoDir = createTestRepo("graft-tick-ceiling-");
    cleanups.push(() => { cleanupTestRepo(repoDir); });

    fs.writeFileSync(path.join(repoDir, "app.ts"), "export const x = 1;\n");
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");

    const result = await runMonitorTickJob(makeJob(repoDir, null));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.commitsIndexed).toBeGreaterThan(0);
  });

  it("returns correct fields on skipped tick", { timeout: 15_000 }, async () => {
    const repoDir = createTestRepo("graft-tick-ceiling-");
    cleanups.push(() => { cleanupTestRepo(repoDir); });

    fs.writeFileSync(path.join(repoDir, "app.ts"), "export const x = 1;\n");
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");
    const headSha = git(repoDir, "rev-parse HEAD");

    const result = await runMonitorTickJob(makeJob(repoDir, headSha));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(`expected ok, got error: ${result.error}`);

    // All result fields must be present and correct
    expect(result).toStrictEqual({
      ok: true,
      headAtStart: headSha,
      currentHead: headSha,
      lastIndexedCommit: headSha,
      backlogCommits: 0,
      commitsIndexed: 0,
      patchesWritten: 0,
    });
  });

  it("handles empty repo (no HEAD) with null lastIndexedCommit", { timeout: 15_000 }, async () => {
    const repoDir = createTestRepo("graft-tick-ceiling-");
    cleanups.push(() => { cleanupTestRepo(repoDir); });

    // Empty repo — no commits, HEAD doesn't resolve.
    // Both headAtStart and lastIndexedCommit are null → short-circuit.
    const result = await runMonitorTickJob(makeJob(repoDir, null));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(`expected ok, got error: ${result.error}`);
    expect(result.headAtStart).toBeNull();
    expect(result.currentHead).toBeNull();
    expect(result.commitsIndexed).toBe(0);
    expect(result.patchesWritten).toBe(0);
    expect(result.backlogCommits).toBe(0);
  });
});

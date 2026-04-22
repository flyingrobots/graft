import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import { runMonitorTickJob, type MonitorTickWorkerJob } from "../../../src/mcp/monitor-tick-job.js";
import { cleanupTestRepo, createCommittedTestRepo, createTestRepo, git } from "../../helpers/git.js";

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

function committedRepo(): string {
  const dir = createCommittedTestRepo("graft-ceiling-");
  cleanups.push(() => cleanupTestRepo(dir));
  return dir;
}

function emptyRepo(): string {
  const dir = createTestRepo("graft-ceiling-empty-");
  cleanups.push(() => cleanupTestRepo(dir));
  return dir;
}

function headSha(cwd: string): string {
  return git(cwd, "rev-parse HEAD");
}

function makeJob(cwd: string, lastIndexedCommit: string | null): MonitorTickWorkerJob {
  return {
    repoId: "test",
    worktreeRoot: cwd,
    writerId: "test-writer",
    lastIndexedCommit,
  };
}

describe("monitor tick ceiling tracking", () => {
  it("skips indexing when HEAD matches lastIndexedCommit", async () => {
    const dir = committedRepo();
    const sha = headSha(dir);

    const result = await runMonitorTickJob(makeJob(dir, sha));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.commitsIndexed).toBe(0);
    expect(result.patchesWritten).toBe(0);
    expect(result.lastIndexedCommit).toBe(sha);
  });

  it("indexes when HEAD differs from lastIndexedCommit", async () => {
    const dir = committedRepo();

    const result = await runMonitorTickJob(makeJob(dir, "0000000000000000000000000000000000000000"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.commitsIndexed).toBeGreaterThan(0);
  });

  it("indexes on first run when lastIndexedCommit is null", async () => {
    const dir = committedRepo();

    const result = await runMonitorTickJob(makeJob(dir, null));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.commitsIndexed).toBeGreaterThan(0);
  });

  it("consecutive ticks with same HEAD: second tick skips", async () => {
    const dir = committedRepo();
    const sha = headSha(dir);

    // First tick — full index
    const first = await runMonitorTickJob(makeJob(dir, null));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.commitsIndexed).toBeGreaterThan(0);

    // Second tick — same HEAD, should skip
    const second = await runMonitorTickJob(makeJob(dir, sha));
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.commitsIndexed).toBe(0);
    expect(second.patchesWritten).toBe(0);
  });

  it("skips on empty repo when both HEAD and lastIndexedCommit are null", async () => {
    const dir = emptyRepo();

    const result = await runMonitorTickJob(makeJob(dir, null));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.commitsIndexed).toBe(0);
    expect(result.patchesWritten).toBe(0);
  });
});

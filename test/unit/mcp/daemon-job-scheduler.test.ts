import { describe, expect, it } from "vitest";
import { DaemonJobScheduler } from "../../../src/mcp/daemon-job-scheduler.js";

function deferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
}

describe("mcp: daemon job scheduler", () => {
  it("tracks queued and completed interactive jobs", async () => {
    const scheduler = new DaemonJobScheduler({ maxConcurrentJobs: 1 });
    const repoA = deferredPromise<string>();

    const running = scheduler.enqueue({
      sessionId: "session-a",
      sliceId: "slice-a",
      repoId: "repo-a",
      worktreeId: "worktree-a",
      tool: "safe_read",
      kind: "repo_tool",
      priority: "interactive",
      writerId: "graft_session_a",
    }, () => repoA.promise);

    const queued = scheduler.enqueue({
      sessionId: "session-b",
      sliceId: "slice-b",
      repoId: "repo-b",
      worktreeId: "worktree-b",
      tool: "code_find",
      kind: "repo_tool",
      priority: "interactive",
      writerId: "graft_session_b",
    }, () => Promise.resolve("done"));

    const queuedSnapshot = scheduler.getCounts();
    expect(queuedSnapshot.activeJobs).toBe(1);
    expect(queuedSnapshot.queuedJobs).toBe(1);
    expect(queuedSnapshot.interactiveQueuedJobs).toBe(1);
    expect(queuedSnapshot.completedJobs).toBe(0);

    repoA.resolve("alpha");
    await expect(running).resolves.toBe("alpha");
    await expect(queued).resolves.toBe("done");

    const finalSnapshot = scheduler.getCounts();
    expect(finalSnapshot.activeJobs).toBe(0);
    expect(finalSnapshot.queuedJobs).toBe(0);
    expect(finalSnapshot.completedJobs).toBe(2);
    expect(finalSnapshot.failedJobs).toBe(0);
  });

  it("serializes work on the same writer lane", () => {
    const scheduler = new DaemonJobScheduler({ maxConcurrentJobs: 2 });
    const repoAFirst = deferredPromise<string>();

    void scheduler.enqueue({
      sessionId: "session-a1",
      sliceId: "slice-a1",
      repoId: "repo-a",
      worktreeId: "worktree-a",
      tool: "safe_read",
      kind: "repo_tool",
      priority: "interactive",
      writerId: "graft_session_shared",
    }, () => repoAFirst.promise);

    void scheduler.enqueue({
      sessionId: "session-a2",
      sliceId: "slice-a2",
      repoId: "repo-a",
      worktreeId: "worktree-a",
      tool: "code_find",
      kind: "repo_tool",
      priority: "interactive",
      writerId: "graft_session_shared",
    }, () => Promise.resolve("queued-behind-repo-a"));

    const jobs = scheduler.listJobs();
    expect(jobs.filter((job) => job.state === "running")).toEqual([
      expect.objectContaining({ repoId: "repo-a", tool: "safe_read", writerId: "graft_session_shared" }),
    ]);
    expect(jobs.filter((job) => job.state === "queued")).toEqual([
      expect.objectContaining({ repoId: "repo-a", tool: "code_find", writerId: "graft_session_shared" }),
    ]);

    repoAFirst.resolve("done-a");
  });

  it("allows different writer lanes for the same repo to run concurrently", () => {
    const scheduler = new DaemonJobScheduler({ maxConcurrentJobs: 2 });
    const writerA = deferredPromise<string>();
    const writerB = deferredPromise<string>();

    void scheduler.enqueue({
      sessionId: "session-a1",
      sliceId: "slice-a1",
      repoId: "repo-a",
      worktreeId: "worktree-a",
      tool: "safe_read",
      kind: "repo_tool",
      priority: "interactive",
      writerId: "graft_session_a",
    }, () => writerA.promise);

    void scheduler.enqueue({
      sessionId: "session-a2",
      sliceId: "slice-a2",
      repoId: "repo-a",
      worktreeId: "worktree-a",
      tool: "graft_map",
      kind: "repo_tool",
      priority: "interactive",
      writerId: "graft_session_b",
    }, () => writerB.promise);

    const jobs = scheduler.listJobs();
    expect(jobs.filter((job) => job.state === "running")).toEqual(expect.arrayContaining([
      expect.objectContaining({ repoId: "repo-a", tool: "safe_read", writerId: "graft_session_a" }),
      expect.objectContaining({ repoId: "repo-a", tool: "graft_map", writerId: "graft_session_b" }),
    ]));
    expect(scheduler.getCounts()).toEqual(expect.objectContaining({
      activeJobs: 2,
      activeWriterLanes: 2,
      queuedJobs: 0,
    }));

    writerA.resolve("done-a");
    writerB.resolve("done-b");
  });
});

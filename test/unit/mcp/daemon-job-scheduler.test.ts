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
  it("Can one hot repo or one slow request no longer starve unrelated daemon sessions by default?", () => {
    const scheduler = new DaemonJobScheduler();
    const slowA = deferredPromise<string>();
    const slowB = deferredPromise<string>();

    void scheduler.enqueue({
      sessionId: "session-a",
      sliceId: "slice-a",
      repoId: "repo-a",
      worktreeId: "worktree-a",
      tool: "safe_read",
      kind: "repo_tool",
      priority: "interactive",
      writerId: "graft_session_a",
    }, () => slowA.promise);

    void scheduler.enqueue({
      sessionId: "session-b",
      sliceId: "slice-b",
      repoId: "repo-b",
      worktreeId: "worktree-b",
      tool: "code_find",
      kind: "repo_tool",
      priority: "interactive",
      writerId: "graft_session_b",
    }, () => slowB.promise);

    const jobs = scheduler.listJobs();
    expect(scheduler.getCounts()).toEqual(expect.objectContaining({
      maxConcurrentJobs: 2,
      activeJobs: 2,
      queuedJobs: 0,
    }));
    expect(jobs.filter((job) => job.state === "running")).toEqual(expect.arrayContaining([
      expect.objectContaining({ sessionId: "session-a", repoId: "repo-a" }),
      expect.objectContaining({ sessionId: "session-b", repoId: "repo-b" }),
    ]));

    slowA.resolve("done-a");
    slowB.resolve("done-b");
  });

  it("Is the scheduling model explicit about what is fair per repo, per session, and per worker kind?", async () => {
    const scheduler = new DaemonJobScheduler({ maxConcurrentJobs: 1 });
    const interactive = deferredPromise<string>();

    const running = scheduler.enqueue({
      sessionId: "session-a",
      sliceId: "slice-a",
      repoId: "repo-a",
      worktreeId: "worktree-a",
      tool: "safe_read",
      kind: "repo_tool",
      priority: "interactive",
      writerId: "graft_session_a",
    }, () => interactive.promise);

    const queued = scheduler.enqueue({
      sessionId: null,
      sliceId: null,
      repoId: "repo-b",
      worktreeId: "worktree-b",
      tool: "monitor_start",
      kind: "persistent_monitor",
      priority: "background",
      writerId: "graft_monitor_b",
    }, () => Promise.resolve("done"));

    expect(scheduler.listJobs()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sessionId: "session-a",
        repoId: "repo-a",
        kind: "repo_tool",
        priority: "interactive",
        writerId: "graft_session_a",
        state: "running",
      }),
      expect.objectContaining({
        sessionId: null,
        repoId: "repo-b",
        kind: "persistent_monitor",
        priority: "background",
        writerId: "graft_monitor_b",
        state: "queued",
      }),
    ]));
    expect(scheduler.getCounts()).toEqual(expect.objectContaining({
      activeJobs: 1,
      queuedJobs: 1,
      interactiveQueuedJobs: 0,
      backgroundQueuedJobs: 1,
      activeWriterLanes: 1,
      queuedWriterLanes: 1,
    }));

    interactive.resolve("alpha");
    await expect(running).resolves.toBe("alpha");
    await expect(queued).resolves.toBe("done");

    expect(scheduler.getCounts()).toEqual(expect.objectContaining({
      activeJobs: 0,
      queuedJobs: 0,
      completedJobs: 2,
      failedJobs: 0,
    }));
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

  it("Are WARP writes modeled as logical writer lanes instead of a single hard-coded writer or executor-derived writer IDs?", () => {
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

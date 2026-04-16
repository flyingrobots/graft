import { describe, expect, it } from "vitest";
import { DaemonJobScheduler } from "../../src/mcp/daemon-job-scheduler.js";
import {
  DEFAULT_WARP_WRITER_ID,
  buildMonitorWarpWriterId,
  buildSessionWarpWriterId,
} from "../../src/warp/writer-id.js";

function deferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
}

describe("0089 logical warp writer lanes", () => {
  it("Do session and monitor work get distinct, stable logical WARP writer lanes instead of sharing one ambient writer identity?", () => {
    expect(DEFAULT_WARP_WRITER_ID).toBe("graft");

    const sessionLane = buildSessionWarpWriterId("session-123");
    const sameSessionLane = buildSessionWarpWriterId("session-123");
    const monitorLane = buildMonitorWarpWriterId("repo:abc123");

    expect(sessionLane).toBe(sameSessionLane);
    expect(sessionLane).toMatch(/^graft_session_[a-f0-9]{12}$/);
    expect(monitorLane).toMatch(/^graft_monitor_[a-f0-9]{12}$/);
    expect(sessionLane).not.toBe(DEFAULT_WARP_WRITER_ID);
    expect(monitorLane).not.toBe(DEFAULT_WARP_WRITER_ID);
    expect(sessionLane).not.toBe(monitorLane);
  });

  it("Can the daemon scheduler serialize same-lane work while allowing different logical lanes in the same repo to run concurrently?", () => {
    const scheduler = new DaemonJobScheduler({ maxConcurrentJobs: 2 });
    const sameLane = deferredPromise<string>();
    const differentLane = deferredPromise<string>();

    void scheduler.enqueue({
      sessionId: "session-a",
      sliceId: "slice-a",
      repoId: "repo-a",
      worktreeId: "worktree-a",
      tool: "safe_read",
      kind: "repo_tool",
      priority: "interactive",
      writerId: buildSessionWarpWriterId("session-a"),
    }, () => sameLane.promise);

    void scheduler.enqueue({
      sessionId: "session-a",
      sliceId: "slice-a-followup",
      repoId: "repo-a",
      worktreeId: "worktree-a",
      tool: "code_find",
      kind: "repo_tool",
      priority: "interactive",
      writerId: buildSessionWarpWriterId("session-a"),
    }, () => Promise.resolve("queued behind same lane"));

    void scheduler.enqueue({
      sessionId: null,
      sliceId: null,
      repoId: "repo-a",
      worktreeId: "worktree-a",
      tool: "monitor_tick",
      kind: "persistent_monitor",
      priority: "background",
      writerId: buildMonitorWarpWriterId("repo-a"),
    }, () => differentLane.promise);

    const jobs = scheduler.listJobs();
    expect(jobs.filter((job) => job.state === "running")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tool: "safe_read", writerId: buildSessionWarpWriterId("session-a") }),
        expect.objectContaining({ tool: "monitor_tick", writerId: buildMonitorWarpWriterId("repo-a") }),
      ]),
    );
    expect(jobs.filter((job) => job.state === "queued")).toEqual([
      expect.objectContaining({ tool: "code_find", writerId: buildSessionWarpWriterId("session-a") }),
    ]);

    sameLane.resolve("done-session");
    differentLane.resolve("done-monitor");
  });

  it("Is monitor indexing tied to a repo-scoped monitor lane instead of to whichever worker happened to run the tick?", () => {
    expect(buildMonitorWarpWriterId("repo-a")).toBe(buildMonitorWarpWriterId("repo-a"));
    expect(buildMonitorWarpWriterId("repo-a")).not.toBe(buildMonitorWarpWriterId("repo-b"));
  });
});

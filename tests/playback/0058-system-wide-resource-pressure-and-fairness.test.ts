import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { CanonicalJsonCodec } from "../../src/adapters/canonical-json.js";
import { nodeGit } from "../../src/adapters/node-git.js";
import { DaemonJobScheduler } from "../../src/mcp/daemon-job-scheduler.js";
import { ChildProcessDaemonWorkerPool } from "../../src/mcp/daemon-worker-pool.js";
import { Metrics } from "../../src/mcp/metrics.js";
import { DEFAULT_DAEMON_CAPABILITY_PROFILE } from "../../src/mcp/workspace-router.js";
import { fileOutline } from "../../src/operations/file-outline.js";
import { safeRead } from "../../src/operations/safe-read.js";
import type { FileSystem } from "../../src/ports/filesystem.js";
import { SessionTracker } from "../../src/session/tracker.js";
import { buildMonitorWarpWriterId, buildSessionWarpWriterId } from "../../src/warp/writer-id.js";
import { cleanupTestRepo, createTestRepo, git } from "../../test/helpers/git.js";
import { createIsolatedServer, parse } from "../../test/helpers/mcp.js";

function deferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
}

class AsyncOnlyFileSystem implements FileSystem {
  constructor(private readonly files: Readonly<Record<string, string>>) {}

  readFile(path: string, encoding: "utf-8"): Promise<string>;
  readFile(path: string): Promise<Buffer>;
  async readFile(path: string, encoding?: "utf-8"): Promise<string | Buffer> {
    const content = this.files[path];
    if (content === undefined) throw new Error("not found");
    await Promise.resolve();
    return encoding === "utf-8" ? content : Buffer.from(content, "utf-8");
  }

  async writeFile(): Promise<void> {
    await Promise.resolve();
    throw new Error("unused");
  }

  async appendFile(): Promise<void> {
    await Promise.resolve();
    throw new Error("unused");
  }

  async mkdir(): Promise<void> {
    await Promise.resolve();
    throw new Error("unused");
  }

  async stat(path: string): Promise<{ size: number }> {
    const content = this.files[path];
    if (content === undefined) throw new Error("not found");
    await Promise.resolve();
    return { size: Buffer.byteLength(content, "utf-8") };
  }

  readFileSync(): string {
    throw new Error("readFileSync should not be used on async request paths");
  }
}

const cleanups: (() => Promise<void> | void)[] = [];
const codec = new CanonicalJsonCodec();

afterEach(async () => {
  while (cleanups.length > 0) {
    await cleanups.pop()!();
  }
});

describe("0058 playback: system-wide resource pressure and fairness", () => {
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

    expect(scheduler.getCounts()).toEqual(expect.objectContaining({
      maxConcurrentJobs: 2,
      activeJobs: 2,
      queuedJobs: 0,
    }));
    expect(scheduler.listJobs()).toEqual(expect.arrayContaining([
      expect.objectContaining({ sessionId: "session-a", repoId: "repo-a", state: "running" }),
      expect.objectContaining({ sessionId: "session-b", repoId: "repo-b", state: "running" }),
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
        state: "running",
      }),
      expect.objectContaining({
        sessionId: null,
        repoId: "repo-b",
        kind: "persistent_monitor",
        priority: "background",
        state: "queued",
      }),
    ]));
    expect(scheduler.getCounts()).toEqual(expect.objectContaining({
      activeWriterLanes: 1,
      queuedWriterLanes: 1,
      backgroundQueuedJobs: 1,
    }));

    interactive.resolve("alpha");
    await expect(running).resolves.toBe("alpha");
    await expect(queued).resolves.toBe("done");
  });

  it("Are WARP writer identities stable and meaningful, rather than tied to incidental worker-process IDs?", () => {
    expect(buildSessionWarpWriterId("session-123")).toBe(buildSessionWarpWriterId("session-123"));
    expect(buildSessionWarpWriterId("session-123")).not.toBe(buildSessionWarpWriterId("session-456"));
    expect(buildMonitorWarpWriterId("repo:abc123")).toMatch(/^graft_monitor_[a-f0-9]{12}$/);
  });

  it("Is `GitClient` async and backed by `@git-stunts/plumbing` instead of synchronous shell execution?", async () => {
    const repoDir = createTestRepo("graft-playback-node-git-");
    cleanups.push(() => {
      cleanupTestRepo(repoDir);
    });
    fs.writeFileSync(path.join(repoDir, "app.ts"), "export const ready = true;\n");
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");

    const resultPromise = nodeGit.run({
      cwd: repoDir,
      args: ["rev-parse", "HEAD"],
    });

    expect(resultPromise).toBeInstanceOf(Promise);
    const result = await resultPromise;
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toMatch(/^[0-9a-f]{40}$/);
  });

  it("Is the filesystem posture async on daemon-heavy request paths, with remaining sync reads treated as deliberate debt rather than default behavior?", async () => {
    const filePath = "/virtual/app.ts";
    const content = [
      "export function greet(name: string): string {",
      "  return `hello ${name}`;",
      "}",
      "",
    ].join("\n");
    const asyncFs = new AsyncOnlyFileSystem({ [filePath]: content });
    const syncRead = vi.fn(() => {
      throw new Error("readFileSync should not be used on async request paths");
    });
    asyncFs.readFileSync = syncRead;

    const safeReadResult = await safeRead(filePath, { fs: asyncFs, codec });
    const fileOutlineResult = await fileOutline(filePath, { fs: asyncFs });

    expect(safeReadResult.projection).toBe("content");
    expect(fileOutlineResult.outline).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "function", name: "greet" }),
    ]));
    expect(syncRead).not.toHaveBeenCalled();
  });

  it("Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas?", async () => {
    const repoDir = createTestRepo("graft-playback-worker-");
    cleanups.push(() => {
      cleanupTestRepo(repoDir);
    });
    fs.writeFileSync(path.join(repoDir, "app.ts"), [
      "export function greet(name: string): string {",
      "  return `hello ${name}`;",
      "}",
      "",
    ].join("\n"));
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");

    const pool = new ChildProcessDaemonWorkerPool({ size: 1 });
    cleanups.push(async () => {
      await pool.close();
    });

    const sessionSnapshot = new SessionTracker().snapshot();
    const metricsSnapshot = new Metrics().snapshot();
    const sessionSnapshotBefore = structuredClone(sessionSnapshot);
    const metricsSnapshotBefore = structuredClone(metricsSnapshot);

    const result = await pool.runRepoTool({
      sessionId: "session:test",
      workspaceSliceId: "slice:test",
      traceId: "trace:test",
      seq: 1,
      startedAtMs: Date.now(),
      tool: "safe_read",
      args: { path: "app.ts" },
      projectRoot: repoDir,
      graftDir: path.join(repoDir, ".graft"),
      graftignorePatterns: [],
      repoId: "repo:test",
      worktreeId: "worktree:test",
      gitCommonDir: path.join(repoDir, ".git"),
      writerId: buildSessionWarpWriterId("session:test"),
      capabilityProfile: DEFAULT_DAEMON_CAPABILITY_PROFILE,
      repoState: {
        checkoutEpoch: 1,
        headRef: "main",
        headSha: git(repoDir, "rev-parse HEAD").trim(),
        dirty: false,
        observedAt: "2026-04-09T00:00:00.000Z",
        lastTransition: null,
        workspaceOverlayId: null,
        workspaceOverlay: null,
        statusLines: [],
      },
      sessionSnapshot,
      metricsSnapshot,
    });

    expect(result.cacheUpdates).toHaveLength(1);
    expect(result.cacheUpdates[0]?.observation).not.toBeNull();
    expect(sessionSnapshot).toEqual(sessionSnapshotBefore);
    expect(metricsSnapshot).toEqual(metricsSnapshotBefore);
  });

  it("Are WARP writes modeled as logical writer lanes instead of a single hard-coded writer or executor-derived writer IDs?", () => {
    const scheduler = new DaemonJobScheduler({ maxConcurrentJobs: 2 });
    const writerA = deferredPromise<string>();
    const writerB = deferredPromise<string>();

    void scheduler.enqueue({
      sessionId: "session-a",
      sliceId: "slice-a",
      repoId: "repo-a",
      worktreeId: "worktree-a",
      tool: "safe_read",
      kind: "repo_tool",
      priority: "interactive",
      writerId: buildSessionWarpWriterId("session-a"),
    }, () => writerA.promise);

    void scheduler.enqueue({
      sessionId: "session-b",
      sliceId: "slice-b",
      repoId: "repo-a",
      worktreeId: "worktree-a",
      tool: "graft_map",
      kind: "repo_tool",
      priority: "interactive",
      writerId: buildSessionWarpWriterId("session-b"),
    }, () => writerB.promise);

    expect(scheduler.getCounts()).toEqual(expect.objectContaining({
      activeJobs: 2,
      activeWriterLanes: 2,
    }));

    writerA.resolve("done-a");
    writerB.resolve("done-b");
  });

  it("Do background monitors run through the same pressure and fairness scheduler as foreground repo work?", async () => {
    const repoDir = createTestRepo("graft-playback-monitor-");
    cleanups.push(() => {
      cleanupTestRepo(repoDir);
    });
    fs.writeFileSync(path.join(repoDir, "app.ts"), "export const ready = true;\n");
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");

    const isolated = createIsolatedServer({ mode: "daemon" });
    cleanups.push(() => {
      isolated.cleanup();
    });
    const server = isolated.server;

    await server.callTool("workspace_authorize", { cwd: repoDir });
    await server.callTool("workspace_bind", { cwd: repoDir });
    await server.callTool("safe_read", { path: "app.ts" });
    const afterForeground = parse(await server.callTool("daemon_status", {}));
    expect(afterForeground["scheduler"]).toEqual(expect.objectContaining({
      completedJobs: 1,
      backgroundQueuedJobs: 0,
    }));

    const start = parse(await server.callTool("monitor_start", {
      cwd: repoDir,
      pollIntervalMs: 60_000,
    }));
    expect(start["ok"]).toBe(true);

    const afterMonitor = parse(await server.callTool("daemon_status", {}));
    expect(afterMonitor["scheduler"]).toEqual(expect.objectContaining({
      completedJobs: 2,
      backgroundQueuedJobs: 0,
      activeJobs: 0,
    }));
  });
});

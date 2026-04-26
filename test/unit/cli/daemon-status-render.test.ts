import { describe, expect, it } from "vitest";
import { renderDaemonStatus } from "../../../src/cli/daemon-status-render.js";
import type { DaemonStatusModel } from "../../../src/cli/daemon-status-model.js";

const model: DaemonStatusModel = {
  command: "daemon_status",
  cwd: "/repo",
  daemon: {
    health: "degraded",
    transport: "unix_socket",
    socketPath: "/tmp/graft.sock",
    mcpPath: "/mcp",
    healthPath: "/healthz",
    startedAt: "2026-04-26T12:00:00.000Z",
    sameUserOnly: true,
    activeWarpRepos: 2,
  },
  sessions: {
    total: 3,
    bound: 2,
    unbound: 1,
    listed: 3,
  },
  workspaces: {
    authorized: 2,
    authorizedRepos: 1,
    bound: 1,
    current: {
      cwd: "/repo",
      authorization: "authorized",
      bindState: "unbound",
      repoId: "repo:1",
      worktreeRoot: "/repo",
      activeSessions: 2,
    },
  },
  monitors: {
    total: 2,
    running: 1,
    paused: 0,
    stopped: 0,
    failing: 1,
    backlog: 1,
    listed: 2,
  },
  scheduler: {
    maxConcurrentJobs: 2,
    activeJobs: 2,
    queuedJobs: 1,
    interactiveQueuedJobs: 1,
    backgroundQueuedJobs: 0,
    longestQueuedWaitMs: 25,
    pressure: "queued",
  },
  workers: {
    mode: "child_processes",
    totalWorkers: 2,
    busyWorkers: 2,
    idleWorkers: 0,
    queuedTasks: 1,
    pressure: "saturated",
  },
  degraded: ["failing_monitors", "monitor_backlog", "scheduler_queue", "worker_queue"],
};

describe("daemon status renderer", () => {
  it("renderDaemonStatus is deterministic without a live terminal", () => {
    const rendered = renderDaemonStatus(model);

    expect(rendered).toContain("Daemon Status");
    expect(rendered).toContain("health: degraded");
    expect(rendered).toContain("socket: /tmp/graft.sock");
    expect(rendered).toContain("sessions");
    expect(rendered).toContain("workspaces");
    expect(rendered).toContain("monitors");
    expect(rendered).toContain("scheduler");
    expect(rendered).toContain("workers");
    expect(rendered).toContain("degraded: failing_monitors, monitor_backlog, scheduler_queue, worker_queue");
  });

  it("daemon status renders read-only output without daemon action affordances", () => {
    const rendered = renderDaemonStatus(model);

    expect(rendered).not.toContain("authorize workspace");
    expect(rendered).not.toContain("revoke workspace");
    expect(rendered).not.toContain("bind workspace");
    expect(rendered).not.toContain("rebind workspace");
    expect(rendered).not.toContain("pause monitor");
    expect(rendered).not.toContain("resume monitor");
    expect(rendered).not.toContain("start monitor");
    expect(rendered).not.toContain("stop monitor");
  });
});

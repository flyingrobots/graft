import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { buildDaemonStatusModel, type DaemonStatusModel, type DaemonStatusReadSnapshot } from "../../src/cli/daemon-status-model.js";
import { renderDaemonStatus } from "../../src/cli/daemon-status-render.js";
import { runCli } from "../../src/cli/main.js";
import { createBufferWriter } from "../../test/helpers/init.js";

const CLI_DOC = path.resolve(import.meta.dirname, "../../docs/CLI.md");

function read(pathname: string): string {
  return fs.readFileSync(pathname, "utf-8");
}

function snapshot(): DaemonStatusReadSnapshot {
  return {
    status: {
      ok: true,
      sessionMode: "daemon",
      transport: "unix_socket",
      sameUserOnly: true,
      socketPath: "/tmp/graft.sock",
      mcpPath: "/mcp",
      healthPath: "/healthz",
      activeSessions: 1,
      boundSessions: 0,
      unboundSessions: 1,
      activeWarpRepos: 0,
      authorizedWorkspaces: 0,
      authorizedRepos: 0,
      workspaceBindRequiresAuthorization: true,
      defaultCapabilityProfile: {
        boundedReads: true,
        structuralTools: true,
        precisionTools: true,
        stateBookmarks: true,
        runtimeLogs: "session_local_only",
        runCapture: false,
      },
      totalMonitors: 0,
      runningMonitors: 0,
      pausedMonitors: 0,
      stoppedMonitors: 0,
      failingMonitors: 0,
      backlogMonitors: 0,
      scheduler: {
        maxConcurrentJobs: 2,
        activeJobs: 0,
        queuedJobs: 0,
        interactiveQueuedJobs: 0,
        backgroundQueuedJobs: 0,
        activeWriterLanes: 0,
        queuedWriterLanes: 0,
        completedJobs: 0,
        failedJobs: 0,
        longestQueuedWaitMs: 0,
      },
      workers: {
        mode: "child_processes",
        totalWorkers: 4,
        busyWorkers: 0,
        idleWorkers: 4,
        queuedTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
      },
      startedAt: "2026-04-26T12:00:00.000Z",
    },
    sessions: { sessions: [] },
    currentRepo: { repos: [], filter: { cwd: "/repo" } },
    monitors: { monitors: [] },
    workspaceStatus: {
      sessionMode: "daemon",
      bindState: "unbound",
      repoId: null,
      worktreeId: null,
      worktreeRoot: null,
      gitCommonDir: null,
      graftDir: null,
      capabilityProfile: null,
    },
    authorizations: { workspaces: [] },
  };
}

function model(): DaemonStatusModel {
  return buildDaemonStatusModel({
    cwd: "/repo",
    snapshot: snapshot(),
  });
}

describe("SURFACE_bijou-daemon-status-first-slice playback", () => {
  it("lets an operator run graft daemon status --socket and see daemon health sessions workspace posture monitors scheduler pressure and worker pressure without raw JSON", () => {
    const cliDoc = read(CLI_DOC);

    expect(cliDoc).toContain("graft daemon status --socket");
    expect(cliDoc).toContain("daemon health");
    expect(cliDoc).toContain("sessions");
    expect(cliDoc).toContain("workspace posture");
    expect(cliDoc).toContain("monitors");
    expect(cliDoc).toContain("scheduler pressure");
    expect(cliDoc).toContain("worker pressure");
  });

  it("daemon status renders read-only output without daemon action affordances", () => {
    const rendered = renderDaemonStatus(model());

    expect(rendered).toContain("Daemon Status");
    expect(rendered).not.toContain("authorize workspace");
    expect(rendered).not.toContain("revoke workspace");
    expect(rendered).not.toContain("bind workspace");
    expect(rendered).not.toContain("rebind workspace");
    expect(rendered).not.toContain("pause monitor");
    expect(rendered).not.toContain("resume monitor");
    expect(rendered).not.toContain("start monitor");
    expect(rendered).not.toContain("stop monitor");
  });

  it("buildDaemonStatusModel normalizes daemon read truth before rendering", () => {
    const status = model();

    expect(status.command).toBe("daemon_status");
    expect(status.daemon.socketPath).toBe("/tmp/graft.sock");
    expect(status.sessions).toMatchObject({ total: 1, bound: 0, unbound: 1 });
    expect(status.workspaces.current).toMatchObject({
      authorization: "not_authorized",
      bindState: "unbound",
    });
  });

  it("renderDaemonStatus is deterministic without a live terminal", () => {
    const status = model();

    expect(renderDaemonStatus(status)).toBe(renderDaemonStatus(status));
    expect(renderDaemonStatus(status)).toContain("Surface");
    expect(renderDaemonStatus(status)).toContain("State");
  });

  it("graft daemon status fails clearly when no daemon is listening", async () => {
    const stdout = createBufferWriter();
    const stderr = createBufferWriter();

    await runCli({
      cwd: "/repo",
      args: ["daemon", "status"],
      stdout,
      stderr,
      readDaemonStatus: () => Promise.reject(new Error("No graft daemon is listening on /tmp/graft.sock")),
    });

    expect(stdout.text()).toBe("");
    expect(stderr.text()).toContain("No graft daemon is listening");
    expect(stderr.text()).toContain("Usage: graft daemon status [--socket <path>]");
  });
});

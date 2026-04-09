import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { resolveEntrypointArgs, runCli } from "../../../src/cli/main.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";

interface Writer {
  text(): string;
  write(chunk: string): true;
}

function createBufferWriter(): Writer {
  let buffer = "";
  return {
    write(chunk: string): true {
      buffer += chunk;
      return true;
    },
    text(): string {
      return buffer;
    },
  };
}

describe("cli: graft grouped surface", () => {
  let previousExitCode: typeof process.exitCode;

  beforeEach(() => {
    previousExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = previousExitCode;
  });

  it("renders grouped help", async () => {
    const stdout = createBufferWriter();
    const stderr = createBufferWriter();

    await runCli({
      args: ["help"],
      stdout,
      stderr,
    });

    expect(stderr.text()).toBe("");
    expect(stdout.text()).toContain("read safe");
    expect(stdout.text()).toContain("struct diff");
    expect(stdout.text()).toContain("diag doctor");
  });

  it("renders help on no-arg interactive CLI runs", async () => {
    const stdout = createBufferWriter();
    const stderr = createBufferWriter();

    await runCli({
      args: [],
      stdout,
      stderr,
    });

    expect(stderr.text()).toBe("");
    expect(stdout.text()).toContain("No args prints help.");
    expect(stdout.text()).toContain("serve           Start the MCP stdio server");
  });

  it("routes explicit serve through the server starter", async () => {
    const stdout = createBufferWriter();
    const stderr = createBufferWriter();
    const calls: string[] = [];

    await runCli({
      cwd: "/tmp/example",
      args: ["serve"],
      stdout,
      stderr,
      startServer: (cwd) => {
        calls.push(cwd);
        return Promise.resolve();
      },
    });

    expect(stderr.text()).toBe("");
    expect(stdout.text()).toBe("");
    expect(calls).toEqual(["/tmp/example"]);
  });

  it("routes explicit daemon through the daemon starter", async () => {
    const stdout = createBufferWriter();
    const stderr = createBufferWriter();
    const calls: { socketPath?: string | undefined }[] = [];

    await runCli({
      cwd: "/tmp/example",
      args: ["daemon", "--socket", "runtime/graft.sock"],
      stdout,
      stderr,
      startDaemon: (options) => {
        calls.push(options);
        return Promise.resolve({
          socketPath: options.socketPath ?? "default",
          healthPath: "/healthz",
          mcpPath: "/mcp",
          close: () => Promise.resolve(),
          getHealthStatus: () => ({
            ok: true,
            sessionMode: "daemon",
            transport: "unix_socket",
            sameUserOnly: true,
            socketPath: options.socketPath ?? "default",
            healthPath: "/healthz",
            mcpPath: "/mcp",
            activeSessions: 0,
            boundSessions: 0,
            unboundSessions: 0,
            activeWarpRepos: 0,
            authorizedWorkspaces: 0,
            authorizedRepos: 0,
            workspaceBindRequiresAuthorization: true,
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
              totalWorkers: 2,
              busyWorkers: 0,
              idleWorkers: 2,
              queuedTasks: 0,
              completedTasks: 0,
              failedTasks: 0,
            },
            defaultCapabilityProfile: {
              boundedReads: true,
              structuralTools: true,
              precisionTools: true,
              stateBookmarks: true,
              runtimeLogs: "session_local_only",
              runCapture: false,
            },
            startedAt: "2026-04-08T00:00:00.000Z",
          }),
        });
      },
    });

    expect(stderr.text()).toBe("");
    expect(stdout.text()).toContain("/tmp/example/runtime/graft.sock");
    expect(calls).toEqual([{ socketPath: "/tmp/example/runtime/graft.sock" }]);
  });

  it("keeps no-arg non-interactive entrypoints compatible with MCP clients", () => {
    expect(resolveEntrypointArgs([], false, false)).toEqual(["serve"]);
    expect(resolveEntrypointArgs([], true, true)).toEqual([]);
    expect(resolveEntrypointArgs(["diag", "doctor"], false, false)).toEqual(["diag", "doctor"]);
  });

  it("runs peer commands through the grouped CLI surface", async () => {
    const repoDir = createTestRepo("graft-cli-main-");
    try {
      fs.writeFileSync(path.join(repoDir, "app.ts"), [
        "export function greet(name: string): string {",
        "  return `hello ${name}`;",
        "}",
        "",
      ].join("\n"));
      git(repoDir, "add -A");
      git(repoDir, "commit -m init");

      const stdout = createBufferWriter();
      const stderr = createBufferWriter();

      await runCli({
        cwd: repoDir,
        args: ["symbol", "find", "greet*", "--json"],
        stdout,
        stderr,
      });

      expect(stderr.text()).toBe("");
      const parsed = JSON.parse(stdout.text()) as { _schema: { id: string }; matches?: unknown[] };
      expect(parsed._schema.id).toBe("graft.cli.symbol_find");
      expect(parsed.matches?.length).toBe(1);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("reports CLI argument errors without starting MCP mode", async () => {
    const stdout = createBufferWriter();
    const stderr = createBufferWriter();

    await runCli({
      args: ["read", "range", "app.ts", "--start", "1"],
      stdout,
      stderr,
    });

    expect(stdout.text()).toBe("");
    expect(stderr.text()).toContain("Missing value for --end");
    expect(process.exitCode).toBe(1);
  });
});

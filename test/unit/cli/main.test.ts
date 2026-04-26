import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { resolveEntrypointArgs, runCli } from "../../../src/cli/main.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import { createBufferWriter } from "../../helpers/init.js";
import { writeLegacyLocalHistoryArtifact } from "../../helpers/legacy-local-history.js";

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
    expect(stdout.text()).toContain("migrate local-history");
    expect(stdout.text()).toContain("read safe");
    expect(stdout.text()).toContain("struct diff");
    expect(stdout.text()).toContain("diag activity");
    expect(stdout.text()).toContain("diag local-history-dag");
    expect(stdout.text()).toContain("diag doctor");
    expect(stdout.text()).toContain("symbol difficulty");
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

  it("runs doctor sludge scan through the top-level doctor alias", async () => {
    const repoDir = createTestRepo("graft-cli-sludge-");
    try {
      fs.mkdirSync(path.join(repoDir, "src"), { recursive: true });
      fs.writeFileSync(path.join(repoDir, "src", "sloppy.ts"), [
        "/** @typedef {{ name: string }} UserShape */",
        "/** @type {UserShape} */",
        "const user = {};",
        "/** @type {UserShape} */",
        "const nextUser = {};",
        "/** @type {UserShape} */",
        "const thirdUser = {};",
        "type UserShape = { name: string };",
        "export function buildUser(input: UserShape) {",
        "  return { name: input.name };",
        "}",
        "",
      ].join("\n"));
      git(repoDir, "add -A");
      git(repoDir, "commit -m sludge");

      const stdout = createBufferWriter();
      const stderr = createBufferWriter();
      await runCli({
        cwd: repoDir,
        args: ["doctor", "--sludge", "--path", "src", "--json"],
        stdout,
        stderr,
      });

      expect(stderr.text()).toBe("");
      const parsed = JSON.parse(stdout.text()) as {
        sludge?: {
          scannedFiles: number;
          filesWithSignals: number;
          files: { path: string; signals: { kind: string }[] }[];
        };
      };
      expect(parsed.sludge?.scannedFiles).toBe(1);
      expect(parsed.sludge?.filesWithSignals).toBe(1);
      expect(parsed.sludge?.files[0]?.signals.map((signal) => signal.kind)).toContain("homeless_constructor");
    } finally {
      cleanupTestRepo(repoDir);
    }
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

  it("runs symbol difficulty through the grouped CLI surface", async () => {
    const repoDir = createTestRepo("graft-cli-difficulty-");
    try {
      fs.writeFileSync(path.join(repoDir, "app.ts"), [
        "export function greet(name: string): string {",
        "  return `hello ${name}`;",
        "}",
        "",
      ].join("\n"));
      fs.writeFileSync(path.join(repoDir, "consumer.ts"), [
        "import { greet } from './app';",
        "export const message = greet('world');",
        "",
      ].join("\n"));
      git(repoDir, "add -A");
      git(repoDir, "commit -m init");

      await runCli({
        cwd: repoDir,
        args: ["index", "--json"],
        stdout: createBufferWriter(),
        stderr: createBufferWriter(),
      });

      const stdout = createBufferWriter();
      const stderr = createBufferWriter();
      await runCli({
        cwd: repoDir,
        args: ["symbol", "difficulty", "greet", "--path", "app.ts", "--json"],
        stdout,
        stderr,
      });

      expect(stderr.text()).toBe("");
      const parsed = JSON.parse(stdout.text()) as {
        _schema: { id: string };
        entries?: { symbol: string; filePath: string; friction: { referenceCount: number } }[];
      };
      expect(parsed._schema.id).toBe("graft.cli.symbol_difficulty");
      expect(parsed.entries?.[0]?.symbol).toBe("greet");
      expect(parsed.entries?.[0]?.filePath).toBe("app.ts");
      expect(parsed.entries?.[0]?.friction.referenceCount).toBe(1);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("runs diag activity through the grouped CLI surface", async () => {
    const repoDir = createTestRepo("graft-cli-activity-");
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
        args: ["diag", "activity", "--limit", "5", "--json"],
        stdout,
        stderr,
      });

      expect(stderr.text()).toBe("");
      const parsed = JSON.parse(stdout.text()) as {
        _schema: { id: string };
        truthClass: string;
        activityWindow: { returned: number };
      };
      expect(parsed._schema.id).toBe("graft.cli.diag_activity");
      expect(parsed.truthClass).toBe("artifact_history");
      expect(parsed.activityWindow.returned).toBeGreaterThanOrEqual(0);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("migrates legacy JSON local history into the WARP graph", async () => {
    const repoDir = createTestRepo("graft-cli-migrate-local-history-");
    try {
      fs.writeFileSync(path.join(repoDir, "app.ts"), [
        "export function greet(name: string): string {",
        "  return `hello ${name}`;",
        "}",
        "",
      ].join("\n"));
      git(repoDir, "add -A");
      git(repoDir, "commit -m init");
      writeLegacyLocalHistoryArtifact(path.join(repoDir, ".graft"));

      const stdout = createBufferWriter();
      const stderr = createBufferWriter();
      await runCli({
        cwd: repoDir,
        args: ["migrate", "local-history", "--json"],
        stdout,
        stderr,
      });

      expect(stderr.text()).toBe("");
      const parsed = JSON.parse(stdout.text()) as {
        _schema: { id: string };
        discoveredArtifacts: number;
        migratedArtifacts: number;
        importedContinuityRecords: number;
      };
      expect(parsed._schema.id).toBe("graft.cli.migrate_local_history");
      expect(parsed.discoveredArtifacts).toBeGreaterThanOrEqual(1);
      expect(parsed.migratedArtifacts).toBeGreaterThanOrEqual(1);
      expect(parsed.importedContinuityRecords).toBeGreaterThanOrEqual(0);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("renders human-friendly diag activity output by default", async () => {
    const repoDir = createTestRepo("graft-cli-activity-human-");
    try {
      fs.writeFileSync(path.join(repoDir, "app.ts"), [
        "export function greet(name: string): string {",
        "  return `hello ${name}`;",
        "}",
        "",
      ].join("\n"));
      git(repoDir, "add -A");
      git(repoDir, "commit -m init");

      await runCli({
        cwd: repoDir,
        args: ["read", "safe", "app.ts", "--json"],
        stdout: createBufferWriter(),
        stderr: createBufferWriter(),
      });

      const stdout = createBufferWriter();
      const stderr = createBufferWriter();

      await runCli({
        cwd: repoDir,
        args: ["diag", "activity", "--limit", "5"],
        stdout,
        stderr,
      });

      expect(stderr.text()).toBe("");
      expect(stdout.text()).toContain("Activity");
      expect(stdout.text()).toContain("truth: artifact_history");
      expect(stdout.text()).toContain("Groups");
      expect(stdout.text()).toContain("read activity");
      expect(stdout.text().trimStart().startsWith("{")).toBe(false);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("renders a bounded local-history DAG from WARP-backed history", { timeout: 15_000 }, async () => {
    const repoDir = createTestRepo("graft-cli-local-history-dag-");
    try {
      fs.writeFileSync(path.join(repoDir, "app.ts"), [
        "export function greet(name: string): string {",
        "  return `hello ${name}`;",
        "}",
        "",
      ].join("\n"));
      git(repoDir, "add -A");
      git(repoDir, "commit -m init");

      await runCli({
        cwd: repoDir,
        args: ["read", "safe", "app.ts", "--json"],
        stdout: createBufferWriter(),
        stderr: createBufferWriter(),
      });

      const stdout = createBufferWriter();
      const stderr = createBufferWriter();
      await runCli({
        cwd: repoDir,
        args: ["diag", "local-history-dag", "--json"],
        stdout,
        stderr,
      });

      expect(stderr.text()).toBe("");
      const parsed = JSON.parse(stdout.text()) as {
        _schema: { id: string };
        repoId: string;
        worktreeId: string;
        totalEventCount: number;
        shownEventCount: number;
        rendered: string;
        nodes: { entityKind: string; label: string }[];
        edges: { label: string }[];
      };
      expect(parsed._schema.id).toBe("graft.cli.diag_local_history_dag");
      expect(parsed.repoId).toContain("repo:");
      expect(parsed.worktreeId).toContain("worktree:");
      expect(parsed.totalEventCount).toBeGreaterThanOrEqual(1);
      expect(parsed.shownEventCount).toBeGreaterThanOrEqual(1);
      expect(parsed.rendered).toContain("Local History DAG");
      expect(parsed.nodes.some((node) => node.entityKind === "local_history_event")).toBe(true);
      expect(parsed.edges.some((edge) => edge.label === "in_session")).toBe(true);
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
    expect(stderr.text()).toContain("Usage: graft read range <path> --start <n> --end <n> [--json]");
    expect(stderr.text()).toContain("docs/CLI.md");
    expect(process.exitCode).toBe(1);
  });

  it("reports explicit serve argument errors with usage guidance", async () => {
    const stdout = createBufferWriter();
    const stderr = createBufferWriter();

    await runCli({
      args: ["serve", "extra"],
      stdout,
      stderr,
    });

    expect(stdout.text()).toBe("");
    expect(stderr.text()).toContain("Unexpected arguments: extra");
    expect(stderr.text()).toContain("Usage: graft serve");
    expect(stderr.text()).toContain("docs/CLI.md");
    expect(process.exitCode).toBe(1);
  });

  it("reports global option parse errors with usage guidance", async () => {
    const stdout = createBufferWriter();
    const stderr = createBufferWriter();

    await runCli({
      args: ["--cwd"],
      stdout,
      stderr,
    });

    expect(stdout.text()).toBe("");
    expect(stderr.text()).toContain("Missing value for --cwd");
    expect(stderr.text()).toContain("Usage: graft [--cwd <path>] <command> ...");
    expect(stderr.text()).toContain("docs/CLI.md");
    expect(process.exitCode).toBe(1);
  });
});

import { afterEach, describe, expect, expectTypeOf, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { ALL_TOOL_REGISTRY, createGraftServer } from "../../../src/mcp/server.js";
import {
  CLI_COMMAND_NAMES,
  CLI_OUTPUT_SCHEMAS,
  MCP_TOOL_NAMES,
  MCP_OUTPUT_SCHEMAS,
  attachCliSchemaMeta,
  getCliOutputJsonSchema,
  getMcpOutputJsonSchema,
  validateCliOutput,
} from "../../../src/contracts/output-schemas.js";
import { runCli } from "../../../src/cli/main.js";
import { runInit } from "../../../src/cli/init.js";
import { runIndex } from "../../../src/cli/index-cmd.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import { createBufferWriter } from "../../helpers/init.js";
import { writeLegacyLocalHistoryArtifact } from "../../helpers/legacy-local-history.js";
import { createServerInRepo, parse } from "../../helpers/mcp.js";

function createDaemonServer(graftDir: string) {
  return createGraftServer({
    mode: "daemon",
    graftDir,
  });
}

async function runCliJson(cwd: string, args: readonly string[]): Promise<Record<string, unknown>> {
  const stdout = createBufferWriter();
  const stderr = createBufferWriter();
  await runCli({ cwd, args, stdout, stderr });
  expect(stderr.text()).toBe("");
  return JSON.parse(stdout.text()) as Record<string, unknown>;
}

describe("contracts: output schemas", () => {
  const cleanups: string[] = [];

  afterEach(() => {
    while (cleanups.length > 0) {
      cleanupTestRepo(cleanups.pop()!);
    }
  });

  it("declares an MCP output schema for every registered tool", () => {
    expect(new Set(MCP_TOOL_NAMES)).toEqual(new Set(ALL_TOOL_REGISTRY.map((tool) => tool.name)));
  });

  it("exports JSON Schema objects for every MCP tool and CLI command", () => {
    for (const tool of MCP_TOOL_NAMES) {
      const jsonSchema = getMcpOutputJsonSchema(tool);
      expect(jsonSchema).toBeDefined();
    }
    for (const command of CLI_COMMAND_NAMES) {
      const jsonSchema = getCliOutputJsonSchema(command);
      expect(jsonSchema).toBeDefined();
    }
  });

  it("preserves concrete CLI output types through the helper stack", () => {
    const payload = validateCliOutput("diag_local_history_dag", attachCliSchemaMeta("diag_local_history_dag", {
      cwd: "/tmp/example",
      repoId: "repo:1",
      worktreeId: "worktree:1",
      requestedEventLimit: 5,
      totalEventCount: 2,
      shownEventCount: 2,
      nodeCount: 4,
      edgeCount: 3,
      truncated: false,
      rendered: "graph",
      nodes: [],
      edges: [],
    }));

    expect(payload["requestedEventLimit"]).toBe(5);
    expectTypeOf(payload).toExtend<Record<string, unknown>>();
    expectTypeOf(payload["requestedEventLimit"]).toEqualTypeOf<unknown>();
    expect(payload["_schema"]).toBeDefined();
    expect((payload["_schema"] as Record<string, unknown>)["id"]).toEqual(expect.any(String));
  });

  it("validates representative MCP tool outputs against the declared schemas", { timeout: 15_000 }, async () => {
    const repoDir = createTestRepo("graft-output-schema-mcp-");
    cleanups.push(repoDir);

    fs.writeFileSync(path.join(repoDir, "app.ts"), [
      "export function greet(name: string): string {",
      "  return `hello ${name}`;",
      "}",
      "",
    ].join("\n"));
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");
    const base = git(repoDir, "rev-parse HEAD");

    fs.writeFileSync(path.join(repoDir, "app.ts"), [
      "export function greet(name: string): string {",
      "  return `hello ${name}`;",
      "}",
      "",
      "export function wave(): string {",
      "  return \"wave\";",
      "}",
      "",
    ].join("\n"));
    git(repoDir, "add -A");
    git(repoDir, "commit -m add-wave");
    const head = git(repoDir, "rev-parse HEAD");

    fs.writeFileSync(path.join(repoDir, "app.ts"), [
      "export function greet(name: string): string {",
      "  return `hello ${name}`;",
      "}",
      "",
      "export function wave(): string {",
      "  return \"workspace\";",
      "}",
      "",
    ].join("\n"));

    const server = createServerInRepo(repoDir);
    const daemonServer = createDaemonServer(path.join(repoDir, ".graft-daemon"));
    const daemonAuthorize = parse(await daemonServer.callTool("workspace_authorize", { cwd: repoDir }));
    const daemonStatusSnapshot = parse(await daemonServer.callTool("daemon_status", {}));
    const daemonSessionsSnapshot = parse(await daemonServer.callTool("daemon_sessions", {}));
    const daemonSessions = daemonSessionsSnapshot["sessions"] as {
      causalSessionId: string | null;
      checkoutEpochId: string | null;
    }[];
    expect(daemonSessions.every((session) =>
      "causalSessionId" in session && "checkoutEpochId" in session
    )).toBe(true);
    const daemonMonitorStart = parse(await daemonServer.callTool("monitor_start", {
      cwd: repoDir,
      pollIntervalMs: 60_000,
    }));
    const daemonRepos = parse(await daemonServer.callTool("daemon_repos", {}));
    const daemonMonitors = parse(await daemonServer.callTool("daemon_monitors", {}));
    const daemonMonitorPause = parse(await daemonServer.callTool("monitor_pause", { cwd: repoDir }));
    const daemonMonitorResume = parse(await daemonServer.callTool("monitor_resume", { cwd: repoDir }));
    const daemonMonitorStop = parse(await daemonServer.callTool("monitor_stop", { cwd: repoDir }));
    const daemonAuthorizations = parse(await daemonServer.callTool("workspace_authorizations", {}));
    const daemonStatus = parse(await daemonServer.callTool("workspace_status", {}));
    const daemonBind = parse(await daemonServer.callTool("workspace_bind", { cwd: repoDir }));
    const daemonRebind = parse(await daemonServer.callTool("workspace_rebind", { cwd: repoDir }));
    const daemonRevoke = parse(await daemonServer.callTool("workspace_revoke", { cwd: repoDir }));
    git(repoDir, "checkout -b feature/output-schema-attach");

    const outputs = {
      safe_read: parse(await server.callTool("safe_read", { path: "app.ts" })),
      file_outline: parse(await server.callTool("file_outline", { path: "app.ts" })),
      read_range: parse(await server.callTool("read_range", { path: "app.ts", start: 1, end: 3 })),
      changed_since: parse(await server.callTool("changed_since", { path: "app.ts" })),
      graft_diff: parse(await server.callTool("graft_diff", {})),
      graft_since: parse(await server.callTool("graft_since", { base, head })),
      graft_map: parse(await server.callTool("graft_map", {})),
      code_show: parse(await server.callTool("code_show", { symbol: "greet", path: "app.ts" })),
      code_find: parse(await server.callTool("code_find", { query: "greet*" })),
      code_refs: parse(await server.callTool("code_refs", { query: "greet", mode: "call" })),
      daemon_repos: daemonRepos,
      daemon_status: daemonStatusSnapshot,
      daemon_sessions: daemonSessionsSnapshot,
      daemon_monitors: daemonMonitors,
      monitor_start: daemonMonitorStart,
      monitor_pause: daemonMonitorPause,
      monitor_resume: daemonMonitorResume,
      monitor_stop: daemonMonitorStop,
      workspace_authorize: daemonAuthorize,
      workspace_authorizations: daemonAuthorizations,
      workspace_revoke: daemonRevoke,
      workspace_bind: daemonBind,
      workspace_status: daemonStatus,
      activity_view: parse(await server.callTool("activity_view", {})),
      causal_status: parse(await server.callTool("causal_status", {})),
      causal_attach: parse(await server.callTool("causal_attach", { actor_kind: "agent" })),
      workspace_rebind: daemonRebind,
      run_capture: parse(await server.callTool("run_capture", { command: "printf 'ok'", tail: 1 })),
      state_save: parse(await server.callTool("state_save", { content: "current task" })),
      state_load: parse(await server.callTool("state_load", {})),
      set_budget: parse(await server.callTool("set_budget", { bytes: 100_000 })),
      explain: parse(await server.callTool("explain", { code: "CONTENT" })),
      doctor: parse(await server.callTool("doctor", {})),
      stats: parse(await server.callTool("stats", {})),
      graft_churn: parse(await server.callTool("graft_churn", {})),
      graft_exports: parse(await server.callTool("graft_exports", { base, head })),
      graft_log: parse(await server.callTool("graft_log", {})),
      graft_blame: parse(await server.callTool("graft_blame", { symbol: "greet" })),
      graft_review: parse(await server.callTool("graft_review", { base, head })),
    } as const;

    for (const tool of MCP_TOOL_NAMES) {
      expect(() => MCP_OUTPUT_SCHEMAS[tool].parse(outputs[tool])).not.toThrow();
    }
  });

  it("validates init JSON output against the declared CLI schema", () => {
    const repoDir = createTestRepo("graft-output-schema-init-");
    cleanups.push(repoDir);

    const stdout = createBufferWriter();
    const stderr = createBufferWriter();

    runInit({
      cwd: repoDir,
      args: ["--json"],
      stdout,
      stderr,
    });

    expect(stderr.text()).toBe("");
    const parsed = JSON.parse(stdout.text()) as Record<string, unknown>;
    expect(() => CLI_OUTPUT_SCHEMAS.init.parse(parsed)).not.toThrow();
  });

  it("validates index JSON output against the declared CLI schema", async () => {
    const repoDir = createTestRepo("graft-output-schema-index-");
    cleanups.push(repoDir);

    fs.writeFileSync(path.join(repoDir, "app.ts"), "export const ready = true;\n");
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");

    const stdout = createBufferWriter();
    const stderr = createBufferWriter();

    await runIndex({
      cwd: repoDir,
      args: ["--json"],
      stdout,
      stderr,
    });

    expect(stderr.text()).toBe("");
    const parsed = JSON.parse(stdout.text()) as Record<string, unknown>;
    expect(() => CLI_OUTPUT_SCHEMAS.index.parse(parsed)).not.toThrow();
  });

  it("validates representative CLI peer outputs against the declared schemas", { timeout: 60_000 }, async () => {
    const repoDir = createTestRepo("graft-output-schema-cli-peer-");
    cleanups.push(repoDir);

    fs.writeFileSync(path.join(repoDir, "app.ts"), [
      "export function greet(name: string): string {",
      "  return `hello ${name}`;",
      "}",
      "",
    ].join("\n"));
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");
    const base = git(repoDir, "rev-parse HEAD");

    fs.writeFileSync(path.join(repoDir, "app.ts"), [
      "export function greet(name: string): string {",
      "  return `hello ${name}`;",
      "}",
      "",
      "export function wave(): string {",
      "  return \"wave\";",
      "}",
      "",
    ].join("\n"));
    git(repoDir, "add -A");
    git(repoDir, "commit -m add-wave");
    const head = git(repoDir, "rev-parse HEAD");

    fs.writeFileSync(path.join(repoDir, "app.ts"), [
      "export function greet(name: string): string {",
      "  return `hello ${name}`;",
      "}",
      "",
      "export function wave(): string {",
      "  return \"workspace\";",
      "}",
      "",
    ].join("\n"));

    const outputs = {
      read_safe: await runCliJson(repoDir, ["read", "safe", "app.ts", "--json"]),
      read_outline: await runCliJson(repoDir, ["read", "outline", "app.ts", "--json"]),
      read_range: await runCliJson(repoDir, ["read", "range", "app.ts", "--start", "1", "--end", "3", "--json"]),
      read_changed: await runCliJson(repoDir, ["read", "changed", "app.ts", "--json"]),
      struct_diff: await runCliJson(repoDir, ["struct", "diff", "--json"]),
      struct_since: await runCliJson(repoDir, ["struct", "since", base, "--head", head, "--json"]),
      struct_map: await runCliJson(repoDir, ["struct", "map", "--json"]),
      struct_log: await runCliJson(repoDir, ["struct", "log", "--json"]),
      struct_review: await runCliJson(repoDir, ["struct", "review", "--json"]),
      struct_churn: await runCliJson(repoDir, ["struct", "churn", "--json"]),
      struct_exports: await runCliJson(repoDir, ["struct", "exports", base, head, "--json"]),
      symbol_show: await runCliJson(repoDir, ["symbol", "show", "greet", "--path", "app.ts", "--json"]),
      symbol_blame: await runCliJson(repoDir, ["symbol", "blame", "greet", "--json"]),
      symbol_find: await runCliJson(repoDir, ["symbol", "find", "greet*", "--json"]),
      diag_doctor: await runCliJson(repoDir, ["diag", "doctor", "--json"]),
      diag_activity: await runCliJson(repoDir, ["diag", "activity", "--limit", "5", "--json"]),
      diag_local_history_dag: await runCliJson(repoDir, ["diag", "local-history-dag", "--limit", "5", "--json"]),
      diag_explain: await runCliJson(repoDir, ["diag", "explain", "CONTENT", "--json"]),
      diag_stats: await runCliJson(repoDir, ["diag", "stats", "--json"]),
      diag_capture: await runCliJson(repoDir, ["diag", "capture", "--json", "--", "printf", "ok"]),
    } as const;

    for (const command of CLI_COMMAND_NAMES.filter((name) => !["init", "index", "migrate_local_history"].includes(name))) {
      expect(() => CLI_OUTPUT_SCHEMAS[command].parse(outputs[command as keyof typeof outputs])).not.toThrow();
    }
  });

  it("validates local-history migration JSON output against the declared CLI schema", { timeout: 15_000 }, async () => {
    const repoDir = createTestRepo("graft-output-schema-migrate-history-");
    cleanups.push(repoDir);

    fs.writeFileSync(path.join(repoDir, "app.ts"), "export const ready = true;\n");
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");
    writeLegacyLocalHistoryArtifact(path.join(repoDir, ".graft"));

    const parsed = await runCliJson(repoDir, ["migrate", "local-history", "--json"]);
    expect(() => CLI_OUTPUT_SCHEMAS.migrate_local_history.parse(parsed)).not.toThrow();
  });
});

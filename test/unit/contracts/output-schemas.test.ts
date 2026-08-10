import { afterEach, describe, expect, expectTypeOf, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { ALL_TOOL_REGISTRY, createGraftServer } from "../../../src/mcp/server.js";
import {
  CLI_COMMAND_NAMES,
  CLI_OUTPUT_SCHEMAS,
  MCP_TOOL_NAMES,
  MCP_OUTPUT_SCHEMAS,
  attachCliSchemaMeta,
  getCliOutputJsonSchema,
  getCliOutputSchemaMeta,
  getMcpOutputJsonSchema,
  getMcpOutputSchemaMeta,
  validateCliOutput,
} from "../../../src/contracts/output-schemas.js";
import {
  cliOutputSchemaMeta,
  mcpOutputSchemaMeta,
  withCliPeerCommon,
  withMcpCommon,
} from "../../../src/contracts/output-schema-meta.js";
import {
  importBindingDiagnosticSchema,
  mcpOutputBodySchemas,
} from "../../../src/contracts/output-schema-mcp.js";
import { cliOutputBodySchemas } from "../../../src/contracts/output-schema-cli.js";
import { runCli } from "../../../src/cli/main.js";
import { runInit } from "../../../src/cli/init.js";
import { runIndex } from "../../../src/cli/index-cmd.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import { createBufferWriter } from "../../helpers/init.js";
import { writeLegacyLocalHistoryArtifact } from "../../helpers/legacy-local-history.js";
import { createServerInRepo, parse } from "../../helpers/mcp.js";

const CLI_PEER_SCHEMA_TIMEOUT_MS = 120_000;

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

  it("versions expanded output contracts independently", () => {
    expect(getMcpOutputSchemaMeta("graft_review")).toBe(mcpOutputSchemaMeta.graft_review);
    expect(getCliOutputSchemaMeta("struct_review")).toBe(cliOutputSchemaMeta.struct_review);
    expect(getMcpOutputSchemaMeta("graft_review").version).toBe("2.0.0");
    expect(getCliOutputSchemaMeta("struct_review").version).toBe("2.0.0");
    expect(getMcpOutputSchemaMeta("file_outline").version).toBe("3.0.0");
    expect(getCliOutputSchemaMeta("read_outline").version).toBe("3.0.0");
    for (const tool of [
      "safe_read",
      "read_range",
      "changed_since",
      "graft_diff",
      "graft_since",
      "graft_map",
      "code_show",
      "code_find",
      "code_refs",
    ] as const) {
      expect(getMcpOutputSchemaMeta(tool).version, tool).toBe("2.0.0");
    }
    for (const command of [
      "read_safe",
      "read_range",
      "read_changed",
      "struct_diff",
      "struct_since",
      "struct_map",
      "symbol_show",
      "symbol_find",
    ] as const) {
      expect(getCliOutputSchemaMeta(command).version, command).toBe("2.0.0");
    }
    expect(getMcpOutputSchemaMeta("doctor").version).toBe("1.0.0");
    expect(getCliOutputSchemaMeta("diag_doctor").version).toBe("1.0.0");
  });

  it("keeps exported common-schema helpers aligned with workspace evidence", () => {
    const bodySchema = z.object({ ok: z.literal(true) }).strict();
    const receiptSchema = z.object({ seq: z.number().int().positive() }).strict();
    const tripwireSchema = z.object({ code: z.string() }).strict();
    const workspace = {
      route: "explicit_cwd",
      requestedRoot: "/tmp/requested",
      resolvedRoot: "/tmp/resolved",
      repoId: "repo:1",
      worktreeId: "worktree:1",
    } as const;

    expect(() => withMcpCommon("safe_read", bodySchema, receiptSchema, tripwireSchema).parse({
      ok: true,
      _schema: mcpOutputSchemaMeta.safe_read,
      _receipt: { seq: 1 },
      _workspace: workspace,
    })).not.toThrow();
    expect(() => withCliPeerCommon("read_safe", bodySchema, receiptSchema, tripwireSchema).parse({
      ok: true,
      _schema: cliOutputSchemaMeta.read_safe,
      _receipt: { seq: 1 },
      _workspace: workspace,
    })).not.toThrow();

    expect(() => withMcpCommon("doctor", bodySchema, receiptSchema, tripwireSchema).parse({
      ok: true,
      _schema: mcpOutputSchemaMeta.doctor,
      _receipt: { seq: 1, workspace },
      _workspace: workspace,
    })).toThrow();
    expect(() => withCliPeerCommon("diag_doctor", bodySchema, receiptSchema, tripwireSchema).parse({
      ok: true,
      _schema: cliOutputSchemaMeta.diag_doctor,
      _receipt: { seq: 1, workspace },
      _workspace: workspace,
    })).toThrow();
  });

  it("adds route evidence only to routed output contracts", () => {
    interface JsonSchema {
      properties?: Record<string, JsonSchema>;
    }
    const assertWorkspacePosture = (schema: JsonSchema, expected: boolean) => {
      expect(schema.properties?.["_workspace"] !== undefined).toBe(expected);
      expect(schema.properties?.["_receipt"]?.properties?.["workspace"] !== undefined).toBe(expected);
    };

    assertWorkspacePosture(getMcpOutputJsonSchema("safe_read") as JsonSchema, true);
    assertWorkspacePosture(getCliOutputJsonSchema("read_safe") as JsonSchema, true);
    assertWorkspacePosture(getMcpOutputJsonSchema("doctor") as JsonSchema, false);
    assertWorkspacePosture(getCliOutputJsonSchema("diag_doctor") as JsonSchema, false);
    assertWorkspacePosture(getMcpOutputJsonSchema("graft_review") as JsonSchema, false);
    assertWorkspacePosture(getCliOutputJsonSchema("struct_review") as JsonSchema, false);
  });

  it("shares one import-binding diagnostic schema across diagnostics and review warnings", () => {
    expect(mcpOutputBodySchemas.graft_import_diagnostics.shape.diagnostics.element).toBe(importBindingDiagnosticSchema);
    expect(mcpOutputBodySchemas.graft_review.shape.breakingChanges.element.shape.referenceWarnings.element).toBe(importBindingDiagnosticSchema);
  });

  it("rejects negative file_outline observation sizes", async () => {
    const repoDir = createTestRepo("graft-file-outline-actual-schema-");
    cleanups.push(repoDir);
    fs.writeFileSync(path.join(repoDir, "app.ts"), "export function greet(): void {}\n");
    const server = createServerInRepo(repoDir);
    await server.callTool("file_outline", { path: "app.ts" });
    const output = parse(await server.callTool("file_outline", { path: "app.ts" }));

    expect(output["cacheHit"]).toBe(true);
    expect(output["actual"]).toBeDefined();
    expect(() => MCP_OUTPUT_SCHEMAS.file_outline.parse({
      ...output,
      actual: { lines: 1, bytes: -1 },
    })).toThrow();
  });

  it("accepts cache-hit outline bodies through every exported schema", async () => {
    const repoDir = createTestRepo("graft-file-outline-split-schema-");
    cleanups.push(repoDir);
    const content = "export function greet(): void {}\n";
    fs.writeFileSync(path.join(repoDir, "app.ts"), content);
    const server = createServerInRepo(repoDir);
    await server.callTool("file_outline", { path: "app.ts" });
    const output = parse(await server.callTool("file_outline", { path: "app.ts" }));
    const { _schema: _schema, _receipt: _receipt, tripwire: _tripwire, ...body } = output;

    expect(output).toMatchObject({
      _schema: {
        id: "graft.mcp.file_outline",
        version: "3.0.0",
      },
      cacheHit: true,
      actual: { lines: 2, bytes: Buffer.byteLength(content) },
    });
    expect(() => MCP_OUTPUT_SCHEMAS.file_outline.parse(output)).not.toThrow();
    expect(() => mcpOutputBodySchemas.file_outline.parse(body)).not.toThrow();
    expect(() => cliOutputBodySchemas.read_outline.parse(body)).not.toThrow();
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

  it("validates representative MCP tool outputs against the declared schemas", { timeout: 30_000 }, async () => {
    const repoDir = createTestRepo("graft-output-schema-mcp-");
    cleanups.push(repoDir);

    fs.writeFileSync(path.join(repoDir, "app.ts"), [
      "export function greet(name: string): string {",
      "  return `hello ${name}`;",
      "}",
      "",
    ].join("\n"));
    fs.mkdirSync(path.join(repoDir, "src"), { recursive: true });
    fs.mkdirSync(path.join(repoDir, "test"), { recursive: true });
    fs.writeFileSync(path.join(repoDir, "src", "coverage.ts"), [
      "export function coveredByTest(): string {",
      "  return \"covered\";",
      "}",
      "",
      "export function uncoveredByTest(): string {",
      "  return \"uncovered\";",
      "}",
      "",
    ].join("\n"));
    fs.writeFileSync(path.join(repoDir, "test", "coverage.test.ts"), [
      "import { coveredByTest } from \"../src/coverage\";",
      "",
      "it(\"references the covered export\", () => {",
      "  expect(coveredByTest()).toBe(\"covered\");",
      "});",
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
    fs.writeFileSync(path.join(repoDir, "edit-target.ts"), "export const editTarget = \"before\";\n");

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
    const daemonMonitorNudge = parse(await daemonServer.callTool("monitor_nudge", { cwd: repoDir }));
    const daemonMonitorStop = parse(await daemonServer.callTool("monitor_stop", { cwd: repoDir }));
    const daemonAuthorizations = parse(await daemonServer.callTool("workspace_authorizations", {}));
    const daemonStatus = parse(await daemonServer.callTool("workspace_status", {}));
    const daemonBind = parse(await daemonServer.callTool("workspace_bind", { cwd: repoDir }));
    const daemonRebind = parse(await daemonServer.callTool("workspace_rebind", { cwd: repoDir }));
    const daemonRevoke = parse(await daemonServer.callTool("workspace_revoke", { cwd: repoDir }));
    const workspaceOpen = parse(await server.callTool("workspace_open", { cwd: repoDir, activate: false }));
    const workspaceListOpened = parse(await server.callTool("workspace_list_opened", {}));
    git(repoDir, "checkout -b feature/output-schema-attach");

    const outputs = {
      safe_read: parse(await server.callTool("safe_read", { path: "app.ts" })),
      graft_edit: parse(await server.callTool("graft_edit", {
        path: "edit-target.ts",
        old_string: "\"before\"",
        new_string: "\"after\"",
      })),
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
      monitor_nudge: daemonMonitorNudge,
      monitor_stop: daemonMonitorStop,
      workspace_authorize: daemonAuthorize,
      workspace_authorizations: daemonAuthorizations,
      workspace_revoke: daemonRevoke,
      workspace_open: workspaceOpen,
      workspace_list_opened: workspaceListOpened,
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
      graft_difficulty: parse(await server.callTool("graft_difficulty", { symbol: "greet" })),
      graft_review: parse(await server.callTool("graft_review", { base, head })),
      graft_import_diagnostics: parse(await server.callTool("graft_import_diagnostics", {})),
      graft_test_coverage: parse(await server.callTool("graft_test_coverage", { sourcePath: "src", testPath: "test" })),
      graft_dead_symbols: parse(await server.callTool("graft_dead_symbols", { maxCommits: 5 })),
      knowledge_map: parse(await server.callTool("knowledge_map", {})),
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

  it("validates representative CLI peer outputs against the declared schemas", { timeout: CLI_PEER_SCHEMA_TIMEOUT_MS }, async () => {
    const repoDir = createTestRepo("graft-output-schema-cli-peer-");
    cleanups.push(repoDir);

    fs.writeFileSync(path.join(repoDir, "app.ts"), [
      "export function greet(name: string): string {",
      "  return `hello ${name}`;",
      "}",
      "",
    ].join("\n"));
    fs.mkdirSync(path.join(repoDir, "src"), { recursive: true });
    fs.mkdirSync(path.join(repoDir, "test"), { recursive: true });
    fs.writeFileSync(path.join(repoDir, "src", "coverage.ts"), [
      "export function coveredByTest(): string {",
      "  return \"covered\";",
      "}",
      "",
      "export function uncoveredByTest(): string {",
      "  return \"uncovered\";",
      "}",
      "",
    ].join("\n"));
    fs.writeFileSync(path.join(repoDir, "test", "coverage.test.ts"), [
      "import { coveredByTest } from \"../src/coverage\";",
      "",
      "it(\"references the covered export\", () => {",
      "  expect(coveredByTest()).toBe(\"covered\");",
      "});",
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
    fs.writeFileSync(path.join(repoDir, "review-comments.json"), JSON.stringify({
      comments: [
        {
          author: { login: "coderabbitai" },
          body: "Rate limit exceeded. Please retry in 30 minutes.",
          createdAt: "2026-05-05T15:00:00.000Z",
          updatedAt: "2026-05-05T15:00:00.000Z",
        },
      ],
    }));

    const outputs = {
      read_safe: await runCliJson(repoDir, ["read", "safe", "app.ts", "--json"]),
      read_outline: await runCliJson(repoDir, ["read", "outline", "app.ts", "--json"]),
      read_range: await runCliJson(repoDir, ["read", "range", "app.ts", "--start", "1", "--end", "3", "--json"]),
      read_changed: await runCliJson(repoDir, ["read", "changed", "app.ts", "--json"]),
      struct_diff: await runCliJson(repoDir, ["struct", "diff", "--json"]),
      struct_since: await runCliJson(repoDir, ["struct", "since", base, "--head", head, "--json"]),
      struct_map: await runCliJson(repoDir, ["struct", "map", "--json"]),
      struct_log: await runCliJson(repoDir, ["struct", "log", "--json"]),
      struct_review: await runCliJson(repoDir, ["struct", "review", "--base", base, "--head", head, "--json"]),
      struct_import_diagnostics: await runCliJson(repoDir, ["struct", "import-diagnostics", "--json"]),
      struct_test_coverage: await runCliJson(repoDir, ["struct", "test-coverage", "--src", "src", "--tests", "test", "--json"]),
      struct_dead_symbols: await runCliJson(repoDir, ["struct", "dead-symbols", "--limit", "5", "--json"]),
      struct_churn: await runCliJson(repoDir, ["struct", "churn", "--json"]),
      struct_exports: await runCliJson(repoDir, ["struct", "exports", base, head, "--json"]),
      symbol_show: await runCliJson(repoDir, ["symbol", "show", "greet", "--path", "app.ts", "--json"]),
      symbol_blame: await runCliJson(repoDir, ["symbol", "blame", "greet", "--json"]),
      symbol_difficulty: await runCliJson(repoDir, ["symbol", "difficulty", "greet", "--json"]),
      symbol_find: await runCliJson(repoDir, ["symbol", "find", "greet*", "--json"]),
      diag_doctor: await runCliJson(repoDir, ["diag", "doctor", "--json"]),
      diag_activity: await runCliJson(repoDir, ["diag", "activity", "--limit", "5", "--json"]),
      diag_local_history_dag: await runCliJson(repoDir, ["diag", "local-history-dag", "--limit", "5", "--json"]),
      diag_explain: await runCliJson(repoDir, ["diag", "explain", "CONTENT", "--json"]),
      diag_stats: await runCliJson(repoDir, ["diag", "stats", "--json"]),
      diag_capture: await runCliJson(repoDir, ["diag", "capture", "--json", "--", "printf", "ok"]),
      review_cooldown: await runCliJson(repoDir, [
        "review",
        "cooldown",
        "--comments-file",
        "review-comments.json",
        "--now",
        "2026-05-05T15:10:00.000Z",
        "--json",
      ]),
      git_graft_enhance: await runCliJson(repoDir, ["enhance", "--since", base, "--head", head, "--json"]),
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

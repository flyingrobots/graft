import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { TOOL_REGISTRY, createGraftServer } from "../../../src/mcp/server.js";
import {
  CLI_COMMAND_NAMES,
  CLI_OUTPUT_SCHEMAS,
  MCP_TOOL_NAMES,
  MCP_OUTPUT_SCHEMAS,
  getCliOutputJsonSchema,
  getMcpOutputJsonSchema,
} from "../../../src/contracts/output-schemas.js";
import { runInit } from "../../../src/cli/init.js";
import { runIndex } from "../../../src/cli/index-cmd.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import { parse } from "../../helpers/mcp.js";

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

function createServerInRepo(repoDir: string) {
  return createGraftServer({
    projectRoot: repoDir,
    graftDir: path.join(repoDir, ".graft"),
  });
}

describe("contracts: output schemas", () => {
  const cleanups: string[] = [];

  afterEach(() => {
    while (cleanups.length > 0) {
      cleanupTestRepo(cleanups.pop()!);
    }
  });

  it("declares an MCP output schema for every registered tool", () => {
    expect(new Set(MCP_TOOL_NAMES)).toEqual(new Set(TOOL_REGISTRY.map((tool) => tool.name)));
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

  it("validates representative MCP tool outputs against the declared schemas", async () => {
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
      run_capture: parse(await server.callTool("run_capture", { command: "printf 'ok'", tail: 1 })),
      state_save: parse(await server.callTool("state_save", { content: "current task" })),
      state_load: parse(await server.callTool("state_load", {})),
      set_budget: parse(await server.callTool("set_budget", { bytes: 100_000 })),
      explain: parse(await server.callTool("explain", { code: "CONTENT" })),
      doctor: parse(await server.callTool("doctor", {})),
      stats: parse(await server.callTool("stats", {})),
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
});

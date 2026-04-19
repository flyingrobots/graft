import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { TOOL_REGISTRY } from "../../../src/mcp/server.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { extractText, harnessPath } from "../../helpers/mcp.js";
import { createCommittedTestRepo, cleanupTestRepo } from "../../helpers/git.js";

// ---------------------------------------------------------------------------
// Fixture content: small .ts, large .ts (>150 lines), medium .ts, binary PNG
// ---------------------------------------------------------------------------

const SMALL_TS = [
  'export function greet(name: string): string {',
  '  return `Hello, ${name}!`;',
  '}',
  '',
  'export const VERSION = "1.0.0";',
  '',
].join("\n");

function generateLargeTs(): string {
  const lines: string[] = [
    '/** Large generated fixture for outline testing. */',
    '',
    'export interface Config {',
    '  host: string;',
    '  port: number;',
    '}',
    '',
  ];
  // Generate enough functions to exceed the 150-line threshold
  for (let i = 0; i < 40; i++) {
    lines.push(
      `export function handler${String(i)}(input: string): string {`,
      `  const tag = "handler${String(i)}";`,
      '  if (!input) {',
      '    throw new Error(`${tag}: empty input`);',
      '  }',
      '  return `${tag}: ${input}`;',
      '}',
      '',
    );
  }
  return lines.join("\n");
}

const MEDIUM_TS = [
  '/**',
  ' * Medium fixture for outline / read_range testing.',
  ' */',
  '',
  'export interface Config {',
  '  host: string;',
  '  port: number;',
  '  debug: boolean;',
  '}',
  '',
  'export class ConnectionManager {',
  '  private config: Config;',
  '',
  '  constructor(config: Config) {',
  '    this.config = config;',
  '  }',
  '',
  '  getConfig(): Config {',
  '    return { ...this.config };',
  '  }',
  '}',
  '',
  'export function createManager(config: Config): ConnectionManager {',
  '  return new ConnectionManager(config);',
  '}',
  '',
  'export const MAX_CONNECTIONS = 100;',
  '',
].join("\n");

// Minimal valid 1x1 red PNG (68 bytes)
const BINARY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * Integration tests: spawn the actual MCP server as a subprocess,
 * connect via stdio, and call tools through the MCP protocol.
 *
 * The test workspace is staged by copy-in with remotes stripped.
 * Tests never execute against the host checkout.
 */
describe("integration: MCP server over stdio", { timeout: 60_000 }, () => {
  let client: Client;
  let transport: StdioClientTransport;
  let projectRoot: string;
  let graftDir: string;

  beforeAll(async () => {
    // Build an isolated fixture repo with small, large, medium, and binary files.
    projectRoot = createCommittedTestRepo("graft-mcp-stdio-", {
      "test/fixtures/small.ts": SMALL_TS,
      "test/fixtures/large.ts": generateLargeTs(),
      "test/fixtures/medium.ts": MEDIUM_TS,
      "test/fixtures/ban-targets/image.png": BINARY_PNG.toString("binary"),
    });

    // Write the binary file again with proper encoding (createCommittedTestRepo writes utf-8)
    fs.writeFileSync(path.join(projectRoot, "test/fixtures/ban-targets/image.png"), BINARY_PNG);

    graftDir = path.join(projectRoot, ".graft");
    fs.mkdirSync(graftDir, { recursive: true });

    transport = new StdioClientTransport({
      command: "node",
      args: ["--import", "tsx", harnessPath("test/helpers/mcp-stdio.ts")],
      // cwd must be the harness (graft repo root) so the subprocess can
      // resolve tsx from node_modules.  The isolated project root is passed
      // through GRAFT_TEST_PROJECT_ROOT.
      cwd: harnessPath(),
      env: {
        GRAFT_TEST_PROJECT_ROOT: projectRoot,
        GRAFT_TEST_GRAFT_DIR: graftDir,
      },
    });
    client = new Client({ name: "graft-test", version: "0.0.0" });
    await client.connect(transport);
  });

  afterAll(async () => {
    await client.close();
    cleanupTestRepo(projectRoot);
  });

  it("lists all registered tools", async () => {
    const tools = await client.listTools();
    const names = tools.tools.map((t) => t.name);
    for (const def of TOOL_REGISTRY) {
      expect(names).toContain(def.name);
    }
    expect(names).toHaveLength(TOOL_REGISTRY.length);
  });

  it("tools have JSON Schema input definitions", async () => {
    const tools = await client.listTools();
    const safeRead = tools.tools.find((t) => t.name === "safe_read");
    expect(safeRead).toBeDefined();
    expect(safeRead!.inputSchema).toBeDefined();
    expect(safeRead!.inputSchema.properties).toHaveProperty("path");
  });

  it("safe_read returns content for small files", { timeout: 60_000 }, async () => {
    const result = await client.callTool({
      name: "safe_read",
      arguments: { path: "test/fixtures/small.ts" },
    });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["projection"]).toBe("content");
    expect(parsed["content"]).toContain("greet");
  });

  it("safe_read returns outline for large files", { timeout: 60_000 }, async () => {
    const result = await client.callTool({
      name: "safe_read",
      arguments: { path: "test/fixtures/large.ts" },
    });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["projection"]).toBe("outline");
    expect(parsed["jumpTable"]).toBeDefined();
  });

  it("safe_read refuses binary files", { timeout: 60_000 }, async () => {
    const result = await client.callTool({
      name: "safe_read",
      arguments: { path: "test/fixtures/ban-targets/image.png" },
    });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["projection"]).toBe("refused");
    expect(parsed["reason"]).toBe("BINARY");
  });

  it("file_outline includes jump table", { timeout: 60_000 }, async () => {
    const result = await client.callTool({
      name: "file_outline",
      arguments: { path: "test/fixtures/medium.ts" },
    });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["outline"]).toBeDefined();
    expect(parsed["jumpTable"]).toBeDefined();
  });

  it("read_range returns bounded lines", { timeout: 60_000 }, async () => {
    const result = await client.callTool({
      name: "read_range",
      arguments: { path: "test/fixtures/medium.ts", start: 1, end: 5 },
    });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["content"]).toBeDefined();
    expect(parsed["startLine"]).toBe(1);
    expect(parsed["endLine"]).toBe(5);
  });

  it("doctor returns health check", { timeout: 60_000 }, async () => {
    const result = await client.callTool({
      name: "doctor",
      arguments: {},
    });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["projectRoot"]).toBe(projectRoot);
    expect(parsed["parserHealthy"]).toBe(true);
  });

  it("stats returns metrics summary", { timeout: 60_000 }, async () => {
    const result = await client.callTool({
      name: "stats",
      arguments: {},
    });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["totalReads"]).toBeDefined();
  });
});

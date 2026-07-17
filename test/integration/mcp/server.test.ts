import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { TOOL_REGISTRY } from "../../../src/mcp/server.js";
import {
  MCP_OUTPUT_SCHEMAS,
  type McpToolName,
} from "../../../src/contracts/output-schemas.js";
import { parseJsonObject } from "../../../src/contracts/json-object.js";
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

type SdkToolResult = Awaited<ReturnType<Client["callTool"]>>;
type SdkToolList = Awaited<ReturnType<Client["listTools"]>>["tools"];

function structuredPayload(
  result: SdkToolResult,
  tool: McpToolName,
): Record<string, unknown> {
  expect(result.isError).not.toBe(true);
  const textPayload = JSON.parse(extractText(result)) as unknown;
  expect(result.structuredContent).toBeDefined();
  const structured = parseJsonObject(result.structuredContent, `MCP tool ${tool} structured content`);
  expect(structured).toEqual(textPayload);
  expect(() => MCP_OUTPUT_SCHEMAS[tool].parse(structured)).not.toThrow();
  return structured;
}

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
  let listedTools: SdkToolList;
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
    // listTools seeds the SDK client's output-schema validator cache. Calls
    // below therefore exercise client-side validation as well as the server.
    listedTools = (await client.listTools()).tools;
  });

  afterAll(async () => {
    await client.close();
    cleanupTestRepo(projectRoot);
  });

  it("lists all registered tools", () => {
    const names = listedTools.map((t) => t.name);
    for (const def of TOOL_REGISTRY) {
      expect(names).toContain(def.name);
    }
    expect(names).toHaveLength(TOOL_REGISTRY.length);
  });

  it("tools have JSON Schema input definitions", () => {
    for (const tool of listedTools) {
      const properties = tool.inputSchema.properties as Record<string, {
        enum?: string[];
      }>;
      expect(properties).toHaveProperty("receipt");
      expect(properties["receipt"]?.enum).toEqual(["compact", "full"]);
      expect(tool.outputSchema).toEqual(expect.objectContaining({ type: "object" }));
    }
    const safeRead = listedTools.find((tool) => tool.name === "safe_read");
    expect(safeRead?.inputSchema.properties).toHaveProperty("path");
    for (const toolName of ["doctor", "activity_view"]) {
      const tool = listedTools.find((candidate) => candidate.name === toolName);
      const detail = tool?.inputSchema.properties?.["detail"] as { enum?: string[] } | undefined;
      expect(detail?.enum).toEqual(["summary", "full"]);
    }
  });

  it("safe_read returns content for small files", { timeout: 60_000 }, async () => {
    const result = await client.callTool({
      name: "safe_read",
      arguments: { path: "test/fixtures/small.ts" },
    });
    const parsed = structuredPayload(result, "safe_read");
    expect(parsed["projection"]).toBe("content");
    expect(parsed["content"]).toContain("greet");
    expect(parsed["_schema"]).toEqual({ id: "graft.mcp.safe_read", version: "2.0.0" });
    expect(parsed["_receipt"]).toMatchObject({ mode: "compact", reason: "CONTENT" });
  });

  it("safe_read returns the full receipt only when requested", { timeout: 60_000 }, async () => {
    const result = await client.callTool({
      name: "safe_read",
      arguments: { path: "test/fixtures/small.ts", receipt: "full" },
    });
    const parsed = structuredPayload(result, "safe_read");
    expect(parsed["_receipt"]).toMatchObject({
      mode: "full",
      tool: "safe_read",
      cumulative: expect.any(Object),
    });
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
    const parsed = structuredPayload(result, "file_outline");
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

  it("doctor defaults to summary and preserves explicit full detail", { timeout: 60_000 }, async () => {
    const summaryResult = await client.callTool({
      name: "doctor",
      arguments: {},
    });
    const summary = structuredPayload(summaryResult, "doctor");
    expect(summary["health"]).toBe("degraded");
    expect(summary["workspace"]).toEqual(expect.objectContaining({ bindState: "bound" }));

    const fullResult = await client.callTool({
      name: "doctor",
      arguments: { detail: "full" },
    });
    const full = structuredPayload(fullResult, "doctor");
    expect(full["projectRoot"]).toBe(projectRoot);
    expect(full["parserHealthy"]).toBe(true);
  });

  it("activity_view validates both summary and full structured variants", { timeout: 60_000 }, async () => {
    const summaryResult = await client.callTool({
      name: "activity_view",
      arguments: {},
    });
    const summary = structuredPayload(summaryResult, "activity_view");
    expect(summary["truthClass"]).toBe("artifact_history");
    expect(summary).not.toHaveProperty("activeCausalWorkspace");

    const fullResult = await client.callTool({
      name: "activity_view",
      arguments: { detail: "full" },
    });
    const full = structuredPayload(fullResult, "activity_view");
    expect(full["truthClass"]).toBe("artifact_history");
    expect(full).toHaveProperty("activeCausalWorkspace");
  });

  it("keeps MCP tool errors usable without structured content", async () => {
    const result = await client.callTool({
      name: "doctor",
      arguments: { detail: "everything" },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
    expect(extractText(result).length).toBeGreaterThan(0);
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

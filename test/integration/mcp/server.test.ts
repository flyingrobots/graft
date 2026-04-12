import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { TOOL_REGISTRY } from "../../../src/mcp/server.js";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { extractText, fixturePath, harnessPath } from "../../helpers/mcp.js";
/**
 * Integration tests: spawn the actual MCP server as a subprocess,
 * connect via stdio, and call tools through the MCP protocol.
 */
describe("integration: MCP server over stdio", () => {
  let client: Client;
  let transport: StdioClientTransport;
  let projectRoot: string;

  beforeAll(async () => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "graft-mcp-stdio-"));

    transport = new StdioClientTransport({
      command: harnessPath("node_modules", ".bin", "tsx"),
      args: [harnessPath("test/helpers/mcp-stdio.ts")],
      cwd: projectRoot,
      env: {
        GRAFT_TEST_PROJECT_ROOT: projectRoot,
        GRAFT_TEST_GRAFT_DIR: path.join(projectRoot, ".graft"),
      },
    });
    client = new Client({ name: "graft-test", version: "0.0.0" });
    await client.connect(transport);
  });

  afterAll(async () => {
    await client.close();
    fs.rmSync(projectRoot, { recursive: true, force: true });
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

  it("safe_read returns content for small files", async () => {
    const result = await client.callTool({
      name: "safe_read",
      arguments: { path: fixturePath("small.ts") },
    });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["projection"]).toBe("content");
    expect(parsed["content"]).toContain("greet");
  });

  it("safe_read returns outline for large files", async () => {
    const result = await client.callTool({
      name: "safe_read",
      arguments: { path: fixturePath("large.ts") },
    });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["projection"]).toBe("outline");
    expect(parsed["jumpTable"]).toBeDefined();
  });

  it("safe_read refuses binary files", async () => {
    const result = await client.callTool({
      name: "safe_read",
      arguments: { path: fixturePath("ban-targets/image.png") },
    });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["projection"]).toBe("refused");
    expect(parsed["reason"]).toBe("BINARY");
  });

  it("file_outline includes jump table", async () => {
    const result = await client.callTool({
      name: "file_outline",
      arguments: { path: fixturePath("medium.ts") },
    });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["outline"]).toBeDefined();
    expect(parsed["jumpTable"]).toBeDefined();
  });

  it("read_range returns bounded lines", async () => {
    const result = await client.callTool({
      name: "read_range",
      arguments: { path: fixturePath("medium.ts"), start: 1, end: 5 },
    });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["content"]).toBeDefined();
    expect(parsed["startLine"]).toBe(1);
    expect(parsed["endLine"]).toBe(5);
  });

  it("doctor returns health check", async () => {
    const result = await client.callTool({
      name: "doctor",
      arguments: {},
    });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["projectRoot"]).toBe(projectRoot);
    expect(parsed["parserHealthy"]).toBe(true);
  });

  it("stats returns metrics summary", async () => {
    const result = await client.callTool({
      name: "stats",
      arguments: {},
    });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["totalReads"]).toBeDefined();
  });
});

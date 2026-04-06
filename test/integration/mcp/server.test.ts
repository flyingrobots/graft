import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { TOOL_REGISTRY } from "../../../src/mcp/server.js";
/**
 * Integration tests: spawn the actual MCP server as a subprocess,
 * connect via stdio, and call tools through the MCP protocol.
 */
describe("integration: MCP server over stdio", () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: "node",
      args: ["--import", "tsx", "src/mcp/stdio.ts"],
      cwd: process.cwd(),
    });
    client = new Client({ name: "graft-test", version: "0.0.0" });
    await client.connect(transport);
  });

  afterAll(async () => {
    await client.close();
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
      arguments: { path: "test/fixtures/small.ts" },
    });
    const text = extractText(result);
    const parsed = JSON.parse(text) as Record<string, unknown>;
    expect(parsed["projection"]).toBe("content");
    expect(parsed["content"]).toContain("greet");
  });

  it("safe_read returns outline for large files", async () => {
    const result = await client.callTool({
      name: "safe_read",
      arguments: { path: "test/fixtures/large.ts" },
    });
    const text = extractText(result);
    const parsed = JSON.parse(text) as Record<string, unknown>;
    expect(parsed["projection"]).toBe("outline");
    expect(parsed["jumpTable"]).toBeDefined();
  });

  it("safe_read refuses binary files", async () => {
    const result = await client.callTool({
      name: "safe_read",
      arguments: { path: "test/fixtures/ban-targets/image.png" },
    });
    const text = extractText(result);
    const parsed = JSON.parse(text) as Record<string, unknown>;
    expect(parsed["projection"]).toBe("refused");
    expect(parsed["reason"]).toBe("BINARY");
  });

  it("file_outline includes jump table", async () => {
    const result = await client.callTool({
      name: "file_outline",
      arguments: { path: "test/fixtures/medium.ts" },
    });
    const text = extractText(result);
    const parsed = JSON.parse(text) as Record<string, unknown>;
    expect(parsed["outline"]).toBeDefined();
    expect(parsed["jumpTable"]).toBeDefined();
  });

  it("read_range returns bounded lines", async () => {
    const result = await client.callTool({
      name: "read_range",
      arguments: { path: "test/fixtures/medium.ts", start: 1, end: 5 },
    });
    const text = extractText(result);
    const parsed = JSON.parse(text) as Record<string, unknown>;
    expect(parsed["content"]).toBeDefined();
    expect(parsed["startLine"]).toBe(1);
    expect(parsed["endLine"]).toBe(5);
  });

  it("doctor returns health check", async () => {
    const result = await client.callTool({
      name: "doctor",
      arguments: {},
    });
    const text = extractText(result);
    const parsed = JSON.parse(text) as Record<string, unknown>;
    expect(parsed["projectRoot"]).toBeDefined();
    expect(parsed["parserHealthy"]).toBe(true);
  });

  it("stats returns metrics summary", async () => {
    const result = await client.callTool({
      name: "stats",
      arguments: {},
    });
    const text = extractText(result);
    const parsed = JSON.parse(text) as Record<string, unknown>;
    expect(parsed["totalReads"]).toBeDefined();
  });
});

function extractText(result: unknown): string {
  const r = result as { content?: { type: string; text: string }[] };
  const textBlock = r.content?.find((c) => c.type === "text");
  if (!textBlock) throw new Error("No text content in MCP result");
  return textBlock.text;
}

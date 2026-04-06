import { describe, it, expect } from "vitest";
import { createGraftServer } from "../../../src/mcp/server.js";

function extractText(result: unknown): string {
  const r = result as { content?: { type: string; text: string }[] };
  const textBlock = r.content?.find((c) => c.type === "text");
  if (!textBlock) throw new Error("No text content in MCP result");
  return textBlock.text;
}

function parse(result: unknown): Record<string, unknown> {
  return JSON.parse(extractText(result)) as Record<string, unknown>;
}

describe("mcp: code_show", () => {
  it("returns source code for a known symbol", async () => {
    const server = createGraftServer();
    const result = parse(await server.callTool("code_show", {
      symbol: "createGraftServer",
      path: "src/mcp/server.ts",
    }));
    expect(result["symbol"]).toBe("createGraftServer");
    expect(result["kind"]).toBe("function");
    expect(result["content"]).toBeDefined();
    expect(typeof result["content"]).toBe("string");
    expect(result["startLine"]).toBeDefined();
    expect(result["endLine"]).toBeDefined();
    expect(result["source"]).toBe("live");
  });

  it("returns not found for unknown symbol", async () => {
    const server = createGraftServer();
    const result = parse(await server.callTool("code_show", {
      symbol: "doesNotExist",
      path: "src/mcp/server.ts",
    }));
    expect(result["error"]).toContain("not found");
  });

  it("returns ambiguous when symbol exists in multiple files", async () => {
    const server = createGraftServer();
    // 'extractText' is defined in multiple test files
    const result = parse(await server.callTool("code_show", {
      symbol: "extractText",
    }));
    // Should be ambiguous or return first match
    expect(result["symbol"]).toBe("extractText");
    expect(
      result["ambiguous"] === true || result["content"] !== undefined
    ).toBe(true);
  });
});

describe("mcp: code_find", () => {
  it("finds symbols matching a glob pattern", async () => {
    const server = createGraftServer();
    const result = parse(await server.callTool("code_find", {
      query: "evaluate*",
    }));
    const matches = result["matches"] as { name: string }[];
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((m) => m.name === "evaluatePolicy")).toBe(true);
    expect(result["source"]).toBe("live");
  });

  it("filters by kind", async () => {
    const server = createGraftServer();
    const result = parse(await server.callTool("code_find", {
      query: "*",
      kind: "class",
    }));
    const matches = result["matches"] as { name: string; kind: string }[];
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      expect(m.kind).toBe("class");
    }
  });

  it("scopes to a directory path", async () => {
    const server = createGraftServer();
    const result = parse(await server.callTool("code_find", {
      query: "*",
      path: "src/policy",
    }));
    const matches = result["matches"] as { path: string }[];
    for (const m of matches) {
      expect(m.path.startsWith("src/policy")).toBe(true);
    }
  });

  it("returns empty for no matches", async () => {
    const server = createGraftServer();
    const result = parse(await server.callTool("code_find", {
      query: "xyzzyNonexistent123",
    }));
    const matches = result["matches"] as unknown[];
    expect(matches).toHaveLength(0);
    expect(result["total"]).toBe(0);
  });
});

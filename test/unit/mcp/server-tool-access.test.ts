import { describe, expect, it } from "vitest";
import type { McpToolResult } from "../../../src/mcp/receipt.js";
import { parseToolPayload } from "../../../src/mcp/server-tool-access.js";

function textResult(text: string): McpToolResult {
  return { content: [{ type: "text", text }] };
}

describe("MCP server tool payload parsing", () => {
  it("prefers native structured content", () => {
    const result: McpToolResult = {
      content: [{ type: "text", text: '{"source":"text"}' }],
      structuredContent: { source: "structured" },
    };

    expect(parseToolPayload(result)).toEqual({ source: "structured" });
  });

  it("retains compatibility with legacy text-only results", () => {
    expect(parseToolPayload(textResult('{"source":"text"}'))).toEqual({
      source: "text",
    });
  });

  it("fails closed when present structured content is malformed", () => {
    const result = {
      content: [{ type: "text" as const, text: '{"source":"text"}' }],
      structuredContent: ["not", "an", "object"],
    } as unknown as McpToolResult;

    expect(parseToolPayload(result)).toBeNull();
  });

  it("returns null for malformed legacy text", () => {
    expect(parseToolPayload(textResult("not-json"))).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { callGraftTool, parseGraftToolPayload } from "../../../src/api/tool-bridge.js";
import type { GraftServer, McpToolResult } from "../../../src/mcp/server.js";

function createTextResult(text: string): McpToolResult {
  return {
    content: [{ type: "text", text }],
  };
}

function createStructuredResult(
  structuredContent: Record<string, unknown>,
  text = JSON.stringify(structuredContent),
): McpToolResult {
  return {
    content: [{ type: "text", text }],
    structuredContent,
  };
}

describe("api tool bridge", () => {
  it("parses object-shaped tool payloads", () => {
    const parsed = parseGraftToolPayload(createTextResult('{"ok":true,"count":1}'));

    expect(parsed).toEqual({ ok: true, count: 1 });
  });

  it("prefers native structured content over compatibility text", () => {
    const parsed = parseGraftToolPayload(createStructuredResult(
      { source: "structured" },
      '{"source":"text"}',
    ));

    expect(parsed).toEqual({ source: "structured" });
  });

  it("rejects malformed native structured content instead of hiding it with text", () => {
    const result = {
      content: [{ type: "text" as const, text: '{"ok":true}' }],
      structuredContent: ["not", "an", "object"],
    } as unknown as McpToolResult;

    expect(() => parseGraftToolPayload(result)).toThrow(
      "Graft tool structured result was not a JSON object",
    );
  });

  it("rejects non-object JSON payloads", () => {
    expect(() => parseGraftToolPayload(createTextResult('["not","an","object"]'))).toThrow(
      "Graft tool result was not a JSON object",
    );
  });

  it("validates tool payloads against the declared output schema", async () => {
    const graft = {
      callTool: () => Promise.resolve(createTextResult('{"projection":"bogus"}')),
    } as Pick<GraftServer, "callTool"> as GraftServer;

    await expect(callGraftTool(graft, "safe_read", { path: "app.ts" })).rejects.toThrow();
  });
});

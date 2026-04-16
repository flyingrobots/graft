import { describe, expect, it } from "vitest";
import { callGraftTool, parseGraftToolPayload } from "../../../src/api/tool-bridge.js";
import type { GraftServer, McpToolResult } from "../../../src/mcp/server.js";

function createTextResult(text: string): McpToolResult {
  return {
    content: [{ type: "text", text }],
  };
}

describe("api tool bridge", () => {
  it("parses object-shaped tool payloads", () => {
    const parsed = parseGraftToolPayload(createTextResult('{"ok":true,"count":1}'));

    expect(parsed).toEqual({ ok: true, count: 1 });
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

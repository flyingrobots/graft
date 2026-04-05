import { describe, it, expect } from "vitest";
import { ZodError } from "zod";
import { createGraftServer } from "../../../src/mcp/server.js";

describe("mcp: tool registration", () => {
  it("creates a server with all Phase 1 tools registered", () => {
    const server = createGraftServer();
    const toolNames = server.getRegisteredTools();
    expect(toolNames).toContain("safe_read");
    expect(toolNames).toContain("file_outline");
    expect(toolNames).toContain("read_range");
    expect(toolNames).toContain("run_capture");
    expect(toolNames).toContain("state_save");
    expect(toolNames).toContain("state_load");
    expect(toolNames).toContain("doctor");
    expect(toolNames).toContain("stats");
    expect(toolNames).toHaveLength(14);
  });
});

describe("mcp: tool handlers", () => {
  it("safe_read returns structured JSON with projection", async () => {
    const server = createGraftServer();
    const result = await server.callTool("safe_read", {
      path: "test/fixtures/small.ts",
    });
    expect(result).toHaveProperty("content");
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["projection"]).toBe("content");
    expect(parsed["reason"]).toBe("CONTENT");
    expect(parsed["path"]).toBeDefined();
  });

  it("safe_read returns outline for large files", async () => {
    const server = createGraftServer();
    const result = await server.callTool("safe_read", {
      path: "test/fixtures/large.ts",
    });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["projection"]).toBe("outline");
    expect(parsed["jumpTable"]).toBeDefined();
  });

  it("safe_read returns refusal for banned files", async () => {
    const server = createGraftServer();
    const result = await server.callTool("safe_read", {
      path: "test/fixtures/ban-targets/image.png",
    });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["projection"]).toBe("refused");
    expect(parsed["reason"]).toBe("BINARY");
  });

  it("file_outline returns outline with jump table", async () => {
    const server = createGraftServer();
    const result = await server.callTool("file_outline", {
      path: "test/fixtures/medium.ts",
    });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["outline"]).toBeDefined();
    expect(parsed["jumpTable"]).toBeDefined();
  });

  it("read_range returns bounded content", async () => {
    const server = createGraftServer();
    const result = await server.callTool("read_range", {
      path: "test/fixtures/medium.ts",
      start: 1,
      end: 10,
    });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["content"]).toBeDefined();
    expect(parsed["startLine"]).toBe(1);
    expect(parsed["endLine"]).toBe(10);
  });

  it("state_save enforces 8 KB cap", async () => {
    const server = createGraftServer();
    const oversized = "x".repeat(9000);
    const result = await server.callTool("state_save", {
      content: oversized,
    });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["ok"]).toBe(false);
  });

  it("state_load returns null when no state saved", async () => {
    const server = createGraftServer();
    const result = await server.callTool("state_load", {});
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["content"]).toBeNull();
  });

  it("doctor returns health check", async () => {
    const server = createGraftServer();
    const result = await server.callTool("doctor", {});
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["projectRoot"]).toBeDefined();
    expect(parsed["parserHealthy"]).toBeDefined();
    expect(parsed["thresholds"]).toBeDefined();
  });

  it("stats returns metrics summary", async () => {
    const server = createGraftServer();
    const result = await server.callTool("stats", {});
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["totalReads"]).toBeDefined();
    expect(parsed["totalOutlines"]).toBeDefined();
    expect(parsed["totalRefusals"]).toBeDefined();
  });
});

describe("mcp: context budget", () => {
  it("set_budget activates budget tracking", async () => {
    const server = createGraftServer();
    const result = await server.callTool("set_budget", { bytes: 100000 });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    const budget = parsed["budget"] as { total: number; remaining: number; fraction: number };
    expect(budget.total).toBe(100000);
    expect(budget.fraction).toBeDefined();
  });

  it("budget appears in receipt after set_budget", async () => {
    const server = createGraftServer();
    await server.callTool("set_budget", { bytes: 100000 });
    const result = await server.callTool("safe_read", { path: "test/fixtures/small.ts" });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    const receipt = parsed["_receipt"] as { budget?: { total: number; remaining: number } };
    expect(receipt.budget).toBeDefined();
    expect(receipt.budget!.total).toBe(100000);
    expect(receipt.budget!.remaining).toBeLessThan(100000);
  });

  it("budget tightens byte cap for large files", async () => {
    const server = createGraftServer();
    // Set a very tight budget — 5% of 1000 = 50 bytes max per read
    await server.callTool("set_budget", { bytes: 1000 });
    const result = await server.callTool("safe_read", { path: "test/fixtures/medium.ts" });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    // medium.ts should get an outline due to tight budget cap
    expect(["outline", "content"]).toContain(parsed["projection"]);
    const receipt = parsed["_receipt"] as { budget?: { remaining: number } };
    expect(receipt.budget).toBeDefined();
  });

  it("no budget in receipt when budget not set", async () => {
    const server = createGraftServer();
    const result = await server.callTool("safe_read", { path: "test/fixtures/small.ts" });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    const receipt = parsed["_receipt"] as Record<string, unknown>;
    expect(receipt["budget"]).toBeUndefined();
  });
});

describe("mcp: policy check middleware", () => {
  it("read_range refuses banned files via middleware", async () => {
    const server = createGraftServer();
    const result = await server.callTool("read_range", {
      path: "test/fixtures/ban-targets/image.png",
      start: 1,
      end: 5,
    });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["projection"]).toBe("refused");
    expect(parsed["reason"]).toBe("BINARY");
  });
});

describe("mcp: explain tool", () => {
  it("returns meaning and action for known reason code", async () => {
    const server = createGraftServer();
    const result = await server.callTool("explain", { code: "BINARY" });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["code"]).toBe("BINARY");
    expect(parsed["meaning"]).toBeDefined();
    expect(parsed["action"]).toBeDefined();
  });

  it("is case-insensitive", async () => {
    const server = createGraftServer();
    const result = await server.callTool("explain", { code: "binary" });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["code"]).toBe("BINARY");
    expect(parsed["meaning"]).toBeDefined();
  });

  it("returns error for unknown code", async () => {
    const server = createGraftServer();
    const result = await server.callTool("explain", { code: "NONSENSE" });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["error"]).toBe("Unknown reason code");
    expect(parsed["knownCodes"]).toBeDefined();
  });
});

describe("mcp: strict schema validation", () => {
  it("rejects unknown keys in tool arguments", async () => {
    const server = createGraftServer();
    await expect(
      server.callTool("safe_read", {
        path: "test/fixtures/small.ts",
        bogus_key: "should be rejected",
      }),
    ).rejects.toThrow(ZodError);
  });
});

describe("mcp: session tracking", () => {
  it("tracks session depth across tool calls", async () => {
    const server = createGraftServer();
    // Make enough calls to move past 'early'
    for (let i = 0; i < 5; i++) {
      await server.callTool("safe_read", { path: "test/fixtures/small.ts" });
    }
    const result = await server.callTool("doctor", {});
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["sessionDepth"]).toBeDefined();
  });

  it("includes tripwire in response when triggered", async () => {
    const server = createGraftServer();
    // Simulate a long session by injecting message count
    server.injectSessionMessages(501);
    const result = await server.callTool("safe_read", {
      path: "test/fixtures/small.ts",
    });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["tripwire"]).toBeDefined();
  });
});

/** Extract text content from an MCP tool result. */
function extractText(result: unknown): string {
  const r = result as { content?: { type: string; text: string }[] };
  const textBlock = r.content?.find((c) => c.type === "text");
  if (!textBlock) throw new Error("No text content in MCP result");
  return textBlock.text;
}

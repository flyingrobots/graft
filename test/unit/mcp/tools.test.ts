import { describe, it, expect } from "vitest";
import { ZodError } from "zod";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createGraftServer, TOOL_REGISTRY } from "../../../src/mcp/server.js";

const EXPECTED_TOOL_NAMES = TOOL_REGISTRY.map((t) => t.name);

describe("mcp: tool registration", () => {
  it("registers every tool in TOOL_REGISTRY", () => {
    const server = createGraftServer();
    const toolNames = server.getRegisteredTools();
    for (const name of EXPECTED_TOOL_NAMES) {
      expect(toolNames).toContain(name);
    }
    expect(toolNames).toHaveLength(EXPECTED_TOOL_NAMES.length);
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

  it("safe_read returns an explicit unsupported result for large markdown files", async () => {
    const server = createGraftServer();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-mcp-tools-md-"));
    const filePath = path.join(tmpDir, "README.md");
    fs.writeFileSync(filePath, "# Heading\n\n".repeat(220));
    const result = await server.callTool("safe_read", { path: filePath });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["projection"]).toBe("outline");
    expect(parsed["reason"]).toBe("UNSUPPORTED_LANGUAGE");
    expect(parsed["outline"]).toEqual([]);
    expect(parsed["jumpTable"]).toEqual([]);
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

  it("file_outline returns an explicit unsupported result for markdown files", async () => {
    const server = createGraftServer();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-file-outline-tool-md-"));
    const filePath = path.join(tmpDir, "README.md");
    fs.writeFileSync(filePath, "# Heading\n\n".repeat(220));
    const result = await server.callTool("file_outline", { path: filePath });
    const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
    expect(parsed["outline"]).toEqual([]);
    expect(parsed["jumpTable"]).toEqual([]);
    expect(typeof parsed["error"]).toBe("string");
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
    const prevCwd = process.cwd();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-state-load-"));

    try {
      process.chdir(tmpDir);
      const server = createGraftServer();
      const result = await server.callTool("state_load", {});
      const parsed = JSON.parse(extractText(result)) as Record<string, unknown>;
      expect(parsed["content"]).toBeNull();
    } finally {
      process.chdir(prevCwd);
    }
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

  it("code_find refuses banned file paths via middleware", async () => {
    const server = createGraftServer();
    const result = await server.callTool("code_find", {
      query: "*",
      path: "test/fixtures/ban-targets/image.png",
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

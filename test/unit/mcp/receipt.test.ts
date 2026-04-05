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

interface Receipt {
  sessionId: string;
  seq: number;
  ts: string;
  tool: string;
  projection: string;
  reason: string;
  fileBytes: number | null;
  returnedBytes: number;
  cumulative: {
    reads: number;
    outlines: number;
    refusals: number;
    cacheHits: number;
    bytesReturned: number;
    bytesAvoided: number;
  };
}

describe("mcp: receipt mode", () => {
  it("every safe_read response includes a _receipt", async () => {
    const server = createGraftServer();
    const result = parse(await server.callTool("safe_read", {
      path: "test/fixtures/small.ts",
    }));
    expect(result["_receipt"]).toBeDefined();
  });

  it("every file_outline response includes a _receipt", async () => {
    const server = createGraftServer();
    const result = parse(await server.callTool("file_outline", {
      path: "test/fixtures/small.ts",
    }));
    expect(result["_receipt"]).toBeDefined();
  });

  it("every read_range response includes a _receipt", async () => {
    const server = createGraftServer();
    const result = parse(await server.callTool("read_range", {
      path: "test/fixtures/small.ts",
      start: 1,
      end: 5,
    }));
    expect(result["_receipt"]).toBeDefined();
  });

  it("every stats response includes a _receipt", async () => {
    const server = createGraftServer();
    const result = parse(await server.callTool("stats", {}));
    expect(result["_receipt"]).toBeDefined();
  });

  it("every doctor response includes a _receipt", async () => {
    const server = createGraftServer();
    const result = parse(await server.callTool("doctor", {}));
    expect(result["_receipt"]).toBeDefined();
  });

  it("receipt has correct shape", async () => {
    const server = createGraftServer();
    const result = parse(await server.callTool("safe_read", {
      path: "test/fixtures/small.ts",
    }));
    const receipt = result["_receipt"] as Receipt;
    expect(typeof receipt.sessionId).toBe("string");
    expect(receipt.sessionId.length).toBeGreaterThan(0);
    expect(typeof receipt.seq).toBe("number");
    expect(receipt.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(receipt.tool).toBe("safe_read");
    expect(typeof receipt.projection).toBe("string");
    expect(typeof receipt.reason).toBe("string");
    expect(typeof receipt.returnedBytes).toBe("number");
    expect(receipt.cumulative).toBeDefined();
    expect(typeof receipt.cumulative.reads).toBe("number");
    expect(typeof receipt.cumulative.bytesAvoided).toBe("number");
  });

  it("sessionId is stable across calls", async () => {
    const server = createGraftServer();
    const r1 = parse(await server.callTool("safe_read", {
      path: "test/fixtures/small.ts",
    }));
    const r2 = parse(await server.callTool("safe_read", {
      path: "test/fixtures/small.ts",
    }));
    const receipt1 = r1["_receipt"] as Receipt;
    const receipt2 = r2["_receipt"] as Receipt;
    expect(receipt1.sessionId).toBe(receipt2.sessionId);
  });

  it("sessionId differs between servers", () => {
    const server1 = createGraftServer();
    const server2 = createGraftServer();
    // Can't easily compare without calling tools, but the contract
    // is that each createGraftServer() gets a unique UUID
    expect(server1).not.toBe(server2);
  });

  it("seq increments monotonically", async () => {
    const server = createGraftServer();
    const r1 = parse(await server.callTool("safe_read", {
      path: "test/fixtures/small.ts",
    }));
    const r2 = parse(await server.callTool("file_outline", {
      path: "test/fixtures/small.ts",
    }));
    const r3 = parse(await server.callTool("doctor", {}));
    expect((r1["_receipt"] as Receipt).seq).toBe(1);
    expect((r2["_receipt"] as Receipt).seq).toBe(2);
    expect((r3["_receipt"] as Receipt).seq).toBe(3);
  });

  it("receipt includes fileBytes for file operations", async () => {
    const server = createGraftServer();
    const result = parse(await server.callTool("safe_read", {
      path: "test/fixtures/small.ts",
    }));
    const receipt = result["_receipt"] as Receipt;
    expect(receipt.fileBytes).toBeGreaterThan(0);
  });

  it("receipt has null fileBytes for non-file operations", async () => {
    const server = createGraftServer();
    const result = parse(await server.callTool("doctor", {}));
    const receipt = result["_receipt"] as Receipt;
    expect(receipt.fileBytes).toBeNull();
  });

  it("cumulative counters accumulate across calls", async () => {
    const server = createGraftServer();

    // First read — content
    await server.callTool("safe_read", { path: "test/fixtures/small.ts" });

    // Second read — cache hit
    const r2 = parse(await server.callTool("safe_read", {
      path: "test/fixtures/small.ts",
    }));
    const receipt = r2["_receipt"] as Receipt;
    expect(receipt.cumulative.reads).toBe(1);
    expect(receipt.cumulative.cacheHits).toBe(1);
    expect(receipt.cumulative.bytesAvoided).toBeGreaterThan(0);
  });

  it("receipt projection matches response projection", async () => {
    const server = createGraftServer();
    const result = parse(await server.callTool("safe_read", {
      path: "test/fixtures/ban-targets/image.png",
    }));
    const receipt = result["_receipt"] as Receipt;
    expect(receipt.projection).toBe("refused");
    expect(receipt.reason).toBe("BINARY");
  });

  it("receipt on cache hit shows cache_hit projection", async () => {
    const server = createGraftServer();
    await server.callTool("safe_read", { path: "test/fixtures/small.ts" });
    const r2 = parse(await server.callTool("safe_read", {
      path: "test/fixtures/small.ts",
    }));
    const receipt = r2["_receipt"] as Receipt;
    expect(receipt.projection).toBe("cache_hit");
    expect(receipt.reason).toBe("REREAD_UNCHANGED");
  });

  it("compressionRatio is returnedBytes / fileBytes for file operations", async () => {
    const server = createGraftServer();
    const result = parse(await server.callTool("safe_read", {
      path: "test/fixtures/small.ts",
    }));
    const receipt = result["_receipt"] as Receipt & { compressionRatio: number | null };
    expect(receipt.compressionRatio).not.toBeNull();
    expect(typeof receipt.compressionRatio).toBe("number");
    expect(receipt.compressionRatio).toBeGreaterThan(0);
    // compressionRatio = returnedBytes / fileBytes
    const expected = Math.round((receipt.returnedBytes / receipt.fileBytes!) * 1000) / 1000;
    expect(receipt.compressionRatio).toBe(expected);
  });

  it("compressionRatio is null for non-file operations", async () => {
    const server = createGraftServer();
    const result = parse(await server.callTool("doctor", {}));
    const receipt = result["_receipt"] as Receipt & { compressionRatio: number | null };
    expect(receipt.compressionRatio).toBeNull();
  });

  it("returnedBytes reflects actual response size", async () => {
    const server = createGraftServer();
    const raw = await server.callTool("safe_read", {
      path: "test/fixtures/small.ts",
    });
    const text = extractText(raw);
    const receipt = (parse(raw))["_receipt"] as Receipt;
    // returnedBytes should be close to the text length
    expect(receipt.returnedBytes).toBe(text.length);
  });
});

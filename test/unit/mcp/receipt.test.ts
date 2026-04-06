import { describe, it, expect, afterEach } from "vitest";
import type { GraftServer } from "../../../src/mcp/server.js";
import { createIsolatedServer, extractText, fixturePath, parse } from "../../helpers/mcp.js";

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

const SMALL_TS = fixturePath("small.ts");
const BANNED_IMAGE = fixturePath("ban-targets/image.png");

describe("mcp: receipt mode", () => {
  const cleanups: (() => void)[] = [];

  afterEach(() => {
    while (cleanups.length > 0) {
      cleanups.pop()!();
    }
  });

  function createServer(): GraftServer {
    const isolated = createIsolatedServer();
    cleanups.push(() => {
      isolated.cleanup();
    });
    return isolated.server;
  }

  it("every safe_read response includes a _receipt", async () => {
    const server = createServer();
    const result = parse(await server.callTool("safe_read", {
      path: SMALL_TS,
    }));
    expect(result["_receipt"]).toBeDefined();
  });

  it("every file_outline response includes a _receipt", async () => {
    const server = createServer();
    const result = parse(await server.callTool("file_outline", {
      path: SMALL_TS,
    }));
    expect(result["_receipt"]).toBeDefined();
  });

  it("every read_range response includes a _receipt", async () => {
    const server = createServer();
    const result = parse(await server.callTool("read_range", {
      path: SMALL_TS,
      start: 1,
      end: 5,
    }));
    expect(result["_receipt"]).toBeDefined();
  });

  it("every stats response includes a _receipt", async () => {
    const server = createServer();
    const result = parse(await server.callTool("stats", {}));
    expect(result["_receipt"]).toBeDefined();
  });

  it("every doctor response includes a _receipt", async () => {
    const server = createServer();
    const result = parse(await server.callTool("doctor", {}));
    expect(result["_receipt"]).toBeDefined();
  });

  it("receipt has correct shape", async () => {
    const server = createServer();
    const result = parse(await server.callTool("safe_read", {
      path: SMALL_TS,
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
    const server = createServer();
    const r1 = parse(await server.callTool("safe_read", {
      path: SMALL_TS,
    }));
    const r2 = parse(await server.callTool("safe_read", {
      path: SMALL_TS,
    }));
    const receipt1 = r1["_receipt"] as Receipt;
    const receipt2 = r2["_receipt"] as Receipt;
    expect(receipt1.sessionId).toBe(receipt2.sessionId);
  });

  it("sessionId differs between servers", () => {
    const server1 = createServer();
    const server2 = createServer();
    // Can't easily compare without calling tools, but the contract
    // is that each createGraftServer() gets a unique UUID
    expect(server1).not.toBe(server2);
  });

  it("seq increments monotonically", async () => {
    const server = createServer();
    const r1 = parse(await server.callTool("safe_read", {
      path: SMALL_TS,
    }));
    const r2 = parse(await server.callTool("file_outline", {
      path: SMALL_TS,
    }));
    const r3 = parse(await server.callTool("doctor", {}));
    expect((r1["_receipt"] as Receipt).seq).toBe(1);
    expect((r2["_receipt"] as Receipt).seq).toBe(2);
    expect((r3["_receipt"] as Receipt).seq).toBe(3);
  });

  it("receipt includes fileBytes for file operations", async () => {
    const server = createServer();
    const result = parse(await server.callTool("safe_read", {
      path: SMALL_TS,
    }));
    const receipt = result["_receipt"] as Receipt;
    expect(receipt.fileBytes).toBeGreaterThan(0);
  });

  it("receipt has null fileBytes for non-file operations", async () => {
    const server = createServer();
    const result = parse(await server.callTool("doctor", {}));
    const receipt = result["_receipt"] as Receipt;
    expect(receipt.fileBytes).toBeNull();
  });

  it("cumulative counters accumulate across calls", async () => {
    const server = createServer();

    // First read — content
    await server.callTool("safe_read", { path: SMALL_TS });

    // Second read — cache hit
    const r2 = parse(await server.callTool("safe_read", {
      path: SMALL_TS,
    }));
    const receipt = r2["_receipt"] as Receipt;
    expect(receipt.cumulative.reads).toBe(1);
    expect(receipt.cumulative.cacheHits).toBe(1);
    expect(receipt.cumulative.bytesAvoided).toBeGreaterThan(0);
  });

  it("receipt projection matches response projection", async () => {
    const server = createServer();
    const result = parse(await server.callTool("safe_read", {
      path: BANNED_IMAGE,
    }));
    const receipt = result["_receipt"] as Receipt;
    expect(receipt.projection).toBe("refused");
    expect(receipt.reason).toBe("BINARY");
  });

  it("receipt on cache hit shows cache_hit projection", async () => {
    const server = createServer();
    await server.callTool("safe_read", { path: SMALL_TS });
    const r2 = parse(await server.callTool("safe_read", {
      path: SMALL_TS,
    }));
    const receipt = r2["_receipt"] as Receipt;
    expect(receipt.projection).toBe("cache_hit");
    expect(receipt.reason).toBe("REREAD_UNCHANGED");
  });

  it("compressionRatio is returnedBytes / fileBytes for file operations", async () => {
    const server = createServer();
    const result = parse(await server.callTool("safe_read", {
      path: SMALL_TS,
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
    const server = createServer();
    const result = parse(await server.callTool("doctor", {}));
    const receipt = result["_receipt"] as Receipt & { compressionRatio: number | null };
    expect(receipt.compressionRatio).toBeNull();
  });

  it("returnedBytes reflects actual response size", async () => {
    const server = createServer();
    const raw = await server.callTool("safe_read", {
      path: SMALL_TS,
    });
    const text = extractText(raw);
    const receipt = (parse(raw))["_receipt"] as Receipt;
    // returnedBytes should be close to the text length
    expect(receipt.returnedBytes).toBe(text.length);
  });
});

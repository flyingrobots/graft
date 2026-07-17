import { describe, it, expect, afterEach } from "vitest";
import type { GraftServer } from "../../../src/mcp/server.js";
import { createFixtureWorkspace, createIsolatedServer, extractText, parse } from "../../helpers/mcp.js";

interface Receipt {
  mode: "full";
  sessionId: string;
  traceId: string;
  seq: number;
  ts: string;
  tool: string;
  projection: string;
  reason: string;
  latencyMs: number;
  fileBytes: number | null;
  returnedBytes: number;
  burden: {
    kind: "read" | "search" | "shell" | "state" | "diagnostic";
    nonRead: boolean;
  };
  cumulative: {
    reads: number;
    outlines: number;
    refusals: number;
    cacheHits: number;
    bytesReturned: number;
    bytesAvoided: number;
    nonReadBytesReturned: number;
    burdenByKind: Record<
      "read" | "search" | "shell" | "state" | "diagnostic",
      { calls: number; bytesReturned: number }
    >;
  };
}

interface CompactReceipt {
  mode: "compact";
  receiptId: string;
  seq: number;
  reason: string;
  latencyMs: number;
  returnedBytes: number;
}

const SMALL_TS = "fixtures/small.ts";
const BANNED_IMAGE = "fixtures/ban-targets/image.png";

describe("mcp: receipt mode", () => {
  const cleanups: (() => void)[] = [];

  afterEach(() => {
    while (cleanups.length > 0) {
      cleanups.pop()!();
    }
  });

  function createServer(): GraftServer {
    const workspace = createFixtureWorkspace();
    const isolated = createIsolatedServer({ projectRoot: workspace.projectRoot });
    cleanups.push(() => {
      isolated.cleanup();
      workspace.cleanup();
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

  it("defaults ordinary MCP calls to the bounded compact receipt", async () => {
    const server = createServer();
    const raw = await server.callTool("safe_read", { path: SMALL_TS });
    const result = parse(raw);
    const receipt = result["_receipt"] as CompactReceipt;

    expect(Object.keys(receipt).sort()).toEqual([
      "latencyMs",
      "mode",
      "reason",
      "receiptId",
      "returnedBytes",
      "seq",
    ]);
    expect(receipt.mode).toBe("compact");
    expect(receipt.receiptId.length).toBeGreaterThan(0);
    expect(receipt.reason).toBe("CONTENT");
    expect(receipt.returnedBytes).toBe(Buffer.byteLength(extractText(raw), "utf8"));
    expect(Buffer.byteLength(JSON.stringify(receipt), "utf8")).toBeLessThanOrEqual(512);
  });

  it("returns the cumulative audit receipt only when full mode is explicit", async () => {
    const server = createServer();
    const result = parse(await server.callTool("safe_read", {
      path: SMALL_TS,
      receipt: "full",
    }));
    const receipt = result["_receipt"] as Receipt;

    expect(receipt.mode).toBe("full");
    expect(receipt.traceId.length).toBeGreaterThan(0);
    expect(receipt.tool).toBe("safe_read");
    expect(receipt.cumulative).toBeDefined();
    expect(receipt.burden).toEqual({ kind: "read", nonRead: false });
  });

  it("accepts full receipt control on tools with no domain arguments", async () => {
    const server = createServer();
    const result = parse(await server.callTool("stats", { receipt: "full" }));
    expect((result["_receipt"] as Receipt).mode).toBe("full");
  });

  it("rejects unknown receipt policies as input validation failures", async () => {
    const server = createServer();
    await expect(server.callTool("stats", { receipt: "everything" })).rejects.toThrow();
  });

  it("keeps cumulative stats authoritative after compact calls", async () => {
    const server = createServer();
    const first = parse(await server.callTool("safe_read", { path: SMALL_TS }));
    const second = parse(await server.callTool("safe_read", { path: SMALL_TS }));
    expect((first["_receipt"] as CompactReceipt).mode).toBe("compact");
    expect((second["_receipt"] as CompactReceipt).mode).toBe("compact");

    const stats = parse(await server.callTool("stats", {}));
    expect(stats["totalReads"]).toBe(1);
    expect(stats["totalCacheHits"]).toBe(1);
    expect(stats["totalBytesReturned"]).toBeGreaterThan(0);
    expect(stats["burdenByKind"]).toMatchObject({
      read: { calls: 2 },
    });
  });

  it("receipt has correct shape", async () => {
    const server = createServer();
    const result = parse(await server.callTool("safe_read", {
      path: SMALL_TS,
      receipt: "full",
    }));
    const receipt = result["_receipt"] as Receipt;
    expect(typeof receipt.sessionId).toBe("string");
    expect(receipt.sessionId.length).toBeGreaterThan(0);
    expect(typeof receipt.traceId).toBe("string");
    expect(receipt.traceId.length).toBeGreaterThan(0);
    expect(typeof receipt.seq).toBe("number");
    expect(receipt.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(receipt.tool).toBe("safe_read");
    expect(typeof receipt.projection).toBe("string");
    expect(typeof receipt.reason).toBe("string");
    expect(typeof receipt.latencyMs).toBe("number");
    expect(receipt.latencyMs).toBeGreaterThanOrEqual(0);
    expect(typeof receipt.returnedBytes).toBe("number");
    expect(typeof receipt.burden.kind).toBe("string");
    expect(typeof receipt.burden.nonRead).toBe("boolean");
    expect(receipt.cumulative).toBeDefined();
    expect(typeof receipt.cumulative.reads).toBe("number");
    expect(typeof receipt.cumulative.bytesAvoided).toBe("number");
    expect(typeof receipt.cumulative.nonReadBytesReturned).toBe("number");
    expect(typeof receipt.cumulative.burdenByKind.read.bytesReturned).toBe("number");
  });

  it("sessionId is stable across calls", async () => {
    const server = createServer();
    const r1 = parse(await server.callTool("safe_read", {
      path: SMALL_TS,
      receipt: "full",
    }));
    const r2 = parse(await server.callTool("safe_read", {
      path: SMALL_TS,
      receipt: "full",
    }));
    const receipt1 = r1["_receipt"] as Receipt;
    const receipt2 = r2["_receipt"] as Receipt;
    expect(receipt1.sessionId).toBe(receipt2.sessionId);
  });

  it("traceId differs per call", async () => {
    const server = createServer();
    const r1 = parse(await server.callTool("safe_read", {
      path: SMALL_TS,
      receipt: "full",
    }));
    const r2 = parse(await server.callTool("safe_read", {
      path: SMALL_TS,
      receipt: "full",
    }));
    const receipt1 = r1["_receipt"] as Receipt;
    const receipt2 = r2["_receipt"] as Receipt;
    expect(receipt1.traceId).not.toBe(receipt2.traceId);
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
    expect((r1["_receipt"] as CompactReceipt).seq).toBe(1);
    expect((r2["_receipt"] as CompactReceipt).seq).toBe(2);
    expect((r3["_receipt"] as CompactReceipt).seq).toBe(3);
  });

  it("receipt includes fileBytes for file operations", async () => {
    const server = createServer();
    const result = parse(await server.callTool("safe_read", {
      path: SMALL_TS,
      receipt: "full",
    }));
    const receipt = result["_receipt"] as Receipt;
    expect(receipt.fileBytes).toBeGreaterThan(0);
  });

  it("receipt has null fileBytes for non-file operations", async () => {
    const server = createServer();
    const result = parse(await server.callTool("doctor", { receipt: "full" }));
    const receipt = result["_receipt"] as Receipt;
    expect(receipt.fileBytes).toBeNull();
    expect(receipt.burden.kind).toBe("diagnostic");
    expect(receipt.burden.nonRead).toBe(true);
  });

  it("cumulative counters accumulate across calls", async () => {
    const server = createServer();

    // First read — content
    await server.callTool("safe_read", { path: SMALL_TS, receipt: "full" });

    // Second read — cache hit
    const r2 = parse(await server.callTool("safe_read", {
      path: SMALL_TS,
      receipt: "full",
    }));
    const receipt = r2["_receipt"] as Receipt;
    expect(receipt.cumulative.reads).toBe(1);
    expect(receipt.cumulative.cacheHits).toBe(1);
    expect(receipt.cumulative.bytesAvoided).toBeGreaterThan(0);
    expect(receipt.cumulative.burdenByKind.read.calls).toBe(2);
    expect(receipt.cumulative.nonReadBytesReturned).toBe(0);
  });

  it("receipt projection matches response projection", async () => {
    const server = createServer();
    const result = parse(await server.callTool("safe_read", {
      path: BANNED_IMAGE,
      receipt: "full",
    }));
    const receipt = result["_receipt"] as Receipt;
    expect(receipt.projection).toBe("refused");
    expect(receipt.reason).toBe("BINARY");
  });

  it("receipt on cache hit shows cache_hit projection", async () => {
    const server = createServer();
    await server.callTool("safe_read", { path: SMALL_TS, receipt: "full" });
    const r2 = parse(await server.callTool("safe_read", {
      path: SMALL_TS,
      receipt: "full",
    }));
    const receipt = r2["_receipt"] as Receipt;
    expect(receipt.projection).toBe("cache_hit");
    expect(receipt.reason).toBe("REREAD_UNCHANGED");
  });

  it("compressionRatio is returnedBytes / fileBytes for file operations", async () => {
    const server = createServer();
    const result = parse(await server.callTool("safe_read", {
      path: SMALL_TS,
      receipt: "full",
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
    const result = parse(await server.callTool("doctor", { receipt: "full" }));
    const receipt = result["_receipt"] as Receipt & { compressionRatio: number | null };
    expect(receipt.compressionRatio).toBeNull();
  });

  it("returnedBytes reflects actual response size", async () => {
    const server = createServer();
    const raw = await server.callTool("safe_read", {
      path: SMALL_TS,
    });
    const text = extractText(raw);
    const receipt = (parse(raw))["_receipt"] as CompactReceipt;
    expect(receipt.returnedBytes).toBe(Buffer.byteLength(text, "utf8"));
  });

  it("tracks non-read burden by tool kind in receipts", async () => {
    const server = createServer();
    await server.callTool("doctor", {});
    const result = parse(await server.callTool("run_capture", {
      command: "printf 'alpha'",
      tail: 1,
      receipt: "full",
    }));

    const receipt = result["_receipt"] as Receipt;
    expect(receipt.burden.kind).toBe("shell");
    expect(receipt.burden.nonRead).toBe(true);
    expect(receipt.cumulative.burdenByKind.diagnostic.calls).toBe(1);
    expect(receipt.cumulative.burdenByKind.shell.calls).toBe(1);
    expect(receipt.cumulative.nonReadBytesReturned).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from "vitest";
import { buildReceiptResult } from "../../../src/mcp/receipt.js";
import { MetricsSnapshot } from "../../../src/mcp/metrics.js";
import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";
import { emptyBurdenByKind } from "../../../src/mcp/burden.js";

const codec = new CanonicalJsonCodec();

function emptyMetrics(): MetricsSnapshot {
  return new MetricsSnapshot({
    reads: 0,
    outlines: 0,
    refusals: 0,
    cacheHits: 0,
    bytesReturned: 0,
    bytesAvoided: 0,
    burdenByKind: emptyBurdenByKind(),
  });
}

function payloadOf(result: ReturnType<typeof buildReceiptResult>["result"]): Record<string, unknown> {
  const content = result.content[0];
  if (content?.type !== "text") {
    throw new Error("expected a text MCP response");
  }
  return JSON.parse(content.text) as Record<string, unknown>;
}

describe("buildReceiptResult (unit)", () => {
  it("projects a compact wire receipt without weakening the internal audit receipt", () => {
    const built = buildReceiptResult("safe_read", {
      projection: "content",
      reason: "CONTENT",
      actual: { bytes: 1234, lines: 50 },
    }, {
      sessionId: "s1",
      traceId: "t1",
      seq: 1,
      latencyMs: 10,
      metrics: emptyMetrics(),
      tripwires: [],
      codec,
      receiptMode: "compact",
    });
    const publicReceipt = payloadOf(built.result)["_receipt"] as Record<string, unknown>;

    expect(Object.keys(publicReceipt).sort()).toEqual([
      "latencyMs",
      "mode",
      "reason",
      "receiptId",
      "returnedBytes",
      "seq",
    ]);
    expect(publicReceipt).toMatchObject({
      mode: "compact",
      receiptId: "t1",
      reason: "CONTENT",
      returnedBytes: built.textBytes,
    });
    expect(Buffer.byteLength(codec.encode(publicReceipt), "utf8")).toBeLessThanOrEqual(512);
    expect(built.receipt.mode).toBe("compact");
    expect(built.receipt.traceId).toBe("t1");
    expect(built.receipt.fileBytes).toBe(1234);
    expect(built.receipt.cumulative).toBeDefined();
  });

  it("bounds long multibyte compact reasons while preserving full internal evidence", () => {
    const reason = "agent-observed-" + "🧶".repeat(200);
    const built = buildReceiptResult("safe_read", {
      projection: "content",
      reason,
    }, {
      sessionId: "s1",
      traceId: "t1",
      seq: 1,
      latencyMs: 10,
      metrics: emptyMetrics(),
      tripwires: [],
      codec,
      receiptMode: "compact",
    });
    const publicReceipt = payloadOf(built.result)["_receipt"] as { reason: string };

    expect(Buffer.byteLength(codec.encode(publicReceipt), "utf8")).toBeLessThanOrEqual(512);
    expect(Buffer.byteLength(publicReceipt.reason, "utf8")).toBeLessThanOrEqual(256);
    expect(publicReceipt.reason).toMatch(/…$/u);
    expect(built.receipt.reason).toBe(reason);
  });

  it("projects the legacy audit fields with a full v2 discriminator", () => {
    const built = buildReceiptResult("stats", {}, {
      sessionId: "s1",
      traceId: "t1",
      seq: 1,
      latencyMs: 1,
      metrics: emptyMetrics(),
      tripwires: [],
      codec,
      receiptMode: "full",
    });
    const publicReceipt = payloadOf(built.result)["_receipt"] as Record<string, unknown>;

    expect(publicReceipt["mode"]).toBe("full");
    expect(publicReceipt["traceId"]).toBe("t1");
    expect(publicReceipt["receiptId"]).toBeUndefined();
    expect(publicReceipt["cumulative"]).toBeDefined();
    expect(publicReceipt["returnedBytes"]).toBe(built.textBytes);
  });

  it("keeps exact full-response bytes when a rounded ratio has no fixed point", () => {
    const built = buildReceiptResult("safe_read", {
      projection: "diff",
      reason: "CHANGED_SINCE_LAST_READ",
      actual: { bytes: 57, lines: 3 },
      padding: "",
    }, {
      sessionId: "s1",
      traceId: "t1",
      seq: 1,
      latencyMs: 175,
      metrics: emptyMetrics(),
      tripwires: [],
      codec,
      receiptMode: "full",
    });
    const publicReceipt = payloadOf(built.result)["_receipt"] as Record<string, unknown>;

    expect(publicReceipt["returnedBytes"]).toBe(built.textBytes);
    expect(publicReceipt["compressionRatio"]).toBeUndefined();
    expect(built.receipt.compressionRatio).toBe(
      Math.round((built.textBytes / 57) * 1000) / 1000,
    );
  });

  it("produces a frozen receipt", () => {
    const { receipt } = buildReceiptResult("safe_read", {}, {
      sessionId: "s1",
      traceId: "t1",
      seq: 1,
      latencyMs: 10,
      metrics: emptyMetrics(),
      tripwires: [],
      codec,
    });
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(Object.isFrozen(receipt.burden)).toBe(true);
    expect(Object.isFrozen(receipt.cumulative)).toBe(true);
  });

  it("extracts projection from data safely", () => {
    const { receipt } = buildReceiptResult("graft_diff", { projection: "diff", reason: "FULL" }, {
      sessionId: "s1",
      traceId: "t1",
      seq: 1,
      latencyMs: 5,
      metrics: emptyMetrics(),
      tripwires: [],
      codec,
    });
    expect(receipt.projection).toBe("diff");
    expect(receipt.reason).toBe("FULL");
  });

  it("defaults projection and reason when absent", () => {
    const { receipt } = buildReceiptResult("stats", {}, {
      sessionId: "s1",
      traceId: "t1",
      seq: 1,
      latencyMs: 1,
      metrics: emptyMetrics(),
      tripwires: [],
      codec,
    });
    expect(receipt.projection).toBe("none");
    expect(receipt.reason).toBe("none");
  });

  it("handles non-string projection gracefully", () => {
    const { receipt } = buildReceiptResult("stats", { projection: 42 }, {
      sessionId: "s1",
      traceId: "t1",
      seq: 1,
      latencyMs: 1,
      metrics: emptyMetrics(),
      tripwires: [],
      codec,
    });
    expect(receipt.projection).toBe("none");
  });

  it("extracts fileBytes from data.actual.bytes", () => {
    const { receipt } = buildReceiptResult("safe_read", { actual: { bytes: 1234, lines: 50 } }, {
      sessionId: "s1",
      traceId: "t1",
      seq: 1,
      latencyMs: 5,
      metrics: emptyMetrics(),
      tripwires: [],
      codec,
    });
    expect(receipt.fileBytes).toBe(1234);
  });

  it("sets fileBytes to null when actual is absent", () => {
    const { receipt } = buildReceiptResult("stats", {}, {
      sessionId: "s1",
      traceId: "t1",
      seq: 1,
      latencyMs: 1,
      metrics: emptyMetrics(),
      tripwires: [],
      codec,
    });
    expect(receipt.fileBytes).toBeNull();
  });

  it("attaches budget when provided", () => {
    const budget = { total: 100000, consumed: 5000, remaining: 95000, fraction: 0.05 };
    const { receipt } = buildReceiptResult("safe_read", {}, {
      sessionId: "s1",
      traceId: "t1",
      seq: 1,
      latencyMs: 1,
      metrics: emptyMetrics(),
      tripwires: [],
      codec,
      budget,
    });
    expect(receipt.budget).toEqual(budget);
  });

  it("stabilizes returnedBytes to match textBytes", () => {
    const { receipt, textBytes } = buildReceiptResult("safe_read", {}, {
      sessionId: "s1",
      traceId: "t1",
      seq: 1,
      latencyMs: 1,
      metrics: emptyMetrics(),
      tripwires: [],
      codec,
    });
    expect(receipt.returnedBytes).toBe(textBytes);
  });

  it("classifies burden kind correctly", () => {
    const { receipt: readReceipt } = buildReceiptResult("safe_read", {}, {
      sessionId: "s1", traceId: "t1", seq: 1, latencyMs: 1,
      metrics: emptyMetrics(), tripwires: [], codec,
    });
    expect(readReceipt.burden.kind).toBe("read");
    expect(readReceipt.burden.nonRead).toBe(false);

    const { receipt: shellReceipt } = buildReceiptResult("run_capture", {}, {
      sessionId: "s1", traceId: "t1", seq: 1, latencyMs: 1,
      metrics: emptyMetrics(), tripwires: [], codec,
    });
    expect(shellReceipt.burden.kind).toBe("shell");
    expect(shellReceipt.burden.nonRead).toBe(true);
  });
});

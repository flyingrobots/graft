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

describe("buildReceiptResult (unit)", () => {
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

import { describe, it, expect } from "vitest";
import {
  Metrics,
  MetricsSnapshot,
  MetricsDelta,
  diffMetrics,
} from "../../../src/mcp/metrics.js";
import { emptyBurdenByKind } from "../../../src/mcp/burden.js";

function emptySnapshot(): MetricsSnapshot {
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

describe("MetricsSnapshot", () => {
  it("is a runtime class instance", () => {
    const snap = emptySnapshot();
    expect(snap).toBeInstanceOf(MetricsSnapshot);
  });

  it("preserves all fields from constructor", () => {
    const snap = new MetricsSnapshot({
      reads: 5,
      outlines: 3,
      refusals: 1,
      cacheHits: 2,
      bytesReturned: 1000,
      bytesAvoided: 500,
      burdenByKind: emptyBurdenByKind(),
    });
    expect(snap.reads).toBe(5);
    expect(snap.outlines).toBe(3);
    expect(snap.refusals).toBe(1);
    expect(snap.cacheHits).toBe(2);
    expect(snap.bytesReturned).toBe(1000);
    expect(snap.bytesAvoided).toBe(500);
  });
});

describe("MetricsDelta", () => {
  it("is a runtime class instance", () => {
    const delta = new MetricsDelta({
      reads: 1,
      outlines: 0,
      refusals: 0,
      cacheHits: 0,
      bytesReturned: 100,
      bytesAvoided: 0,
      burdenByKind: emptyBurdenByKind(),
    });
    expect(delta).toBeInstanceOf(MetricsDelta);
  });
});

describe("Metrics", () => {
  it("starts at zero", () => {
    const m = new Metrics();
    const snap = m.snapshot();
    expect(snap.reads).toBe(0);
    expect(snap.outlines).toBe(0);
    expect(snap.refusals).toBe(0);
    expect(snap.cacheHits).toBe(0);
    expect(snap.bytesReturned).toBe(0);
    expect(snap.bytesAvoided).toBe(0);
  });

  it("snapshot returns a MetricsSnapshot instance", () => {
    const m = new Metrics();
    expect(m.snapshot()).toBeInstanceOf(MetricsSnapshot);
  });

  it("records reads", () => {
    const m = new Metrics();
    m.recordRead();
    m.recordRead();
    expect(m.snapshot().reads).toBe(2);
  });

  it("records outlines", () => {
    const m = new Metrics();
    m.recordOutline();
    expect(m.snapshot().outlines).toBe(1);
  });

  it("records refusals", () => {
    const m = new Metrics();
    m.recordRefusal();
    expect(m.snapshot().refusals).toBe(1);
  });

  it("records cache hits with bytes avoided", () => {
    const m = new Metrics();
    m.recordCacheHit(500);
    m.recordCacheHit(300);
    const snap = m.snapshot();
    expect(snap.cacheHits).toBe(2);
    expect(snap.bytesAvoided).toBe(800);
  });

  it("records tool results with burden tracking", () => {
    const m = new Metrics();
    m.recordToolResult("safe_read", 200);
    m.recordToolResult("graft_diff", 150);
    const snap = m.snapshot();
    expect(snap.bytesReturned).toBe(350);
    expect(snap.burdenByKind.read.calls).toBe(1);
    expect(snap.burdenByKind.read.bytesReturned).toBe(200);
    expect(snap.burdenByKind.search.calls).toBe(1);
    expect(snap.burdenByKind.search.bytesReturned).toBe(150);
  });

  it("applies deltas correctly", () => {
    const m = new Metrics();
    m.recordRead();
    m.recordToolResult("safe_read", 100);

    const delta = new MetricsDelta({
      reads: 3,
      outlines: 1,
      refusals: 0,
      cacheHits: 0,
      bytesReturned: 500,
      bytesAvoided: 200,
      burdenByKind: {
        read: { calls: 2, bytesReturned: 400 },
        search: { calls: 1, bytesReturned: 100 },
        shell: { calls: 0, bytesReturned: 0 },
        state: { calls: 0, bytesReturned: 0 },
        diagnostic: { calls: 0, bytesReturned: 0 },
      },
    });
    m.applyDelta(delta);

    const snap = m.snapshot();
    expect(snap.reads).toBe(4);
    expect(snap.outlines).toBe(1);
    expect(snap.bytesReturned).toBe(600);
    expect(snap.bytesAvoided).toBe(200);
    expect(snap.burdenByKind.read.calls).toBe(3);
    expect(snap.burdenByKind.read.bytesReturned).toBe(500);
    expect(snap.burdenByKind.search.calls).toBe(1);
  });

  it("restores from snapshot", () => {
    const m = new Metrics();
    m.recordRead();
    m.recordToolResult("safe_read", 100);
    const snap = m.snapshot();

    const restored = Metrics.fromSnapshot(snap);
    const restoredSnap = restored.snapshot();
    expect(restoredSnap.reads).toBe(snap.reads);
    expect(restoredSnap.bytesReturned).toBe(snap.bytesReturned);
    expect(restoredSnap.burdenByKind.read.calls).toBe(
      snap.burdenByKind.read.calls,
    );
  });
});

describe("diffMetrics", () => {
  it("returns a MetricsDelta instance", () => {
    const diff = diffMetrics(emptySnapshot(), emptySnapshot());
    expect(diff).toBeInstanceOf(MetricsDelta);
  });

  it("computes the difference between two snapshots", () => {
    const before = new MetricsSnapshot({
      reads: 2,
      outlines: 1,
      refusals: 0,
      cacheHits: 1,
      bytesReturned: 500,
      bytesAvoided: 200,
      burdenByKind: {
        read: { calls: 2, bytesReturned: 500 },
        search: { calls: 0, bytesReturned: 0 },
        shell: { calls: 0, bytesReturned: 0 },
        state: { calls: 0, bytesReturned: 0 },
        diagnostic: { calls: 0, bytesReturned: 0 },
      },
    });
    const after = new MetricsSnapshot({
      reads: 5,
      outlines: 3,
      refusals: 1,
      cacheHits: 2,
      bytesReturned: 1500,
      bytesAvoided: 800,
      burdenByKind: {
        read: { calls: 4, bytesReturned: 1200 },
        search: { calls: 1, bytesReturned: 300 },
        shell: { calls: 0, bytesReturned: 0 },
        state: { calls: 0, bytesReturned: 0 },
        diagnostic: { calls: 0, bytesReturned: 0 },
      },
    });

    const delta = diffMetrics(before, after);
    expect(delta.reads).toBe(3);
    expect(delta.outlines).toBe(2);
    expect(delta.refusals).toBe(1);
    expect(delta.cacheHits).toBe(1);
    expect(delta.bytesReturned).toBe(1000);
    expect(delta.bytesAvoided).toBe(600);
    expect(delta.burdenByKind.read.calls).toBe(2);
    expect(delta.burdenByKind.read.bytesReturned).toBe(700);
    expect(delta.burdenByKind.search.calls).toBe(1);
    expect(delta.burdenByKind.search.bytesReturned).toBe(300);
  });
});

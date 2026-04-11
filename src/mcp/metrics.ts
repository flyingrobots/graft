// ---------------------------------------------------------------------------
// Session metrics — replaces loose counters in server.ts
// ---------------------------------------------------------------------------

import type { McpToolName } from "../contracts/output-schemas.js";
import {
  emptyBurdenByKind,
  freezeBurdenByKind,
  burdenKindForTool,
  cloneBurdenByKind,
  type BurdenByKind,
} from "./burden.js";

export interface MetricsSnapshot {
  readonly reads: number;
  readonly outlines: number;
  readonly refusals: number;
  readonly cacheHits: number;
  readonly bytesReturned: number;
  readonly bytesAvoided: number;
  readonly burdenByKind: Readonly<BurdenByKind>;
}

export interface MetricsDelta {
  readonly reads: number;
  readonly outlines: number;
  readonly refusals: number;
  readonly cacheHits: number;
  readonly bytesReturned: number;
  readonly bytesAvoided: number;
  readonly burdenByKind: Readonly<BurdenByKind>;
}

export class Metrics {
  private totalReads = 0;
  private totalOutlines = 0;
  private totalRefusals = 0;
  private totalCacheHits = 0;
  private totalBytesAvoidedByCache = 0;
  private cumulativeBytesReturned = 0;
  private burdenByKind: BurdenByKind = emptyBurdenByKind();

  static fromSnapshot(snapshot: MetricsSnapshot): Metrics {
    const metrics = new Metrics();
    metrics.totalReads = snapshot.reads;
    metrics.totalOutlines = snapshot.outlines;
    metrics.totalRefusals = snapshot.refusals;
    metrics.totalCacheHits = snapshot.cacheHits;
    metrics.totalBytesAvoidedByCache = snapshot.bytesAvoided;
    metrics.cumulativeBytesReturned = snapshot.bytesReturned;
    metrics.burdenByKind = cloneBurdenByKind(snapshot.burdenByKind);
    return metrics;
  }

  recordRead(): void {
    this.totalReads++;
  }

  recordOutline(): void {
    this.totalOutlines++;
  }

  recordRefusal(): void {
    this.totalRefusals++;
  }

  recordCacheHit(bytesAvoided: number): void {
    this.totalCacheHits++;
    this.totalBytesAvoidedByCache += bytesAvoided;
  }

  recordToolResult(tool: McpToolName, n: number): void {
    this.cumulativeBytesReturned += n;
    const kind = burdenKindForTool(tool);
    const current = this.burdenByKind[kind];
    this.burdenByKind = {
      ...this.burdenByKind,
      [kind]: {
        calls: current.calls + 1,
        bytesReturned: current.bytesReturned + n,
      },
    };
  }

  applyDelta(delta: MetricsDelta): void {
    this.totalReads += delta.reads;
    this.totalOutlines += delta.outlines;
    this.totalRefusals += delta.refusals;
    this.totalCacheHits += delta.cacheHits;
    this.totalBytesAvoidedByCache += delta.bytesAvoided;
    this.cumulativeBytesReturned += delta.bytesReturned;
    this.burdenByKind = {
      read: {
        calls: this.burdenByKind.read.calls + delta.burdenByKind.read.calls,
        bytesReturned: this.burdenByKind.read.bytesReturned + delta.burdenByKind.read.bytesReturned,
      },
      search: {
        calls: this.burdenByKind.search.calls + delta.burdenByKind.search.calls,
        bytesReturned: this.burdenByKind.search.bytesReturned + delta.burdenByKind.search.bytesReturned,
      },
      shell: {
        calls: this.burdenByKind.shell.calls + delta.burdenByKind.shell.calls,
        bytesReturned: this.burdenByKind.shell.bytesReturned + delta.burdenByKind.shell.bytesReturned,
      },
      state: {
        calls: this.burdenByKind.state.calls + delta.burdenByKind.state.calls,
        bytesReturned: this.burdenByKind.state.bytesReturned + delta.burdenByKind.state.bytesReturned,
      },
      diagnostic: {
        calls: this.burdenByKind.diagnostic.calls + delta.burdenByKind.diagnostic.calls,
        bytesReturned: this.burdenByKind.diagnostic.bytesReturned + delta.burdenByKind.diagnostic.bytesReturned,
      },
    };
  }

  snapshot(): MetricsSnapshot {
    return {
      reads: this.totalReads,
      outlines: this.totalOutlines,
      refusals: this.totalRefusals,
      cacheHits: this.totalCacheHits,
      bytesReturned: this.cumulativeBytesReturned,
      bytesAvoided: this.totalBytesAvoidedByCache,
      burdenByKind: freezeBurdenByKind(cloneBurdenByKind(this.burdenByKind)),
    };
  }
}

export function diffMetrics(before: MetricsSnapshot, after: MetricsSnapshot): MetricsDelta {
  return {
    reads: after.reads - before.reads,
    outlines: after.outlines - before.outlines,
    refusals: after.refusals - before.refusals,
    cacheHits: after.cacheHits - before.cacheHits,
    bytesReturned: after.bytesReturned - before.bytesReturned,
    bytesAvoided: after.bytesAvoided - before.bytesAvoided,
    burdenByKind: freezeBurdenByKind({
      read: {
        calls: after.burdenByKind.read.calls - before.burdenByKind.read.calls,
        bytesReturned: after.burdenByKind.read.bytesReturned - before.burdenByKind.read.bytesReturned,
      },
      search: {
        calls: after.burdenByKind.search.calls - before.burdenByKind.search.calls,
        bytesReturned: after.burdenByKind.search.bytesReturned - before.burdenByKind.search.bytesReturned,
      },
      shell: {
        calls: after.burdenByKind.shell.calls - before.burdenByKind.shell.calls,
        bytesReturned: after.burdenByKind.shell.bytesReturned - before.burdenByKind.shell.bytesReturned,
      },
      state: {
        calls: after.burdenByKind.state.calls - before.burdenByKind.state.calls,
        bytesReturned: after.burdenByKind.state.bytesReturned - before.burdenByKind.state.bytesReturned,
      },
      diagnostic: {
        calls: after.burdenByKind.diagnostic.calls - before.burdenByKind.diagnostic.calls,
        bytesReturned: after.burdenByKind.diagnostic.bytesReturned - before.burdenByKind.diagnostic.bytesReturned,
      },
    }),
  };
}

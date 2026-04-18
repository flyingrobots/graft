// ---------------------------------------------------------------------------
// Session metrics — runtime-backed metric snapshots and deltas
// ---------------------------------------------------------------------------

import type { McpToolName } from "../contracts/output-schemas.js";
import {
  BURDEN_KINDS,
  emptyBurdenByKind,
  freezeBurdenByKind,
  burdenKindForTool,
  cloneBurdenByKind,
  type BurdenByKind,
} from "./burden.js";

export class MetricsSnapshot {
  readonly reads: number;
  readonly outlines: number;
  readonly refusals: number;
  readonly cacheHits: number;
  readonly bytesReturned: number;
  readonly bytesAvoided: number;
  readonly burdenByKind: Readonly<BurdenByKind>;

  constructor(fields: {
    readonly reads: number;
    readonly outlines: number;
    readonly refusals: number;
    readonly cacheHits: number;
    readonly bytesReturned: number;
    readonly bytesAvoided: number;
    readonly burdenByKind: Readonly<BurdenByKind>;
  }) {
    this.reads = fields.reads;
    this.outlines = fields.outlines;
    this.refusals = fields.refusals;
    this.cacheHits = fields.cacheHits;
    this.bytesReturned = fields.bytesReturned;
    this.bytesAvoided = fields.bytesAvoided;
    this.burdenByKind = fields.burdenByKind;
  }
}

export class MetricsDelta {
  readonly reads: number;
  readonly outlines: number;
  readonly refusals: number;
  readonly cacheHits: number;
  readonly bytesReturned: number;
  readonly bytesAvoided: number;
  readonly burdenByKind: Readonly<BurdenByKind>;

  constructor(fields: {
    readonly reads: number;
    readonly outlines: number;
    readonly refusals: number;
    readonly cacheHits: number;
    readonly bytesReturned: number;
    readonly bytesAvoided: number;
    readonly burdenByKind: Readonly<BurdenByKind>;
  }) {
    this.reads = fields.reads;
    this.outlines = fields.outlines;
    this.refusals = fields.refusals;
    this.cacheHits = fields.cacheHits;
    this.bytesReturned = fields.bytesReturned;
    this.bytesAvoided = fields.bytesAvoided;
    this.burdenByKind = fields.burdenByKind;
  }
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
    const merged = cloneBurdenByKind(this.burdenByKind);
    for (const kind of BURDEN_KINDS) {
      merged[kind] = {
        calls: this.burdenByKind[kind].calls + delta.burdenByKind[kind].calls,
        bytesReturned:
          this.burdenByKind[kind].bytesReturned +
          delta.burdenByKind[kind].bytesReturned,
      };
    }
    this.burdenByKind = merged;
  }

  snapshot(): MetricsSnapshot {
    return new MetricsSnapshot({
      reads: this.totalReads,
      outlines: this.totalOutlines,
      refusals: this.totalRefusals,
      cacheHits: this.totalCacheHits,
      bytesReturned: this.cumulativeBytesReturned,
      bytesAvoided: this.totalBytesAvoidedByCache,
      burdenByKind: freezeBurdenByKind(cloneBurdenByKind(this.burdenByKind)),
    });
  }
}

export function diffMetrics(
  before: MetricsSnapshot,
  after: MetricsSnapshot,
): MetricsDelta {
  const burdenDelta = emptyBurdenByKind();
  for (const kind of BURDEN_KINDS) {
    burdenDelta[kind] = {
      calls: after.burdenByKind[kind].calls - before.burdenByKind[kind].calls,
      bytesReturned:
        after.burdenByKind[kind].bytesReturned -
        before.burdenByKind[kind].bytesReturned,
    };
  }
  return new MetricsDelta({
    reads: after.reads - before.reads,
    outlines: after.outlines - before.outlines,
    refusals: after.refusals - before.refusals,
    cacheHits: after.cacheHits - before.cacheHits,
    bytesReturned: after.bytesReturned - before.bytesReturned,
    bytesAvoided: after.bytesAvoided - before.bytesAvoided,
    burdenByKind: freezeBurdenByKind(burdenDelta),
  });
}

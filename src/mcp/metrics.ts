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

export class Metrics {
  private totalReads = 0;
  private totalOutlines = 0;
  private totalRefusals = 0;
  private totalCacheHits = 0;
  private totalBytesAvoidedByCache = 0;
  private cumulativeBytesReturned = 0;
  private burdenByKind: BurdenByKind = emptyBurdenByKind();

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

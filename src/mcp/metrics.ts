// ---------------------------------------------------------------------------
// Session metrics — replaces loose counters in server.ts
// ---------------------------------------------------------------------------

export interface MetricsSnapshot {
  readonly reads: number;
  readonly outlines: number;
  readonly refusals: number;
  readonly cacheHits: number;
  readonly bytesReturned: number;
  readonly bytesAvoided: number;
}

export class Metrics {
  private totalReads = 0;
  private totalOutlines = 0;
  private totalRefusals = 0;
  private totalCacheHits = 0;
  private totalBytesAvoidedByCache = 0;
  private cumulativeBytesReturned = 0;

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

  addBytesReturned(n: number): void {
    this.cumulativeBytesReturned += n;
  }

  snapshot(): MetricsSnapshot {
    return {
      reads: this.totalReads,
      outlines: this.totalOutlines,
      refusals: this.totalRefusals,
      cacheHits: this.totalCacheHits,
      bytesReturned: this.cumulativeBytesReturned,
      bytesAvoided: this.totalBytesAvoidedByCache,
    };
  }
}

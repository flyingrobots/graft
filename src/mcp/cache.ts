// ---------------------------------------------------------------------------
// Observation cache — tracks file content seen by the agent
// ---------------------------------------------------------------------------

import * as crypto from "node:crypto";
import type { OutlineEntry, JumpEntry } from "../parser/types.js";

export function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export interface ObservationSnapshot {
  readonly contentHash: string;
  readonly outline: readonly OutlineEntry[];
  readonly jumpTable: readonly JumpEntry[];
  readonly actual: Readonly<{ lines: number; bytes: number }>;
  readonly readCount: number;
  readonly firstReadAt: string;
  readonly lastReadAt: string;
}

export class Observation {
  readonly contentHash: string;
  readonly outline: readonly OutlineEntry[];
  readonly jumpTable: readonly JumpEntry[];
  readonly actual: Readonly<{ lines: number; bytes: number }>;
  readonly firstReadAt: string;
  private _readCount: number;
  private _lastReadAt: string;

  constructor(opts: {
    contentHash: string;
    outline: readonly OutlineEntry[];
    jumpTable: readonly JumpEntry[];
    actual: Readonly<{ lines: number; bytes: number }>;
    readCount: number;
    firstReadAt: string;
    lastReadAt: string;
  }) {
    this.contentHash = opts.contentHash;
    this.outline = opts.outline;
    this.jumpTable = opts.jumpTable;
    this.actual = opts.actual;
    this._readCount = opts.readCount;
    this.firstReadAt = opts.firstReadAt;
    this._lastReadAt = opts.lastReadAt;
  }

  get readCount(): number {
    return this._readCount;
  }

  get lastReadAt(): string {
    return this._lastReadAt;
  }

  isStale(currentContentHash: string): boolean {
    return this.contentHash !== currentContentHash;
  }

  touch(): void {
    this._readCount++;
    this._lastReadAt = new Date().toISOString();
  }

  snapshot(): ObservationSnapshot {
    return {
      contentHash: this.contentHash,
      outline: this.outline,
      jumpTable: this.jumpTable,
      actual: this.actual,
      readCount: this.readCount,
      firstReadAt: this.firstReadAt,
      lastReadAt: this.lastReadAt,
    };
  }

  static fromSnapshot(snapshot: ObservationSnapshot): Observation {
    return new Observation(snapshot);
  }
}

export type CacheResult =
  | { hit: true; obs: Observation }
  | { hit: false; stale: Observation | null };

export class ObservationCache {
  private readonly entries = new Map<string, Observation>();

  static fromSnapshots(
    snapshots: Readonly<Record<string, ObservationSnapshot>> | undefined,
  ): ObservationCache {
    const cache = new ObservationCache();
    if (snapshots === undefined) {
      return cache;
    }
    for (const [filePath, snapshot] of Object.entries(snapshots)) {
      cache.entries.set(filePath, Observation.fromSnapshot(snapshot));
    }
    return cache;
  }

  record(
    filePath: string,
    contentHash: string,
    outline: readonly OutlineEntry[],
    jumpTable: readonly JumpEntry[],
    actual: Readonly<{ lines: number; bytes: number }>,
  ): void {
    const existing = this.entries.get(filePath);
    const now = new Date().toISOString();
    this.entries.set(filePath, new Observation({
      contentHash,
      outline,
      jumpTable,
      actual,
      readCount: (existing?.readCount ?? 0) + 1,
      firstReadAt: existing?.firstReadAt ?? now,
      lastReadAt: now,
    }));
  }

  check(filePath: string, currentContent: string): CacheResult {
    const obs = this.entries.get(filePath);
    if (obs === undefined) return { hit: false, stale: null };
    if (!obs.isStale(hashContent(currentContent))) return { hit: true, obs };
    return { hit: false, stale: obs };
  }

  get(filePath: string): Observation | undefined {
    return this.entries.get(filePath);
  }

  snapshotEntry(filePath: string): ObservationSnapshot | null {
    return this.entries.get(filePath)?.snapshot() ?? null;
  }

  applySnapshot(filePath: string, snapshot: ObservationSnapshot | null): void {
    if (snapshot === null) {
      this.entries.delete(filePath);
      return;
    }
    this.entries.set(filePath, Observation.fromSnapshot(snapshot));
  }
}

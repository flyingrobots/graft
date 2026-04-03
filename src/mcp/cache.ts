// ---------------------------------------------------------------------------
// Observation cache — tracks file content seen by the agent
// ---------------------------------------------------------------------------

import * as crypto from "node:crypto";
import type { OutlineEntry, JumpEntry } from "../parser/types.js";

export function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export class Observation {
  readonly contentHash: string;
  readonly outline: OutlineEntry[];
  readonly jumpTable: JumpEntry[];
  readonly actual: { lines: number; bytes: number };
  readCount: number;
  firstReadAt: string;
  lastReadAt: string;

  constructor(opts: {
    contentHash: string;
    outline: OutlineEntry[];
    jumpTable: JumpEntry[];
    actual: { lines: number; bytes: number };
    readCount: number;
    firstReadAt: string;
    lastReadAt: string;
  }) {
    this.contentHash = opts.contentHash;
    this.outline = opts.outline;
    this.jumpTable = opts.jumpTable;
    this.actual = opts.actual;
    this.readCount = opts.readCount;
    this.firstReadAt = opts.firstReadAt;
    this.lastReadAt = opts.lastReadAt;
  }

  isStale(currentContentHash: string): boolean {
    return this.contentHash !== currentContentHash;
  }

  touch(): void {
    this.readCount++;
    this.lastReadAt = new Date().toISOString();
  }
}

export type CacheResult =
  | { hit: true; obs: Observation }
  | { hit: false; stale: Observation | null };

export class ObservationCache {
  private readonly entries = new Map<string, Observation>();

  record(
    filePath: string,
    contentHash: string,
    outline: OutlineEntry[],
    jumpTable: JumpEntry[],
    actual: { lines: number; bytes: number },
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
}

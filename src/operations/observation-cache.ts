// ---------------------------------------------------------------------------
// Observation cache — tracks file content seen by the agent
// ---------------------------------------------------------------------------

import { sha256Hex } from "../contracts/sha256.js";
import type { OutlineEntry, JumpEntry } from "../parser/types.js";

// In a `u` regex a surrogate pair is one code point, so `\p{Cs}` matches only
// lone surrogates.
const LONE_SURROGATE = /\p{Cs}/u;

/**
 * Content identity for "unchanged" decisions.
 *
 * Well-formed content is identified by the SHA-256 of its UTF-8 bytes. Read
 * paths decode observed bytes strictly and keep any BOM, so this is the
 * SHA-256 of the observed bytes. A string with a lone surrogate has no
 * faithful UTF-8 encoding (it would alias U+FFFD), so it is identified by its
 * UTF-16LE code units under a different label. The labels keep the two
 * domains disjoint: distinct strings never share an identity.
 */
export function hashContent(content: string): string {
  if (!LONE_SURROGATE.test(content)) {
    return `sha256:${sha256Hex(new TextEncoder().encode(content))}`;
  }
  return `sha256-utf16le:${sha256Hex(utf16leCodeUnits(content))}`;
}

function utf16leCodeUnits(content: string): Uint8Array {
  const bytes = new Uint8Array(content.length * 2);
  for (let index = 0; index < content.length; index++) {
    const unit = content.charCodeAt(index);
    bytes[index * 2] = unit & 0xff;
    bytes[index * 2 + 1] = unit >>> 8;
  }
  return bytes;
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

  touch(now: string): void {
    this._readCount++;
    this._lastReadAt = now;
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
  readonly now: () => string;

  constructor(now?: () => string) {
    this.now = now ?? (() => new Date().toISOString());
  }

  static fromSnapshots(
    snapshots: Readonly<Record<string, ObservationSnapshot>> | undefined,
    now?: () => string,
  ): ObservationCache {
    const cache = new ObservationCache(now);
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
    const now = this.now();
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

  /** Iterate all observed file paths and their observations. */
  allEntries(): IterableIterator<[string, Observation]> {
    return this.entries.entries();
  }

  /** Number of observed files. */
  get size(): number {
    return this.entries.size;
  }
}

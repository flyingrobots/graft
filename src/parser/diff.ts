import { OutlineEntry } from "./types.js";

export class DiffEntry {
  readonly name: string;
  readonly kind: OutlineEntry["kind"];
  readonly signature?: string;
  readonly oldSignature?: string;
  readonly childDiff?: OutlineDiff;

  constructor(opts: {
    name: string;
    kind: OutlineEntry["kind"];
    signature?: string;
    oldSignature?: string;
    childDiff?: OutlineDiff;
  }) {
    if (opts.name.length === 0) {
      throw new Error("DiffEntry: name must be non-empty");
    }
    this.name = opts.name;
    this.kind = opts.kind;
    if (opts.signature !== undefined) this.signature = opts.signature;
    if (opts.oldSignature !== undefined) this.oldSignature = opts.oldSignature;
    if (opts.childDiff !== undefined) this.childDiff = opts.childDiff;
    Object.freeze(this);
  }
}

export class OutlineDiff {
  readonly added: readonly DiffEntry[];
  readonly removed: readonly DiffEntry[];
  readonly changed: readonly DiffEntry[];
  readonly unchangedCount: number;

  constructor(opts: {
    added: DiffEntry[];
    removed: DiffEntry[];
    changed: DiffEntry[];
    unchangedCount: number;
  }) {
    this.added = Object.freeze([...opts.added]);
    this.removed = Object.freeze([...opts.removed]);
    this.changed = Object.freeze([...opts.changed]);
    this.unchangedCount = opts.unchangedCount;
    Object.freeze(this);
  }
}

/**
 * Returns the effective signature for comparison and reporting.
 * Falls back to the entry's name when no explicit signature exists
 * (e.g., for classes, interfaces, and plain exports).
 */
function entrySignature(entry: OutlineEntry): string {
  return entry.signature ?? entry.name;
}

export function diffOutlines(
  oldEntries: readonly OutlineEntry[],
  newEntries: readonly OutlineEntry[],
): OutlineDiff {
  // Note: duplicate names are clobbered by Map.set — only the last
  // entry with a given name survives. This is acceptable because
  // tree-sitter outlines rarely produce duplicate top-level names,
  // and symbol identity tracking (WARP Level 2+) will handle that case.
  const oldByName = new Map<string, OutlineEntry>();
  for (const entry of oldEntries) {
    oldByName.set(entry.name, entry);
  }

  const newByName = new Map<string, OutlineEntry>();
  for (const entry of newEntries) {
    newByName.set(entry.name, entry);
  }

  const added: DiffEntry[] = [];
  const removed: DiffEntry[] = [];
  const changed: DiffEntry[] = [];
  let unchangedCount = 0;

  // Check new entries against old
  for (const [name, newEntry] of newByName) {
    const oldEntry = oldByName.get(name);
    if (oldEntry === undefined) {
      added.push(new DiffEntry({
        name,
        kind: newEntry.kind,
        ...(newEntry.signature !== undefined ? { signature: newEntry.signature } : {}),
      }));
    } else {
      const oldSig = entrySignature(oldEntry);
      const newSig = entrySignature(newEntry);
      if (oldSig !== newSig) {
        changed.push(new DiffEntry({
          name,
          kind: newEntry.kind,
          oldSignature: entrySignature(oldEntry),
          ...(newEntry.signature !== undefined ? { signature: newEntry.signature } : {}),
        }));
      } else {
        // Same name and signature — check children recursively
        const oldChildren = oldEntry.children ?? [];
        const newChildren = newEntry.children ?? [];
        if (oldChildren.length > 0 || newChildren.length > 0) {
          const childDiff = diffOutlines(oldChildren, newChildren);
          if (childDiff.added.length > 0 || childDiff.removed.length > 0 || childDiff.changed.length > 0) {
            changed.push(new DiffEntry({
              name,
              kind: newEntry.kind,
              childDiff,
              ...(newEntry.signature !== undefined ? { signature: newEntry.signature } : {}),
            }));
          } else {
            unchangedCount++;
          }
        } else {
          unchangedCount++;
        }
      }
    }
  }

  // Check for removed (in old but not in new)
  for (const [name, oldEntry] of oldByName) {
    if (!newByName.has(name)) {
      removed.push(new DiffEntry({
        name,
        kind: oldEntry.kind,
        ...(oldEntry.signature !== undefined ? { signature: oldEntry.signature } : {}),
      }));
    }
  }

  return new OutlineDiff({ added, removed, changed, unchangedCount });
}

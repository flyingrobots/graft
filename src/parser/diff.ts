import type { OutlineEntry } from "./types.js";

export interface DiffEntry {
  name: string;
  kind: OutlineEntry["kind"];
  signature?: string;
  oldSignature?: string;
  childDiff?: OutlineDiff;
}

export interface OutlineDiff {
  added: DiffEntry[];
  removed: DiffEntry[];
  changed: DiffEntry[];
  unchangedCount: number;
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
  oldEntries: OutlineEntry[],
  newEntries: OutlineEntry[],
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
      const entry: DiffEntry = { name, kind: newEntry.kind };
      if (newEntry.signature !== undefined) entry.signature = newEntry.signature;
      added.push(entry);
    } else {
      const oldSig = entrySignature(oldEntry);
      const newSig = entrySignature(newEntry);
      if (oldSig !== newSig) {
        const entry: DiffEntry = {
          name,
          kind: newEntry.kind,
          oldSignature: entrySignature(oldEntry),
        };
        if (newEntry.signature !== undefined) entry.signature = newEntry.signature;
        changed.push(entry);
      } else {
        // Same name and signature — check children recursively
        const oldChildren = oldEntry.children ?? [];
        const newChildren = newEntry.children ?? [];
        if (oldChildren.length > 0 || newChildren.length > 0) {
          const childDiff = diffOutlines(oldChildren, newChildren);
          if (childDiff.added.length > 0 || childDiff.removed.length > 0 || childDiff.changed.length > 0) {
            const entry: DiffEntry = { name, kind: newEntry.kind, childDiff };
            if (newEntry.signature !== undefined) entry.signature = newEntry.signature;
            changed.push(entry);
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
      const entry: DiffEntry = { name, kind: oldEntry.kind };
      if (oldEntry.signature !== undefined) entry.signature = oldEntry.signature;
      removed.push(entry);
    }
  }

  return { added, removed, changed, unchangedCount };
}

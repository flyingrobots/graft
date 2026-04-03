import type { OutlineEntry } from "./types.js";

export interface DiffEntry {
  name: string;
  kind: string;
  signature?: string;
  oldSignature?: string;
  start?: number;
  end?: number;
}

export interface OutlineDiff {
  added: DiffEntry[];
  removed: DiffEntry[];
  changed: DiffEntry[];
  unchangedCount: number;
}

function entrySignature(entry: OutlineEntry): string {
  return entry.signature ?? entry.name;
}

export function diffOutlines(
  oldEntries: OutlineEntry[],
  newEntries: OutlineEntry[],
): OutlineDiff {
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
      added.push({
        name,
        kind: newEntry.kind,
        signature: newEntry.signature,
      });
    } else {
      const oldSig = entrySignature(oldEntry);
      const newSig = entrySignature(newEntry);
      if (oldSig !== newSig) {
        changed.push({
          name,
          kind: newEntry.kind,
          signature: newEntry.signature,
          oldSignature: oldEntry.signature,
        });
      } else {
        unchangedCount++;
      }
    }
  }

  // Check for removed (in old but not in new)
  for (const [name, oldEntry] of oldByName) {
    if (!newByName.has(name)) {
      removed.push({
        name,
        kind: oldEntry.kind,
        signature: oldEntry.signature,
      });
    }
  }

  return { added, removed, changed, unchangedCount };
}

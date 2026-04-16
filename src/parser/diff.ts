import { OutlineEntry } from "./types.js";

export type DiffContinuityKind = "rename";
export type DiffContinuityConfidence = "likely";
export type DiffContinuityBasis =
  | "matching_signature_shape"
  | "matching_child_structure";

export class DiffContinuity {
  /** @internal */
  private readonly _brand = "DiffContinuity" as const;
  readonly kind: DiffContinuityKind;
  readonly confidence: DiffContinuityConfidence;
  readonly basis: DiffContinuityBasis;
  readonly symbolKind: OutlineEntry["kind"];
  readonly oldName: string;
  readonly newName: string;
  readonly oldSignature?: string;
  readonly newSignature?: string;

  constructor(opts: {
    kind: DiffContinuityKind;
    confidence: DiffContinuityConfidence;
    basis: DiffContinuityBasis;
    symbolKind: OutlineEntry["kind"];
    oldName: string;
    newName: string;
    oldSignature?: string;
    newSignature?: string;
  }) {
    if (opts.oldName.trim().length === 0 || opts.newName.trim().length === 0) {
      throw new Error("DiffContinuity: names must be non-empty");
    }
    this.kind = opts.kind;
    this.confidence = opts.confidence;
    this.basis = opts.basis;
    this.symbolKind = opts.symbolKind;
    this.oldName = opts.oldName.trim();
    this.newName = opts.newName.trim();
    if (opts.oldSignature !== undefined) this.oldSignature = opts.oldSignature;
    if (opts.newSignature !== undefined) this.newSignature = opts.newSignature;
    Object.freeze(this);
  }
}

export class DiffEntry {
  /** @internal */
  private readonly _brand = "DiffEntry" as const;
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
    if (opts.name.trim().length === 0) {
      throw new Error("DiffEntry: name must be non-empty");
    }
    this.name = opts.name.trim();
    this.kind = opts.kind;
    if (opts.signature !== undefined) this.signature = opts.signature;
    if (opts.oldSignature !== undefined) this.oldSignature = opts.oldSignature;
    if (opts.childDiff !== undefined) this.childDiff = opts.childDiff;
    Object.freeze(this);
  }
}

export class OutlineDiff {
  /** @internal */
  private readonly _brand = "OutlineDiff" as const;
  readonly added: readonly DiffEntry[];
  readonly removed: readonly DiffEntry[];
  readonly changed: readonly DiffEntry[];
  readonly continuity: readonly DiffContinuity[];
  readonly unchangedCount: number;

  constructor(opts: {
    added: DiffEntry[];
    removed: DiffEntry[];
    changed: DiffEntry[];
    continuity?: DiffContinuity[];
    unchangedCount: number;
  }) {
    if (!Number.isInteger(opts.unchangedCount) || opts.unchangedCount < 0) {
      throw new Error("OutlineDiff: unchangedCount must be a non-negative integer");
    }
    this.added = Object.freeze([...opts.added]);
    this.removed = Object.freeze([...opts.removed]);
    this.changed = Object.freeze([...opts.changed]);
    this.continuity = Object.freeze([...(opts.continuity ?? [])]);
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizedSignatureShape(entry: OutlineEntry): string | null {
  if (entry.signature === undefined) {
    return null;
  }
  return entry.signature
    .replace(new RegExp(`\\b${escapeRegExp(entry.name)}\\b`, "g"), "<name>")
    .replace(/\s+/g, " ")
    .trim();
}

function childStructureFingerprint(children: readonly OutlineEntry[] | undefined): string | null {
  if (children === undefined || children.length === 0) {
    return null;
  }
  return children.map((child) => {
    const signatureShape = normalizedSignatureShape(child) ?? child.name;
    const childFingerprint = childStructureFingerprint(child.children);
    return `${child.kind}:${String(child.exported)}:${signatureShape}:${childFingerprint ?? ""}`;
  }).join("|");
}

function continuityFingerprint(entry: OutlineEntry): {
  basis: DiffContinuityBasis;
  key: string;
} | null {
  const signatureShape = normalizedSignatureShape(entry);
  if (signatureShape !== null) {
    return {
      basis: "matching_signature_shape",
      key: `${entry.kind}:${String(entry.exported)}:${signatureShape}`,
    };
  }

  const childFingerprint = childStructureFingerprint(entry.children);
  if (childFingerprint !== null) {
    return {
      basis: "matching_child_structure",
      key: `${entry.kind}:${String(entry.exported)}:${childFingerprint}`,
    };
  }

  return null;
}

function detectContinuity(
  removedEntries: readonly OutlineEntry[],
  addedEntries: readonly OutlineEntry[],
): DiffContinuity[] {
  const groups = new Map<string, {
    basis: DiffContinuityBasis;
    removed: OutlineEntry[];
    added: OutlineEntry[];
  }>();

  for (const entry of removedEntries) {
    const fingerprint = continuityFingerprint(entry);
    if (fingerprint === null) continue;
    const group = groups.get(fingerprint.key) ?? {
      basis: fingerprint.basis,
      removed: [],
      added: [],
    };
    group.removed.push(entry);
    groups.set(fingerprint.key, group);
  }

  for (const entry of addedEntries) {
    const fingerprint = continuityFingerprint(entry);
    if (fingerprint === null) continue;
    const group = groups.get(fingerprint.key) ?? {
      basis: fingerprint.basis,
      removed: [],
      added: [],
    };
    group.added.push(entry);
    groups.set(fingerprint.key, group);
  }

  const continuity: DiffContinuity[] = [];
  for (const group of groups.values()) {
    if (group.removed.length !== 1 || group.added.length !== 1) {
      continue;
    }

    const removed = group.removed[0];
    const added = group.added[0];
    if (removed === undefined || added === undefined) {
      continue;
    }

    continuity.push(new DiffContinuity({
      kind: "rename",
      confidence: "likely",
      basis: group.basis,
      symbolKind: added.kind,
      oldName: removed.name,
      newName: added.name,
      ...(removed.signature !== undefined ? { oldSignature: removed.signature } : {}),
      ...(added.signature !== undefined ? { newSignature: added.signature } : {}),
    }));
  }

  return continuity.sort((left, right) => {
    return `${left.oldName}:${left.newName}`.localeCompare(`${right.oldName}:${right.newName}`);
  });
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
  const addedEntries: OutlineEntry[] = [];
  const removedEntries: OutlineEntry[] = [];
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
      addedEntries.push(newEntry);
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
      removedEntries.push(oldEntry);
    }
  }

  return new OutlineDiff({
    added,
    removed,
    changed,
    continuity: detectContinuity(removedEntries, addedEntries),
    unchangedCount,
  });
}

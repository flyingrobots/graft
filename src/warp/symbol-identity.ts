import crypto from "node:crypto";
import { diffOutlines } from "../parser/diff.js";
import type { OutlineEntry } from "../parser/types.js";

export type SymbolIdentityMap = ReadonlyMap<string, string>;

export function buildSymbolPath(parentPath: string, name: string): string {
  return parentPath.length > 0 ? `${parentPath}.${name}` : name;
}

function mintCanonicalSymbolIdentity(
  commitSha: string,
  filePath: string,
  symbolPath: string,
  entry: OutlineEntry,
): string {
  const seed = [
    commitSha,
    filePath,
    symbolPath,
    entry.kind,
    entry.signature ?? "",
    String(entry.exported),
  ].join("\n");
  return `sid:${crypto.createHash("sha256").update(seed).digest("hex").slice(0, 16)}`;
}

export function assignCanonicalSymbolIdentities(input: {
  oldEntries: readonly OutlineEntry[];
  newEntries: readonly OutlineEntry[];
  oldIdentityByPath: SymbolIdentityMap;
  commitSha: string;
  filePath: string;
}): Map<string, string> {
  const assigned = new Map<string, string>();

  assignLevel({
    oldEntries: input.oldEntries,
    newEntries: input.newEntries,
    oldIdentityByPath: input.oldIdentityByPath,
    commitSha: input.commitSha,
    filePath: input.filePath,
    oldParentPath: "",
    newParentPath: "",
    assigned,
  });

  return assigned;
}

function assignLevel(input: {
  oldEntries: readonly OutlineEntry[];
  newEntries: readonly OutlineEntry[];
  oldIdentityByPath: SymbolIdentityMap;
  commitSha: string;
  filePath: string;
  oldParentPath: string;
  newParentPath: string;
  assigned: Map<string, string>;
}): void {
  const oldByName = new Map<string, OutlineEntry>();
  for (const entry of input.oldEntries) {
    oldByName.set(entry.name, entry);
  }

  const continuityByNewName = new Map<string, string>();
  const diff = diffOutlines(input.oldEntries, input.newEntries);
  for (const continuity of diff.continuity) {
    continuityByNewName.set(continuity.newName, continuity.oldName);
  }

  for (const newEntry of input.newEntries) {
    const newSymbolPath = buildSymbolPath(input.newParentPath, newEntry.name);
    const oldName = oldByName.has(newEntry.name)
      ? newEntry.name
      : continuityByNewName.get(newEntry.name);
    const oldEntry = oldName !== undefined ? oldByName.get(oldName) : undefined;
    const oldSymbolPath = oldName !== undefined
      ? buildSymbolPath(input.oldParentPath, oldName)
      : null;

    const identityId = oldSymbolPath !== null
      ? input.oldIdentityByPath.get(oldSymbolPath) ??
        mintCanonicalSymbolIdentity(input.commitSha, input.filePath, newSymbolPath, newEntry)
      : mintCanonicalSymbolIdentity(input.commitSha, input.filePath, newSymbolPath, newEntry);

    input.assigned.set(newSymbolPath, identityId);

    assignLevel({
      oldEntries: oldEntry?.children ?? [],
      newEntries: newEntry.children ?? [],
      oldIdentityByPath: input.oldIdentityByPath,
      commitSha: input.commitSha,
      filePath: input.filePath,
      oldParentPath: oldSymbolPath ?? "",
      newParentPath: newSymbolPath,
      assigned: input.assigned,
    });
  }
}

import { diffOutlines } from "../parser/diff.js";
import type { OutlineEntry } from "../parser/types.js";
import type { WarpContext } from "./context.js";
import { observeGraph } from "./context.js";
import { buildSymbolPath, type SymbolIdentityMap } from "./symbol-identity.js";
import { fileSymbolsLens } from "./observers.js";
import {
  dirNodeId,
  fileNodeId,
  identityNodeId,
  symNodeId,
  type PatchOps,
} from "./indexer-model.js";

function cloneIdentityMap(input: SymbolIdentityMap | undefined): Map<string, string> {
  return new Map(input ?? []);
}

async function readCommitTick(ctx: WarpContext, sha: string): Promise<number | null> {
  const observer = await observeGraph(ctx, { match: `commit:${sha}`, expose: ["tick"] });
  const nodes = await observer.getNodes();
  const nodeId = nodes[0];
  if (nodeId === undefined) {
    return null;
  }
  const props = await observer.getNodeProps(nodeId);
  return typeof props?.["tick"] === "number" ? props["tick"] : null;
}

async function readIdentitySeedForFile(
  ctx: WarpContext,
  filePath: string,
  ceiling: number | null,
): Promise<Map<string, string>> {
  if (ceiling === null) {
    return new Map();
  }

  const observer = await observeGraph(ctx, fileSymbolsLens(filePath), {
    source: { kind: "live", ceiling },
  });
  const nodes = await observer.getNodes();
  const seeded = new Map<string, string>();

  for (const nodeId of nodes) {
    const props = await observer.getNodeProps(nodeId);
    const symbolPath = typeof props?.["symbolPath"] === "string"
      ? props["symbolPath"]
      : typeof props?.["name"] === "string"
        ? props["name"]
        : null;
    const identityId = typeof props?.["identityId"] === "string"
      ? props["identityId"]
      : null;
    if (symbolPath !== null && identityId !== null) {
      seeded.set(symbolPath, identityId);
    }
  }

  return seeded;
}

export async function resolveParentTick(
  ctx: WarpContext,
  commitTicks: ReadonlyMap<string, number>,
  parentSha: string | null,
): Promise<number | null> {
  if (parentSha === null) {
    return null;
  }
  return commitTicks.get(parentSha) ?? await readCommitTick(ctx, parentSha);
}

export async function loadPriorIdentityMap(
  ctx: WarpContext,
  liveIdentityByFile: ReadonlyMap<string, Map<string, string>>,
  filePath: string,
  parentTick: number | null,
): Promise<Map<string, string>> {
  return liveIdentityByFile.has(filePath)
    ? cloneIdentityMap(liveIdentityByFile.get(filePath))
    : await readIdentitySeedForFile(ctx, filePath, parentTick);
}

export function emitDirectoryChain(patch: PatchOps, filePath: string): void {
  const parts = filePath.split("/");
  if (parts.length <= 1) return;

  let current = "";
  for (let index = 0; index < parts.length - 1; index++) {
    const parent = current;
    const part = parts[index] ?? "";
    current = current.length > 0 ? `${current}/${part}` : part;
    const dirId = dirNodeId(current);
    patch.addNode(dirId);
    patch.setProperty(dirId, "path", current);

    if (parent.length > 0) {
      patch.addEdge(dirNodeId(parent), dirId, "contains");
    }
  }

  patch.addEdge(dirNodeId(current), fileNodeId(filePath), "contains");
}

function annotateSymbol(
  patch: PatchOps,
  input: {
    filePath: string;
    entry: OutlineEntry;
    jumpLookup: Map<string, { start: number; end: number }>;
    symbolPath: string;
    identityByPath: SymbolIdentityMap;
    parentSymId?: string | undefined;
    commitId?: string | undefined;
  },
): void {
  const symId = symNodeId(input.filePath, input.symbolPath);
  patch.addNode(symId);
  patch.setProperty(symId, "name", input.entry.name);
  patch.setProperty(symId, "kind", input.entry.kind);
  patch.setProperty(symId, "exported", input.entry.exported);
  patch.setProperty(symId, "symbolPath", input.symbolPath);
  if (input.entry.signature !== undefined) {
    patch.setProperty(symId, "signature", input.entry.signature);
  }
  const identityId = input.identityByPath.get(input.symbolPath);
  if (identityId !== undefined) {
    patch.setProperty(symId, "identityId", identityId);
    patch.addNode(identityNodeId(identityId));
    patch.setProperty(identityNodeId(identityId), "identityId", identityId);
    patch.setProperty(identityNodeId(identityId), "entityKind", "symbol_identity");
    patch.addEdge(symId, identityNodeId(identityId), "has_identity");
  }
  const jump = input.jumpLookup.get(input.entry.name);
  if (jump !== undefined) {
    patch.setProperty(symId, "startLine", jump.start);
    patch.setProperty(symId, "endLine", jump.end);
  }
  patch.addEdge(fileNodeId(input.filePath), symId, "contains");
  if (input.parentSymId !== undefined) {
    patch.addEdge(input.parentSymId, symId, "child_of");
  }
  if (input.commitId !== undefined) {
    patch.addEdge(input.commitId, symId, "adds");
  }
}

export function emitSymbols(
  patch: PatchOps,
  filePath: string,
  entries: readonly OutlineEntry[],
  jumpLookup: Map<string, { start: number; end: number }>,
  identityByPath: SymbolIdentityMap,
  parentSymId?: string,
  parentSymbolPath = "",
  commitId?: string,
): void {
  for (const entry of entries) {
    const symbolPath = buildSymbolPath(parentSymbolPath, entry.name);
    const symId = symNodeId(filePath, symbolPath);
    annotateSymbol(patch, {
      filePath,
      entry,
      jumpLookup,
      symbolPath,
      identityByPath,
      parentSymId,
      commitId,
    });
    if (entry.children !== undefined && entry.children.length > 0) {
      emitSymbols(patch, filePath, entry.children, jumpLookup, identityByPath, symId, symbolPath, commitId);
    }
  }
}

export function removeSymbols(
  patch: PatchOps,
  filePath: string,
  entries: readonly OutlineEntry[],
  parentSymbolPath = "",
  commitId?: string,
): void {
  for (const entry of entries) {
    const symbolPath = buildSymbolPath(parentSymbolPath, entry.name);
    if (entry.children !== undefined && entry.children.length > 0) {
      removeSymbols(patch, filePath, entry.children, symbolPath, commitId);
    }
    const symId = symNodeId(filePath, symbolPath);
    if (commitId !== undefined) {
      patch.addEdge(commitId, symId, "removes");
    }
    patch.removeEdge(fileNodeId(filePath), symId, "contains");
    patch.removeNode(symId);
  }
}

export function applyModifiedSymbols(
  patch: PatchOps,
  filePath: string,
  fileId: string,
  commitId: string,
  oldEntries: readonly OutlineEntry[],
  newEntries: readonly OutlineEntry[],
  jumpLookup: Map<string, { start: number; end: number }>,
  identityByPath: SymbolIdentityMap,
  oldParentPath = "",
  newParentPath = "",
): void {
  const oldByName = new Map<string, OutlineEntry>();
  for (const entry of oldEntries) {
    oldByName.set(entry.name, entry);
  }
  const newByName = new Map<string, OutlineEntry>();
  for (const entry of newEntries) {
    newByName.set(entry.name, entry);
  }
  const diff = diffOutlines(oldEntries, newEntries);
  const changedNames = new Set(diff.changed.map((entry) => entry.name));

  for (const removed of diff.removed) {
    const oldEntry = oldByName.get(removed.name);
    if (oldEntry !== undefined) {
      removeSymbols(patch, filePath, [oldEntry], oldParentPath, commitId);
    }
  }

  for (const added of diff.added) {
    const newEntry = newByName.get(added.name);
    if (newEntry !== undefined) {
      emitSymbols(
        patch,
        filePath,
        [newEntry],
        jumpLookup,
        identityByPath,
        undefined,
        newParentPath,
        commitId,
      );
    }
  }

  for (const [name, newEntry] of newByName) {
    const oldEntry = oldByName.get(name);
    if (oldEntry === undefined) {
      continue;
    }
    const symbolPath = buildSymbolPath(newParentPath, newEntry.name);
    const symId = symNodeId(filePath, symbolPath);

    applyModifiedSymbols(
      patch,
      filePath,
      fileId,
      commitId,
      oldEntry.children ?? [],
      newEntry.children ?? [],
      jumpLookup,
      identityByPath,
      buildSymbolPath(oldParentPath, oldEntry.name),
      symbolPath,
    );

    annotateSymbol(patch, {
      filePath,
      entry: newEntry,
      jumpLookup,
      symbolPath,
      identityByPath,
    });
    patch.addEdge(fileId, symId, "contains");
    if (changedNames.has(name)) {
      patch.addEdge(commitId, symId, "changes");
    }
  }
}

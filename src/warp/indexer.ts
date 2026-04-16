/**
 * WARP Indexer — walks git history and writes structural delta
 * patches into the WARP graph.
 *
 * Observer Law: this module WRITES facts. It never reads them back.
 * Reading is done exclusively through observers (see observers.ts).
 */

import type { GitClient } from "../ports/git.js";
import type { WarpHandle } from "../ports/warp.js";
import { extractOutline } from "../parser/outline.js";
import { diffOutlines } from "../parser/diff.js";
import { detectLang } from "../parser/lang.js";
import { getFileAtRef } from "../git/diff.js";
import type { OutlineEntry, JumpEntry } from "../parser/types.js";
import { fileSymbolsLens } from "./observers.js";
import {
  assignCanonicalSymbolIdentities,
  buildSymbolPath,
  type SymbolIdentityMap,
} from "./symbol-identity.js";

export interface IndexOptions {
  readonly cwd: string;
  readonly git: GitClient;
  readonly from?: string;
  readonly to?: string;
}

export interface IndexResult {
  readonly commitsIndexed: number;
  readonly patchesWritten: number;
  readonly commitTicks: ReadonlyMap<string, number>;
}

// Patch builder shape — matches PatchBuilderV2's fluent API.
interface PatchOps {
  addNode(id: string): PatchOps;
  removeNode(id: string): PatchOps;
  setProperty(id: string, key: string, value: unknown): PatchOps;
  addEdge(from: string, to: string, label: string): PatchOps;
  removeEdge(from: string, to: string, label: string): PatchOps;
}

interface PreparedChange {
  readonly status: string;
  readonly filePath: string;
  readonly previousPath?: string | undefined;
  readonly fileId: string;
  readonly lang: string | null;
  readonly parentExists: boolean;
  readonly oldOutline: readonly OutlineEntry[];
  readonly newOutline?: readonly OutlineEntry[] | undefined;
  readonly jumpLookup?: Map<string, { start: number; end: number }> | undefined;
  readonly diff?: ReturnType<typeof diffOutlines> | undefined;
}

async function git(gitClient: GitClient, cwd: string, args: readonly string[]): Promise<string> {
  const result = await gitClient.run({ cwd, args });
  if (result.error !== undefined || result.status !== 0) {
    throw result.error ?? new Error(result.stderr.trim() || `git exited with status ${String(result.status)}`);
  }
  return result.stdout;
}

async function listCommits(gitClient: GitClient, cwd: string, from?: string, to?: string): Promise<string[]> {
  const range = from !== undefined ? `${from}..${to ?? "HEAD"}` : to ?? "HEAD";
  const args = ["log", "--reverse", "--format=%H", range];
  try {
    return (await git(gitClient, cwd, args))
      .trim().split("\n").filter((l) => l.length > 0);
  } catch {
    return [];
  }
}

async function getCommitChanges(
  gitClient: GitClient,
  sha: string,
  cwd: string,
): Promise<{ status: string; path: string; previousPath?: string }[]> {
  // --root handles the initial commit (no parent to diff against)
  const args = ["diff-tree", "--root", "--no-commit-id", "-r", "-M", "--name-status", sha];
  try {
    return (await git(gitClient, cwd, args))
      .trim().split("\n").filter((l) => l.length > 0).map((line) => {
        const parts = line.split("\t");
        const rawStatus = parts[0] ?? "";
        if (rawStatus.startsWith("R")) {
          return {
            status: "R",
            previousPath: parts[1] ?? "",
            path: parts[2] ?? "",
          };
        }
        if (rawStatus.startsWith("C")) {
          return {
            status: "A",
            path: parts[2] ?? "",
          };
        }
        return { status: rawStatus[0] ?? rawStatus, path: parts[1] ?? "" };
      });
  } catch {
    return [];
  }
}

async function getCommitMeta(
  gitClient: GitClient,
  sha: string,
  cwd: string,
): Promise<{ message: string; author: string; email: string; timestamp: string }> {
  try {
    const output = await git(gitClient, cwd, ["log", "-1", "--format=%s%n%aN%n%aE%n%aI", sha]);
    const lines = output.trim().split("\n");
    return { message: lines[0] ?? "", author: lines[1] ?? "", email: lines[2] ?? "", timestamp: lines[3] ?? "" };
  } catch {
    return { message: "", author: "", email: "", timestamp: "" };
  }
}

/**
 * Check if a commit has a parent (is not the root commit).
 */
async function hasParent(gitClient: GitClient, sha: string, cwd: string): Promise<boolean> {
  try {
    await git(gitClient, cwd, ["rev-parse", "--verify", `${sha}~1`]);
    return true;
  } catch {
    return false;
  }
}

async function getParentSha(gitClient: GitClient, sha: string, cwd: string): Promise<string | null> {
  try {
    return (await git(gitClient, cwd, ["rev-parse", "--verify", `${sha}~1`])).trim();
  } catch {
    return null;
  }
}

function dirNodeId(dirPath: string): string {
  return `dir:${dirPath}`;
}

function fileNodeId(filePath: string): string {
  return `file:${filePath}`;
}

function symNodeId(filePath: string, name: string): string {
  return `sym:${filePath}:${name}`;
}

function identityNodeId(identityId: string): string {
  return identityId;
}

/**
 * Build a lookup from symbol name → line range from the jump table.
 */
function buildJumpLookup(jumpTable: readonly JumpEntry[]): Map<string, { start: number; end: number }> {
  const lookup = new Map<string, { start: number; end: number }>();
  for (const entry of jumpTable) {
    lookup.set(entry.symbol, { start: entry.start, end: entry.end });
  }
  return lookup;
}

function cloneIdentityMap(input: SymbolIdentityMap | undefined): Map<string, string> {
  return new Map(input ?? []);
}

async function readCommitTick(warp: WarpHandle, sha: string): Promise<number | null> {
  const observer = await warp.observer({ match: `commit:${sha}`, expose: ["tick"] });
  const nodes = await observer.getNodes();
  const nodeId = nodes[0];
  if (nodeId === undefined) {
    return null;
  }
  const props = await observer.getNodeProps(nodeId);
  return typeof props?.["tick"] === "number" ? props["tick"] : null;
}

async function readIdentitySeedForFile(
  warp: WarpHandle,
  filePath: string,
  ceiling: number | null,
): Promise<Map<string, string>> {
  if (ceiling === null) {
    return new Map();
  }

  const observer = await warp.observer(
    fileSymbolsLens(filePath),
    { source: { kind: "live", ceiling } },
  );
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

/**
 * Emit directory nodes + edges for all path components of a file.
 */
function emitDirectoryChain(patch: PatchOps, filePath: string): void {
  const parts = filePath.split("/");
  if (parts.length <= 1) return;

  let current = "";
  for (let i = 0; i < parts.length - 1; i++) {
    const parent = current;
    const part = parts[i] ?? "";
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
  const symId = symNodeId(input.filePath, input.entry.name);
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

function emitSymbols(
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
    const symId = symNodeId(filePath, entry.name);
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

function removeSymbols(
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
    const symId = symNodeId(filePath, entry.name);
    if (commitId !== undefined) {
      patch.addEdge(commitId, symId, "removes");
    }
    patch.removeEdge(fileNodeId(filePath), symId, "contains");
    patch.removeNode(symId);
  }
}

function applyModifiedSymbols(
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
    const symId = symNodeId(filePath, newEntry.name);

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

async function prepareChange(
  gitClient: GitClient,
  cwd: string,
  sha: string,
  parentRef: string,
  parentExists: boolean,
  change: { status: string; path: string; previousPath?: string },
): Promise<PreparedChange> {
  const filePath = change.path;
  const fileId = fileNodeId(filePath);
  const lang = detectLang(filePath);
  const previousPath = change.previousPath;

  if (change.status === "D") {
    let oldOutline: readonly OutlineEntry[] = [];
    if (lang !== null && parentExists) {
      const oldContent = await getFileAtRef(parentRef, filePath, { cwd, git: gitClient });
      if (oldContent !== null) {
        oldOutline = extractOutline(oldContent, lang).entries;
      }
    }
    return {
      status: change.status,
      filePath,
      ...(previousPath !== undefined ? { previousPath } : {}),
      fileId,
      lang,
      parentExists,
      oldOutline,
    };
  }

  if (lang === null) {
    return {
      status: change.status,
      filePath,
      ...(previousPath !== undefined ? { previousPath } : {}),
      fileId,
      lang,
      parentExists,
      oldOutline: [],
    };
  }

  const newContent = await getFileAtRef(sha, filePath, { cwd, git: gitClient });
  if (newContent === null) {
    return {
      status: change.status,
      filePath,
      ...(previousPath !== undefined ? { previousPath } : {}),
      fileId,
      lang,
      parentExists,
      oldOutline: [],
    };
  }

  const newResult = extractOutline(newContent, lang);
  const newOutline = newResult.entries;
  const jumpLookup = buildJumpLookup(newResult.jumpTable ?? []);

  if (change.status === "A" || !parentExists) {
    return {
      status: change.status,
      filePath,
      ...(previousPath !== undefined ? { previousPath } : {}),
      fileId,
      lang,
      parentExists,
      oldOutline: [],
      newOutline,
      jumpLookup,
    };
  }

  const oldContent = await getFileAtRef(parentRef, previousPath ?? filePath, { cwd, git: gitClient });
  if (oldContent === null) {
    return {
      status: change.status,
      filePath,
      ...(previousPath !== undefined ? { previousPath } : {}),
      fileId,
      lang,
      parentExists,
      oldOutline: [],
      newOutline,
      jumpLookup,
    };
  }

  const oldOutline = extractOutline(oldContent, lang).entries;
  return {
    status: change.status,
    filePath,
    ...(previousPath !== undefined ? { previousPath } : {}),
    fileId,
    lang,
    parentExists,
    oldOutline,
    newOutline,
    jumpLookup,
    diff: diffOutlines(oldOutline, newOutline),
  };
}

/**
 * Index a range of commits into the WARP graph.
 */
export async function indexCommits(
  warp: WarpHandle,
  options: IndexOptions,
): Promise<IndexResult> {
  const { cwd, git: gitClient } = options;
  const commits = await listCommits(gitClient, cwd, options.from, options.to);

  let patchesWritten = 0;
  const commitTicks = new Map<string, number>();
  const liveIdentityByFile = new Map<string, Map<string, string>>();

  for (const sha of commits) {
    const changes = await getCommitChanges(gitClient, sha, cwd);

    // Only materialize when removals are possible (D or M status).
    // Materialization is expensive — O(n) replay of all prior patches.
    // Add-only commits (A status) and no-change commits don't need it.
    const hasRemovals = changes.some((c) => c.status === "D" || c.status === "M" || c.status === "R");
    if (hasRemovals) {
      await warp.materialize();
    }

    const meta = await getCommitMeta(gitClient, sha, cwd);
    const parentExists = await hasParent(gitClient, sha, cwd);
    const parentRef = `${sha}~1`;
    const parentSha = parentExists ? await getParentSha(gitClient, sha, cwd) : null;
    const preparedChanges = await Promise.all(changes.map((change) =>
      prepareChange(gitClient, cwd, sha, parentRef, parentExists, change)
    ));
    const parentTick = parentSha !== null
      ? commitTicks.get(parentSha) ?? await readCommitTick(warp, parentSha)
      : null;

    const resolvedChanges = await Promise.all(preparedChanges.map(async (change) => {
      const oldIdentitySourcePath = change.previousPath ?? change.filePath;
      const oldIdentityByPath = liveIdentityByFile.has(oldIdentitySourcePath)
        ? cloneIdentityMap(liveIdentityByFile.get(oldIdentitySourcePath))
        : await readIdentitySeedForFile(warp, oldIdentitySourcePath, parentTick);
      const newIdentityByPath = change.lang !== null && change.newOutline !== undefined
        ? assignCanonicalSymbolIdentities({
          oldEntries: change.oldOutline,
          newEntries: change.newOutline,
          oldIdentityByPath,
          commitSha: sha,
          filePath: change.filePath,
        })
        : new Map<string, string>();

      return {
        ...change,
        oldIdentityByPath,
        newIdentityByPath,
      };
    }));

    await warp.patch((p) => {
      const patch = p as unknown as PatchOps;

      const commitId = `commit:${sha}`;
      patch.addNode(commitId);
      patch.setProperty(commitId, "sha", sha);
      patch.setProperty(commitId, "message", meta.message);
      patch.setProperty(commitId, "author", meta.author);
      patch.setProperty(commitId, "email", meta.email);
      patch.setProperty(commitId, "timestamp", meta.timestamp);
      patch.setProperty(commitId, "tick", patchesWritten + 1);

      for (const change of resolvedChanges) {
        if (change.status === "D") {
          if (change.lang !== null) {
            removeSymbols(patch, change.filePath, change.oldOutline, "", commitId);
          }
          patch.removeNode(change.fileId);
          continue;
        }

        // Added or modified — ensure file + directory nodes exist
        patch.addNode(change.fileId);
        patch.setProperty(change.fileId, "path", change.filePath);
        patch.setProperty(change.fileId, "lang", change.lang ?? "unknown");
        patch.addEdge(commitId, change.fileId, "touches");
        emitDirectoryChain(patch, change.filePath);

        if (change.lang === null || change.newOutline === undefined || change.jumpLookup === undefined) continue;

        if (change.status === "R" && change.previousPath !== undefined) {
          removeSymbols(patch, change.previousPath, change.oldOutline, "", commitId);
          patch.removeNode(fileNodeId(change.previousPath));
          emitSymbols(
            patch,
            change.filePath,
            change.newOutline,
            change.jumpLookup,
            change.newIdentityByPath,
            undefined,
            "",
            commitId,
          );
          continue;
        }

        if (change.status === "A" || !change.parentExists || change.diff === undefined) {
          // New file or root commit — emit all symbols
          emitSymbols(
            patch,
            change.filePath,
            change.newOutline,
            change.jumpLookup,
            change.newIdentityByPath,
            undefined,
            "",
            commitId,
          );
        } else {
          applyModifiedSymbols(
            patch,
            change.filePath,
            change.fileId,
            commitId,
            change.oldOutline,
            change.newOutline,
            change.jumpLookup,
            change.newIdentityByPath,
          );
        }
      }
    });
    patchesWritten++;
    commitTicks.set(sha, patchesWritten);

    for (const change of resolvedChanges) {
      if (change.status === "D") {
        liveIdentityByFile.delete(change.filePath);
        continue;
      }
      if (change.previousPath !== undefined && change.previousPath !== change.filePath) {
        liveIdentityByFile.delete(change.previousPath);
      }
      if (change.newOutline !== undefined && change.lang !== null) {
        liveIdentityByFile.set(change.filePath, new Map(change.newIdentityByPath));
      } else {
        liveIdentityByFile.delete(change.filePath);
      }
    }
  }

  return { commitsIndexed: commits.length, patchesWritten, commitTicks };
}

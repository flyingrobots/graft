/**
 * WARP Indexer — walks git history and writes structural delta
 * patches into the WARP graph.
 *
 * Observer Law: this module WRITES facts. It never reads them back.
 * Reading is done exclusively through observers (see observers.ts).
 */

import type WarpApp from "@git-stunts/git-warp";
import { execFileSync } from "node:child_process";
import { extractOutline } from "../parser/outline.js";
import { diffOutlines } from "../parser/diff.js";
import { detectLang } from "../parser/lang.js";
import { getFileAtRef } from "../git/diff.js";
import type { OutlineEntry, JumpEntry } from "../parser/types.js";
import type { DiffEntry } from "../parser/diff.js";

export interface IndexOptions {
  readonly cwd: string;
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

function listCommits(cwd: string, from?: string, to?: string): string[] {
  const range = from !== undefined ? `${from}..${to ?? "HEAD"}` : to ?? "HEAD";
  const args = ["log", "--reverse", "--format=%H", range];
  try {
    return execFileSync("git", args, { cwd, encoding: "utf-8" })
      .trim().split("\n").filter((l) => l.length > 0);
  } catch {
    return [];
  }
}

function getCommitChanges(sha: string, cwd: string): { status: string; path: string }[] {
  // --root handles the initial commit (no parent to diff against)
  const args = ["diff-tree", "--root", "--no-commit-id", "-r", "--name-status", sha];
  try {
    return execFileSync("git", args, { cwd, encoding: "utf-8" })
      .trim().split("\n").filter((l) => l.length > 0).map((line) => {
        const parts = line.split("\t");
        return { status: parts[0] ?? "", path: parts[1] ?? "" };
      });
  } catch {
    return [];
  }
}

function getCommitMeta(sha: string, cwd: string): { message: string; author: string; email: string; timestamp: string } {
  try {
    const output = execFileSync("git", ["log", "-1", "--format=%s%n%aN%n%aE%n%aI", sha], { cwd, encoding: "utf-8" });
    const lines = output.trim().split("\n");
    return { message: lines[0] ?? "", author: lines[1] ?? "", email: lines[2] ?? "", timestamp: lines[3] ?? "" };
  } catch {
    return { message: "", author: "", email: "", timestamp: "" };
  }
}

/**
 * Check if a commit has a parent (is not the root commit).
 */
function hasParent(sha: string, cwd: string): boolean {
  try {
    execFileSync("git", ["rev-parse", "--verify", `${sha}~1`], { cwd, encoding: "utf-8" });
    return true;
  } catch {
    return false;
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

/**
 * Emit symbol nodes + edges for all entries in a file outline.
 */
function emitSymbols(
  patch: PatchOps,
  filePath: string,
  entries: readonly OutlineEntry[],
  jumpLookup: Map<string, { start: number; end: number }>,
  parentSymId?: string,
): void {
  for (const entry of entries) {
    const symId = symNodeId(filePath, entry.name);
    patch.addNode(symId);
    patch.setProperty(symId, "name", entry.name);
    patch.setProperty(symId, "kind", entry.kind);
    patch.setProperty(symId, "exported", entry.exported);
    if (entry.signature !== undefined) {
      patch.setProperty(symId, "signature", entry.signature);
    }
    const jump = jumpLookup.get(entry.name);
    if (jump !== undefined) {
      patch.setProperty(symId, "startLine", jump.start);
      patch.setProperty(symId, "endLine", jump.end);
    }
    patch.addEdge(fileNodeId(filePath), symId, "contains");
    if (parentSymId !== undefined) {
      patch.addEdge(parentSymId, symId, "child_of");
    }
    if (entry.children !== undefined && entry.children.length > 0) {
      emitSymbols(patch, filePath, entry.children, jumpLookup, symId);
    }
  }
}

/**
 * Tombstone (remove) symbol nodes recursively including children.
 */
function removeSymbols(
  patch: PatchOps,
  filePath: string,
  entries: readonly OutlineEntry[],
): void {
  for (const entry of entries) {
    // Recurse into children FIRST (bottom-up removal)
    if (entry.children !== undefined && entry.children.length > 0) {
      removeSymbols(patch, filePath, entry.children);
    }
    const symId = symNodeId(filePath, entry.name);
    patch.removeEdge(fileNodeId(filePath), symId, "contains");
    patch.removeNode(symId);
  }
}

/**
 * Remove symbols from DiffEntry (removed symbols in a diff).
 * Also recursively handles childDiff if present.
 */
function removeDiffSymbols(
  patch: PatchOps,
  filePath: string,
  fileId: string,
  entries: readonly DiffEntry[],
): void {
  for (const entry of entries) {
    // Recurse into childDiff if present (remove grandchildren first)
    if (entry.childDiff !== undefined) {
      removeDiffSymbols(patch, filePath, fileId, [...entry.childDiff.removed]);
      removeDiffSymbols(patch, filePath, fileId, [...entry.childDiff.added]);
      removeDiffSymbols(patch, filePath, fileId, [...entry.childDiff.changed]);
    }
    const symId = symNodeId(filePath, entry.name);
    patch.removeEdge(fileId, symId, "contains");
    patch.removeNode(symId);
  }
}

/**
 * Apply child diffs for changed symbols (methods added/removed/changed
 * inside a class that kept its name).
 */
function applyChildDiffs(
  patch: PatchOps,
  filePath: string,
  fileId: string,
  commitId: string,
  changed: readonly DiffEntry[],
  jumpLookup: Map<string, { start: number; end: number }>,
): void {
  for (const entry of changed) {
    if (entry.childDiff === undefined) continue;
    const parentSymId = symNodeId(filePath, entry.name);

    for (const added of entry.childDiff.added) {
      const symId = symNodeId(filePath, added.name);
      patch.addNode(symId);
      patch.setProperty(symId, "name", added.name);
      patch.setProperty(symId, "kind", added.kind);
      patch.setProperty(symId, "exported", false);
      if (added.signature !== undefined) {
        patch.setProperty(symId, "signature", added.signature);
      }
      const jump = jumpLookup.get(added.name);
      if (jump !== undefined) {
        patch.setProperty(symId, "startLine", jump.start);
        patch.setProperty(symId, "endLine", jump.end);
      }
      patch.addEdge(fileId, symId, "contains");
      patch.addEdge(parentSymId, symId, "child_of");
      patch.addEdge(commitId, symId, "adds");
    }

    for (const removed of entry.childDiff.removed) {
      const symId = symNodeId(filePath, removed.name);
      patch.addEdge(commitId, symId, "removes");
      patch.removeEdge(fileId, symId, "contains");
      patch.removeNode(symId);
    }

    // Recurse into changed children that have their own childDiffs
    applyChildDiffs(patch, filePath, fileId, commitId, [...entry.childDiff.changed], jumpLookup);

    for (const child of entry.childDiff.changed) {
      const symId = symNodeId(filePath, child.name);
      patch.setProperty(symId, "kind", child.kind);
      if (child.signature !== undefined) {
        patch.setProperty(symId, "signature", child.signature);
      }
      patch.addEdge(commitId, symId, "changes");
    }
  }
}

/**
 * Index a range of commits into the WARP graph.
 */
export async function indexCommits(
  warp: WarpApp,
  options: IndexOptions,
): Promise<IndexResult> {
  const { cwd } = options;
  const commits = listCommits(cwd, options.from, options.to);

  let patchesWritten = 0;
  const commitTicks = new Map<string, number>();

  for (const sha of commits) {
    const changes = getCommitChanges(sha, cwd);

    // Materialize before each patch so removeNode can observe OR-Set dots.
    await warp.core().materialize();

    const meta = getCommitMeta(sha, cwd);
    const parentExists = hasParent(sha, cwd);
    const parentRef = `${sha}~1`;

    await warp.patch((p) => {
      const patch = p as unknown as PatchOps;

      const commitId = `commit:${sha}`;
      patch.addNode(commitId);
      patch.setProperty(commitId, "sha", sha);
      patch.setProperty(commitId, "message", meta.message);
      patch.setProperty(commitId, "author", meta.author);
      patch.setProperty(commitId, "email", meta.email);
      patch.setProperty(commitId, "timestamp", meta.timestamp);

      for (const change of changes) {
        const filePath = change.path;
        const fileId = fileNodeId(filePath);
        const lang = detectLang(filePath);

        if (change.status === "D") {
          if (lang !== null && parentExists) {
            const oldContent = getFileAtRef(parentRef, filePath, cwd);
            if (oldContent !== null) {
              const oldOutline = extractOutline(oldContent, lang).entries;
              removeSymbols(patch, filePath, oldOutline);
            }
          }
          patch.removeNode(fileId);
          continue;
        }

        // Added or modified — ensure file + directory nodes exist
        patch.addNode(fileId);
        patch.setProperty(fileId, "path", filePath);
        patch.setProperty(fileId, "lang", lang ?? "unknown");
        patch.addEdge(commitId, fileId, "touches");
        emitDirectoryChain(patch, filePath);

        if (lang === null) continue;

        const newContent = getFileAtRef(sha, filePath, cwd);
        if (newContent === null) continue;
        const newResult = extractOutline(newContent, lang);
        const newOutline = newResult.entries;
        const jumpLookup = buildJumpLookup(newResult.jumpTable ?? []);

        if (change.status === "A" || !parentExists) {
          // New file or root commit — emit all symbols
          emitSymbols(patch, filePath, newOutline, jumpLookup);
        } else {
          // Modified file — structural diff
          const oldContent = getFileAtRef(parentRef, filePath, cwd);
          if (oldContent === null) {
            emitSymbols(patch, filePath, newOutline, jumpLookup);
            continue;
          }

          const oldOutline = extractOutline(oldContent, lang).entries;
          const diff = diffOutlines(oldOutline, newOutline);

          // Remove deleted symbols
          for (const removed of diff.removed) {
            const symId = symNodeId(filePath, removed.name);
            patch.addEdge(commitId, symId, "removes");
            removeDiffSymbols(patch, filePath, fileId, [removed]);
          }

          // Add new symbols (preserve actual exported status)
          for (const added of diff.added) {
            const symId = symNodeId(filePath, added.name);
            patch.addNode(symId);
            patch.setProperty(symId, "name", added.name);
            patch.setProperty(symId, "kind", added.kind);
            // DiffEntry doesn't carry exported — default false for safety.
            // Full exported status comes from emitSymbols on initial add.
            patch.setProperty(symId, "exported", false);
            if (added.signature !== undefined) {
              patch.setProperty(symId, "signature", added.signature);
            }
            const jump = jumpLookup.get(added.name);
            if (jump !== undefined) {
              patch.setProperty(symId, "startLine", jump.start);
              patch.setProperty(symId, "endLine", jump.end);
            }
            patch.addEdge(fileId, symId, "contains");
            patch.addEdge(commitId, symId, "adds");
          }

          // Update changed symbols
          for (const changed of diff.changed) {
            const symId = symNodeId(filePath, changed.name);
            patch.setProperty(symId, "kind", changed.kind);
            if (changed.signature !== undefined) {
              patch.setProperty(symId, "signature", changed.signature);
            }
            patch.addEdge(commitId, symId, "changes");
          }

          // Apply nested child diffs (methods in classes)
          applyChildDiffs(patch, filePath, fileId, commitId, [...diff.changed], jumpLookup);
        }
      }
    });
    patchesWritten++;
    commitTicks.set(sha, patchesWritten);
  }

  return { commitsIndexed: commits.length, patchesWritten, commitTicks };
}

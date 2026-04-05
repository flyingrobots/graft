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
import type { OutlineEntry } from "../parser/types.js";

export interface IndexOptions {
  readonly cwd: string;
  readonly from?: string;
  readonly to?: string;
}

export interface IndexResult {
  readonly commitsIndexed: number;
  readonly patchesWritten: number;
}

// Patch builder shape — the subset of PatchBuilderV2 we use.
// Avoids importing the concrete class for testability.
interface PatchOps {
  addNode(id: string): PatchOps;
  removeNode(id: string): PatchOps;
  setProperty(id: string, key: string, value: unknown): PatchOps;
  addEdge(from: string, to: string, label: string): PatchOps;
  removeEdge(from: string, to: string, label: string): PatchOps;
  commit(): Promise<string>;
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
  const args = ["diff-tree", "--no-commit-id", "-r", "--name-status", sha];
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

function getCommitMeta(sha: string, cwd: string): { message: string; timestamp: string } {
  const output = execFileSync("git", ["log", "-1", "--format=%s%n%aI", sha], { cwd, encoding: "utf-8" });
  const lines = output.trim().split("\n");
  return { message: lines[0] ?? "", timestamp: lines[1] ?? "" };
}

function fileNodeId(path: string): string {
  return `file:${path}`;
}

function symNodeId(filePath: string, name: string): string {
  return `sym:${filePath}:${name}`;
}

/**
 * Emit symbol nodes + edges for all entries in a file outline.
 */
function emitSymbols(
  patch: PatchOps,
  filePath: string,
  entries: readonly OutlineEntry[],
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
    patch.addEdge(fileNodeId(filePath), symId, "contains");
    if (parentSymId !== undefined) {
      patch.addEdge(parentSymId, symId, "child_of");
    }
    if (entry.children !== undefined && entry.children.length > 0) {
      emitSymbols(patch, filePath, entry.children, symId);
    }
  }
}

/**
 * Tombstone (remove) symbol nodes for deleted/removed entries.
 */
function removeSymbols(
  patch: PatchOps,
  filePath: string,
  entries: readonly OutlineEntry[],
): void {
  for (const entry of entries) {
    const symId = symNodeId(filePath, entry.name);
    patch.removeEdge(fileNodeId(filePath), symId, "contains");
    patch.removeNode(symId);
    if (entry.children !== undefined && entry.children.length > 0) {
      removeSymbols(patch, filePath, entry.children);
    }
  }
}

/**
 * Index a range of commits into the WARP graph.
 *
 * For each commit:
 * 1. Identify changed files
 * 2. Parse files at both revisions with tree-sitter
 * 3. Compute structural diff
 * 4. Emit WARP patch operations (add/remove/update nodes)
 */
export async function indexCommits(
  warp: WarpApp,
  options: IndexOptions,
): Promise<IndexResult> {
  const { cwd } = options;
  const commits = listCommits(cwd, options.from, options.to);

  let patchesWritten = 0;

  for (const sha of commits) {
    const changes = getCommitChanges(sha, cwd);
    if (changes.length === 0) continue;

    const meta = getCommitMeta(sha, cwd);
    const parentRef = `${sha}~1`;
    const patch = await warp.createPatch() as unknown as PatchOps;

    // Record commit node
    const commitId = `commit:${sha}`;
    patch.addNode(commitId);
    patch.setProperty(commitId, "sha", sha);
    patch.setProperty(commitId, "message", meta.message);
    patch.setProperty(commitId, "timestamp", meta.timestamp);

    for (const change of changes) {
      const filePath = change.path;
      const fileId = fileNodeId(filePath);
      const lang = detectLang(filePath);

      if (change.status === "D") {
        // Deleted file — remove all symbols then the file node
        if (lang !== null) {
          const oldContent = getFileAtRef(parentRef, filePath, cwd);
          if (oldContent !== null) {
            const oldOutline = extractOutline(oldContent, lang).entries;
            removeSymbols(patch, filePath, oldOutline);
          }
        }
        patch.removeNode(fileId);
        continue;
      }

      // Added or modified — ensure file node exists
      patch.addNode(fileId);
      patch.setProperty(fileId, "path", filePath);
      patch.setProperty(fileId, "lang", lang ?? "unknown");
      patch.addEdge(fileId, commitId, "at_commit");

      // Unsupported language — file node only, no symbols
      // (unsupported-lawful-degrade invariant)
      if (lang === null) continue;

      const newContent = getFileAtRef(sha, filePath, cwd);
      if (newContent === null) continue;
      const newOutline = extractOutline(newContent, lang).entries;

      if (change.status === "A") {
        // New file — emit all symbols
        emitSymbols(patch, filePath, newOutline);
      } else {
        // Modified file — structural diff
        const oldContent = getFileAtRef(parentRef, filePath, cwd);
        if (oldContent === null) {
          emitSymbols(patch, filePath, newOutline);
          continue;
        }

        const oldOutline = extractOutline(oldContent, lang).entries;
        const diff = diffOutlines(oldOutline, newOutline);

        // Remove deleted symbols
        for (const removed of diff.removed) {
          const symId = symNodeId(filePath, removed.name);
          patch.removeEdge(fileId, symId, "contains");
          patch.removeNode(symId);
        }

        // Add new symbols
        for (const added of diff.added) {
          const symId = symNodeId(filePath, added.name);
          patch.addNode(symId);
          patch.setProperty(symId, "name", added.name);
          patch.setProperty(symId, "kind", added.kind);
          patch.setProperty(symId, "exported", true);
          if (added.signature !== undefined) {
            patch.setProperty(symId, "signature", added.signature);
          }
          patch.addEdge(fileId, symId, "contains");
        }

        // Update changed symbols
        for (const changed of diff.changed) {
          const symId = symNodeId(filePath, changed.name);
          patch.setProperty(symId, "kind", changed.kind);
          if (changed.signature !== undefined) {
            patch.setProperty(symId, "signature", changed.signature);
          }
        }
      }
    }

    await patch.commit();
    patchesWritten++;
  }

  return { commitsIndexed: commits.length, patchesWritten };
}

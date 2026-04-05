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
  const output = execFileSync("git", ["log", "-1", "--format=%s%n%aN%n%aE%n%aI", sha], { cwd, encoding: "utf-8" });
  const lines = output.trim().split("\n");
  return { message: lines[0] ?? "", author: lines[1] ?? "", email: lines[2] ?? "", timestamp: lines[3] ?? "" };
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
 * Emit directory nodes + edges for all path components of a file.
 * e.g. "src/mcp/server.ts" → dir:src, dir:src/mcp, with contains edges.
 */
function emitDirectoryChain(patch: PatchOps, filePath: string): void {
  const parts = filePath.split("/");
  if (parts.length <= 1) return; // file at root, no dirs to emit

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

  // Link innermost dir to the file
  patch.addEdge(dirNodeId(current), fileNodeId(filePath), "contains");
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
  const commitTicks = new Map<string, number>();

  for (const sha of commits) {
    const changes = getCommitChanges(sha, cwd);
    if (changes.length === 0) continue;

    // Materialize before each patch so removeNode can observe OR-Set dots.
    // core().materialize() populates _cachedState on the runtime.
    await warp.core().materialize();

    const meta = getCommitMeta(sha, cwd);
    const parentRef = `${sha}~1`;

    // warp.patch() creates, builds, and commits atomically
    await warp.patch((p) => {
      const patch = p as unknown as PatchOps;

      // Record commit node
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

        // Added or modified — ensure file + directory nodes exist
        patch.addNode(fileId);
        patch.setProperty(fileId, "path", filePath);
        patch.setProperty(fileId, "lang", lang ?? "unknown");
        patch.addEdge(commitId, fileId, "touches");
        emitDirectoryChain(patch, filePath);

        // Unsupported language — file node only, no symbols
        if (lang === null) continue;

        const newContent = getFileAtRef(sha, filePath, cwd);
        if (newContent === null) continue;
        const newResult = extractOutline(newContent, lang);
        const newOutline = newResult.entries;
        const jumpLookup = buildJumpLookup(newResult.jumpTable ?? []);

        if (change.status === "A") {
          emitSymbols(patch, filePath, newOutline, jumpLookup);
        } else {
          const oldContent = getFileAtRef(parentRef, filePath, cwd);
          if (oldContent === null) {
            emitSymbols(patch, filePath, newOutline, jumpLookup);
            continue;
          }

          const oldOutline = extractOutline(oldContent, lang).entries;
          const diff = diffOutlines(oldOutline, newOutline);

          for (const removed of diff.removed) {
            const symId = symNodeId(filePath, removed.name);
            patch.addEdge(commitId, symId, "removes");
            patch.removeEdge(fileId, symId, "contains");
            patch.removeNode(symId);
          }

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
            patch.addEdge(commitId, symId, "adds");
          }

          for (const changed of diff.changed) {
            const symId = symNodeId(filePath, changed.name);
            patch.setProperty(symId, "kind", changed.kind);
            if (changed.signature !== undefined) {
              patch.setProperty(symId, "signature", changed.signature);
            }
            patch.addEdge(commitId, symId, "changes");
          }
        }
      }
    });
    patchesWritten++;
    commitTicks.set(sha, patchesWritten);
  }

  return { commitsIndexed: commits.length, patchesWritten, commitTicks };
}

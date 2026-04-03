import * as fs from "node:fs";
import * as path from "node:path";
import { getChangedFiles, getFileAtRef, GitError } from "../git/diff.js";
import { extractOutline } from "../parser/outline.js";
import { diffOutlines } from "../parser/diff.js";
import type { OutlineDiff } from "../parser/diff.js";

export interface FileDiff {
  path: string;
  status: "modified" | "added" | "deleted";
  diff: OutlineDiff;
}

export interface GraftDiffResult {
  base: string;
  head: string;
  files: FileDiff[];
}

export interface GraftDiffOptions {
  cwd: string;
  base?: string | undefined;
  head?: string | undefined;
  path?: string | undefined;
}

function emptyDiff(): OutlineDiff {
  return { added: [], removed: [], changed: [], unchangedCount: 0 };
}

function detectLang(filePath: string): "ts" | "js" | null {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".ts" || ext === ".tsx") return "ts";
  if (ext === ".js" || ext === ".jsx") return "js";
  return null;
}

/**
 * Compute structural diffs between two git refs (or working tree).
 */
export function graftDiff(opts: GraftDiffOptions): GraftDiffResult {
  const base = opts.base ?? "HEAD";
  const headLabel = opts.head ?? "working tree";
  const cwd = opts.cwd;

  let changedFiles = getChangedFiles({
    cwd,
    base,
    head: opts.head,
  });

  // Filter by path if provided
  if (opts.path !== undefined) {
    changedFiles = changedFiles.filter((f) => f === opts.path);
  }

  const files: FileDiff[] = [];

  for (const filePath of changedFiles) {
    const lang = detectLang(filePath);

    // Get content at base (null = file absent at ref)
    let baseContent: string | null;
    try {
      baseContent = getFileAtRef(base, filePath, cwd);
    } catch (err: unknown) {
      if (err instanceof GitError) { baseContent = null; }
      else { throw err; }
    }

    // Get content at head (null = file absent at ref/worktree)
    let headContent: string | null;
    if (opts.head !== undefined) {
      try {
        headContent = getFileAtRef(opts.head, filePath, cwd);
      } catch (err: unknown) {
        if (err instanceof GitError) { headContent = null; }
        else { throw err; }
      }
    } else {
      const fullPath = path.join(cwd, filePath);
      try {
        headContent = fs.readFileSync(fullPath, "utf-8");
      } catch {
        headContent = null;
      }
    }

    // Determine status
    let status: "modified" | "added" | "deleted";
    if (baseContent === null && headContent === null) {
      // Both absent — file listed in diff but unreadable at both refs. Skip.
      continue;
    } else if (baseContent === null) {
      status = "added";
    } else if (headContent === null) {
      status = "deleted";
    } else {
      status = "modified";
    }

    // Compute structural diff (only for supported languages)
    if (lang === null) {
      files.push({ path: filePath, status, diff: emptyDiff() });
      continue;
    }

    const baseOutline = baseContent !== null
      ? extractOutline(baseContent, lang).entries
      : [];
    const headOutline = headContent !== null
      ? extractOutline(headContent, lang).entries
      : [];

    const diff = diffOutlines(baseOutline, headOutline);
    files.push({ path: filePath, status, diff });
  }

  return { base, head: headLabel, files };
}

import * as path from "node:path";
import type { FileSystem } from "../ports/filesystem.js";
import { getChangedFiles, getFileAtRef } from "../git/diff.js";
import { detectLang } from "../parser/lang.js";
import { extractOutline } from "../parser/outline.js";
import { diffOutlines } from "../parser/diff.js";
import type { OutlineDiff } from "../parser/diff.js";

export interface FileDiff {
  path: string;
  status: "modified" | "added" | "deleted";
  diff: OutlineDiff;
}

export interface GraftDiffResult {
  [key: string]: unknown;
  base: string;
  head: string;
  files: FileDiff[];
}

export interface GraftDiffOptions {
  cwd: string;
  fs: FileSystem;
  base?: string | undefined;
  head?: string | undefined;
  path?: string | undefined;
}

function emptyDiff(): OutlineDiff {
  return { added: [], removed: [], changed: [], unchangedCount: 0 };
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
    const baseContent = getFileAtRef(base, filePath, cwd);

    // Get content at head (null = file absent at ref/worktree)
    let headContent: string | null;
    if (opts.head !== undefined) {
      headContent = getFileAtRef(opts.head, filePath, cwd);
    } else {
      const fullPath = path.join(cwd, filePath);
      try {
        headContent = opts.fs.readFileSync(fullPath, "utf-8");
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

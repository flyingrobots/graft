import * as fs from "node:fs";
import * as path from "node:path";
import { getChangedFiles, getFileAtRef } from "../git/diff.js";
import { extractOutline } from "../parser/outline.js";
import { diffOutlines } from "../parser/diff.js";
import type { OutlineDiff } from "../parser/diff.js";

const SUPPORTED_EXTENSIONS = new Set([".ts", ".js", ".tsx", ".jsx"]);

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
    const ext = path.extname(filePath).toLowerCase();
    const supported = SUPPORTED_EXTENSIONS.has(ext);

    // Get content at base
    const baseContent = getFileAtRef(base, filePath, cwd);

    // Get content at head
    let headContent: string | null;
    if (opts.head !== undefined) {
      headContent = getFileAtRef(opts.head, filePath, cwd);
    } else {
      // Working tree
      const fullPath = path.join(cwd, filePath);
      try {
        headContent = fs.readFileSync(fullPath, "utf-8");
      } catch {
        headContent = null;
      }
    }

    // Determine status
    let status: "modified" | "added" | "deleted";
    if (baseContent === null && headContent !== null) {
      status = "added";
    } else if (baseContent !== null && headContent === null) {
      status = "deleted";
    } else {
      status = "modified";
    }

    // Compute structural diff (only for supported languages)
    if (!supported || lang === null) {
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

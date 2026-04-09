import type { FileSystem } from "../ports/filesystem.js";
import type { GitClient } from "../ports/git.js";
import { getChangedFiles, getFileAtRef } from "../git/diff.js";
import { detectLang } from "../parser/lang.js";
import { extractOutline } from "../parser/outline.js";
import { diffOutlines, OutlineDiff } from "../parser/diff.js";

export interface FileDiff {
  path: string;
  status: "modified" | "added" | "deleted";
  summary: string;
  diff: OutlineDiff;
}

export interface GraftDiffRefusal {
  path: string;
  reason: string;
  reasonDetail: string;
  next: readonly string[];
  actual: { lines: number; bytes: number };
}

function buildSummary(filePath: string, status: string, diff: OutlineDiff): string {
  const parts: string[] = [];
  if (diff.added.length > 0) parts.push(`+${String(diff.added.length)} added`);
  if (diff.removed.length > 0) parts.push(`-${String(diff.removed.length)} removed`);
  if (diff.changed.length > 0) parts.push(`~${String(diff.changed.length)} changed`);
  if (diff.unchangedCount > 0) parts.push(`=${String(diff.unchangedCount)} unchanged`);
  const stats = parts.length > 0 ? parts.join(", ") : "no structural changes";
  return `${filePath} | ${status} | ${stats}`;
}

export interface GraftDiffResult {
  [key: string]: unknown;
  base: string;
  head: string;
  files: FileDiff[];
  refused?: GraftDiffRefusal[] | undefined;
}

export interface GraftDiffOptions {
  cwd: string;
  fs: FileSystem;
  git: GitClient;
  resolveWorkingTreePath: (filePath: string) => string;
  base?: string | undefined;
  head?: string | undefined;
  path?: string | undefined;
  refusalCheck?: ((filePath: string, actual: { lines: number; bytes: number }) => GraftDiffRefusal | null) | undefined;
}

function emptyDiff(): OutlineDiff {
  return new OutlineDiff({ added: [], removed: [], changed: [], unchangedCount: 0 });
}

function countLines(content: string): number {
  return content.split("\n").length;
}

function measureActual(
  baseContent: string | null,
  headContent: string | null,
): { lines: number; bytes: number } {
  const byteLengths = [baseContent, headContent]
    .filter((content): content is string => content !== null)
    .map((content) => Buffer.byteLength(content));
  const lineCounts = [baseContent, headContent]
    .filter((content): content is string => content !== null)
    .map((content) => countLines(content));

  return {
    bytes: byteLengths.length > 0 ? Math.max(...byteLengths) : 0,
    lines: lineCounts.length > 0 ? Math.max(...lineCounts) : 0,
  };
}


/**
 * Compute structural diffs between two git refs (or working tree).
 */
export async function graftDiff(opts: GraftDiffOptions): Promise<GraftDiffResult> {
  const base = opts.base ?? "HEAD";
  const headLabel = opts.head ?? "working tree";
  const cwd = opts.cwd;

  let changedFiles = await getChangedFiles({
    cwd,
    git: opts.git,
    base,
    head: opts.head,
  });

  // Filter by path if provided
  if (opts.path !== undefined) {
    changedFiles = changedFiles.filter((f) => f === opts.path);
  }

  const files: FileDiff[] = [];
  const refused: GraftDiffRefusal[] = [];

  for (const filePath of changedFiles) {
    // Get content at base (null = file absent at ref)
    const baseContent = await getFileAtRef(base, filePath, { cwd, git: opts.git });

    // Get content at head (null = file absent at ref/worktree)
    let headContent: string | null;
    if (opts.head !== undefined) {
      headContent = await getFileAtRef(opts.head, filePath, { cwd, git: opts.git });
    } else {
      try {
        headContent = opts.fs.readFileSync(opts.resolveWorkingTreePath(filePath), "utf-8");
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

    const actual = measureActual(baseContent, headContent);
    const refusal = opts.refusalCheck?.(filePath, actual) ?? null;
    if (refusal !== null) {
      refused.push(refusal);
      continue;
    }

    const lang = detectLang(filePath);

    // Compute structural diff (only for supported languages)
    if (lang === null) {
      const empty = emptyDiff();
      files.push({ path: filePath, status, summary: buildSummary(filePath, status, empty), diff: empty });
      continue;
    }

    const baseOutline = baseContent !== null
      ? extractOutline(baseContent, lang).entries
      : [];
    const headOutline = headContent !== null
      ? extractOutline(headContent, lang).entries
      : [];

    const diff = diffOutlines(baseOutline, headOutline);
    files.push({ path: filePath, status, summary: buildSummary(filePath, status, diff), diff });
  }

  return {
    base,
    head: headLabel,
    files,
    ...(refused.length > 0 ? { refused } : {}),
  };
}

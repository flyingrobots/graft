// ---------------------------------------------------------------------------
// Structural Review — zero-noise PR review separating signal from formatting
// ---------------------------------------------------------------------------

import type { FileSystem } from "../ports/filesystem.js";
import type { GitClient } from "../ports/git.js";
import { graftDiff, type FileDiff, type GraftDiffOptions } from "./graft-diff.js";

// ---- Public types ---------------------------------------------------------

export interface ReferenceCountResult {
  readonly referenceCount: number;
  readonly referencingFiles: readonly string[];
}

export type ReferenceCounter = (
  symbolName: string,
  filePath: string,
) => Promise<ReferenceCountResult>;


export type ReviewCategory = "structural" | "formatting" | "test" | "docs" | "config";

export interface ReviewFile {
  readonly path: string;
  readonly category: ReviewCategory;
  readonly structuralChanges?: { added: number; removed: number; changed: number };
}

export interface BreakingChange {
  readonly symbol: string;
  readonly kind: string;
  readonly filePath: string;
  readonly changeType: "removed_export" | "signature_changed" | "type_changed";
  readonly previousSignature?: string;
  readonly newSignature?: string;
  readonly impactedFiles: number;
  readonly impactedFilePaths: readonly string[];
}

export interface StructuralReviewResult {
  readonly base: string;
  readonly head: string;
  readonly totalFiles: number;
  readonly categories: Record<ReviewCategory, number>;
  readonly files: readonly ReviewFile[];
  readonly breakingChanges: readonly BreakingChange[];
  readonly summary: string;
}

export interface StructuralReviewOptions {
  readonly cwd: string;
  readonly fs: FileSystem;
  readonly git: GitClient;
  readonly resolveWorkingTreePath: (filePath: string) => string;
  readonly base?: string | undefined;
  readonly head?: string | undefined;
  readonly countReferences: ReferenceCounter;
}

// ---- File categorization --------------------------------------------------

const CONFIG_PATTERNS = [
  "package.json",
  "tsconfig",
  "eslint",
  ".prettierrc",
  ".editorconfig",
  "vitest.config",
  "jest.config",
  "rollup.config",
  "vite.config",
  "webpack.config",
  "babel.config",
  ".babelrc",
  ".npmrc",
  ".nvmrc",
  ".gitignore",
  ".gitattributes",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "yarn.lock",
  "package-lock.json",
  "Makefile",
  "Dockerfile",
  "docker-compose",
];

const TEST_PATTERNS = [
  "/test/",
  "/tests/",
  "/__tests__/",
  ".test.",
  ".spec.",
  "_test.",
];

function isTestFile(filePath: string): boolean {
  return TEST_PATTERNS.some((p) => filePath.includes(p));
}

function isDocsFile(filePath: string): boolean {
  return filePath.endsWith(".md") || filePath.endsWith(".txt") || filePath.endsWith(".rst");
}

function isConfigFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return CONFIG_PATTERNS.some((p) => lower.includes(p));
}

// ---- Breaking change detection --------------------------------------------

async function detectBreakingChanges(
  structuralFiles: readonly FileDiff[],
  countReferences: ReferenceCounter,
): Promise<BreakingChange[]> {
  const breaking: BreakingChange[] = [];

  for (const file of structuralFiles) {
    // Removed exports → breaking
    for (const removed of file.diff.removed) {
      if (removed.exported !== true) continue;
      const refs = await countReferences(removed.name, file.path);
      breaking.push({
        symbol: removed.name,
        kind: removed.kind,
        filePath: file.path,
        changeType: "removed_export",
        ...(removed.signature !== undefined ? { previousSignature: removed.signature } : {}),
        impactedFiles: refs.referenceCount,
        impactedFilePaths: refs.referencingFiles,
      });
    }

    // Changed exported symbol signatures → potentially breaking
    for (const changed of file.diff.changed) {
      if (changed.exported !== true) continue;
      if (changed.oldSignature !== undefined && changed.signature !== undefined &&
          changed.oldSignature !== changed.signature) {
        const refs = await countReferences(changed.name, file.path);
        breaking.push({
          symbol: changed.name,
          kind: changed.kind,
          filePath: file.path,
          changeType: "signature_changed",
          previousSignature: changed.oldSignature,
          newSignature: changed.signature,
          impactedFiles: refs.referenceCount,
          impactedFilePaths: refs.referencingFiles,
        });
      }
    }
  }

  return breaking;
}

// ---- Summary rendering ----------------------------------------------------

function renderSummary(
  base: string,
  head: string,
  categories: Record<ReviewCategory, number>,
  breakingChanges: readonly BreakingChange[],
  totalFiles: number,
  structuralFiles: readonly FileDiff[],
): string {
  const parts: string[] = [];
  parts.push(`PR Review: ${base}..${head} — ${String(totalFiles)} files changed`);
  parts.push("");

  // Structural details
  if (categories.structural > 0) {
    const totalAdded = structuralFiles.reduce((n, f) => n + f.diff.added.length, 0);
    const totalChanged = structuralFiles.reduce((n, f) => n + f.diff.changed.length, 0);
    const totalRemoved = structuralFiles.reduce((n, f) => n + f.diff.removed.length, 0);
    const details: string[] = [];
    if (totalAdded > 0) details.push(`${String(totalAdded)} new exports`);
    if (totalChanged > 0) details.push(`${String(totalChanged)} sig changes`);
    if (totalRemoved > 0) details.push(`${String(totalRemoved)} removed`);
    const suffix = details.length > 0 ? ` (${details.join(", ")})` : "";
    parts.push(`  Structural: ${String(categories.structural)} files${suffix}`);
  }
  if (categories.formatting > 0) {
    parts.push(`  Formatting: ${String(categories.formatting)} files`);
  }
  if (categories.test > 0) {
    parts.push(`  Tests: ${String(categories.test)} files`);
  }
  if (categories.docs > 0) {
    parts.push(`  Docs: ${String(categories.docs)} files`);
  }
  if (categories.config > 0) {
    parts.push(`  Config: ${String(categories.config)} files`);
  }

  // Breaking changes
  for (const bc of breakingChanges) {
    parts.push("");
    if (bc.changeType === "removed_export") {
      parts.push(`  ⚠ BREAKING: ${bc.symbol} — removed export`);
      if (bc.previousSignature !== undefined) {
        parts.push(`    Was: ${bc.previousSignature}`);
      }
    } else {
      parts.push(`  ⚠ BREAKING: ${bc.symbol} — signature changed`);
      if (bc.previousSignature !== undefined) {
        parts.push(`    Was: ${bc.previousSignature}`);
      }
      if (bc.newSignature !== undefined) {
        parts.push(`    Now: ${bc.newSignature}`);
      }
    }
    parts.push(`    Impact: referenced by ${String(bc.impactedFiles)} files`);
  }

  return parts.join("\n");
}

// ---- Public API -----------------------------------------------------------

export async function structuralReview(
  opts: StructuralReviewOptions,
): Promise<StructuralReviewResult> {
  const base = opts.base ?? "main";
  const head = opts.head ?? "HEAD";

  // 1. Get structural diff
  const diffOpts: GraftDiffOptions = {
    cwd: opts.cwd,
    fs: opts.fs,
    git: opts.git,
    resolveWorkingTreePath: opts.resolveWorkingTreePath,
    base,
    head,
  };
  const structDiff = await graftDiff(diffOpts);

  // 2. Get ALL changed files via diff-tree (allowed by the git adapter)
  const allFilesResult = await opts.git.run({
    args: ["diff-tree", "--no-commit-id", "--name-only", "-r", base, head],
    cwd: opts.cwd,
  });
  if (allFilesResult.error !== undefined || allFilesResult.status !== 0) {
    const msg = allFilesResult.error !== undefined
      ? allFilesResult.error.message
      : (allFilesResult.stderr.trim() || `git exited ${String(allFilesResult.status)}`);
    throw new Error(`git diff-tree failed: ${msg}`);
  }
  const allChangedPaths = allFilesResult.stdout.trim().length === 0
    ? []
    : allFilesResult.stdout.trim().split("\n");

  // 3. Build set of structurally-changed file paths
  const structuralPaths = new Set(structDiff.files.map((f) => f.path));

  // 4. Categorize each changed file
  const files: ReviewFile[] = [];
  for (const filePath of allChangedPaths) {
    // Check if the file has actual structural (symbol-level) changes
    const fileDiff = structuralPaths.has(filePath)
      ? structDiff.files.find((f) => f.path === filePath)
      : undefined;
    const diff = fileDiff?.diff;
    const hasStructuralChanges = diff !== undefined &&
      (diff.added.length > 0 || diff.removed.length > 0 || diff.changed.length > 0);

    if (hasStructuralChanges) {
      files.push({
        path: filePath,
        category: "structural",
        structuralChanges: { added: diff.added.length, removed: diff.removed.length, changed: diff.changed.length },
      });
    } else if (isTestFile(filePath)) {
      files.push({ path: filePath, category: "test" });
    } else if (isDocsFile(filePath)) {
      files.push({ path: filePath, category: "docs" });
    } else if (isConfigFile(filePath)) {
      files.push({ path: filePath, category: "config" });
    } else {
      files.push({ path: filePath, category: "formatting" });
    }
  }

  // 5. Count categories
  const categories: Record<ReviewCategory, number> = {
    structural: 0,
    formatting: 0,
    test: 0,
    docs: 0,
    config: 0,
  };
  for (const file of files) {
    categories[file.category]++;
  }

  // 6. Detect breaking changes in structural files
  const structuralFileDiffs = structDiff.files.filter((f) =>
    f.diff.removed.length > 0 || f.diff.changed.length > 0,
  );
  const breakingChanges = await detectBreakingChanges(structuralFileDiffs, opts.countReferences);

  // 7. Render summary
  const summary = renderSummary(
    base,
    head,
    categories,
    breakingChanges,
    allChangedPaths.length,
    structDiff.files,
  );

  return {
    base,
    head,
    totalFiles: allChangedPaths.length,
    categories,
    files,
    breakingChanges,
    summary,
  };
}

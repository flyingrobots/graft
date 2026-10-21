// ---------------------------------------------------------------------------
// Index coverage — how much of the indexable tree the lazy WARP index holds.
//
// Indexing is lazy: files enter the index on read or by explicit path, at
// most a bounded number per call. A reading over the index is complete only
// for the files the index actually covers at the basis commit, so the
// readings derive their completeness from this report instead of asserting
// it.
// ---------------------------------------------------------------------------

import type { GitClient } from "../ports/git.js";
import {
  STRUCTURAL_COVERAGE_MISSING_PATH_LIMIT,
  type StructuralCoverageExclusionReason,
  type StructuralCoverageMissingReason,
  type StructuralReadingCoverage,
} from "../ports/structural-reading.js";
import { detectLang } from "../parser/lang.js";
import { observeGraph, type WarpContext } from "./context.js";

interface TreeEntry {
  readonly type: string;
  readonly objectId: string;
  readonly path: string;
}

interface IndexedFile {
  readonly path: string;
  readonly indexedCommit: string;
}

async function runGit(git: GitClient, cwd: string, args: string[]): Promise<string> {
  const result = await git.run({ args, cwd });
  if (result.error !== undefined || result.status !== 0) {
    throw result.error ?? new Error(
      result.stderr.trim() || `git ${args[0] ?? ""} failed with status ${String(result.status)}`,
    );
  }
  return result.stdout;
}

async function listTree(git: GitClient, cwd: string, commit: string): Promise<readonly TreeEntry[]> {
  const stdout = await runGit(git, cwd, ["ls-tree", "-r", "-z", "--full-tree", commit]);
  const entries: TreeEntry[] = [];
  for (const record of stdout.split("\0")) {
    if (record.length === 0) continue;
    // "<mode> SP <type> SP <object> TAB <path>"
    const tab = record.indexOf("\t");
    if (tab < 0) continue;
    const [, type, objectId] = record.slice(0, tab).split(" ");
    if (type === undefined || objectId === undefined) continue;
    entries.push({ type, objectId, path: record.slice(tab + 1) });
  }
  return entries;
}

async function readIndexedFiles(ctx: WarpContext): Promise<readonly IndexedFile[]> {
  const observer = await observeGraph(ctx, { match: "file:*", expose: ["path", "indexedCommit"] });
  const indexed: IndexedFile[] = [];
  for (const nodeId of await observer.getNodes()) {
    const props = await observer.getNodeProps(nodeId);
    const indexedCommit = props?.["indexedCommit"];
    // Import resolution can name a file node it never indexed; only a node
    // stamped with the commit it was indexed at counts as coverage.
    if (typeof indexedCommit !== "string" || indexedCommit.length === 0) continue;
    const pathProp = props?.["path"];
    const filePath = typeof pathProp === "string" ? pathProp : nodeId.slice("file:".length);
    indexed.push({ path: filePath, indexedCommit });
  }
  return indexed;
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Report how much of the indexable tree at HEAD the WARP index covers.
 *
 * The declared domain is every blob tracked at HEAD whose language the index
 * parses. A domain file is covered when the index holds it at HEAD, or at an
 * earlier commit with the same blob. Files outside the domain are counted as
 * excluded by reason. Domain files the index lacks, holds at different
 * content, or holds although HEAD no longer tracks them are missing.
 */
export async function readIndexCoverage(opts: {
  readonly cwd: string;
  readonly git: GitClient;
  readonly ctx: WarpContext;
}): Promise<StructuralReadingCoverage> {
  const basisCommit = (await runGit(opts.git, opts.cwd, ["rev-parse", "--verify", "HEAD^{commit}"])).trim();
  const basisTree = await listTree(opts.git, opts.cwd, basisCommit);

  const domain = new Map<string, string>();
  const excluded = new Map<StructuralCoverageExclusionReason, number>();
  for (const entry of basisTree) {
    let reason: StructuralCoverageExclusionReason | null = null;
    if (entry.type === "commit") reason = "submodule";
    else if (entry.type !== "blob" || detectLang(entry.path) === null) reason = "unsupported-language";
    if (reason === null) domain.set(entry.path, entry.objectId);
    else excluded.set(reason, (excluded.get(reason) ?? 0) + 1);
  }

  const indexedFiles = await readIndexedFiles(opts.ctx);
  const indexedByPath = new Map(indexedFiles.map((file) => [file.path, file.indexedCommit]));
  const missing: { path: string; reason: StructuralCoverageMissingReason }[] = [];
  const priorTrees = new Map<string, Promise<ReadonlyMap<string, string> | null>>();
  const priorTree = (commit: string): Promise<ReadonlyMap<string, string> | null> => {
    let pending = priorTrees.get(commit);
    if (pending === undefined) {
      pending = listTree(opts.git, opts.cwd, commit).then(
        (entries) => new Map(entries.map((entry) => [entry.path, entry.objectId])),
        // An indexed commit the repository no longer has cannot vouch for
        // the file's content.
        () => null,
      );
      priorTrees.set(commit, pending);
    }
    return pending;
  };

  let coveredFiles = 0;
  for (const [filePath, objectId] of domain) {
    const indexedCommit = indexedByPath.get(filePath);
    if (indexedCommit === undefined) {
      missing.push({ path: filePath, reason: "not-indexed" });
      continue;
    }
    if (indexedCommit === basisCommit) {
      coveredFiles++;
      continue;
    }
    const tree = await priorTree(indexedCommit);
    if (tree?.get(filePath) === objectId) coveredFiles++;
    else missing.push({ path: filePath, reason: "indexed-content-differs" });
  }
  const basisPaths = new Set(basisTree.map((entry) => entry.path));
  for (const file of indexedFiles) {
    if (!basisPaths.has(file.path)) {
      missing.push({ path: file.path, reason: "deleted-since-indexed" });
    }
  }

  missing.sort((left, right) => compareCodeUnits(left.path, right.path));
  return {
    basisCommit,
    domain: "indexable-files-at-basis",
    domainFiles: domain.size,
    coveredFiles,
    excluded: [...excluded.entries()]
      .map(([reason, files]) => ({ reason, files }))
      .sort((left, right) => compareCodeUnits(left.reason, right.reason)),
    missingFiles: missing.length,
    missing: missing.slice(0, STRUCTURAL_COVERAGE_MISSING_PATH_LIMIT),
  };
}

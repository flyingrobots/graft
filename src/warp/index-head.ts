// ---------------------------------------------------------------------------
// Index HEAD — emit compact structural facts into WARP.
//
// Also emits a commit node and commit→sym edges (adds/changes/removes)
// so the structural query layer can detect what changed between ticks.
// ---------------------------------------------------------------------------

import { Buffer } from "node:buffer";
import type { GitClient } from "../ports/git.js";
import type { PathOps } from "../ports/paths.js";
import type { WarpContext } from "./context.js";
import type { PatchBuilderV2 } from "@git-stunts/git-warp";
import { patchGraph, observeGraph, materializeGraph } from "./context.js";
import { detectLang } from "../parser/lang.js";
import { parseStructuredTree } from "../parser/runtime.js";
import { extractOutlineForFile } from "../parser/outline.js";
import { attachAstSnapshot, emitAstNodes } from "./ast-emitter.js";
import { resolveImportEdges } from "./ast-import-resolver.js";
import type { OutlineEntry } from "../parser/types.js";

export const DEFAULT_INDEX_MAX_FILES_PER_CALL = 64;
export const DEFAULT_INDEX_MAX_PATCH_JSON_BYTES = 2 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Sym-node emission from outline entries (richer than the AST-only walker:
// includes signatures for change detection).
// ---------------------------------------------------------------------------

function emitOutlineSyms(
  patch: PatchBuilderV2,
  filePath: string,
  entries: readonly OutlineEntry[],
  jumpLookup: ReadonlyMap<string, { start: number; end: number }>,
  parentPath = "",
): Set<string> {
  const emitted = new Set<string>();
  const fileId = `file:${filePath}`;

  for (const entry of entries) {
    const symbolPath = parentPath.length > 0 ? `${parentPath}.${entry.name}` : entry.name;
    const symId = `sym:${filePath}:${symbolPath}`;
    emitted.add(symId);

    patch.addNode(symId);
    patch.setProperty(symId, "name", entry.name);
    patch.setProperty(symId, "kind", entry.kind);
    patch.setProperty(symId, "exported", entry.exported);
    patch.setProperty(symId, "filePath", filePath);
    if (entry.signature !== undefined) {
      patch.setProperty(symId, "signature", entry.signature);
    }
    const jump = jumpLookup.get(entry.name);
    if (jump !== undefined) {
      patch.setProperty(symId, "startLine", jump.start);
      patch.setProperty(symId, "endLine", jump.end);
    }
    patch.addEdge(fileId, symId, "contains");

    if (entry.children !== undefined && entry.children.length > 0) {
      for (const childId of emitOutlineSyms(patch, filePath, entry.children, jumpLookup, symbolPath)) {
        emitted.add(childId);
      }
    }
  }
  return emitted;
}


// ---------------------------------------------------------------------------
// Directory chain emission (inlined from indexer-graph.ts to avoid dep on
// the legacy indexer module).
// ---------------------------------------------------------------------------

function emitDirectoryChain(patch: PatchBuilderV2, filePath: string): void {
  const parts = filePath.split("/");
  if (parts.length <= 1) return;

  let current = "";
  for (let index = 0; index < parts.length - 1; index++) {
    const parent = current;
    const part = parts[index] ?? "";
    current = current.length > 0 ? `${current}/${part}` : part;
    const dirId = `dir:${current}`;
    patch.addNode(dirId);
    patch.setProperty(dirId, "path", current);

    if (parent.length > 0) {
      patch.addEdge(`dir:${parent}`, dirId, "contains");
    }
  }

  patch.addEdge(`dir:${current}`, `file:${filePath}`, "contains");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface IndexHeadOptions {
  readonly cwd: string;
  readonly git: GitClient;
  readonly pathOps: PathOps;
  readonly ctx: WarpContext;
  readonly paths?: readonly string[] | undefined;
  readonly maxFilesPerCall?: number | undefined;
  readonly maxPatchJsonBytes?: number | undefined;
}

export interface IndexHeadResult {
  readonly ok: true;
  readonly filesIndexed: number;
  readonly nodesEmitted: number;
}

/**
 * Index the current HEAD by writing one bounded patch per file.
 *
 * Full tree-sitter syntax is attached as file-node blob content. The graph
 * itself only stores compact query facts: files, symbols, import/reference
 * anchors, directories, and commit-to-symbol touch edges.
 *
 * Emits a `commit:{sha}` node with edges to sym nodes labelled
 * "adds", "changes", or "removes" so structural queries can detect
 * what changed between ticks.
 */
export async function indexHead(opts: IndexHeadOptions): Promise<IndexHeadResult> {
  const { cwd, git, pathOps, ctx } = opts;
  const maxFilesPerCall = opts.maxFilesPerCall ?? DEFAULT_INDEX_MAX_FILES_PER_CALL;
  const maxPatchJsonBytes = opts.maxPatchJsonBytes ?? DEFAULT_INDEX_MAX_PATCH_JSON_BYTES;

  const headResult = await git.run({ args: ["rev-parse", "HEAD"], cwd });
  if (headResult.status !== 0) {
    throw new Error(`git rev-parse HEAD failed: ${headResult.stderr}`);
  }
  const headSha = headResult.stdout.trim();

  const allFiles = await listTrackedFiles(cwd, git);
  const knownFiles = new Set(allFiles);
  const parseableFiles = selectParseableFiles(allFiles, opts.paths);

  if (parseableFiles.length > maxFilesPerCall) {
    throw new Error(
      `indexHead refused to index ${String(parseableFiles.length)} files in one call. ` +
      `Lazy indexing policy allows at most ${String(maxFilesPerCall)} files; ` +
      `pass explicit paths or index on read.`,
    );
  }

  let filesIndexed = 0;
  for (const filePath of parseableFiles) {
    const indexed = await indexHeadFile({
      cwd,
      git,
      pathOps,
      ctx,
      headSha,
      knownFiles,
      filePath,
      maxPatchJsonBytes,
    });
    if (indexed) filesIndexed++;
  }

  return { ok: true, filesIndexed, nodesEmitted: filesIndexed };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function collectSymIds(
  target: Map<string, string | undefined>,
  filePath: string,
  entries: readonly OutlineEntry[],
  parentPath = "",
): void {
  for (const entry of entries) {
    const symbolPath = parentPath.length > 0 ? `${parentPath}.${entry.name}` : entry.name;
    target.set(`sym:${filePath}:${symbolPath}`, entry.signature);
    if (entry.children !== undefined && entry.children.length > 0) {
      collectSymIds(target, filePath, entry.children, symbolPath);
    }
  }
}

async function listTrackedFiles(cwd: string, git: GitClient): Promise<readonly string[]> {
  const result = await git.run({ args: ["ls-files"], cwd });
  if (result.status !== 0) {
    throw new Error(`git ls-files failed: ${result.stderr}`);
  }
  return result.stdout.trim().split("\n").filter((filePath) => filePath.length > 0);
}

function selectParseableFiles(
  allFiles: readonly string[],
  requestedPaths: readonly string[] | undefined,
): readonly string[] {
  const tracked = new Set(allFiles);
  const candidates = requestedPaths !== undefined && requestedPaths.length > 0
    ? requestedPaths.map((filePath) => filePath.trim()).filter((filePath) => filePath.length > 0 && tracked.has(filePath))
    : allFiles;

  return candidates.filter((filePath) => detectLang(filePath) !== null);
}

async function readPriorSymsForFile(
  ctx: WarpContext,
  filePath: string,
): Promise<Map<string, string | undefined>> {
  const priorSyms = new Map<string, string | undefined>();
  const priorObs = await observeGraph(ctx, { match: `sym:${filePath}:*`, expose: ["signature"] });
  const priorNodes = await priorObs.getNodes();
  for (const nodeId of priorNodes) {
    const props = await priorObs.getNodeProps(nodeId);
    const sig = typeof props?.["signature"] === "string" ? props["signature"] : undefined;
    priorSyms.set(nodeId, sig);
  }
  return priorSyms;
}

async function readPriorAstAnchorsForFile(
  ctx: WarpContext,
  filePath: string,
): Promise<readonly string[]> {
  const obs = await observeGraph(ctx, { match: `ast:${filePath}:*`, expose: [] });
  return obs.getNodes();
}

function patchJsonByteLength(patch: PatchBuilderV2): number {
  return Buffer.byteLength(JSON.stringify(patch.build()), "utf8");
}

function assertPatchWithinBudget(
  patch: PatchBuilderV2,
  filePath: string,
  maxPatchJsonBytes: number,
): void {
  const bytes = patchJsonByteLength(patch);
  if (bytes > maxPatchJsonBytes) {
    throw new Error(
      `indexHead refused to write ${filePath}: estimated patch payload ${String(bytes)} bytes ` +
      `exceeds ${String(maxPatchJsonBytes)} bytes. Index smaller slices or attach bulky data as blobs.`,
    );
  }
}

async function indexHeadFile(input: {
  readonly cwd: string;
  readonly git: GitClient;
  readonly pathOps: PathOps;
  readonly ctx: WarpContext;
  readonly headSha: string;
  readonly knownFiles: ReadonlySet<string>;
  readonly filePath: string;
  readonly maxPatchJsonBytes: number;
}): Promise<boolean> {
  const { cwd, git, pathOps, ctx, headSha, knownFiles, filePath, maxPatchJsonBytes } = input;
  const lang = detectLang(filePath);
  if (lang === null) return false;

  const contentResult = await git.run({ args: ["show", `HEAD:${filePath}`], cwd });
  if (contentResult.status !== 0) return false;

  const tree = parseStructuredTree(lang, contentResult.stdout);
  try {
    const outlineResult = extractOutlineForFile(filePath, contentResult.stdout);
    const outline = outlineResult?.entries ?? [];
    const jumpLookup = new Map<string, { start: number; end: number }>();
    for (const jt of outlineResult?.jumpTable ?? []) {
      jumpLookup.set(jt.symbol, { start: jt.start, end: jt.end });
    }

    const currentSyms = new Map<string, string | undefined>();
    collectSymIds(currentSyms, filePath, outline);

    let priorSyms = new Map<string, string | undefined>();
    let priorAstAnchors: readonly string[] = [];
    try {
      await materializeGraph(ctx);
      priorSyms = await readPriorSymsForFile(ctx, filePath);
      priorAstAnchors = await readPriorAstAnchorsForFile(ctx, filePath);
    } catch {
      // No prior state: first lazy index writes adds only.
    }

    await patchGraph(ctx, async (patch) => {
      const tick = patch.build().lamport;
      const commitId = `commit:${headSha}`;
      const fileId = `file:${filePath}`;

      patch.addNode(commitId);
      patch.setProperty(commitId, "sha", headSha);
      patch.setProperty(commitId, "tick", tick);

      patch.addNode(fileId);
      patch.setProperty(fileId, "path", filePath);
      patch.setProperty(fileId, "lang", lang);
      patch.setProperty(fileId, "indexedCommit", headSha);
      patch.addEdge(commitId, fileId, "touches");

      emitDirectoryChain(patch, filePath);
      for (const anchorId of priorAstAnchors) {
        patch.removeNode(anchorId);
      }
      emitOutlineSyms(patch, filePath, outline, jumpLookup);
      emitAstNodes(patch, filePath, tree.root);
      resolveImportEdges(patch, filePath, tree.root, pathOps, knownFiles);
      await attachAstSnapshot(patch, filePath, tree.root);

      for (const [symId, sig] of currentSyms) {
        if (!priorSyms.has(symId)) {
          patch.addEdge(commitId, symId, "adds");
        } else if (priorSyms.get(symId) !== sig) {
          patch.addEdge(commitId, symId, "changes");
        }
      }

      for (const symId of priorSyms.keys()) {
        if (!currentSyms.has(symId)) {
          patch.addEdge(commitId, symId, "removes");
          patch.removeNode(symId);
        }
      }

      assertPatchWithinBudget(patch, filePath, maxPatchJsonBytes);
    });

    return true;
  } finally {
    tree.delete();
  }
}

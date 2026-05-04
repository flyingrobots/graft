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
import { getCommitMeta } from "./commit-meta.js";
import {
  DEFAULT_SEMANTIC_FACT_LIMIT,
  type SemanticEnrichmentFact,
  type SemanticEnrichmentProvider,
  type SemanticEnrichmentSummary,
  type SemanticEnrichmentUnavailableFile,
} from "../ports/semantic-enrichment.js";
import { emitSemanticFacts, prepareSemanticFacts } from "./semantic-enrichment.js";

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
  readonly semanticProvider?: SemanticEnrichmentProvider | undefined;
  readonly semanticFactLimit?: number | undefined;
}

export interface IndexHeadResult {
  readonly ok: true;
  readonly filesIndexed: number;
  readonly nodesEmitted: number;
  readonly semanticEnrichment: SemanticEnrichmentSummary;
}

interface HeadCommitMetadata {
  readonly message: string;
  readonly author: string;
  readonly email: string;
  readonly timestamp: string;
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
  const semanticFactLimit = normalizeSemanticFactLimit(opts.semanticFactLimit);
  const hasExplicitPaths = hasExplicitIndexPaths(opts.paths);
  const semanticSummary = createMutableSemanticSummary({
    providerConfigured: opts.semanticProvider !== undefined,
    hasExplicitPaths,
  });
  const semanticProvider = opts.semanticProvider !== undefined && hasExplicitPaths
    ? opts.semanticProvider
    : undefined;

  const headResult = await git.run({ args: ["rev-parse", "HEAD"], cwd });
  if (headResult.status !== 0) {
    throw new Error(`git rev-parse HEAD failed: ${headResult.stderr}`);
  }
  const headSha = headResult.stdout.trim();
  const commitMeta = await getCommitMeta(git, headSha, cwd);

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
      commitMeta,
      knownFiles,
      filePath,
      maxPatchJsonBytes,
      semanticProvider,
      semanticFactLimit,
    });
    if (indexed.indexed) {
      filesIndexed++;
      if (indexed.semantic !== undefined) {
        mergeSemanticSummary(semanticSummary, indexed.semantic);
      }
    }
  }

  return {
    ok: true,
    filesIndexed,
    nodesEmitted: filesIndexed,
    semanticEnrichment: finalizeSemanticSummary(semanticSummary),
  };
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

function hasExplicitIndexPaths(paths: readonly string[] | undefined): boolean {
  return paths?.some((filePath) => filePath.trim().length > 0) ?? false;
}

function normalizeSemanticFactLimit(value: number | undefined): number {
  if (value === undefined) return DEFAULT_SEMANTIC_FACT_LIMIT;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("indexHead semanticFactLimit must be a non-negative integer");
  }
  return value;
}

interface MutableSemanticSummary {
  status: SemanticEnrichmentSummary["status"];
  filesAttempted: number;
  factsAccepted: number;
  factsRejected: number;
  unavailable: SemanticEnrichmentUnavailableFile[];
}

function createMutableSemanticSummary(input: {
  readonly providerConfigured: boolean;
  readonly hasExplicitPaths: boolean;
}): MutableSemanticSummary {
  const status = input.providerConfigured
    ? input.hasExplicitPaths ? "available" : "skipped_not_explicit"
    : "not_configured";
  return {
    status,
    filesAttempted: 0,
    factsAccepted: 0,
    factsRejected: 0,
    unavailable: [],
  };
}

function mergeSemanticSummary(
  target: MutableSemanticSummary,
  fileSummary: SemanticEnrichmentSummary,
): void {
  target.filesAttempted += fileSummary.filesAttempted;
  target.factsAccepted += fileSummary.factsAccepted;
  target.factsRejected += fileSummary.factsRejected;
  target.unavailable.push(...fileSummary.unavailable);
}

function finalizeSemanticSummary(summary: MutableSemanticSummary): SemanticEnrichmentSummary {
  const status = summary.status === "available" && summary.unavailable.length > 0
    ? "unavailable"
    : summary.status;

  return {
    status,
    filesAttempted: summary.filesAttempted,
    factsAccepted: summary.factsAccepted,
    factsRejected: summary.factsRejected,
    unavailable: summary.unavailable,
  };
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
  readonly commitMeta: HeadCommitMetadata;
  readonly knownFiles: ReadonlySet<string>;
  readonly filePath: string;
  readonly maxPatchJsonBytes: number;
  readonly semanticProvider: SemanticEnrichmentProvider | undefined;
  readonly semanticFactLimit: number;
}): Promise<IndexHeadFileResult> {
  const {
    cwd,
    git,
    pathOps,
    ctx,
    headSha,
    commitMeta,
    knownFiles,
    filePath,
    maxPatchJsonBytes,
    semanticProvider,
    semanticFactLimit,
  } = input;
  const lang = detectLang(filePath);
  if (lang === null) return { indexed: false };

  const contentResult = await git.run({ args: ["show", `HEAD:${filePath}`], cwd });
  if (contentResult.status !== 0) return { indexed: false };

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
    const currentSymbolIds = new Set(currentSyms.keys());
    const semantic = await prepareFileSemanticEnrichment({
      provider: semanticProvider,
      repoRoot: cwd,
      filePath,
      language: lang,
      content: contentResult.stdout,
      headSha,
      currentSymbolIds,
      maxFacts: semanticFactLimit,
    });

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
      patch.setProperty(commitId, "message", commitMeta.message);
      patch.setProperty(commitId, "author", commitMeta.author);
      patch.setProperty(commitId, "email", commitMeta.email);
      patch.setProperty(commitId, "date", commitMeta.timestamp);
      patch.setProperty(commitId, "timestamp", commitMeta.timestamp);

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
      emitSemanticFacts(patch, semantic.factsToEmit);
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

    return { indexed: true, semantic: semantic.summary };
  } finally {
    tree.delete();
  }
}

interface IndexHeadFileResult {
  readonly indexed: boolean;
  readonly semantic?: SemanticEnrichmentSummary | undefined;
}

interface PreparedFileSemanticEnrichment {
  readonly factsToEmit: readonly SemanticEnrichmentFact[];
  readonly summary: SemanticEnrichmentSummary | undefined;
}

async function prepareFileSemanticEnrichment(input: {
  readonly provider: SemanticEnrichmentProvider | undefined;
  readonly repoRoot: string;
  readonly filePath: string;
  readonly language: NonNullable<ReturnType<typeof detectLang>>;
  readonly content: string;
  readonly headSha: string;
  readonly currentSymbolIds: ReadonlySet<string>;
  readonly maxFacts: number;
}): Promise<PreparedFileSemanticEnrichment> {
  if (input.provider === undefined) {
    return { factsToEmit: [], summary: undefined };
  }

  try {
    const providerResult = await input.provider.enrichFile({
      repoRoot: input.repoRoot,
      filePath: input.filePath,
      language: input.language,
      content: input.content,
      headSha: input.headSha,
      maxFacts: input.maxFacts,
    });

    if (providerResult.status === "unavailable") {
      return unavailableFileSemanticEnrichment(
        input.filePath,
        normalizeUnavailableReason(providerResult.reason),
      );
    }

    const prepared = prepareSemanticFacts({
      filePath: input.filePath,
      currentSymbolIds: input.currentSymbolIds,
      result: providerResult,
      maxFacts: input.maxFacts,
    });

    return {
      factsToEmit: prepared.acceptedFacts,
      summary: {
        status: "available",
        filesAttempted: 1,
        factsAccepted: prepared.acceptedFacts.length,
        factsRejected: prepared.factsRejected,
        unavailable: [],
      },
    };
  } catch (error) {
    return unavailableFileSemanticEnrichment(
      input.filePath,
      `semantic provider failed: ${errorMessage(error)}`,
    );
  }
}

function unavailableFileSemanticEnrichment(
  filePath: string,
  reason: string,
): PreparedFileSemanticEnrichment {
  return {
    factsToEmit: [],
    summary: {
      status: "unavailable",
      filesAttempted: 1,
      factsAccepted: 0,
      factsRejected: 0,
      unavailable: [{ filePath, reason }],
    },
  };
}

function normalizeUnavailableReason(reason: string): string {
  const trimmed = reason.trim();
  return trimmed.length > 0 ? trimmed : "semantic provider unavailable";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

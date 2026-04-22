// ---------------------------------------------------------------------------
// Index HEAD — parse all files at HEAD and emit full AST into WARP.
//
// Also emits a commit node and commit→sym edges (adds/changes/removes)
// so the structural query layer can detect what changed between ticks.
// ---------------------------------------------------------------------------

import type { GitClient } from "../ports/git.js";
import type { PathOps } from "../ports/paths.js";
import type { WarpContext } from "./context.js";
import type { PatchBuilderV2 } from "@git-stunts/git-warp";
import { patchGraph, observeGraph, materializeGraph } from "./context.js";
import { detectLang } from "../parser/lang.js";
import { parseStructuredTree } from "../parser/runtime.js";
import { extractOutlineForFile } from "../parser/outline.js";
import { emitAstNodes } from "./ast-emitter.js";
import { resolveImportEdges } from "./ast-import-resolver.js";
import type { OutlineEntry } from "../parser/types.js";

type TSNode = import("web-tree-sitter").SyntaxNode;

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
}

export interface IndexHeadResult {
  readonly ok: true;
  readonly filesIndexed: number;
  readonly nodesEmitted: number;
}

/**
 * Index the current HEAD: parse every tracked file, emit full AST +
 * cross-file import edges into WARP as a single atomic patch.
 *
 * Emits a `commit:{sha}` node with edges to sym nodes labelled
 * "adds", "changes", or "removes" so structural queries can detect
 * what changed between ticks.
 *
 * No commit walking. No history replay. WARP handles provenance.
 */
export async function indexHead(opts: IndexHeadOptions): Promise<IndexHeadResult> {
  const { cwd, git, pathOps, ctx } = opts;

  // Get HEAD sha for commit node
  const headResult = await git.run({ args: ["rev-parse", "HEAD"], cwd });
  if (headResult.status !== 0) {
    throw new Error(`git rev-parse HEAD failed: ${headResult.stderr}`);
  }
  const headSha = headResult.stdout.trim();

  // Get all tracked files
  const result = await git.run({ args: ["ls-files"], cwd });
  if (result.status !== 0) {
    throw new Error(`git ls-files failed: ${result.stderr}`);
  }
  const allFiles = result.stdout.trim().split("\n").filter((f) => f.length > 0);

  // Filter to parseable files
  const parseableFiles = allFiles.filter((f) => detectLang(f) !== null);
  const knownFiles = new Set(allFiles);

  // Parse all files and collect trees + outlines
  const parsed: {
    filePath: string;
    root: TSNode;
    outline: readonly OutlineEntry[];
    jumpLookup: ReadonlyMap<string, { start: number; end: number }>;
    cleanup: () => void;
  }[] = [];

  for (const filePath of parseableFiles) {
    const contentResult = await git.run({ args: ["show", `HEAD:${filePath}`], cwd });
    if (contentResult.status !== 0) continue;

    const lang = detectLang(filePath);
    if (lang === null) continue;

    const tree = parseStructuredTree(lang, contentResult.stdout);
    const outlineResult = extractOutlineForFile(filePath, contentResult.stdout);
    const entries = outlineResult?.entries ?? [];
    const jumpLookup = new Map<string, { start: number; end: number }>();
    for (const jt of outlineResult?.jumpTable ?? []) {
      jumpLookup.set(jt.symbol, { start: jt.start, end: jt.end });
    }

    parsed.push({
      filePath,
      root: tree.root,
      outline: entries,
      jumpLookup,
      cleanup: () => { tree.delete(); },
    });
  }

  // Build current sym set with signatures (for reconciliation)
  const currentSyms = new Map<string, string | undefined>();
  for (const { filePath, outline } of parsed) {
    collectSymIds(currentSyms, filePath, outline);
  }

  // Read prior sym state for diff detection
  const priorSyms = new Map<string, string | undefined>();
  let priorCommitCount = 0;
  try {
    await materializeGraph(ctx);
    const priorObs = await observeGraph(ctx, { match: "sym:*", expose: ["signature"] });
    const priorNodes = await priorObs.getNodes();
    for (const nodeId of priorNodes) {
      const props = await priorObs.getNodeProps(nodeId);
      const sig = typeof props?.["signature"] === "string" ? props["signature"] : undefined;
      priorSyms.set(nodeId, sig);
    }
    // Count existing commit nodes to derive the next tick value
    const commitObs = await observeGraph(ctx, { match: "commit:*", expose: [] });
    const commitNodes = await commitObs.getNodes();
    priorCommitCount = commitNodes.length;
  } catch {
    // No prior state — first index, everything is "adds"
  }

  // Emit everything in one atomic WARP patch
  let nodesEmitted = 0;
  const tick = priorCommitCount + 1;

  await patchGraph(ctx, (patch) => {
    // Commit node
    const commitId = `commit:${headSha}`;
    patch.addNode(commitId);
    patch.setProperty(commitId, "sha", headSha);
    patch.setProperty(commitId, "tick", tick);

    for (const { filePath, root, outline, jumpLookup } of parsed) {
      // File node
      const fileId = `file:${filePath}`;
      patch.addNode(fileId);
      patch.setProperty(fileId, "path", filePath);
      patch.setProperty(fileId, "lang", detectLang(filePath) ?? "unknown");
      patch.addEdge(commitId, fileId, "touches");

      // Directory chain (dir:src, dir:src/mcp, etc.)
      emitDirectoryChain(patch, filePath);

      // Symbol nodes from outline (includes signatures + line ranges)
      emitOutlineSyms(patch, filePath, outline, jumpLookup);

      // Full AST
      emitAstNodes(patch, filePath, root);

      // Cross-file import resolution edges
      resolveImportEdges(patch, filePath, root, pathOps, knownFiles);

      nodesEmitted++;
    }

    // Commit→sym edges based on diff with prior state
    for (const [symId, sig] of currentSyms) {
      if (!priorSyms.has(symId)) {
        patch.addEdge(commitId, symId, "adds");
      } else if (priorSyms.get(symId) !== sig) {
        patch.addEdge(commitId, symId, "changes");
      }
    }

    // Removals: syms that existed before but are gone now
    for (const symId of priorSyms.keys()) {
      if (!currentSyms.has(symId)) {
        patch.addEdge(commitId, symId, "removes");
        patch.removeNode(symId);
      }
    }
  });

  // Cleanup parsed trees
  for (const { cleanup } of parsed) {
    cleanup();
  }

  return { ok: true, filesIndexed: parsed.length, nodesEmitted };
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

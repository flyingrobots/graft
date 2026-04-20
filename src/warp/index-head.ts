// ---------------------------------------------------------------------------
// Index HEAD — parse all files at HEAD and emit full AST into WARP
// ---------------------------------------------------------------------------

import type { GitClient } from "../ports/git.js";
import type { PathOps } from "../ports/paths.js";
import type { WarpHandle } from "../ports/warp.js";
import { detectLang } from "../parser/lang.js";
import { parseStructuredTree } from "../parser/runtime.js";
import { emitAstNodes } from "./ast-emitter.js";
import { resolveImportEdges } from "./ast-import-resolver.js";

export interface IndexHeadOptions {
  readonly cwd: string;
  readonly git: GitClient;
  readonly pathOps: PathOps;
  readonly warp: WarpHandle;
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
 * No commit walking. No history replay. WARP handles provenance.
 */
export async function indexHead(opts: IndexHeadOptions): Promise<IndexHeadResult> {
  const { cwd, git, pathOps, warp } = opts;

  // Get all tracked files
  const result = await git.run({ args: ["ls-files"], cwd });
  if (result.status !== 0) {
    throw new Error(`git ls-files failed: ${result.stderr}`);
  }
  const allFiles = result.stdout.trim().split("\n").filter((f) => f.length > 0);

  // Filter to parseable files
  const parseableFiles = allFiles.filter((f) => detectLang(f) !== null);
  const knownFiles = new Set(allFiles);

  // Parse all files and collect trees
  const parsed: {
    filePath: string;
    root: import("web-tree-sitter").SyntaxNode;
    cleanup: () => void;
  }[] = [];

  for (const filePath of parseableFiles) {
    const contentResult = await git.run({ args: ["show", `HEAD:${filePath}`], cwd });
    if (contentResult.status !== 0) continue;

    const lang = detectLang(filePath);
    if (lang === null) continue;

    const tree = parseStructuredTree(lang, contentResult.stdout);
    parsed.push({ filePath, root: tree.root, cleanup: () => { tree.delete(); } });
  }

  // Emit everything in one atomic WARP patch
  let nodesEmitted = 0;

  await warp.patch((patch) => {
    for (const { filePath, root } of parsed) {
      // File node
      const fileId = `file:${filePath}`;
      patch.addNode(fileId);
      patch.setProperty(fileId, "path", filePath);
      patch.setProperty(fileId, "lang", detectLang(filePath) ?? "unknown");

      // Full AST
      emitAstNodes(patch, filePath, root);

      // Cross-file import resolution edges
      resolveImportEdges(patch, filePath, root, pathOps, knownFiles);

      nodesEmitted++;
    }
  });

  // Cleanup parsed trees
  for (const { cleanup } of parsed) {
    cleanup();
  }

  return { ok: true, filesIndexed: parsed.length, nodesEmitted };
}

// ---------------------------------------------------------------------------
// Index HEAD — parse all files at HEAD and emit full AST into WARP
// ---------------------------------------------------------------------------

import type { GitClient } from "../ports/git.js";
import type { PathOps } from "../ports/paths.js";
import type { WarpHandle } from "../ports/warp.js";
import type { WarpPatchBuilder } from "../ports/warp.js";
import { detectLang } from "../parser/lang.js";
import { parseStructuredTree } from "../parser/runtime.js";
import { emitAstNodes } from "./ast-emitter.js";
import { resolveImportEdges } from "./ast-import-resolver.js";

type TSNode = import("web-tree-sitter").SyntaxNode;

const DECLARATION_TYPES = new Set([
  "function_declaration",
  "class_declaration",
  "interface_declaration",
  "type_alias_declaration",
  "enum_declaration",
]);

function emitSymNodes(patch: WarpPatchBuilder, filePath: string, root: TSNode): void {
  const fileId = `file:${filePath}`;

  for (const child of root.namedChildren) {
    // Exported declaration: export function foo() {}
    if (child.type === "export_statement") {
      const decl = child.namedChildren.find((c) => DECLARATION_TYPES.has(c.type));
      if (decl !== undefined) {
        const nameNode = decl.childForFieldName("name");
        if (nameNode !== null) {
          const symId = `sym:${filePath}:${nameNode.text}`;
          patch.addNode(symId);
          patch.setProperty(symId, "name", nameNode.text);
          patch.setProperty(symId, "kind", decl.type.replace("_declaration", ""));
          patch.setProperty(symId, "exported", true);
          patch.setProperty(symId, "filePath", filePath);
          patch.addEdge(fileId, symId, "contains");
        }
      }

      // Exported variable: export const foo = ...
      const lexical = child.namedChildren.find((c) => c.type === "lexical_declaration");
      if (lexical !== undefined) {
        for (const declarator of lexical.namedChildren) {
          if (declarator.type === "variable_declarator") {
            const nameNode = declarator.childForFieldName("name");
            if (nameNode !== null) {
              const symId = `sym:${filePath}:${nameNode.text}`;
              patch.addNode(symId);
              patch.setProperty(symId, "name", nameNode.text);
              patch.setProperty(symId, "kind", "variable");
              patch.setProperty(symId, "exported", true);
              patch.setProperty(symId, "filePath", filePath);
              patch.addEdge(fileId, symId, "contains");
            }
          }
        }
      }
      continue;
    }

    // Non-exported top-level declaration
    if (DECLARATION_TYPES.has(child.type)) {
      const nameNode = child.childForFieldName("name");
      if (nameNode !== null) {
        const symId = `sym:${filePath}:${nameNode.text}`;
        patch.addNode(symId);
        patch.setProperty(symId, "name", nameNode.text);
        patch.setProperty(symId, "kind", child.type.replace("_declaration", ""));
        patch.setProperty(symId, "exported", false);
        patch.setProperty(symId, "filePath", filePath);
        patch.addEdge(fileId, symId, "contains");
      }
    }
  }
}

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

      // Symbol nodes (for cross-file reference edges to target)
      emitSymNodes(patch, filePath, root);

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

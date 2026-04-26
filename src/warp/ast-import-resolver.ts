// ---------------------------------------------------------------------------
// AST Import Resolver — adds cross-file reference edges to the WARP graph
// ---------------------------------------------------------------------------

import { createHash } from "node:crypto";
import type { PatchBuilderV2 } from "@git-stunts/git-warp";
import type { PathOps } from "../ports/paths.js";

type TSNode = import("web-tree-sitter").SyntaxNode;

function hashId(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 12);
}

function astNodeId(filePath: string, node: TSNode): string {
  const hash = hashId(`${filePath}:${node.type}:${String(node.startIndex)}:${String(node.endIndex)}`);
  return `ast:${filePath}:${hash}`;
}

function resolveModulePath(
  importSource: string,
  importingFilePath: string,
  pathOps: PathOps,
  knownFiles: ReadonlySet<string>,
): string | null {
  // Skip non-relative imports (bare specifiers like "@pkg/foo" or "node:path")
  if (!importSource.startsWith(".") && !importSource.startsWith("/")) {
    return null;
  }

  // Resolve relative to the importing file's directory
  const dir = importingFilePath.includes("/")
    ? importingFilePath.slice(0, importingFilePath.lastIndexOf("/"))
    : "";
  const raw = dir.length > 0
    ? pathOps.join(dir, importSource)
    : pathOps.normalize(importSource);

  // Try exact match, then with extensions
  const candidates = [
    raw,
    `${raw}.ts`,
    `${raw}.tsx`,
    `${raw}.js`,
    `${raw}.jsx`,
    `${raw}/index.ts`,
    `${raw}/index.tsx`,
    `${raw}/index.js`,
  ];

  for (const candidate of candidates) {
    if (knownFiles.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

function symNodeId(filePath: string, symbolName: string): string {
  return `sym:${filePath}:${symbolName}`;
}

interface ImportInfo {
  readonly specifierNodeId: string;
  readonly node: TSNode;
  readonly importedName: string;
  readonly localName: string;
}

function emitAstAnchor(patch: PatchBuilderV2, filePath: string, node: TSNode): string {
  const nodeId = astNodeId(filePath, node);
  patch.addNode(nodeId);
  patch.setProperty(nodeId, "type", node.type);
  patch.setProperty(nodeId, "named", node.isNamed());
  patch.setProperty(nodeId, "startRow", node.startPosition.row);
  patch.setProperty(nodeId, "startCol", node.startPosition.column);
  patch.setProperty(nodeId, "endRow", node.endPosition.row);
  patch.setProperty(nodeId, "endCol", node.endPosition.column);
  patch.setProperty(nodeId, "filePath", filePath);
  return nodeId;
}

function extractImportSpecifiers(
  importNode: TSNode,
  filePath: string,
): ImportInfo[] {
  const results: ImportInfo[] = [];
  const importClause = importNode.namedChildren.find((c) => c.type === "import_clause");
  if (importClause === undefined) return results;

  for (const child of importClause.namedChildren) {
    switch (child.type) {
      case "named_imports": {
        // import { foo, bar as baz } from "..."
        for (const spec of child.namedChildren) {
          if (spec.type === "import_specifier") {
            const nameNode = spec.childForFieldName("name");
            const aliasNode = spec.childForFieldName("alias");
            if (nameNode !== null) {
              results.push({
                specifierNodeId: astNodeId(filePath, spec),
                node: spec,
                importedName: nameNode.text,
                localName: aliasNode !== null ? aliasNode.text : nameNode.text,
              });
            }
          }
        }
        break;
      }
      case "identifier": {
        // import foo from "..." (default import)
        results.push({
          specifierNodeId: astNodeId(filePath, child),
          node: child,
          importedName: "default",
          localName: child.text,
        });
        break;
      }
      case "namespace_import": {
        // import * as ns from "..."
        const aliasNode = child.namedChildren.find((c) => c.type === "identifier");
        if (aliasNode !== undefined) {
          results.push({
            specifierNodeId: astNodeId(filePath, child),
            node: child,
            importedName: "*",
            localName: aliasNode.text,
          });
        }
        break;
      }
    }
  }

  return results;
}

function extractExportSpecifiers(
  exportNode: TSNode,
  filePath: string,
): ImportInfo[] {
  const results: ImportInfo[] = [];
  const exportClause = exportNode.namedChildren.find((c) => c.type === "export_clause");
  if (exportClause === undefined) return results;

  for (const spec of exportClause.namedChildren) {
    if (spec.type === "export_specifier") {
      const nameNode = spec.childForFieldName("name");
      const aliasNode = spec.childForFieldName("alias");
      if (nameNode !== null) {
        results.push({
          specifierNodeId: astNodeId(filePath, spec),
          node: spec,
          importedName: nameNode.text,
          localName: aliasNode !== null ? aliasNode.text : nameNode.text,
        });
      }
    }
  }

  return results;
}

function getModuleSource(node: TSNode): string | null {
  const stringNode = node.namedChildren.find((c) => c.type === "string");
  if (stringNode === undefined) return null;
  const fragment = stringNode.namedChildren.find((c) => c.type === "string_fragment");
  return fragment !== undefined ? fragment.text : null;
}

/**
 * Resolve import/export statements and emit cross-file reference edges.
 *
 * Call this inside a patch callback after emitAstNodes has run for a file.
 * Handles: named imports, aliased imports, default imports, namespace imports,
 * re-exports, and dynamic imports.
 */
export function resolveImportEdges(
  patch: PatchBuilderV2,
  filePath: string,
  root: TSNode,
  pathOps: PathOps,
  knownFiles: ReadonlySet<string>,
): void {
  for (const child of root.namedChildren) {
    if (child.type === "import_statement") {
      handleImportStatement(patch, filePath, child, pathOps, knownFiles);
    } else if (child.type === "export_statement") {
      handleExportStatement(patch, filePath, child, pathOps, knownFiles);
    }
  }

  // Dynamic imports: find call_expression nodes with `import` function
  walkForDynamicImports(patch, filePath, root, pathOps, knownFiles);
}

function handleImportStatement(
  patch: PatchBuilderV2,
  filePath: string,
  node: TSNode,
  pathOps: PathOps,
  knownFiles: ReadonlySet<string>,
): void {
  const source = getModuleSource(node);
  if (source === null) return;

  const resolvedPath = resolveModulePath(source, filePath, pathOps, knownFiles);

  // Emit resolves_to edge from the string node to the target file
  const stringNode = node.namedChildren.find((c) => c.type === "string");
  if (stringNode !== undefined && resolvedPath !== null) {
    const stringId = emitAstAnchor(patch, filePath, stringNode);
    patch.addEdge(stringId, `file:${resolvedPath}`, "resolves_to");
  }

  // Emit reference edges from specifiers to sym: nodes
  const specifiers = extractImportSpecifiers(node, filePath);
  for (const spec of specifiers) {
    emitAstAnchor(patch, filePath, spec.node);
    patch.setProperty(spec.specifierNodeId, "importedName", spec.importedName);
    patch.setProperty(spec.specifierNodeId, "localName", spec.localName);
    patch.setProperty(spec.specifierNodeId, "filePath", filePath);

    if (resolvedPath !== null) {
      if (spec.importedName === "*") {
        // Namespace import references the whole file
        patch.addEdge(spec.specifierNodeId, `file:${resolvedPath}`, "references");
      } else {
        // Named/default import references a specific symbol
        patch.addEdge(spec.specifierNodeId, symNodeId(resolvedPath, spec.importedName), "references");
      }
    }
  }
}

function handleExportStatement(
  patch: PatchBuilderV2,
  filePath: string,
  node: TSNode,
  pathOps: PathOps,
  knownFiles: ReadonlySet<string>,
): void {
  // Only handle re-exports (export { ... } from "...")
  const source = getModuleSource(node);
  if (source === null) return;

  const resolvedPath = resolveModulePath(source, filePath, pathOps, knownFiles);

  const stringNode = node.namedChildren.find((c) => c.type === "string");
  if (stringNode !== undefined && resolvedPath !== null) {
    const stringId = emitAstAnchor(patch, filePath, stringNode);
    patch.addEdge(stringId, `file:${resolvedPath}`, "resolves_to");
  }

  // Check for wildcard re-export: export * from "..."
  const hasWildcard = node.children.some((c) => c.type === "*" || c.type === "namespace_export");
  if (hasWildcard && resolvedPath !== null) {
    const nodeId = emitAstAnchor(patch, filePath, node);
    patch.addEdge(nodeId, `file:${resolvedPath}`, "reexports");
    return;
  }

  // Named re-exports: export { foo, bar as baz } from "..."
  const specifiers = extractExportSpecifiers(node, filePath);
  for (const spec of specifiers) {
    emitAstAnchor(patch, filePath, spec.node);
    patch.setProperty(spec.specifierNodeId, "importedName", spec.importedName);
    patch.setProperty(spec.specifierNodeId, "localName", spec.localName);
    patch.setProperty(spec.specifierNodeId, "filePath", filePath);

    if (resolvedPath !== null) {
      patch.addEdge(spec.specifierNodeId, symNodeId(resolvedPath, spec.importedName), "references");
    }
  }
}

function walkForDynamicImports(
  patch: PatchBuilderV2,
  filePath: string,
  node: TSNode,
  pathOps: PathOps,
  knownFiles: ReadonlySet<string>,
): void {
  if (node.type === "call_expression") {
    const funcNode = node.namedChildren[0];
    if (funcNode?.type === "import") {
      // Dynamic import: import("./foo")
      const args = node.namedChildren.find((c) => c.type === "arguments");
      if (args !== undefined) {
        const stringArg = args.namedChildren.find((c) => c.type === "string");
        if (stringArg !== undefined) {
          const fragment = stringArg.namedChildren.find((c) => c.type === "string_fragment");
          if (fragment !== undefined) {
            const resolved = resolveModulePath(fragment.text, filePath, pathOps, knownFiles);
            if (resolved !== null) {
              const stringId = emitAstAnchor(patch, filePath, stringArg);
              patch.addEdge(stringId, `file:${resolved}`, "resolves_to");
            }
          }
        }
      }
    }
  }

  // Recurse
  for (const child of node.namedChildren) {
    walkForDynamicImports(patch, filePath, child, pathOps, knownFiles);
  }
}

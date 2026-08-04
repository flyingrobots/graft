// ---------------------------------------------------------------------------
// Python AST import resolver — adds first-party reference edges to WARP
// ---------------------------------------------------------------------------

import type { PatchBuilderV2 } from "@git-stunts/git-warp";
import type { PathOps } from "../ports/paths.js";
import { emitAstAnchor } from "./ast-emitter.js";
import { SymIdCodec } from "./sym-id-codec.js";

type TSNode = import("web-tree-sitter").SyntaxNode;

interface ImportInfo {
  readonly node: TSNode;
  readonly importedName: string;
  readonly localName: string;
}

function moduleCandidates(path: string): readonly string[] {
  return [`${path}.py`, `${path}.pyi`, `${path}/__init__.py`, `${path}/__init__.pyi`];
}

export function isPythonPackageModulePath(filePath: string): boolean {
  return filePath.endsWith("/__init__.py") || filePath.endsWith("/__init__.pyi");
}

export function pythonChildModuleSource(packageSource: string, childName: string): string {
  return packageSource.endsWith(".")
    ? `${packageSource}${childName}`
    : `${packageSource}.${childName}`;
}

export function resolvePythonModulePath(
  source: string,
  importingFilePath: string,
  pathOps: PathOps,
  knownFiles: ReadonlySet<string>,
): string | null {
  const directory = importingFilePath.includes("/") ? importingFilePath.slice(0, importingFilePath.lastIndexOf("/")) : "";
  const prefix = /^\.+/.exec(source);
  const name = source.slice(prefix?.[0].length ?? 0).replaceAll(".", "/");
  const base = prefix === null
    ? name
    : pathOps.normalize(pathOps.join(directory, ...Array.from({ length: prefix[0].length - 1 }, () => ".."), name));
  return moduleCandidates(base).find((candidate) => knownFiles.has(candidate)) ?? null;
}

function importInfo(node: TSNode, fromImport: boolean): ImportInfo | null {
  if (node.type === "wildcard_import") return { node, importedName: "*", localName: "*" };
  if (node.type === "dotted_name") {
    return fromImport
      ? { node, importedName: node.text, localName: node.text }
      : (() => { const localName = node.text.split(".")[0]; return localName === undefined ? null : { node, importedName: "*", localName }; })();
  }
  if (node.type !== "aliased_import") return null;
  const imported = node.namedChildren.find((child) => child.type === "dotted_name");
  const local = node.namedChildren.find((child) => child.type === "identifier");
  if (imported === undefined || local === undefined) return null;
  return { node, importedName: fromImport ? imported.text : "*", localName: local.text };
}

function emitReference(patch: PatchBuilderV2, filePath: string, info: ImportInfo, target: string | null): void {
  const specifierId = emitAstAnchor(patch, filePath, info.node);
  patch.setProperty(specifierId, "importedName", info.importedName);
  patch.setProperty(specifierId, "localName", info.localName);
  patch.setProperty(specifierId, "filePath", filePath);
  if (target !== null) patch.addEdge(specifierId, target, "references");
}

function handleImportStatement(patch: PatchBuilderV2, filePath: string, node: TSNode, pathOps: PathOps, knownFiles: ReadonlySet<string>): void {
  for (const child of node.namedChildren) {
    const info = importInfo(child, false);
    if (info === null) continue;
    const moduleNode = child.type === "aliased_import" ? child.namedChildren.find((candidate) => candidate.type === "dotted_name") : child;
    if (moduleNode === undefined) continue;
    const resolvedPath = resolvePythonModulePath(moduleNode.text, filePath, pathOps, knownFiles);
    if (resolvedPath !== null) patch.addEdge(emitAstAnchor(patch, filePath, moduleNode), `file:${resolvedPath}`, "resolves_to");
    emitReference(patch, filePath, info, resolvedPath === null ? null : `file:${resolvedPath}`);
  }
}

function handleFromImportStatement(patch: PatchBuilderV2, filePath: string, node: TSNode, pathOps: PathOps, knownFiles: ReadonlySet<string>): void {
  const moduleNode = node.namedChildren.find((child) => child.type === "dotted_name" || child.type === "relative_import");
  if (moduleNode === undefined) return;
  const resolvedPath = resolvePythonModulePath(moduleNode.text, filePath, pathOps, knownFiles);
  if (resolvedPath !== null) patch.addEdge(emitAstAnchor(patch, filePath, moduleNode), `file:${resolvedPath}`, "resolves_to");

  for (const child of node.namedChildren.slice(node.namedChildren.indexOf(moduleNode) + 1)) {
    const info = importInfo(child, true);
    if (info === null || info.importedName === "*") continue;
    const childModule = resolvedPath === null || isPythonPackageModulePath(resolvedPath)
      ? resolvePythonModulePath(pythonChildModuleSource(moduleNode.text, info.importedName), filePath, pathOps, knownFiles)
      : null;
    const target = childModule !== null
      ? `file:${childModule}`
      : resolvedPath === null ? null : SymIdCodec.encode(resolvedPath, info.importedName);
    emitReference(patch, filePath, info, target);
  }
}

/** Resolve first-party Python imports without sharing TypeScript resolver shapes. */
export function resolvePythonImportEdges(
  patch: PatchBuilderV2,
  filePath: string,
  root: TSNode,
  pathOps: PathOps,
  knownFiles: ReadonlySet<string>,
): void {
  const visit = (node: TSNode): void => {
    if (node.type === "import_statement") {
      handleImportStatement(patch, filePath, node, pathOps, knownFiles);
      return;
    }
    if (node.type === "import_from_statement") {
      handleFromImportStatement(patch, filePath, node, pathOps, knownFiles);
      return;
    }
    for (const child of node.namedChildren) visit(child);
  };
  visit(root);
}

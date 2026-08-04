// ---------------------------------------------------------------------------
// Qualified reference resolver — shared language-adapter contract
// ---------------------------------------------------------------------------

import type { PatchBuilderV2 } from "@git-stunts/git-warp";
import type { SupportedLang } from "../parser/lang.js";
import type { PathOps } from "../ports/paths.js";
import { emitAstAnchor } from "./ast-emitter.js";
import type { ImportBindingDiagnostic } from "./import-diagnostic.js";
import { SymIdCodec } from "./sym-id-codec.js";
import { isPythonPackageModulePath, pythonChildModuleSource, resolvePythonModulePath } from "./python-import-resolver.js";

type TSNode = import("web-tree-sitter").SyntaxNode;

export type QualifiedReferenceLanguage = "python" | "ts" | "tsx" | "js" | "rust" | "go";

export interface GoReferenceContext {
  readonly modulePath: string;
  readonly moduleDirectory: string;
  readonly packageNames: ReadonlyMap<string, string | null>;
  readonly packageFiles: ReadonlyMap<string, readonly string[]>;
  /** package directory -> exported name -> unique declaring file, or null when ambiguous */
  readonly declarations: ReadonlyMap<string, ReadonlyMap<string, string | null>>;
}

export interface QualifiedReferenceContext {
  readonly pathOps: PathOps;
  readonly knownFiles: ReadonlySet<string>;
  readonly go?: GoReferenceContext | undefined;
}

export interface ResolvedImportBinding {
  readonly name: string;
  readonly targetFilePath: string | null;
  readonly unresolvedTargetFilePath?: string | undefined;
  readonly qualifiedPath?: readonly string[] | undefined;
  readonly scopeStartIndex?: number | undefined;
  readonly scopeEndIndex?: number | undefined;
  readonly packageDirectory?: string | undefined;
  readonly importNode: TSNode;
}

export interface QualifiedReferenceAccess {
  readonly binding: string;
  readonly member: string;
  readonly targetFilePath: string;
  readonly node: TSNode;
  readonly shadow: ImportBindingDiagnostic | null;
}

export interface UnresolvedQualifiedReferenceAccess {
  readonly binding: string;
  readonly member: string;
  readonly targetDirectoryPath?: string | undefined;
  readonly targetFilePath?: string | undefined;
  readonly node: TSNode;
  readonly shadow: ImportBindingDiagnostic | null;
}

export interface QualifiedReferenceAnalysis {
  readonly bindings: readonly ResolvedImportBinding[];
  readonly accesses: readonly QualifiedReferenceAccess[];
  readonly unresolvedAccesses: readonly UnresolvedQualifiedReferenceAccess[];
  readonly diagnostics: readonly ImportBindingDiagnostic[];
}

export interface DirectSymbolImportReference {
  readonly importedName: string;
  readonly targetFilePath: string;
}

interface ShadowRegion {
  readonly binding: string;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly diagnostic: ImportBindingDiagnostic;
  readonly pythonClassScope?: TSNode | undefined;
}

function walk(node: TSNode, visit: (candidate: TSNode) => void): void {
  visit(node);
  for (const child of node.namedChildren) walk(child, visit);
}

function languageName(language: QualifiedReferenceLanguage): ImportBindingDiagnostic["language"] {
  if (language === "ts" || language === "tsx") return "typescript";
  if (language === "js") return "javascript";
  return language;
}

function compiledSpecifierSourceCandidates(raw: string): readonly string[] {
  const pairs: readonly [string, readonly string[]][] = [
    [".js", [".ts", ".tsx"]], [".jsx", [".tsx", ".ts"]],
    [".mjs", [".mts", ".ts"]], [".cjs", [".cts", ".ts"]],
  ];
  for (const [extension, replacements] of pairs) {
    if (!raw.endsWith(extension)) continue;
    const base = raw.slice(0, -extension.length);
    return replacements.map((replacement) => `${base}${replacement}`);
  }
  return [];
}

function resolveRelativeModule(
  source: string,
  importingFilePath: string,
  context: QualifiedReferenceContext,
): string | null {
  if (!source.startsWith(".") && !source.startsWith("/")) return null;
  const directory = importingFilePath.includes("/")
    ? importingFilePath.slice(0, importingFilePath.lastIndexOf("/"))
    : "";
  const raw = directory === ""
    ? context.pathOps.normalize(source)
    : context.pathOps.join(directory, source);
  const candidates = [
    raw,
    ...compiledSpecifierSourceCandidates(raw),
    `${raw}.ts`, `${raw}.tsx`, `${raw}.js`, `${raw}.jsx`, `${raw}.mts`, `${raw}.cts`,
    `${raw}.d.ts`, `${raw}.d.mts`, `${raw}.d.cts`,
    `${raw}/index.ts`, `${raw}/index.tsx`, `${raw}/index.js`, `${raw}/index.jsx`,
    `${raw}/index.mts`, `${raw}/index.cts`,
    `${raw}/index.d.ts`, `${raw}/index.d.mts`, `${raw}/index.d.cts`,
  ];
  return candidates.find((candidate) => context.knownFiles.has(candidate)) ?? null;
}

function stringValue(node: TSNode): string | null {
  const fragment = node.namedChildren.find((child) => child.type === "string_fragment");
  if (fragment !== undefined) return fragment.text;
  const text = node.text;
  return text.length >= 2 ? text.slice(1, -1) : null;
}

function pythonBindings(
  root: TSNode,
  filePath: string,
  context: QualifiedReferenceContext,
): readonly ResolvedImportBinding[] {
  const bindings: ResolvedImportBinding[] = [];
  const statements: TSNode[] = [];
  walk(root, (node) => {
    if (node.type === "import_statement" || node.type === "import_from_statement") {
      statements.push(node);
    }
  });
  for (const statement of statements) {
    const lexicalScope = nearestAncestor(statement, PYTHON_LEXICAL_SCOPE_TYPES);
    const scopeBody = lexicalScope?.childForFieldName("body") ?? lexicalScope;
    const scopeStartIndex = statement.endIndex;
    const scopeEndIndex = scopeBody?.endIndex ?? root.endIndex;
    if (statement.type === "import_statement") {
      for (const specifier of statement.namedChildren) {
        const moduleNode = specifier.type === "aliased_import"
          ? specifier.childForFieldName("name") ?? specifier.namedChildren.find((child) => child.type === "dotted_name")
          : specifier;
        if (moduleNode?.type !== "dotted_name") continue;
        const alias = specifier.type === "aliased_import"
          ? specifier.childForFieldName("alias") ?? specifier.namedChildren.find((child) => child.type === "identifier")
          : undefined;
        const moduleParts = moduleNode.text.split(".");
        const bindingName = alias?.text ?? moduleParts[0];
        if (bindingName === undefined) continue;
        bindings.push({
          name: bindingName,
          targetFilePath: resolvePythonModulePath(moduleNode.text, filePath, context.pathOps, context.knownFiles),
          ...(alias === undefined && moduleParts.length > 1 ? { qualifiedPath: moduleParts.slice(1) } : {}),
          scopeStartIndex,
          scopeEndIndex,
          importNode: specifier,
        });
      }
      continue;
    }
    if (statement.type !== "import_from_statement") continue;
    const packageNode = statement.childForFieldName("module_name") ??
      statement.namedChildren.find((child) => child.type === "dotted_name" || child.type === "relative_import");
    if (packageNode === undefined) continue;
    const packagePath = resolvePythonModulePath(packageNode.text, filePath, context.pathOps, context.knownFiles);
    for (const specifier of statement.namedChildren.slice(statement.namedChildren.indexOf(packageNode) + 1)) {
      if (specifier.type === "wildcard_import") continue;
      const imported = specifier.type === "aliased_import"
        ? specifier.childForFieldName("name") ?? specifier.namedChildren.find((child) => child.type === "dotted_name")
        : specifier;
      if (imported?.type !== "dotted_name") continue;
      const alias = specifier.type === "aliased_import"
        ? specifier.childForFieldName("alias") ?? specifier.namedChildren.find((child) => child.type === "identifier")
        : undefined;
      const childPath = packagePath === null || isPythonPackageModulePath(packagePath)
        ? resolvePythonModulePath(pythonChildModuleSource(packageNode.text, imported.text), filePath, context.pathOps, context.knownFiles)
        : null;
      bindings.push({
        name: alias?.text ?? imported.text,
        targetFilePath: childPath,
        scopeStartIndex,
        scopeEndIndex,
        importNode: specifier,
      });
    }
  }
  return bindings;
}

function typescriptBindings(
  root: TSNode,
  filePath: string,
  context: QualifiedReferenceContext,
): readonly ResolvedImportBinding[] {
  const bindings: ResolvedImportBinding[] = [];
  for (const statement of root.namedChildren) {
    if (statement.type !== "import_statement") continue;
    const sourceNode = statement.childForFieldName("source") ?? statement.namedChildren.find((child) => child.type === "string");
    const source = sourceNode === undefined ? null : stringValue(sourceNode);
    if (source === null) continue;
    const namespace = statement.namedChildren
      .find((child) => child.type === "import_clause")
      ?.namedChildren.find((child) => child.type === "namespace_import");
    const alias = namespace?.namedChildren.find((child) => child.type === "identifier");
    if (namespace !== undefined && alias !== undefined) {
      bindings.push({ name: alias.text, targetFilePath: resolveRelativeModule(source, filePath, context), importNode: namespace });
    }
  }
  return bindings;
}

function rustSourceRoot(filePath: string, knownFiles: ReadonlySet<string>): string {
  const parts = filePath.split("/");
  for (let length = parts.length - 1; length >= 0; length--) {
    const directory = parts.slice(0, length).join("/");
    const manifest = directory === "" ? "Cargo.toml" : `${directory}/Cargo.toml`;
    if (!knownFiles.has(manifest)) continue;
    const sourceRoot = directory === "" ? "src" : `${directory}/src`;
    const autoTargetRoots = [
      `${sourceRoot}/bin`,
      directory === "" ? "examples" : `${directory}/examples`,
      directory === "" ? "tests" : `${directory}/tests`,
      directory === "" ? "benches" : `${directory}/benches`,
    ];
    for (const targetRoot of autoTargetRoots) {
      if (parentDirectory(filePath) === targetRoot) return targetRoot;
      if (!filePath.startsWith(`${targetRoot}/`)) continue;
      const relative = filePath.slice(targetRoot.length + 1);
      const targetName = relative.split("/")[0];
      if (targetName === undefined) continue;
      const directoryTarget = `${targetRoot}/${targetName}`;
      if (knownFiles.has(`${directoryTarget}/main.rs`)) return directoryTarget;
      if (knownFiles.has(`${targetRoot}/${targetName}.rs`)) return targetRoot;
    }
    return sourceRoot;
  }
  const srcIndex = parts.lastIndexOf("src");
  return srcIndex >= 0 ? parts.slice(0, srcIndex + 1).join("/") : "";
}

function parentDirectory(value: string): string {
  return value.includes("/") ? value.slice(0, value.lastIndexOf("/")) : "";
}

function rustLogicalModuleDirectory(filePath: string): string {
  const directory = parentDirectory(filePath);
  const fileName = filePath.slice(directory.length === 0 ? 0 : directory.length + 1);
  if (fileName === "lib.rs" || fileName === "main.rs" || fileName === "mod.rs") {
    return directory;
  }
  const moduleName = fileName.endsWith(".rs") ? fileName.slice(0, -3) : fileName;
  return directory === "" ? moduleName : `${directory}/${moduleName}`;
}

function rustInlineModuleSegments(node: TSNode): readonly string[] {
  const segments: string[] = [];
  let cursor = node.parent;
  while (cursor !== null) {
    if (cursor.type === "mod_item") {
      const body = cursor.childForFieldName("body") ??
        cursor.namedChildren.find((child) => child.type === "declaration_list");
      const name = cursor.childForFieldName("name") ??
        cursor.namedChildren.find((child) => child.type === "identifier");
      if (body !== undefined && name !== undefined) segments.unshift(name.text);
    }
    cursor = cursor.parent;
  }
  return segments;
}

function rustModuleCandidatePath(
  source: string,
  filePath: string,
  context: QualifiedReferenceContext,
  importNode?: TSNode,
): string | null {
  const sourceRoot = rustSourceRoot(filePath, context.knownFiles);
  const logicalDirectory = rustLogicalModuleDirectory(filePath);
  const inlineSegments = importNode === undefined ? [] : rustInlineModuleSegments(importNode);
  const moduleDirectory = inlineSegments.length === 0
    ? logicalDirectory
    : context.pathOps.join(logicalDirectory, ...inlineSegments);
  const segments = source.split("::");
  const prefix = segments.shift();
  let base: string;
  if (prefix === "crate") base = sourceRoot;
  else if (prefix === "self") base = moduleDirectory;
  else if (prefix === "super") {
    base = parentDirectory(moduleDirectory);
    while (segments[0] === "super") { segments.shift(); base = parentDirectory(base); }
  } else return null;
  return context.pathOps.normalize(context.pathOps.join(base, ...segments));
}

function resolveRustModule(
  source: string,
  filePath: string,
  context: QualifiedReferenceContext,
  importNode?: TSNode,
): string | null {
  const raw = rustModuleCandidatePath(source, filePath, context, importNode);
  if (raw === null) return null;
  return [`${raw}.rs`, `${raw}/mod.rs`].find((candidate) => context.knownFiles.has(candidate)) ?? null;
}

function unresolvedRustModuleOwner(
  source: string,
  filePath: string,
  context: QualifiedReferenceContext,
  importNode?: TSNode,
): string | null {
  let candidate = rustModuleCandidatePath(source, filePath, context, importNode);
  if (candidate === null) return null;
  while (candidate !== "") {
    const owner = [`${candidate}.rs`, `${candidate}/mod.rs`]
      .find((file) => context.knownFiles.has(file));
    if (owner !== undefined) return owner;
    candidate = parentDirectory(candidate);
  }
  return null;
}

interface RustUseModuleCandidate {
  readonly name: string;
  readonly source: string;
  readonly importNode: TSNode;
}

function joinRustUsePath(prefix: string, path: string): string {
  if (path === "self") return prefix === "" ? path : prefix;
  if (path === "crate" || path === "super" || path.startsWith("crate::") || path.startsWith("self::") || path.startsWith("super::")) {
    return path;
  }
  return prefix === "" ? path : `${prefix}::${path}`;
}

function rustUseModuleCandidates(node: TSNode, prefix = ""): readonly RustUseModuleCandidate[] {
  if (node.type === "use_as_clause") {
    const path = node.childForFieldName("path") ?? node.namedChildren[0];
    const alias = node.childForFieldName("alias") ?? node.namedChildren.at(-1);
    if (path === undefined || alias === undefined) return [];
    return [{ name: alias.text, source: joinRustUsePath(prefix, path.text), importNode: node }];
  }
  if (node.type === "scoped_use_list") {
    const path = node.childForFieldName("path") ?? node.namedChildren[0];
    const list = node.namedChildren.find((child) => child.type === "use_list");
    if (path === undefined || list === undefined) return [];
    const nestedPrefix = joinRustUsePath(prefix, path.text);
    return list.namedChildren.flatMap((child) => rustUseModuleCandidates(child, nestedPrefix));
  }
  if (node.type === "use_list") {
    return node.namedChildren.flatMap((child) => rustUseModuleCandidates(child, prefix));
  }
  if (node.type === "scoped_identifier") {
    const name = node.childForFieldName("name") ?? node.namedChildren.at(-1);
    return name === undefined
      ? []
      : [{ name: name.text, source: joinRustUsePath(prefix, node.text), importNode: node }];
  }
  if (node.type === "identifier") {
    return [{ name: node.text, source: joinRustUsePath(prefix, node.text), importNode: node }];
  }
  if (node.type === "self" && prefix !== "") {
    const name = prefix.split("::").at(-1);
    return name === undefined ? [] : [{ name, source: prefix, importNode: node }];
  }
  return [];
}

function rustBindings(
  root: TSNode,
  filePath: string,
  context: QualifiedReferenceContext,
): readonly ResolvedImportBinding[] {
  const bindings: ResolvedImportBinding[] = [];
  const statements: TSNode[] = [];
  walk(root, (node) => {
    if (node.type === "use_declaration") statements.push(node);
  });
  for (const statement of statements) {
    const argument = statement.childForFieldName("argument") ?? statement.namedChildren[0];
    if (argument === undefined) continue;
    const scope = nearestAncestor(statement, RUST_IMPORT_SCOPE_TYPES);
    const scopeStartIndex = scope?.startIndex ?? root.startIndex;
    const scopeEndIndex = scope?.endIndex ?? root.endIndex;
    for (const candidate of rustUseModuleCandidates(argument)) {
      const targetFilePath = resolveRustModule(candidate.source, filePath, context, candidate.importNode);
      bindings.push({
        name: candidate.name,
        targetFilePath,
        ...(targetFilePath === null
          ? { unresolvedTargetFilePath: unresolvedRustModuleOwner(candidate.source, filePath, context, candidate.importNode) ?? undefined }
          : {}),
        scopeStartIndex,
        scopeEndIndex,
        importNode: candidate.importNode,
      });
    }
  }
  return bindings;
}

function goBindings(root: TSNode, context: QualifiedReferenceContext): readonly ResolvedImportBinding[] {
  const go = context.go;
  if (go === undefined) return [];
  const bindings: ResolvedImportBinding[] = [];
  walk(root, (node) => {
    if (node.type !== "import_spec") return;
    const pathNode = node.childForFieldName("path") ?? node.namedChildren.find((child) => child.type.endsWith("string_literal"));
    if (pathNode === undefined) return;
    const importPath = stringValue(pathNode);
    if (importPath === null || (importPath !== go.modulePath && !importPath.startsWith(`${go.modulePath}/`))) return;
    const directory = importPath === go.modulePath ? "" : importPath.slice(go.modulePath.length + 1);
    if (!go.packageNames.has(directory)) return;
    const explicit = node.childForFieldName("name") ?? node.namedChildren.find((child) => child.type === "package_identifier");
    const name = explicit?.text ?? go.packageNames.get(directory);
    if (name === undefined || name === null || name === "_" || name === ".") return;
    bindings.push({ name, targetFilePath: null, packageDirectory: directory, importNode: node });
  });
  return bindings;
}

function goTargetDirectoryPath(
  context: GoReferenceContext,
  packageDirectory: string,
  pathOps: PathOps,
): string {
  if (context.moduleDirectory === "") return packageDirectory;
  if (packageDirectory === "") return context.moduleDirectory;
  return pathOps.join(context.moduleDirectory, packageDirectory);
}

export function resolveQualifiedImportBindings(
  language: QualifiedReferenceLanguage,
  filePath: string,
  root: TSNode,
  context: QualifiedReferenceContext,
): readonly ResolvedImportBinding[] {
  if (language === "python") return pythonBindings(root, filePath, context);
  if (language === "rust") return rustBindings(root, filePath, context);
  if (language === "go") return goBindings(root, context);
  return typescriptBindings(root, filePath, context);
}

export function analyzeDirectSymbolImportReferences(
  language: QualifiedReferenceLanguage,
  filePath: string,
  root: TSNode,
  context: QualifiedReferenceContext,
): readonly DirectSymbolImportReference[] {
  const references: DirectSymbolImportReference[] = [];
  if (language === "python") {
    walk(root, (statement) => {
      if (statement.type !== "import_from_statement") return;
      const packageNode = statement.childForFieldName("module_name") ??
        statement.namedChildren.find((child) => child.type === "dotted_name" || child.type === "relative_import");
      if (packageNode === undefined) return;
      const packagePath = resolvePythonModulePath(packageNode.text, filePath, context.pathOps, context.knownFiles);
      if (packagePath === null) return;
      for (const specifier of statement.namedChildren.slice(statement.namedChildren.indexOf(packageNode) + 1)) {
        if (specifier.type === "wildcard_import") continue;
        const imported = specifier.type === "aliased_import"
          ? specifier.childForFieldName("name") ?? specifier.namedChildren.find((child) => child.type === "dotted_name")
          : specifier;
        if (imported?.type !== "dotted_name") continue;
        const childModule = isPythonPackageModulePath(packagePath)
          ? resolvePythonModulePath(pythonChildModuleSource(packageNode.text, imported.text), filePath, context.pathOps, context.knownFiles)
          : null;
        if (childModule === null) references.push({ importedName: imported.text, targetFilePath: packagePath });
      }
    });
  }
  if (language === "rust") {
    walk(root, (statement) => {
      if (statement.type !== "use_declaration") return;
      const argument = statement.childForFieldName("argument") ?? statement.namedChildren[0];
      if (argument === undefined) return;
      for (const candidate of rustUseModuleCandidates(argument)) {
        if (resolveRustModule(candidate.source, filePath, context, candidate.importNode) !== null) continue;
        const segments = candidate.source.split("::");
        const importedName = segments.pop();
        if (importedName === undefined || segments.length === 0) continue;
        const targetFilePath = resolveRustModule(segments.join("::"), filePath, context, candidate.importNode);
        if (targetFilePath !== null) references.push({ importedName, targetFilePath });
      }
    });
  }
  return references;
}

function nearestAncestor(node: TSNode, types: ReadonlySet<string>): TSNode | null {
  let cursor = node.parent;
  while (cursor !== null) {
    if (types.has(cursor.type)) return cursor;
    cursor = cursor.parent;
  }
  return null;
}

function directMatchingIdentifier(
  node: TSNode | null | undefined,
  bindings: ReadonlySet<string>,
): readonly TSNode[] {
  if (node === null || node === undefined) return [];
  return ["identifier", "type_identifier", "package_identifier", "shorthand_property_identifier_pattern"].includes(node.type) && bindings.has(node.text)
    ? [node]
    : [];
}

function matchingBindingIdentifiers(
  language: QualifiedReferenceLanguage,
  node: TSNode | null | undefined,
  bindings: ReadonlySet<string>,
): readonly TSNode[] {
  const direct = directMatchingIdentifier(node, bindings);
  if (direct.length > 0 || node === null || node === undefined) return direct;

  if (language === "python") {
    if (node.type === "dotted_name" && node.namedChildren.length === 1) {
      return directMatchingIdentifier(node.namedChildren[0], bindings);
    }
    if (["default_parameter", "typed_parameter", "typed_default_parameter"].includes(node.type)) {
      return matchingBindingIdentifiers(language, node.childForFieldName("name") ?? node.childForFieldName("parameter") ?? node.namedChildren[0], bindings);
    }
    if (["parameters", "lambda_parameters", "case_pattern", "pattern_list", "tuple_pattern", "list_pattern", "dict_pattern", "union_pattern", "list_splat_pattern", "dictionary_splat_pattern", "as_pattern", "as_pattern_target"].includes(node.type)) {
      return node.namedChildren.flatMap((child) => matchingBindingIdentifiers(language, child, bindings));
    }
    return [];
  }

  if (language === "ts" || language === "tsx" || language === "js") {
    if (node.type === "pair_pattern") {
      return matchingBindingIdentifiers(language, node.childForFieldName("value") ?? node.namedChildren.at(-1), bindings);
    }
    if (node.type === "assignment_pattern") {
      return matchingBindingIdentifiers(language, node.childForFieldName("left") ?? node.namedChildren[0], bindings);
    }
    if (["required_parameter", "optional_parameter"].includes(node.type)) {
      return matchingBindingIdentifiers(language, node.childForFieldName("pattern") ?? node.childForFieldName("name") ?? node.namedChildren[0], bindings);
    }
    if (node.type === "rest_pattern") {
      return matchingBindingIdentifiers(language, node.childForFieldName("pattern") ?? node.namedChildren[0], bindings);
    }
    if (["formal_parameters", "object_pattern", "array_pattern"].includes(node.type)) {
      return node.namedChildren.flatMap((child) => matchingBindingIdentifiers(language, child, bindings));
    }
    return [];
  }

  if (language === "rust") {
    if (node.type === "parameter") {
      return matchingBindingIdentifiers(language, node.childForFieldName("pattern") ?? node.namedChildren[0], bindings);
    }
    if (node.type === "tuple_struct_pattern" || node.type === "struct_pattern") {
      const type = node.childForFieldName("type");
      return node.namedChildren
        .filter((child) => child.startIndex !== type?.startIndex)
        .flatMap((child) => matchingBindingIdentifiers(language, child, bindings));
    }
    if (node.type === "field_pattern") {
      return matchingBindingIdentifiers(language, node.childForFieldName("pattern") ?? node.childForFieldName("name") ?? node.namedChildren.at(-1), bindings);
    }
    if (["parameters", "closure_parameters", "match_pattern", "tuple_pattern", "slice_pattern", "reference_pattern", "mut_pattern", "or_pattern"].includes(node.type)) {
      return node.namedChildren.flatMap((child) => matchingBindingIdentifiers(language, child, bindings));
    }
    return [];
  }

  if (["parameter_declaration", "variadic_parameter_declaration"].includes(node.type)) {
    return node.namedChildren
      .filter((child) => child.type === "identifier")
      .flatMap((child) => directMatchingIdentifier(child, bindings));
  }
  if (node.type === "expression_list") {
    return node.namedChildren.flatMap((child) => directMatchingIdentifier(child, bindings));
  }
  return [];
}

function pythonDeletionIdentifiers(
  node: TSNode,
  bindings: ReadonlySet<string>,
): readonly TSNode[] {
  if (node.type === "attribute" || node.type === "subscript") return [];
  const direct = directMatchingIdentifier(node, bindings);
  if (direct.length > 0) return direct;
  return node.namedChildren.flatMap((child) => pythonDeletionIdentifiers(child, bindings));
}

function matchingRustUseBindingIdentifiers(
  node: TSNode | null | undefined,
  bindings: ReadonlySet<string>,
): readonly TSNode[] {
  if (node === null || node === undefined) return [];
  if (node.type === "use_as_clause") {
    return directMatchingIdentifier(node.childForFieldName("alias") ?? node.namedChildren.at(-1), bindings);
  }
  if (node.type === "scoped_identifier") {
    return directMatchingIdentifier(node.childForFieldName("name") ?? node.namedChildren.at(-1), bindings);
  }
  if (node.type === "identifier") return directMatchingIdentifier(node, bindings);
  if (node.type === "use_list" || node.type === "scoped_use_list") {
    return node.namedChildren.flatMap((child) => matchingRustUseBindingIdentifiers(child, bindings));
  }
  return [];
}

function matchingGoSpecIdentifiers(
  node: TSNode,
  bindings: ReadonlySet<string>,
): readonly TSNode[] {
  const identifiers: TSNode[] = [];
  for (const child of node.namedChildren) {
    if (child.type !== "identifier") break;
    identifiers.push(...directMatchingIdentifier(child, bindings));
  }
  return identifiers;
}

function diagnosticFor(
  language: QualifiedReferenceLanguage,
  filePath: string,
  binding: string,
  targetFilePath: string,
  shadowKind: string,
  node: TSNode,
): ImportBindingDiagnostic {
  return {
    code: "import_binding_shadowed",
    severity: "warning",
    language: languageName(language),
    filePath,
    range: {
      startLine: node.startPosition.row + 1,
      startColumn: node.startPosition.column + 1,
      endLine: node.endPosition.row + 1,
      endColumn: node.endPosition.column + 1,
    },
    binding,
    targetFilePath,
    shadowKind,
    message: `Import binding '${binding}' is shadowed; affected qualified accesses were excluded from reference inference.`,
  };
}

const PYTHON_LEXICAL_SCOPE_TYPES = new Set(["function_definition", "lambda", "class_definition"]);
const PYTHON_DECLARATION_SCOPE_TYPES = new Set(["function_definition", "class_definition"]);
const PYTHON_IMPORT_STATEMENT_TYPES = new Set(["import_statement", "import_from_statement"]);
const PYTHON_COMPREHENSION_TYPES = new Set(["list_comprehension", "set_comprehension", "dictionary_comprehension", "generator_expression"]);
const PYTHON_ASSIGNMENT_TYPES = new Set(["assignment", "augmented_assignment", "named_expression", "for_statement", "for_in_clause"]);
const TYPESCRIPT_FUNCTION_TYPES = new Set([
  "function_declaration", "function_expression", "generator_function_declaration", "generator_function",
  "arrow_function", "method_definition",
]);
const TYPESCRIPT_BLOCK_TYPES = new Set(["statement_block", "switch_statement", "program"]);
const TYPESCRIPT_LOCAL_TYPES = new Set(["variable_declarator", "assignment_expression"]);
const TYPESCRIPT_LOOP_TYPES = new Set(["for_statement", "for_in_statement"]);
const TYPESCRIPT_DECLARATION_TYPES = new Set(["lexical_declaration", "variable_declaration"]);
const TYPESCRIPT_SCOPED_LOOP_TYPES = new Set(["for_in_statement", "for_of_statement"]);
const RUST_FUNCTION_TYPES = new Set(["function_item", "closure_expression"]);
const RUST_BLOCK_TYPES = new Set(["block"]);
const RUST_IMPORT_SCOPE_TYPES = new Set(["block", "declaration_list"]);
const RUST_LOOP_TYPES = new Set(["for_expression"]);
const RUST_PATTERN_TYPES = new Set(["for_expression", "match_arm"]);
const RUST_CONDITIONAL_TYPES = new Set(["if_expression", "while_expression"]);
const RUST_USE_DECLARATION_TYPES = new Set(["use_declaration"]);
const RUST_DECLARATION_TYPES = new Set(["function_item", "struct_item", "enum_item", "type_item", "const_item", "static_item", "union_item", "trait_item", "mod_item"]);
const GO_FUNCTION_TYPES = new Set(["function_declaration", "method_declaration", "func_literal"]);
const GO_BLOCK_TYPES = new Set(["block"]);
const GO_LEXICAL_SCOPE_TYPES = new Set([
  "block", "expression_case", "type_case", "communication_case", "default_case",
]);
const GO_LOCAL_TYPES = new Set(["short_var_declaration", "var_spec", "const_spec", "assignment_statement"]);
const GO_LOOP_TYPES = new Set(["for_statement"]);
const GO_CONTROL_TYPES = new Set(["if_statement", "expression_switch_statement", "type_switch_statement"]);
const GO_DECLARATION_TYPES = new Set(["function_declaration", "type_spec"]);

function containsIndex(node: TSNode, index: number): boolean {
  return index >= node.startIndex && index < node.endIndex;
}

function pythonClassNamespaceAppliesAtIndex(classScope: TSNode, index: number): boolean {
  let cursor = classScope;
  let child = cursor.namedChildren.find((candidate) => containsIndex(candidate, index));
  while (child !== undefined) {
    if (PYTHON_LEXICAL_SCOPE_TYPES.has(child.type)) {
      const body = child.childForFieldName("body") ?? child;
      if (containsIndex(body, index)) return false;
    }
    if (PYTHON_COMPREHENSION_TYPES.has(child.type)) {
      const outermostForClause = child.namedChildren.find((candidate) => candidate.type === "for_in_clause");
      const iterable = outermostForClause?.childForFieldName("right") ?? outermostForClause?.namedChildren.at(-1);
      if (iterable === undefined || !containsIndex(iterable, index)) return false;
    }
    cursor = child;
    child = cursor.namedChildren.find((candidate) => containsIndex(candidate, index));
  }
  return true;
}

function pythonClassScopeForBindingIdentifier(identifier: TSNode): TSNode | undefined {
  let scope = nearestAncestor(identifier, PYTHON_LEXICAL_SCOPE_TYPES);
  if (scope !== null) {
    const declarationName = scope.childForFieldName("name");
    if (declarationName !== null && containsIndex(declarationName, identifier.startIndex)) {
      scope = nearestAncestor(scope, PYTHON_LEXICAL_SCOPE_TYPES);
    }
  }
  if (scope?.type !== "class_definition") return undefined;
  const comprehension = nearestAncestor(identifier, PYTHON_COMPREHENSION_TYPES);
  if (comprehension !== null && containsIndex(scope, comprehension.startIndex)) return undefined;
  return scope;
}

function importBindingAppliesAtIndex(
  language: QualifiedReferenceLanguage,
  binding: ResolvedImportBinding,
  index: number,
): boolean {
  if (language !== "python") return true;
  const importScope = nearestAncestor(binding.importNode, PYTHON_LEXICAL_SCOPE_TYPES);
  if (importScope?.type !== "class_definition") return true;
  return pythonClassNamespaceAppliesAtIndex(importScope, index);
}

interface ShadowCollector {
  readonly root: TSNode;
  readonly bindings: readonly ResolvedImportBinding[];
  readonly bindingNames: ReadonlySet<string>;
  readonly regions: ShadowRegion[];
  readonly resolvedImportDeclarationStarts: ReadonlySet<number>;
  readonly addAll: (identifiers: readonly TSNode[], kind: string, start: number, end: number) => void;
}

function createShadowCollector(
  language: QualifiedReferenceLanguage,
  filePath: string,
  root: TSNode,
  bindings: readonly ResolvedImportBinding[],
  context: QualifiedReferenceContext,
): ShadowCollector {
  const bindingNames = new Set(bindings.map((binding) => binding.name));
  const targetForBinding = (binding: ResolvedImportBinding): string => {
    const packageDirectory = binding.packageDirectory ?? "";
    const packageDeclarations = context.go?.declarations.get(packageDirectory);
    const goTarget = packageDeclarations === undefined
      ? undefined
      : [...packageDeclarations.values()].find((value): value is string => value !== null) ??
        context.go?.packageFiles.get(packageDirectory)?.[0];
    const goDirectory = context.go === undefined
      ? undefined
      : goTargetDirectoryPath(context.go, packageDirectory, context.pathOps);
    return binding.targetFilePath ?? goTarget ?? goDirectory ?? "";
  };
  const activeBinding = (bindingName: string, scopeStart: number): ResolvedImportBinding | undefined =>
    bindings
      .filter((binding) =>
        binding.name === bindingName &&
        scopeStart >= (binding.scopeStartIndex ?? root.startIndex) &&
        scopeStart < (binding.scopeEndIndex ?? root.endIndex) &&
        importBindingAppliesAtIndex(language, binding, scopeStart)
      )
      .sort((left, right) =>
        (right.scopeStartIndex ?? root.startIndex) - (left.scopeStartIndex ?? root.startIndex) ||
        right.importNode.startIndex - left.importNode.startIndex
      )[0];
  const regions: ShadowRegion[] = [];
  const resolvedImportDeclarationStarts = new Set(bindings.flatMap((binding) => {
    const declaration = nearestAncestor(binding.importNode, RUST_USE_DECLARATION_TYPES);
    return declaration === null ? [] : [declaration.startIndex];
  }));
  return {
    root,
    bindings,
    bindingNames,
    regions,
    resolvedImportDeclarationStarts,
    addAll: (identifiers, kind, start, end): void => {
      for (const identifier of identifiers) {
        const binding = activeBinding(identifier.text, start);
        if (binding === undefined) continue;
        const target = targetForBinding(binding);
        const diagnostic = diagnosticFor(language, filePath, identifier.text, target, kind, identifier);
        const pythonClassScope = language === "python"
          ? pythonClassScopeForBindingIdentifier(identifier)
          : undefined;
        regions.push({
          binding: identifier.text,
          startIndex: start,
          endIndex: end,
          diagnostic,
          ...(pythonClassScope !== undefined ? { pythonClassScope } : {}),
        });
      }
    },
  };
}

function collectPythonShadowRegions(collector: ShadowCollector): void {
  const { root, bindings, bindingNames, addAll } = collector;
  const declaredOuterNames = new WeakMap<TSNode, ReadonlySet<string>>();
  const outerNamesForScope = (scope: TSNode): ReadonlySet<string> => {
    const existing = declaredOuterNames.get(scope);
    if (existing !== undefined) return existing;
    const names = new Set<string>();
    const visit = (node: TSNode): void => {
      if (node !== scope && PYTHON_LEXICAL_SCOPE_TYPES.has(node.type)) return;
      if (node.type === "global_statement" || node.type === "nonlocal_statement") {
        walk(node, (candidate) => {
          if (candidate.type === "identifier" && bindingNames.has(candidate.text)) names.add(candidate.text);
        });
        return;
      }
      for (const child of node.namedChildren) visit(child);
    };
    visit(scope);
    declaredOuterNames.set(scope, names);
    return names;
  };
  for (const binding of bindings) {
    const statement = nearestAncestor(binding.importNode, PYTHON_IMPORT_STATEMENT_TYPES);
    const scope = statement === null ? null : nearestAncestor(statement, PYTHON_LEXICAL_SCOPE_TYPES);
    if (statement === null || (scope?.type !== "function_definition" && scope?.type !== "lambda")) continue;
    const body = scope.childForFieldName("body") ?? scope;
    const alias = binding.importNode.type === "aliased_import"
      ? binding.importNode.childForFieldName("alias") ?? binding.importNode.namedChildren.at(-1)
      : binding.importNode.namedChildren.find((child) => child.type === "identifier" && child.text === binding.name);
    addAll(directMatchingIdentifier(alias, bindingNames), "import_declaration", body.startIndex, statement.endIndex);
  }
  walk(root, (node) => {
    if (node.type === "function_definition" || node.type === "lambda") {
      const parameters = node.childForFieldName("parameters");
      const body = node.childForFieldName("body") ?? node.namedChildren.at(-1);
      if (body !== undefined) addAll(matchingBindingIdentifiers("python", parameters, bindingNames), "parameter", body.startIndex, body.endIndex);
    }
    if (PYTHON_ASSIGNMENT_TYPES.has(node.type)) {
      const left = node.childForFieldName("left") ?? node.childForFieldName("target") ?? node.namedChildren[0];
      const identifiers = left?.type === "attribute" || left?.type === "subscript"
        ? []
        : matchingBindingIdentifiers("python", left, bindingNames);
      if (identifiers.length > 0) {
        const comprehension = nearestAncestor(node, PYTHON_COMPREHENSION_TYPES);
        const scope = nearestAncestor(node, PYTHON_LEXICAL_SCOPE_TYPES);
        const outerNames = scope === null ? new Set<string>() : outerNamesForScope(scope);
        const outerIdentifiers = identifiers.filter((identifier) => outerNames.has(identifier.text));
        const localIdentifiers = identifiers.filter((identifier) => !outerNames.has(identifier.text));
        const outermostForClause = comprehension?.namedChildren.find((child) => child.type === "for_in_clause");
        if (node.type === "named_expression") {
          const body = scope?.childForFieldName("body") ?? scope;
          const start = scope?.type === "function_definition" || scope?.type === "lambda"
            ? body?.startIndex ?? scope.startIndex
            : node.startIndex;
          addAll(localIdentifiers, scope === null ? "assignment" : "local_binding", start, body?.endIndex ?? root.endIndex);
          addAll(outerIdentifiers, "assignment", node.startIndex, body?.endIndex ?? root.endIndex);
        } else if (comprehension !== null && node.type === "for_in_clause" && node.startIndex === outermostForClause?.startIndex) {
          const element = comprehension.namedChildren[0];
          const iterable = node.childForFieldName("right") ?? node.namedChildren.at(-1);
          if (element !== undefined) {
            addAll(identifiers, "comprehension_binding", element.startIndex, element.endIndex);
          }
          addAll(identifiers, "comprehension_binding", iterable?.endIndex ?? node.endIndex, comprehension.endIndex);
        } else if (comprehension !== null) {
          addAll(identifiers, "comprehension_binding", comprehension.startIndex, comprehension.endIndex);
        }
        else if (scope !== null) {
          const body = scope.childForFieldName("body") ?? scope;
          const start = scope.type === "function_definition" || scope.type === "lambda" ? body.startIndex : node.startIndex;
          addAll(localIdentifiers, node.type === "for_statement" ? "loop_binding" : "local_binding", start, body.endIndex);
          addAll(outerIdentifiers, "assignment", node.startIndex, body.endIndex);
        } else {
          addAll(identifiers, node.type === "for_statement" ? "loop_binding" : "assignment", node.startIndex, root.endIndex);
        }
      }
    }
    if (node.type === "delete_statement") {
      const scope = nearestAncestor(node, PYTHON_LEXICAL_SCOPE_TYPES);
      if (scope?.type === "function_definition" || scope?.type === "lambda") {
        const body = scope.childForFieldName("body") ?? scope;
        addAll(pythonDeletionIdentifiers(node, bindingNames), "deletion", body.startIndex, body.endIndex);
      }
    }
    if (node.type === "function_definition" || node.type === "class_definition") {
      const identifiers = matchingBindingIdentifiers("python", node.childForFieldName("name"), bindingNames);
      if (identifiers.length > 0) {
        const scope = nearestAncestor(node, PYTHON_DECLARATION_SCOPE_TYPES);
        const body = scope?.childForFieldName("body");
        const start = scope?.type === "function_definition" ? body?.startIndex ?? scope.startIndex : node.startIndex;
        addAll(identifiers, node.type === "class_definition" ? "class_declaration" : "function_declaration", start, body?.endIndex ?? root.endIndex);
      }
    }
    if (node.type === "except_clause") {
      const asPattern = node.namedChildren.find((child) => child.type === "as_pattern");
      const target = asPattern?.namedChildren.find((child) => child.type === "as_pattern_target");
      const scope = nearestAncestor(node, PYTHON_LEXICAL_SCOPE_TYPES);
      const scopeBody = scope?.childForFieldName("body") ?? scope;
      const start = scope?.type === "function_definition" || scope?.type === "lambda"
        ? scopeBody?.startIndex ?? scope.startIndex
        : target?.startIndex ?? node.startIndex;
      addAll(
        matchingBindingIdentifiers("python", target, bindingNames),
        "except_binding",
        start,
        scopeBody?.endIndex ?? root.endIndex,
      );
    }
    if (node.type === "with_item") {
      const asPattern = node.namedChildren.find((child) => child.type === "as_pattern");
      const alias = asPattern?.childForFieldName("alias") ?? asPattern?.namedChildren.find((child) => child.type === "as_pattern_target");
      const identifiers = matchingBindingIdentifiers("python", alias, bindingNames);
      if (identifiers.length > 0) {
        const scope = nearestAncestor(node, PYTHON_LEXICAL_SCOPE_TYPES);
        const body = scope?.childForFieldName("body") ?? scope;
        const start = scope?.type === "function_definition" || scope?.type === "lambda" ? body?.startIndex ?? scope.startIndex : node.startIndex;
        addAll(identifiers, "with_binding", start, body?.endIndex ?? root.endIndex);
      }
    }
    if (node.type === "case_clause") {
      const pattern = node.childForFieldName("pattern") ?? node.namedChildren[0];
      const identifiers = matchingBindingIdentifiers("python", pattern, bindingNames);
      if (identifiers.length > 0) {
        const scope = nearestAncestor(node, PYTHON_LEXICAL_SCOPE_TYPES);
        const body = scope?.childForFieldName("body") ?? scope;
        const start = scope?.type === "function_definition" || scope?.type === "lambda" ? body?.startIndex ?? scope.startIndex : node.startIndex;
        addAll(identifiers, "pattern_binding", start, body?.endIndex ?? root.endIndex);
      }
    }
  });
}

function collectTypeScriptShadowRegions(
  language: "ts" | "tsx" | "js",
  collector: ShadowCollector,
): void {
  const { root, bindingNames, addAll } = collector;
  walk(root, (node) => {
    const functionNode = nearestAncestor(node, TYPESCRIPT_FUNCTION_TYPES);
    const functionBody = functionNode?.childForFieldName("body") ?? functionNode?.namedChildren.at(-1);
    if (TYPESCRIPT_FUNCTION_TYPES.has(node.type)) {
      const body = node.childForFieldName("body") ?? node.namedChildren.at(-1);
      const parameters = node.childForFieldName("parameters") ?? node.childForFieldName("parameter");
      if (body !== undefined) {
        addAll(matchingBindingIdentifiers(language, parameters, bindingNames), "parameter", body.startIndex, body.endIndex);
      }
    }
    if (TYPESCRIPT_LOCAL_TYPES.has(node.type)) {
      const identifiers = matchingBindingIdentifiers(language, node.childForFieldName("pattern") ?? node.childForFieldName("name") ?? node.childForFieldName("left") ?? node.namedChildren[0], bindingNames);
      const enclosingLoop = nearestAncestor(node, TYPESCRIPT_LOOP_TYPES);
      const loopBody = enclosingLoop?.childForFieldName("body");
      const loop = enclosingLoop !== null && (loopBody === null || loopBody === undefined || node.startIndex < loopBody.startIndex) ? enclosingLoop : null;
      let scope = loop ?? nearestAncestor(node, TYPESCRIPT_BLOCK_TYPES) ?? root;
      if (node.type === "variable_declarator") {
        const declaration = nearestAncestor(node, TYPESCRIPT_DECLARATION_TYPES);
        if (declaration?.type === "variable_declaration") scope = functionBody ?? root;
      }
      const declarationPoint = node.type === "assignment_expression" ? node.startIndex : scope.startIndex;
      addAll(identifiers, loop === null ? "local_binding" : "loop_binding", declarationPoint, scope.endIndex);
    }
    if (node.type === "catch_clause") {
      const identifiers = matchingBindingIdentifiers(language, node.childForFieldName("parameter") ?? node.namedChildren[0], bindingNames);
      const body = node.childForFieldName("body") ?? node;
      addAll(identifiers, "catch_binding", body.startIndex, body.endIndex);
    }
    if (TYPESCRIPT_SCOPED_LOOP_TYPES.has(node.type)) {
      const identifiers = matchingBindingIdentifiers(language, node.childForFieldName("left") ?? node.namedChildren[0], bindingNames);
      const body = node.childForFieldName("body") ?? node;
      addAll(identifiers, "loop_binding", body.startIndex, body.endIndex);
    }
    if (node.type === "function_declaration" || node.type === "generator_function_declaration" ||
        node.type === "class_declaration" || node.type === "enum_declaration") {
      const identifiers = matchingBindingIdentifiers(language, node.childForFieldName("name"), bindingNames);
      const scope = nearestAncestor(node, TYPESCRIPT_BLOCK_TYPES) ?? root;
      const kind = node.type === "class_declaration" || node.type === "enum_declaration"
        ? "type_declaration"
        : "function_declaration";
      addAll(identifiers, kind, scope.startIndex, scope.endIndex);
    }
  });
}

function collectRustShadowRegions(collector: ShadowCollector): void {
  const { root, bindingNames, resolvedImportDeclarationStarts, addAll } = collector;
  walk(root, (node) => {
    if (RUST_FUNCTION_TYPES.has(node.type)) {
      const body = node.childForFieldName("body") ?? node.namedChildren.at(-1);
      const parameters = node.childForFieldName("parameters") ??
        node.namedChildren.find((child) => child.type === "parameters" || child.type === "closure_parameters");
      if (body !== undefined) {
        addAll(matchingBindingIdentifiers("rust", parameters, bindingNames), "parameter", body.startIndex, body.endIndex);
      }
    }
    if (node.type === "let_declaration") {
      const identifiers = matchingBindingIdentifiers("rust", node.childForFieldName("pattern") ?? node.namedChildren[0], bindingNames);
      const enclosingLoop = nearestAncestor(node, RUST_LOOP_TYPES);
      const loopBody = enclosingLoop?.childForFieldName("body");
      const loop = enclosingLoop !== null && (loopBody === null || loopBody === undefined || node.startIndex < loopBody.startIndex) ? enclosingLoop : null;
      const scope = loop ?? nearestAncestor(node, RUST_BLOCK_TYPES) ?? root;
      addAll(identifiers, loop === null ? "local_binding" : "loop_binding", node.endIndex, scope.endIndex);
    }
    if (RUST_PATTERN_TYPES.has(node.type)) {
      const identifiers = matchingBindingIdentifiers("rust", node.childForFieldName("pattern") ?? node.namedChildren[0], bindingNames);
      const body = node.childForFieldName("body") ?? node;
      addAll(identifiers, "pattern_binding", body.startIndex, body.endIndex);
    }
    if (node.type === "let_condition") {
      const identifiers = matchingBindingIdentifiers("rust", node.childForFieldName("pattern") ?? node.namedChildren[0], bindingNames);
      const conditional = nearestAncestor(node, RUST_CONDITIONAL_TYPES);
      const body = conditional?.childForFieldName(conditional.type === "if_expression" ? "consequence" : "body");
      if (body !== null && body !== undefined) addAll(identifiers, "pattern_binding", node.endIndex, body.endIndex);
    }
    if (node.type === "use_declaration") {
      if (resolvedImportDeclarationStarts.has(node.startIndex)) return;
      const scope = nearestAncestor(node, RUST_IMPORT_SCOPE_TYPES);
      if (scope !== null) {
        const argument = node.childForFieldName("argument") ?? node.namedChildren[0];
        addAll(matchingRustUseBindingIdentifiers(argument, bindingNames), "import_declaration", scope.startIndex, scope.endIndex);
      }
    }
    if (RUST_DECLARATION_TYPES.has(node.type)) {
      const identifiers = matchingBindingIdentifiers("rust", node.childForFieldName("name"), bindingNames);
      const scope = nearestAncestor(node, RUST_BLOCK_TYPES) ?? root;
      const kind = node.type === "const_item" || node.type === "static_item"
        ? "item_declaration"
        : node.type === "mod_item"
          ? "module_declaration"
          : node.type === "function_item"
            ? "function_declaration"
            : "type_declaration";
      addAll(identifiers, kind, scope.startIndex, scope.endIndex);
    }
  });
}

function collectGoShadowRegions(collector: ShadowCollector): void {
  const { root, bindingNames, addAll } = collector;
  walk(root, (node) => {
    const functionNode = nearestAncestor(node, GO_FUNCTION_TYPES);
    const functionBody = functionNode?.childForFieldName("body") ?? functionNode?.namedChildren.at(-1);
    if ((node.type === "parameter_declaration" || node.type === "variadic_parameter_declaration") && functionBody !== undefined) {
      addAll(matchingBindingIdentifiers("go", node, bindingNames), "parameter", functionBody.startIndex, functionBody.endIndex);
    }
    if (GO_LOCAL_TYPES.has(node.type)) {
      const identifiers = node.type === "var_spec" || node.type === "const_spec"
        ? matchingGoSpecIdentifiers(node, bindingNames)
        : matchingBindingIdentifiers("go", node.childForFieldName("pattern") ?? node.childForFieldName("name") ?? node.childForFieldName("left") ?? node.namedChildren[0], bindingNames);
      const enclosingLoop = nearestAncestor(node, GO_LOOP_TYPES);
      const loopBody = enclosingLoop?.childForFieldName("body");
      const loop = enclosingLoop !== null && (loopBody === null || loopBody === undefined || node.startIndex < loopBody.startIndex) ? enclosingLoop : null;
      const controlStatement = nearestAncestor(node, GO_CONTROL_TYPES);
      const initializer = controlStatement?.childForFieldName("initializer");
      const initializedControl = controlStatement !== null && initializer !== null && initializer !== undefined &&
          node.startIndex >= initializer.startIndex && node.endIndex <= initializer.endIndex
        ? controlStatement
        : null;
      const scope = loop ?? initializedControl ?? nearestAncestor(node, GO_LEXICAL_SCOPE_TYPES) ?? root;
      addAll(identifiers, loop === null ? (node.type === "assignment_statement" ? "assignment" : "local_binding") : "loop_binding", node.endIndex, scope.endIndex);
    }
    if (node.type === "range_clause") {
      const identifiers = matchingBindingIdentifiers("go", node.childForFieldName("left") ?? node.namedChildren[0], bindingNames);
      const loop = nearestAncestor(node, GO_LOOP_TYPES);
      const body = loop?.childForFieldName("body");
      if (loop !== null) addAll(identifiers, "range_binding", body?.startIndex ?? node.endIndex, loop.endIndex);
    }
    if (node.type === "receive_statement" && node.parent?.type === "communication_case") {
      const identifiers = matchingBindingIdentifiers("go", node.childForFieldName("left") ?? node.namedChildren[0], bindingNames);
      addAll(identifiers, "pattern_binding", node.endIndex, node.parent.endIndex);
    }
    if (node.type === "type_switch_statement") {
      const alias = node.namedChildren.find((child) => child.type === "expression_list");
      const firstCase = node.namedChildren.find((child) => child.type === "type_case" || child.type === "default_case");
      if (firstCase !== undefined) {
        addAll(matchingBindingIdentifiers("go", alias, bindingNames), "pattern_binding", firstCase.startIndex, node.endIndex);
      }
    }
    if (GO_DECLARATION_TYPES.has(node.type)) {
      const identifiers = matchingBindingIdentifiers("go", node.childForFieldName("name"), bindingNames);
      const scope = nearestAncestor(node, GO_BLOCK_TYPES) ?? root;
      addAll(identifiers, node.type === "type_spec" ? "type_declaration" : "function_declaration", node.startIndex, scope.endIndex);
    }
  });
}

function collectShadowRegions(
  language: QualifiedReferenceLanguage,
  filePath: string,
  root: TSNode,
  bindings: readonly ResolvedImportBinding[],
  context: QualifiedReferenceContext,
): readonly ShadowRegion[] {
  const collector = createShadowCollector(language, filePath, root, bindings, context);
  if (language === "python") collectPythonShadowRegions(collector);
  else if (language === "rust") collectRustShadowRegions(collector);
  else if (language === "go") collectGoShadowRegions(collector);
  else collectTypeScriptShadowRegions(language, collector);

  const unique = new Map<string, ShadowRegion>();
  for (const region of collector.regions) {
    const key = [
      region.binding,
      region.diagnostic.range.startLine,
      region.diagnostic.range.startColumn,
      region.diagnostic.shadowKind,
      region.startIndex,
      region.endIndex,
    ].join(":");
    unique.set(key, region);
  }
  return [...unique.values()];
}

function accessParts(language: QualifiedReferenceLanguage, node: TSNode): {
  readonly binding: TSNode;
  readonly qualifier: readonly string[];
  readonly member: TSNode;
} | null {
  if (language === "python" && node.type === "attribute") {
    const member = node.childForFieldName("attribute") ?? node.namedChildren[1];
    if (member?.type !== "identifier") return null;
    const qualifier: string[] = [];
    let binding = node.childForFieldName("object") ?? node.namedChildren[0];
    while (binding?.type === "attribute") {
      const attribute = binding.childForFieldName("attribute") ?? binding.namedChildren[1];
      if (attribute?.type !== "identifier") return null;
      qualifier.unshift(attribute.text);
      binding = binding.childForFieldName("object") ?? binding.namedChildren[0];
    }
    return binding?.type === "identifier" ? { binding, qualifier, member } : null;
  }
  if ((language === "ts" || language === "tsx" || language === "js") && node.type === "member_expression") {
    const binding = node.childForFieldName("object"); const member = node.childForFieldName("property");
    return binding?.type === "identifier" && member?.type === "property_identifier" ? { binding, qualifier: [], member } : null;
  }
  if ((language === "ts" || language === "tsx") && node.type === "nested_type_identifier") {
    const binding = node.childForFieldName("module"); const member = node.childForFieldName("name");
    return binding?.type === "identifier" && member?.type === "type_identifier" ? { binding, qualifier: [], member } : null;
  }
  if (language === "rust" && node.type === "scoped_identifier") {
    const binding = node.childForFieldName("path"); const member = node.childForFieldName("name");
    return binding?.type === "identifier" && member?.type === "identifier" ? { binding, qualifier: [], member } : null;
  }
  if (language === "go" && node.type === "selector_expression") {
    const binding = node.childForFieldName("operand"); const member = node.childForFieldName("field");
    return binding?.type === "identifier" && member?.type === "field_identifier" ? { binding, qualifier: [], member } : null;
  }
  return null;
}

export function analyzeQualifiedReferences(
  language: QualifiedReferenceLanguage,
  filePath: string,
  root: TSNode,
  context: QualifiedReferenceContext,
): QualifiedReferenceAnalysis {
  const discoveredBindings = resolveQualifiedImportBindings(language, filePath, root, context);
  const bindings = discoveredBindings.filter((binding) =>
    binding.targetFilePath !== null || context.go?.declarations.has(binding.packageDirectory ?? "") === true,
  );
  const shadows = collectShadowRegions(language, filePath, root, bindings, context);
  const accesses: QualifiedReferenceAccess[] = [];
  const unresolvedAccesses: UnresolvedQualifiedReferenceAccess[] = [];
  const unresolvedGoPackageDirectories = language === "go" && context.go !== undefined
    ? [...context.go.packageNames.entries()]
      .filter(([directory, packageName]) =>
        packageName === null &&
        !discoveredBindings.some((binding) => binding.packageDirectory === directory)
      )
      .map(([directory]) => directory)
    : [];
  walk(root, (node) => {
    const parts = accessParts(language, node);
    if (parts === null) return;
    const bindingCandidates = language === "rust" ? bindings : discoveredBindings;
    const binding = bindingCandidates
      .filter((candidate) =>
        candidate.name === parts.binding.text &&
        (candidate.qualifiedPath ?? []).length === parts.qualifier.length &&
        (candidate.qualifiedPath ?? []).every((segment, index) => segment === parts.qualifier[index]) &&
        node.startIndex >= (candidate.scopeStartIndex ?? root.startIndex) &&
        node.startIndex < (candidate.scopeEndIndex ?? root.endIndex) &&
        importBindingAppliesAtIndex(language, candidate, node.startIndex)
      )
      .sort((left, right) =>
        (right.scopeStartIndex ?? root.startIndex) - (left.scopeStartIndex ?? root.startIndex) ||
        right.importNode.startIndex - left.importNode.startIndex
      )[0];
    if (binding === undefined) {
      if (language === "rust") {
        const unresolvedBinding = discoveredBindings
          .filter((candidate) =>
            candidate.name === parts.binding.text &&
            candidate.unresolvedTargetFilePath !== undefined &&
            node.startIndex >= (candidate.scopeStartIndex ?? root.startIndex) &&
            node.startIndex < (candidate.scopeEndIndex ?? root.endIndex)
          )
          .sort((left, right) =>
            (right.scopeStartIndex ?? root.startIndex) - (left.scopeStartIndex ?? root.startIndex) ||
            right.importNode.startIndex - left.importNode.startIndex
          )[0];
        if (unresolvedBinding?.unresolvedTargetFilePath !== undefined) {
          unresolvedAccesses.push({
            binding: unresolvedBinding.name,
            member: parts.member.text,
            targetFilePath: unresolvedBinding.unresolvedTargetFilePath,
            node,
            shadow: null,
          });
        }
      }
      if (language === "go" && context.go !== undefined) {
        for (const packageDirectory of unresolvedGoPackageDirectories) {
          unresolvedAccesses.push({
            binding: parts.binding.text,
            member: parts.member.text,
            targetDirectoryPath: goTargetDirectoryPath(context.go, packageDirectory, context.pathOps),
            node,
            shadow: null,
          });
        }
      }
      return;
    }
    const shadowRegion = shadows.find((region) =>
      region.binding === binding.name &&
      node.startIndex >= region.startIndex &&
      node.startIndex < region.endIndex &&
      (region.pythonClassScope === undefined || pythonClassNamespaceAppliesAtIndex(region.pythonClassScope, node.startIndex)),
    );
    const target = language === "go"
      ? context.go?.declarations.get(binding.packageDirectory ?? "")?.get(parts.member.text)
      : binding.targetFilePath;
    if (target === null || target === undefined) {
      if (language === "go" && context.go !== undefined) {
        const packageDirectory = binding.packageDirectory ?? "";
        unresolvedAccesses.push({
          binding: binding.name,
          member: parts.member.text,
          targetDirectoryPath: goTargetDirectoryPath(context.go, packageDirectory, context.pathOps),
          node,
          shadow: shadowRegion?.diagnostic ?? null,
        });
      }
      return;
    }
    const shadow = shadowRegion === undefined
      ? null
      : { ...shadowRegion.diagnostic, targetFilePath: target };
    accesses.push({ binding: binding.name, member: parts.member.text, targetFilePath: target, node, shadow });
  });
  const keyForDiagnostic = (diagnostic: ImportBindingDiagnostic): string => [
    diagnostic.binding,
    diagnostic.range.startLine,
    diagnostic.range.startColumn,
    diagnostic.shadowKind,
  ].join(":");
  const diagnosticsByRegion = new Map(
    shadows.map((region) => [keyForDiagnostic(region.diagnostic), region.diagnostic] as const),
  );
  if (language === "go") {
    for (const access of accesses) {
      if (access.shadow !== null) diagnosticsByRegion.set(keyForDiagnostic(access.shadow), access.shadow);
    }
  }
  const diagnostics = [...diagnosticsByRegion.values()];
  return { bindings, accesses, unresolvedAccesses, diagnostics };
}

/** Emit import-level file edges and precision-preserving qualified symbol edges. */
export function resolveQualifiedReferenceEdges(
  patch: PatchBuilderV2,
  language: QualifiedReferenceLanguage,
  filePath: string,
  root: TSNode,
  context: QualifiedReferenceContext,
  emitImportFileEdges: boolean,
): QualifiedReferenceAnalysis {
  const analysis = analyzeQualifiedReferences(language, filePath, root, context);
  if (emitImportFileEdges) {
    const importTargets = language === "go"
      ? analysis.bindings.flatMap((binding) =>
        (context.go?.packageFiles.get(binding.packageDirectory ?? "") ?? []).map((target) => ({ binding, target })),
      )
      : analysis.bindings.map((binding) => ({ binding, target: binding.targetFilePath }));
    const emitted = new Set<string>();
    for (const item of importTargets) {
      const binding = item.binding;
      const target = item.target;
      if (target === null) continue;
      const key = `${binding.name}:${target}`;
      if (emitted.has(key)) continue;
      emitted.add(key);
      const anchor = emitAstAnchor(patch, filePath, binding.importNode);
      patch.setProperty(anchor, "importedName", "*");
      patch.setProperty(anchor, "localName", binding.name);
      patch.setProperty(anchor, "filePath", filePath);
      patch.addEdge(anchor, `file:${target}`, "references");
    }
  }
  for (const access of analysis.accesses) {
    if (access.shadow !== null) continue;
    const anchor = emitAstAnchor(patch, filePath, access.node);
    patch.setProperty(anchor, "importedName", access.member);
    patch.setProperty(anchor, "localName", access.member);
    patch.setProperty(anchor, "filePath", filePath);
    patch.addEdge(anchor, SymIdCodec.encode(access.targetFilePath, access.member), "references");
  }
  return analysis;
}

export function isQualifiedReferenceLanguage(language: SupportedLang): language is QualifiedReferenceLanguage {
  return language === "python" || language === "ts" || language === "tsx" || language === "js" || language === "rust" || language === "go";
}

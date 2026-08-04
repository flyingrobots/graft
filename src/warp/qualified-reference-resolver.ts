// ---------------------------------------------------------------------------
// Qualified reference resolver — shared language-adapter contract
// ---------------------------------------------------------------------------

import { createHash } from "node:crypto";
import type { PatchBuilderV2 } from "@git-stunts/git-warp";
import type { SupportedLang } from "../parser/lang.js";
import type { PathOps } from "../ports/paths.js";
import type { ImportBindingDiagnostic } from "./import-diagnostic.js";
import { SymIdCodec } from "./sym-id-codec.js";
import { isPythonPackageModulePath, pythonChildModuleSource, resolvePythonModulePath } from "./python-import-resolver.js";

type TSNode = import("web-tree-sitter").SyntaxNode;

export type QualifiedReferenceLanguage = "python" | "ts" | "tsx" | "js" | "rust" | "go";

export interface GoReferenceContext {
  readonly modulePath: string;
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

export interface QualifiedReferenceAnalysis {
  readonly bindings: readonly ResolvedImportBinding[];
  readonly accesses: readonly QualifiedReferenceAccess[];
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
}

function astNodeId(filePath: string, node: TSNode): string {
  const hash = createHash("sha1")
    .update(`${filePath}:${node.type}:${String(node.startIndex)}:${String(node.endIndex)}`)
    .digest("hex")
    .slice(0, 12);
  return `ast:${filePath}:${hash}`;
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
    `${raw}/index.ts`, `${raw}/index.tsx`, `${raw}/index.js`, `${raw}/index.jsx`,
    `${raw}/index.mts`, `${raw}/index.cts`,
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
    const lexicalScope = nearestAncestor(statement, new Set(["function_definition", "lambda", "class_definition"]));
    const scopeBody = lexicalScope?.childForFieldName("body") ?? lexicalScope;
    const scopeStartIndex = lexicalScope?.type === "function_definition" || lexicalScope?.type === "lambda"
      ? scopeBody?.startIndex ?? statement.endIndex
      : statement.endIndex;
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
    if (knownFiles.has(manifest)) return directory === "" ? "src" : `${directory}/src`;
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

function resolveRustModule(
  source: string,
  filePath: string,
  context: QualifiedReferenceContext,
): string | null {
  const sourceRoot = rustSourceRoot(filePath, context.knownFiles);
  const moduleDirectory = rustLogicalModuleDirectory(filePath);
  const segments = source.split("::");
  const prefix = segments.shift();
  let base: string;
  if (prefix === "crate") base = sourceRoot;
  else if (prefix === "self") base = moduleDirectory;
  else if (prefix === "super") {
    base = parentDirectory(moduleDirectory);
    while (segments[0] === "super") { segments.shift(); base = parentDirectory(base); }
  } else return null;
  const raw = context.pathOps.normalize(context.pathOps.join(base, ...segments));
  return [`${raw}.rs`, `${raw}/mod.rs`].find((candidate) => context.knownFiles.has(candidate)) ?? null;
}

function rustBindings(
  root: TSNode,
  filePath: string,
  context: QualifiedReferenceContext,
): readonly ResolvedImportBinding[] {
  const bindings: ResolvedImportBinding[] = [];
  for (const statement of root.namedChildren) {
    if (statement.type !== "use_declaration") continue;
    const argument = statement.childForFieldName("argument") ?? statement.namedChildren[0];
    if (argument === undefined) continue;
    if (argument.type === "use_as_clause") {
      const imported = argument.childForFieldName("path") ?? argument.namedChildren[0];
      const alias = argument.childForFieldName("alias") ?? argument.namedChildren.at(-1);
      if (imported !== undefined && alias !== undefined) bindings.push({ name: alias.text, targetFilePath: resolveRustModule(imported.text, filePath, context), importNode: argument });
      continue;
    }
    if (argument.type === "scoped_identifier") {
      const name = argument.childForFieldName("name") ?? argument.namedChildren.at(-1);
      if (name !== undefined) bindings.push({ name: name.text, targetFilePath: resolveRustModule(argument.text, filePath, context), importNode: argument });
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
    const explicit = node.childForFieldName("name") ?? node.namedChildren.find((child) => child.type === "package_identifier");
    const name = explicit?.text ?? go.packageNames.get(directory);
    if (name === undefined || name === null || name === "_" || name === ".") return;
    bindings.push({ name, targetFilePath: null, packageDirectory: directory, importNode: node });
  });
  return bindings;
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
      const imported = argument?.type === "use_as_clause"
        ? argument.childForFieldName("path") ?? argument.namedChildren[0]
        : argument;
      if (imported?.type !== "scoped_identifier") return;
      if (resolveRustModule(imported.text, filePath, context) !== null) return;
      const segments = imported.text.split("::");
      const importedName = segments.pop();
      if (importedName === undefined || segments.length === 0) return;
      const targetFilePath = resolveRustModule(segments.join("::"), filePath, context);
      if (targetFilePath !== null) references.push({ importedName, targetFilePath });
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
        .filter((child) => type === null || child.startIndex !== type.startIndex)
        .flatMap((child) => matchingBindingIdentifiers(language, child, bindings));
    }
    if (node.type === "field_pattern") {
      return matchingBindingIdentifiers(language, node.childForFieldName("pattern") ?? node.childForFieldName("name") ?? node.namedChildren.at(-1), bindings);
    }
    if (["match_pattern", "tuple_pattern", "slice_pattern", "reference_pattern", "mut_pattern", "or_pattern"].includes(node.type)) {
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

function collectShadowRegions(
  language: QualifiedReferenceLanguage,
  filePath: string,
  root: TSNode,
  bindings: readonly ResolvedImportBinding[],
  context: QualifiedReferenceContext,
): readonly ShadowRegion[] {
  const bindingNames = new Set(bindings.map((binding) => binding.name));
  const targetByBinding = new Map(bindings.map((binding) => {
    const packageFiles = context.go?.declarations.get(binding.packageDirectory ?? "");
    const goTarget = packageFiles === undefined ? undefined : [...packageFiles.values()].find((value): value is string => value !== null);
    return [binding.name, binding.targetFilePath ?? goTarget ?? ""] as const;
  }));
  const regions: ShadowRegion[] = [];
  const add = (identifier: TSNode | null, kind: string, start: number, end: number): void => {
    if (identifier === null) return;
    const target = targetByBinding.get(identifier.text);
    if (target === undefined) return;
    const diagnostic = diagnosticFor(language, filePath, identifier.text, target, kind, identifier);
    regions.push({ binding: identifier.text, startIndex: start, endIndex: end, diagnostic });
  };
  const addAll = (identifiers: readonly TSNode[], kind: string, start: number, end: number): void => {
    for (const identifier of identifiers) add(identifier, kind, start, end);
  };

  walk(root, (node) => {
    if (language === "python") {
      if (node.type === "function_definition" || node.type === "lambda") {
        const parameters = node.childForFieldName("parameters");
        const body = node.childForFieldName("body") ?? node.namedChildren.at(-1);
        if (body !== undefined) {
          addAll(matchingBindingIdentifiers(language, parameters, bindingNames), "parameter", body.startIndex, body.endIndex);
        }
      }
      if (["assignment", "augmented_assignment", "named_expression", "for_statement", "for_in_clause"].includes(node.type)) {
        const left = node.childForFieldName("left") ?? node.childForFieldName("target") ?? node.namedChildren[0];
        const identifiers = left?.type === "attribute" || left?.type === "subscript"
          ? []
          : matchingBindingIdentifiers(language, left, bindingNames);
        if (identifiers.length > 0) {
          const comprehension = nearestAncestor(node, new Set(["list_comprehension", "set_comprehension", "dictionary_comprehension", "generator_expression"]));
          const scope = nearestAncestor(node, new Set(["function_definition", "lambda", "class_definition"]));
          if (comprehension !== null) addAll(identifiers, "comprehension_binding", comprehension.startIndex, comprehension.endIndex);
          else if (scope !== null) {
            const body = scope.childForFieldName("body") ?? scope;
            const start = scope.type === "function_definition" || scope.type === "lambda"
              ? body.startIndex
              : node.startIndex;
            addAll(identifiers, node.type === "for_statement" ? "loop_binding" : "local_binding", start, body.endIndex);
          }
          else addAll(identifiers, node.type === "for_statement" ? "loop_binding" : "assignment", node.startIndex, root.endIndex);
        }
      }
      if (node.type === "function_definition" || node.type === "class_definition") {
        const identifiers = matchingBindingIdentifiers(language, node.childForFieldName("name"), bindingNames);
        if (identifiers.length > 0) {
          const scope = nearestAncestor(node, new Set(["function_definition", "class_definition"]));
          const body = scope?.childForFieldName("body");
          const start = scope?.type === "function_definition" ? body?.startIndex ?? scope.startIndex : node.startIndex;
          const end = body?.endIndex ?? root.endIndex;
          addAll(identifiers, node.type === "class_definition" ? "class_declaration" : "function_declaration", start, end);
        }
      }
      if (node.type === "except_clause") {
        const asPattern = node.namedChildren.find((child) => child.type === "as_pattern");
        const target = asPattern?.namedChildren.find((child) => child.type === "as_pattern_target");
        const body = node.namedChildren.find((child) => child.type === "block");
        if (body !== undefined) {
          addAll(matchingBindingIdentifiers(language, target, bindingNames), "except_binding", body.startIndex, body.endIndex);
        }
      }
      if (node.type === "with_item") {
        const asPattern = node.namedChildren.find((child) => child.type === "as_pattern");
        const alias = asPattern?.childForFieldName("alias") ??
          asPattern?.namedChildren.find((child) => child.type === "as_pattern_target");
        const identifiers = matchingBindingIdentifiers(language, alias, bindingNames);
        if (identifiers.length > 0) {
          const scope = nearestAncestor(node, new Set(["function_definition", "lambda", "class_definition"]));
          const body = scope?.childForFieldName("body") ?? scope;
          const start = scope?.type === "function_definition" || scope?.type === "lambda"
            ? body?.startIndex ?? scope.startIndex
            : node.startIndex;
          addAll(identifiers, "with_binding", start, body?.endIndex ?? root.endIndex);
        }
      }
      if (node.type === "case_clause") {
        const pattern = node.childForFieldName("pattern") ?? node.namedChildren[0];
        const identifiers = matchingBindingIdentifiers(language, pattern, bindingNames);
        if (identifiers.length > 0) {
          const scope = nearestAncestor(node, new Set(["function_definition", "lambda", "class_definition"]));
          const body = scope?.childForFieldName("body") ?? scope;
          const start = scope?.type === "function_definition" || scope?.type === "lambda"
            ? body?.startIndex ?? scope.startIndex
            : node.startIndex;
          addAll(identifiers, "pattern_binding", start, body?.endIndex ?? root.endIndex);
        }
      }
      return;
    }

    const functionTypes = language === "rust"
      ? new Set(["function_item", "closure_expression"])
      : language === "go"
        ? new Set(["function_declaration", "method_declaration", "func_literal"])
        : new Set(["function_declaration", "function_expression", "arrow_function", "method_definition"]);
    const blockTypes = language === "rust" || language === "go"
      ? new Set(["block"])
      : new Set(["statement_block", "program"]);
    const functionNode = nearestAncestor(node, functionTypes);
    const functionBody = functionNode?.childForFieldName("body") ?? functionNode?.namedChildren.at(-1);

    const parameterTypes = language === "rust"
      ? ["parameter"]
      : language === "go"
        ? ["parameter_declaration", "variadic_parameter_declaration"]
        : ["required_parameter", "optional_parameter", "rest_pattern"];
    const plainJavaScriptParameter = language === "js" && node.type === "identifier" && (
      node.parent?.type === "formal_parameters" ||
      (node.parent?.type === "arrow_function" && node.parent.childForFieldName("parameter")?.startIndex === node.startIndex)
    );
    if ((parameterTypes.includes(node.type) || plainJavaScriptParameter) && functionBody !== undefined) {
      addAll(matchingBindingIdentifiers(language, node, bindingNames), "parameter", functionBody.startIndex, functionBody.endIndex);
    }

    const localTypes = language === "rust"
      ? ["let_declaration"]
      : language === "go"
        ? ["short_var_declaration", "var_spec", "assignment_statement"]
        : ["variable_declarator", "assignment_expression"];
    if (localTypes.includes(node.type)) {
      const identifiers = matchingBindingIdentifiers(language, node.childForFieldName("pattern") ?? node.childForFieldName("name") ?? node.childForFieldName("left") ?? node.namedChildren[0], bindingNames);
      const enclosingLoop = nearestAncestor(node, new Set(language === "go" ? ["for_statement"] : language === "rust" ? ["for_expression"] : ["for_statement", "for_in_statement"]));
      const loopBody = enclosingLoop?.childForFieldName("body");
      const loop = enclosingLoop !== null && (loopBody === null || loopBody === undefined || node.startIndex < loopBody.startIndex)
        ? enclosingLoop
        : null;
      const controlStatement = language === "go"
        ? nearestAncestor(node, new Set(["if_statement", "expression_switch_statement", "type_switch_statement"]))
        : null;
      const initializer = controlStatement?.childForFieldName("initializer");
      const initializedControl = controlStatement !== null && initializer !== null && initializer !== undefined &&
          node.startIndex >= initializer.startIndex && node.endIndex <= initializer.endIndex
        ? controlStatement
        : null;
      let scope = loop ?? initializedControl ?? nearestAncestor(node, blockTypes) ?? root;
      if ((language === "ts" || language === "tsx" || language === "js") && node.type === "variable_declarator") {
        const declaration = nearestAncestor(node, new Set(["lexical_declaration", "variable_declaration"]));
        if (declaration?.type === "variable_declaration") scope = functionBody ?? root;
      }
      const declarationPoint = language === "rust" || language === "go"
        ? node.endIndex
        : node.type === "assignment_expression"
          ? node.startIndex
          : scope.startIndex;
      addAll(identifiers, loop === null ? (node.type === "assignment_statement" ? "assignment" : "local_binding") : "loop_binding", declarationPoint, scope.endIndex);
    }

    if (language === "rust" && ["for_expression", "match_arm"].includes(node.type)) {
      const identifiers = matchingBindingIdentifiers(language, node.childForFieldName("pattern") ?? node.namedChildren[0], bindingNames);
      const body = node.childForFieldName("body") ?? node;
      addAll(identifiers, "pattern_binding", body.startIndex, body.endIndex);
    }
    if (language === "rust" && node.type === "let_condition") {
      const pattern = node.childForFieldName("pattern") ?? node.namedChildren[0];
      const identifiers = matchingBindingIdentifiers(language, pattern, bindingNames);
      const conditional = nearestAncestor(node, new Set(["if_expression", "while_expression"]));
      const body = conditional?.childForFieldName(conditional.type === "if_expression" ? "consequence" : "body");
      if (body !== null && body !== undefined) {
        addAll(identifiers, "pattern_binding", node.endIndex, body.endIndex);
      }
    }
    if (language === "rust" && node.type === "use_declaration") {
      const scope = nearestAncestor(node, new Set(["block"]));
      if (scope !== null) {
        const argument = node.childForFieldName("argument") ?? node.namedChildren[0];
        const identifiers = matchingRustUseBindingIdentifiers(argument, bindingNames);
        addAll(identifiers, "import_declaration", scope.startIndex, scope.endIndex);
      }
    }
    if (language === "go" && node.type === "range_clause") {
      const identifiers = matchingBindingIdentifiers(language, node.childForFieldName("left") ?? node.namedChildren[0], bindingNames);
      const loop = nearestAncestor(node, new Set(["for_statement"]));
      const body = loop?.childForFieldName("body");
      if (loop !== null) addAll(identifiers, "range_binding", body?.startIndex ?? node.endIndex, loop.endIndex);
    }
    if ((language === "ts" || language === "tsx" || language === "js") && node.type === "catch_clause") {
      const identifiers = matchingBindingIdentifiers(language, node.childForFieldName("parameter") ?? node.namedChildren[0], bindingNames);
      const body = node.childForFieldName("body") ?? node;
      addAll(identifiers, "catch_binding", body.startIndex, body.endIndex);
    }
    if ((language === "ts" || language === "tsx" || language === "js") && ["for_in_statement", "for_of_statement"].includes(node.type)) {
      const identifiers = matchingBindingIdentifiers(language, node.childForFieldName("left") ?? node.namedChildren[0], bindingNames);
      const body = node.childForFieldName("body") ?? node;
      addAll(identifiers, "loop_binding", body.startIndex, body.endIndex);
    }

    const declarationTypes = language === "rust"
      ? ["function_item", "struct_item", "enum_item", "type_item", "const_item", "static_item", "union_item", "trait_item", "mod_item"]
      : language === "go"
        ? ["function_declaration", "type_spec"]
        : ["function_declaration", "class_declaration"];
    if (declarationTypes.includes(node.type)) {
      const identifiers = matchingBindingIdentifiers(language, node.childForFieldName("name"), bindingNames);
      const scope = nearestAncestor(node, blockTypes) ?? root;
      const declarationPoint = language === "rust" ? scope.startIndex : node.startIndex;
      const kind = language === "rust"
        ? node.type === "const_item" || node.type === "static_item"
          ? "item_declaration"
          : node.type === "mod_item"
            ? "module_declaration"
            : node.type === "function_item"
              ? "function_declaration"
              : "type_declaration"
        : node.type.includes("class") || node.type.includes("struct") || node.type.includes("type")
          ? "type_declaration"
          : "function_declaration";
      addAll(identifiers, kind, declarationPoint, scope.endIndex);
    }
  });

  const unique = new Map<string, ShadowRegion>();
  for (const region of regions) {
    const key = `${region.binding}:${String(region.diagnostic.range.startLine)}:${String(region.diagnostic.range.startColumn)}:${region.diagnostic.shadowKind}`;
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
  walk(root, (node) => {
    const parts = accessParts(language, node);
    if (parts === null) return;
    const binding = discoveredBindings
      .filter((candidate) =>
        candidate.name === parts.binding.text &&
        (candidate.qualifiedPath ?? []).length === parts.qualifier.length &&
        (candidate.qualifiedPath ?? []).every((segment, index) => segment === parts.qualifier[index]) &&
        node.startIndex >= (candidate.scopeStartIndex ?? root.startIndex) &&
        node.startIndex < (candidate.scopeEndIndex ?? root.endIndex)
      )
      .sort((left, right) =>
        (right.scopeStartIndex ?? root.startIndex) - (left.scopeStartIndex ?? root.startIndex)
      )[0];
    if (binding === undefined) return;
    const target = language === "go"
      ? context.go?.declarations.get(binding.packageDirectory ?? "")?.get(parts.member.text)
      : binding.targetFilePath;
    if (target === null || target === undefined) return;
    const shadowRegion = shadows.find((region) =>
      region.binding === binding.name && node.startIndex >= region.startIndex && node.startIndex < region.endIndex,
    );
    const shadow = shadowRegion === undefined
      ? null
      : { ...shadowRegion.diagnostic, targetFilePath: target };
    accesses.push({ binding: binding.name, member: parts.member.text, targetFilePath: target, node, shadow });
  });
  const diagnostics = language === "go"
    ? [...new Map(accesses.flatMap((access) => access.shadow === null ? [] : [[
      `${access.shadow.binding}:${String(access.shadow.range.startLine)}:${String(access.shadow.range.startColumn)}:${access.shadow.targetFilePath}`,
      access.shadow,
    ] as const])).values()]
    : shadows.map((region) => region.diagnostic);
  return { bindings, accesses, diagnostics };
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

import { isPythonPackageModulePath, pythonChildModuleSource, resolvePythonModulePath } from "./python-import-resolver.js";
import type { PathOps } from "../ports/paths.js";
import type {
  DirectSymbolImportReference,
  GoReferenceContext,
  QualifiedReferenceContext,
  QualifiedReferenceLanguage,
  ResolvedImportBinding,
  TSNode,
} from "./qualified-reference-contract.js";

function walk(node: TSNode, visit: (candidate: TSNode) => void): void {
  visit(node);
  for (const child of node.namedChildren) walk(child, visit);
}

function nearestAncestor(node: TSNode, types: ReadonlySet<string>): TSNode | null {
  let cursor = node.parent;
  while (cursor !== null) {
    if (types.has(cursor.type)) return cursor;
    cursor = cursor.parent;
  }
  return null;
}

const RUST_IMPORT_SCOPE_TYPES = new Set(["block", "declaration_list"]);
const PYTHON_LEXICAL_SCOPE_TYPES = new Set(["function_definition", "lambda", "class_definition"]);

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
  language: "ts" | "tsx" | "js",
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
  const sourceExtensions = language === "js"
    ? [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"]
    : [".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"];
  const candidates = [
    raw,
    ...compiledSpecifierSourceCandidates(raw),
    ...sourceExtensions.map((extension) => `${raw}${extension}`),
    `${raw}.d.ts`, `${raw}.d.mts`, `${raw}.d.cts`,
    ...sourceExtensions.map((extension) => `${raw}/index${extension}`),
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

interface PythonImportScope {
  readonly scopeStartIndex: number;
  readonly scopeEndIndex: number;
}

interface PythonModuleImportClause extends PythonImportScope {
  readonly kind: "module";
  readonly specifier: TSNode;
  readonly moduleNode: TSNode;
  readonly alias: TSNode | undefined;
}

interface PythonFromImportClause extends PythonImportScope {
  readonly kind: "from";
  readonly specifier: TSNode;
  readonly packagePath: string | null;
  readonly imported: TSNode;
  readonly alias: TSNode | undefined;
  readonly childPath: string | null;
}

interface PythonWildcardImportClause extends PythonImportScope {
  readonly kind: "wildcard";
  readonly specifier: TSNode;
  readonly packagePath: string | null;
}

type PythonImportClause = PythonModuleImportClause | PythonFromImportClause | PythonWildcardImportClause;

function* pythonImportClauses(
  root: TSNode,
  filePath: string,
  context: QualifiedReferenceContext,
): Generator<PythonImportClause> {
  const statements: TSNode[] = [];
  walk(root, (node) => {
    if (node.type === "import_statement" || node.type === "import_from_statement") {
      statements.push(node);
    }
  });
  for (const statement of statements) {
    const lexicalScope = nearestAncestor(statement, PYTHON_LEXICAL_SCOPE_TYPES);
    const scopeBody = lexicalScope?.childForFieldName("body") ?? lexicalScope;
    const scope = {
      scopeStartIndex: statement.endIndex,
      scopeEndIndex: scopeBody?.endIndex ?? root.endIndex,
    };
    if (statement.type === "import_statement") {
      for (const specifier of statement.namedChildren) {
        const moduleNode = specifier.type === "aliased_import"
          ? specifier.childForFieldName("name") ?? specifier.namedChildren.find((child) => child.type === "dotted_name")
          : specifier;
        if (moduleNode?.type !== "dotted_name") continue;
        const alias = specifier.type === "aliased_import"
          ? specifier.childForFieldName("alias") ?? specifier.namedChildren.find((child) => child.type === "identifier")
          : undefined;
        yield { kind: "module", specifier, moduleNode, alias, ...scope };
      }
      continue;
    }
    const packageNode = statement.childForFieldName("module_name") ??
      statement.namedChildren.find((child) => child.type === "dotted_name" || child.type === "relative_import");
    if (packageNode === undefined) continue;
    const packagePath = resolvePythonModulePath(packageNode.text, filePath, context.pathOps, context.knownFiles);
    for (const specifier of statement.namedChildren.slice(statement.namedChildren.indexOf(packageNode) + 1)) {
      if (specifier.type === "wildcard_import") {
        yield { kind: "wildcard", specifier, packagePath, ...scope };
        continue;
      }
      const imported = specifier.type === "aliased_import"
        ? specifier.childForFieldName("name") ?? specifier.namedChildren.find((child) => child.type === "dotted_name")
        : specifier;
      if (imported?.type !== "dotted_name") continue;
      const alias = specifier.type === "aliased_import"
        ? specifier.childForFieldName("alias") ?? specifier.namedChildren.find((child) => child.type === "identifier")
        : undefined;
      const childPath = packagePath === null || isPythonPackageModulePath(packagePath)
        ? resolvePythonModulePath(
          pythonChildModuleSource(packageNode.text, imported.text),
          filePath,
          context.pathOps,
          context.knownFiles,
        )
        : null;
      yield { kind: "from", specifier, packagePath, imported, alias, childPath, ...scope };
    }
  }
}

function pythonBindings(
  root: TSNode,
  filePath: string,
  context: QualifiedReferenceContext,
): readonly ResolvedImportBinding[] {
  const bindings: ResolvedImportBinding[] = [];
  for (const clause of pythonImportClauses(root, filePath, context)) {
    if (clause.kind === "module") {
      const moduleParts = clause.moduleNode.text.split(".");
      const bindingName = clause.alias?.text ?? moduleParts[0];
      if (bindingName === undefined) continue;
      bindings.push({
        name: bindingName,
        targetFilePath: resolvePythonModulePath(clause.moduleNode.text, filePath, context.pathOps, context.knownFiles),
        ...(clause.alias === undefined && moduleParts.length > 1 ? { qualifiedPath: moduleParts.slice(1) } : {}),
        scopeStartIndex: clause.scopeStartIndex,
        scopeEndIndex: clause.scopeEndIndex,
        importNode: clause.specifier,
      });
      continue;
    }
    if (clause.kind === "wildcard") continue;
    bindings.push({
      name: clause.alias?.text ?? clause.imported.text,
      targetFilePath: clause.childPath,
      scopeStartIndex: clause.scopeStartIndex,
      scopeEndIndex: clause.scopeEndIndex,
      importNode: clause.specifier,
    });
  }
  return bindings;
}

function typescriptBindings(
  language: "ts" | "tsx" | "js",
  root: TSNode,
  filePath: string,
  context: QualifiedReferenceContext,
): readonly ResolvedImportBinding[] {
  const bindings: ResolvedImportBinding[] = [];
  for (const statement of root.namedChildren) {
    if (statement.type !== "import_statement") continue;
    const importRequire = statement.namedChildren.find((child) => child.type === "import_require_clause");
    const sourceNode = statement.childForFieldName("source") ??
      importRequire?.childForFieldName("source") ??
      statement.namedChildren.find((child) => child.type === "string");
    const source = sourceNode === undefined ? null : stringValue(sourceNode);
    if (source === null) continue;
    const importRequireAlias = importRequire?.namedChildren.find((child) => child.type === "identifier");
    if (importRequire !== undefined && importRequireAlias !== undefined) {
      bindings.push({
        name: importRequireAlias.text,
        targetFilePath: resolveRelativeModule(language, source, filePath, context),
        importNode: importRequire,
      });
      continue;
    }
    const namespace = statement.namedChildren
      .find((child) => child.type === "import_clause")
      ?.namedChildren.find((child) => child.type === "namespace_import");
    const alias = namespace?.namedChildren.find((child) => child.type === "identifier");
    if (namespace !== undefined && alias !== undefined) {
      bindings.push({
        name: alias.text,
        targetFilePath: resolveRelativeModule(language, source, filePath, context),
        importNode: namespace,
      });
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

function rustCrateRootFiles(
  filePath: string,
  sourceRoot: string,
  knownFiles: ReadonlySet<string>,
): readonly string[] {
  const directory = parentDirectory(filePath);
  const fileName = filePath.slice(directory === "" ? 0 : directory.length + 1);
  const isPackageSourceRoot = sourceRoot === "src" || sourceRoot.endsWith("/src");
  if (directory === sourceRoot && fileName !== "lib.rs" && fileName !== "main.rs" && !isPackageSourceRoot) {
    return [filePath];
  }
  return [`${sourceRoot}/lib.rs`, `${sourceRoot}/main.rs`]
    .filter((candidate) => knownFiles.has(candidate));
}

function unresolvedRustModuleOwners(
  source: string,
  filePath: string,
  context: QualifiedReferenceContext,
  importNode?: TSNode,
): readonly string[] {
  const sourceRoot = rustSourceRoot(filePath, context.knownFiles);
  let candidate = rustModuleCandidatePath(source, filePath, context, importNode);
  if (candidate === null) return [];
  while (candidate !== "") {
    const owner = [`${candidate}.rs`, `${candidate}/mod.rs`]
      .find((file) => context.knownFiles.has(file));
    if (owner !== undefined) return [owner];
    if (candidate === sourceRoot) {
      return rustCrateRootFiles(filePath, sourceRoot, context.knownFiles);
    }
    candidate = parentDirectory(candidate);
  }
  return [];
}

export function resolveRustQualifiedModule(
  source: string,
  filePath: string,
  context: QualifiedReferenceContext,
  sourceNode?: TSNode,
): {
  readonly targetFilePath: string | null;
  readonly unresolvedTargetFilePaths: readonly string[];
} {
  const targetFilePath = resolveRustModule(source, filePath, context, sourceNode);
  return {
    targetFilePath,
    unresolvedTargetFilePaths: targetFilePath === null
      ? unresolvedRustModuleOwners(source, filePath, context, sourceNode)
      : [],
  };
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
      const resolution = resolveRustQualifiedModule(candidate.source, filePath, context, candidate.importNode);
      bindings.push({
        name: candidate.name,
        targetFilePath: resolution.targetFilePath,
        ...(resolution.targetFilePath === null
          ? { unresolvedTargetFilePaths: resolution.unresolvedTargetFilePaths }
          : {}),
        scopeStartIndex,
        scopeEndIndex,
        importNode: candidate.importNode,
      });
    }
  }
  walk(root, (node) => {
    if (node.type !== "mod_item" || node.childForFieldName("body") !== null) return;
    const name = node.childForFieldName("name") ?? node.namedChildren.find((child) => child.type === "identifier");
    if (name === undefined) return;
    const targetFilePath = resolveRustModule(`self::${name.text}`, filePath, context, node);
    if (targetFilePath === null) return;
    const scope = nearestAncestor(node, RUST_IMPORT_SCOPE_TYPES);
    bindings.push({
      name: name.text,
      targetFilePath,
      scopeStartIndex: scope?.startIndex ?? root.startIndex,
      scopeEndIndex: scope?.endIndex ?? root.endIndex,
      importNode: node,
    });
  });
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

export function goTargetDirectoryPath(
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
  return typescriptBindings(language, root, filePath, context);
}

export function analyzeDirectSymbolImportReferences(
  language: QualifiedReferenceLanguage,
  filePath: string,
  root: TSNode,
  context: QualifiedReferenceContext,
): readonly DirectSymbolImportReference[] {
  const references: DirectSymbolImportReference[] = [];
  if (language === "python") {
    for (const clause of pythonImportClauses(root, filePath, context)) {
      if (clause.kind === "from" && clause.packagePath !== null && clause.childPath === null) {
        references.push({ importedName: clause.imported.text, targetFilePath: clause.packagePath });
      }
    }
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

export function analyzeUnsupportedWildcardImportTargets(
  language: QualifiedReferenceLanguage,
  filePath: string,
  root: TSNode,
  context: QualifiedReferenceContext,
): readonly string[] {
  if (language !== "python") return [];
  const targets = new Set<string>();
  for (const clause of pythonImportClauses(root, filePath, context)) {
    if (clause.kind === "wildcard" && clause.packagePath !== null) targets.add(clause.packagePath);
  }
  return [...targets];
}

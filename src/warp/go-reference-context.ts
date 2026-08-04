import { parseStructuredTreeAsync } from "../parser/runtime.js";
import type { GoReferenceContext } from "./qualified-reference-resolver.js";

type TSNode = import("web-tree-sitter").SyntaxNode;

export type RefFileReader = (filePath: string) => Promise<string | null>;

function nearestGoMod(filePath: string, knownFiles: ReadonlySet<string>): string | null {
  const parts = filePath.split("/");
  for (let length = parts.length - 1; length >= 0; length--) {
    const directory = parts.slice(0, length).join("/");
    const candidate = directory === "" ? "go.mod" : `${directory}/go.mod`;
    if (knownFiles.has(candidate)) return candidate;
  }
  return null;
}

function moduleCoordinate(content: string): string | null {
  for (const line of content.split("\n")) {
    const match = /^\s*module\s+(\S+)\s*(?:\/\/.*)?$/u.exec(line);
    const token = match?.[1];
    if (token === undefined) continue;
    const quote = token[0];
    if (quote !== '"' && quote !== "`") return token;
    if (token.length < 2 || token.at(-1) !== quote) return null;
    return token.slice(1, -1);
  }
  return null;
}

function declarationNames(root: TSNode): readonly string[] {
  const names: string[] = [];
  for (const declaration of root.namedChildren) {
    if (declaration.type === "function_declaration") {
      const name = declaration.childForFieldName("name");
      if (name !== null) names.push(name.text);
      continue;
    }
    if (!["type_declaration", "var_declaration", "const_declaration"].includes(declaration.type)) continue;
    for (const spec of declaration.namedChildren) {
      if (spec.type === "var_spec" || spec.type === "const_spec") {
        for (const child of spec.namedChildren) {
          if (child.type !== "identifier") break;
          names.push(child.text);
        }
        continue;
      }
      const name = spec.childForFieldName("name");
      if (name !== null) names.push(name.text);
    }
  }
  return names.filter((name) => /^\p{Lu}/u.test(name));
}

function packageName(root: TSNode): string | null {
  const clause = root.namedChildren.find((node) => node.type === "package_clause");
  return clause?.namedChildren.find((node) => node.type === "package_identifier")?.text ?? null;
}

function importPaths(root: TSNode): readonly string[] {
  const paths: string[] = [];
  const visit = (node: TSNode): void => {
    if (node.type === "import_spec") {
      const path = node.childForFieldName("path") ??
        node.namedChildren.find((child) => child.type.endsWith("string_literal"));
      if (path !== undefined && path.text.length >= 2) paths.push(path.text.slice(1, -1));
      return;
    }
    for (const child of node.namedChildren) visit(child);
  };
  visit(root);
  return paths;
}

interface ParsedGoFileFacts {
  readonly packageName: string | null;
  readonly declarations: readonly string[];
  readonly imports: readonly string[];
}

interface GoModuleFacts {
  readonly manifestPath: string;
  readonly modulePath: string;
  readonly moduleDirectory: string;
  readonly filePrefix: string;
}

interface GoPackageFacts {
  readonly packageName: string | null;
  readonly files: readonly string[];
  readonly declarations: ReadonlyMap<string, string | null>;
}

export type GoReferenceContextResolver = (
  importingFilePath: string,
) => Promise<GoReferenceContext | undefined>;

/** Build a resolver that shares parsed manifests and package declarations. */
export function createGoReferenceContextResolver(
  knownFiles: ReadonlySet<string>,
  readFile: RefFileReader,
): GoReferenceContextResolver {
  const parsedFiles = new Map<string, Promise<ParsedGoFileFacts | undefined>>();
  const modules = new Map<string, Promise<GoModuleFacts | undefined>>();
  const packages = new Map<string, Promise<GoPackageFacts>>();

  const parseFile = (filePath: string): Promise<ParsedGoFileFacts | undefined> => {
    const existing = parsedFiles.get(filePath);
    if (existing !== undefined) return existing;
    const pending = readFile(filePath).then(async (content) => {
      if (content === null) return undefined;
      const parsed = await parseStructuredTreeAsync("go", content);
      try {
        return {
          packageName: packageName(parsed.root),
          declarations: declarationNames(parsed.root),
          imports: importPaths(parsed.root),
        };
      } finally {
        parsed.delete();
      }
    });
    parsedFiles.set(filePath, pending);
    return pending;
  };

  const moduleFor = (manifestPath: string): Promise<GoModuleFacts | undefined> => {
    const existing = modules.get(manifestPath);
    if (existing !== undefined) return existing;
    const pending = readFile(manifestPath).then((manifest) => {
      if (manifest === null) return undefined;
      const modulePath = moduleCoordinate(manifest);
      if (modulePath === null) return undefined;
      const moduleDirectory = manifestPath === "go.mod" ? "" : manifestPath.slice(0, -"/go.mod".length);
      return {
        manifestPath,
        modulePath,
        moduleDirectory,
        filePrefix: moduleDirectory === "" ? "" : `${moduleDirectory}/`,
      };
    });
    modules.set(manifestPath, pending);
    return pending;
  };

  const packageFor = (module: GoModuleFacts, directory: string): Promise<GoPackageFacts> => {
    const cacheKey = `${module.manifestPath}\0${directory}`;
    const existing = packages.get(cacheKey);
    if (existing !== undefined) return existing;
    const pending = (async (): Promise<GoPackageFacts> => {
      const files = [...knownFiles].filter((filePath) => {
        if (!filePath.startsWith(module.filePrefix) || !filePath.endsWith(".go") || filePath.endsWith("_test.go")) return false;
        const relative = filePath.slice(module.filePrefix.length);
        const candidateDirectory = relative.includes("/") ? relative.slice(0, relative.lastIndexOf("/")) : "";
        return candidateDirectory === directory;
      }).sort();
      const declarations = new Map<string, string | null>();
      let declaredPackage: string | null | undefined;
      for (const filePath of files) {
        const facts = await parseFile(filePath);
        if (facts === undefined) continue;
        if (facts.packageName !== null) {
          declaredPackage = declaredPackage === undefined || declaredPackage === facts.packageName
            ? facts.packageName
            : null;
        }
        for (const name of facts.declarations) {
          declarations.set(name, declarations.has(name) ? null : filePath);
        }
      }
      return { packageName: declaredPackage ?? null, files, declarations };
    })();
    packages.set(cacheKey, pending);
    return pending;
  };

  return async (importingFilePath) => {
    const manifestPath = nearestGoMod(importingFilePath, knownFiles);
    if (manifestPath === null) return undefined;
    const module = await moduleFor(manifestPath);
    if (module === undefined) return undefined;
    const importingFile = await parseFile(importingFilePath);
    if (importingFile === undefined) return undefined;
    const directories = new Set<string>();
    for (const importPath of importingFile.imports) {
      if (importPath === module.modulePath) directories.add("");
      else if (importPath.startsWith(`${module.modulePath}/`)) directories.add(importPath.slice(module.modulePath.length + 1));
    }
    const packageNames = new Map<string, string | null>();
    const packageFiles = new Map<string, readonly string[]>();
    const declarations = new Map<string, ReadonlyMap<string, string | null>>();
    for (const directory of directories) {
      const target = await packageFor(module, directory);
      packageNames.set(directory, target.packageName);
      packageFiles.set(directory, target.files);
      declarations.set(directory, target.declarations);
    }
    return {
      modulePath: module.modulePath,
      moduleDirectory: module.moduleDirectory,
      packageNames,
      packageFiles,
      declarations,
    };
  };
}

/** Build exact first-party package ownership and unique exported declarations. */
export async function buildGoReferenceContext(
  importingFilePath: string,
  knownFiles: ReadonlySet<string>,
  readFile: RefFileReader,
): Promise<GoReferenceContext | undefined> {
  return createGoReferenceContextResolver(knownFiles, readFile)(importingFilePath);
}

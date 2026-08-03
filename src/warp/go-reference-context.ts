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
    if (match?.[1] !== undefined) return match[1];
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

/** Build exact first-party package ownership and unique exported declarations. */
export async function buildGoReferenceContext(
  importingFilePath: string,
  knownFiles: ReadonlySet<string>,
  readFile: RefFileReader,
): Promise<GoReferenceContext | undefined> {
  const manifestPath = nearestGoMod(importingFilePath, knownFiles);
  if (manifestPath === null) return undefined;
  const manifest = await readFile(manifestPath);
  if (manifest === null) return undefined;
  const modulePath = moduleCoordinate(manifest);
  if (modulePath === null) return undefined;
  const moduleDirectory = manifestPath === "go.mod" ? "" : manifestPath.slice(0, -"/go.mod".length);
  const prefix = moduleDirectory === "" ? "" : `${moduleDirectory}/`;
  const importingSource = await readFile(importingFilePath);
  if (importingSource === null) return undefined;
  const packageDirectories = new Set<string>();
  const importPattern = /"([^"]+)"/gu;
  let importMatch: RegExpExecArray | null;
  while ((importMatch = importPattern.exec(importingSource)) !== null) {
    const importPath = importMatch[1];
    if (importPath === undefined) continue;
    if (importPath === modulePath) packageDirectories.add("");
    else if (importPath.startsWith(`${modulePath}/`)) packageDirectories.add(importPath.slice(modulePath.length + 1));
  }
  const candidates = [...knownFiles].filter((filePath) =>
    filePath.startsWith(prefix) && filePath.endsWith(".go") && !filePath.endsWith("_test.go") &&
    packageDirectories.has((() => {
      const relative = filePath.slice(prefix.length);
      return relative.includes("/") ? relative.slice(0, relative.lastIndexOf("/")) : "";
    })()),
  ).sort();
  const mutable = new Map<string, Map<string, string | null>>();
  const packageNames = new Map<string, string | null>();
  const packageFiles = new Map<string, string[]>();
  for (const candidate of candidates) {
    const content = await readFile(candidate);
    if (content === null) continue;
    const parsed = await parseStructuredTreeAsync("go", content);
    try {
      const relative = candidate.slice(prefix.length);
      const directory = relative.includes("/") ? relative.slice(0, relative.lastIndexOf("/")) : "";
      packageFiles.set(directory, [...(packageFiles.get(directory) ?? []), candidate]);
      const declaredPackage = packageName(parsed.root);
      const priorPackage = packageNames.get(directory);
      if (declaredPackage !== null) packageNames.set(directory, priorPackage === undefined || priorPackage === declaredPackage ? declaredPackage : null);
      const declarations = mutable.get(directory) ?? new Map<string, string | null>();
      for (const name of declarationNames(parsed.root)) {
        declarations.set(name, declarations.has(name) ? null : candidate);
      }
      mutable.set(directory, declarations);
    } finally {
      parsed.delete();
    }
  }
  return { modulePath, packageNames, packageFiles, declarations: mutable };
}

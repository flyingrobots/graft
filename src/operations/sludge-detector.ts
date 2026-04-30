import type { SyntaxNode } from "web-tree-sitter";
import { detectLang } from "../parser/lang.js";
import { extractOutlineForFile } from "../parser/outline.js";
import { parseStructuredTreeForFile } from "../parser/runtime.js";
import type { OutlineEntry } from "../parser/types.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { GitClient } from "../ports/git.js";

export type SludgeSignalKind =
  | "phantom_shape"
  | "cast_density"
  | "homeless_constructor"
  | "free_function_data_behavior"
  | "god_file";

export type SludgeSeverity = "low" | "medium" | "high";

export interface SludgeSignal {
  readonly kind: SludgeSignalKind;
  readonly severity: SludgeSeverity;
  readonly message: string;
  readonly line?: number;
  readonly symbol?: string;
  readonly evidence: string;
}

export interface SludgeMetrics {
  readonly typedefCount: number;
  readonly typeCastCount: number;
  readonly classCount: number;
  readonly functionCount: number;
  readonly symbolCount: number;
  readonly homelessConstructorCount: number;
  readonly freeFunctionDataBehaviorCount: number;
}

export interface SludgeFileReport {
  readonly path: string;
  readonly score: number;
  readonly metrics: SludgeMetrics;
  readonly signals: readonly SludgeSignal[];
}

export interface SludgeReport {
  readonly scannedFiles: number;
  readonly filesWithSignals: number;
  readonly totalSignals: number;
  readonly score: number;
  readonly files: readonly SludgeFileReport[];
  readonly summary: string;
}

export interface DetectSludgeOptions {
  readonly cwd: string;
  readonly fs: FileSystem;
  readonly git: GitClient;
  readonly resolvePath: (filePath: string) => string;
  readonly path?: string;
}

interface FunctionFact {
  readonly name: string;
  readonly line: number;
  readonly firstParameterType: string | null;
  readonly returnsPlainObject: boolean;
}

const CONSTRUCTOR_PREFIXES = ["build", "create", "make", "assemble"] as const;

function walk(node: SyntaxNode, visit: (node: SyntaxNode) => void): void {
  visit(node);
  for (const child of node.namedChildren) {
    walk(child, visit);
  }
}

function countOutlineEntries(
  entries: readonly OutlineEntry[],
  predicate: (entry: OutlineEntry) => boolean,
): number {
  let count = 0;
  for (const entry of entries) {
    if (predicate(entry)) count++;
    if (entry.children !== undefined) {
      count += countOutlineEntries(entry.children, predicate);
    }
  }
  return count;
}

function collectTypeNames(entries: readonly OutlineEntry[]): Set<string> {
  const names = new Set<string>();
  for (const entry of entries) {
    if (entry.kind === "class" || entry.kind === "interface" || entry.kind === "type") {
      names.add(entry.name);
    }
    if (entry.children !== undefined) {
      for (const childName of collectTypeNames(entry.children)) {
        names.add(childName);
      }
    }
  }
  return names;
}

function startsWithConstructorPrefix(name: string): boolean {
  const lower = name.toLowerCase();
  return CONSTRUCTOR_PREFIXES.some((prefix) => lower.startsWith(prefix) && lower.length > prefix.length);
}

function isPlainObjectExpression(node: SyntaxNode | null): boolean {
  if (node === null) return false;
  if (node.type === "object") return true;
  if (node.type !== "parenthesized_expression") return false;
  return node.namedChildren.some((child) => child.type === "object");
}

function returnsPlainObject(node: SyntaxNode): boolean {
  const body = node.childForFieldName("body");
  if (isPlainObjectExpression(body)) return true;

  let found = false;
  const searchRoot = body ?? node;
  walk(searchRoot, (child) => {
    if (found || child.type !== "return_statement") return;
    found = isPlainObjectExpression(child.namedChildren[0] ?? null);
  });
  return found;
}

function normalizedTypeName(typeAnnotation: SyntaxNode | null): string | null {
  if (typeAnnotation === null) return null;
  let text = typeAnnotation.text.trim();
  if (text.startsWith(":")) {
    text = text.slice(1).trim();
  }
  let end = text.length;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === "<" || char === " " || char === "|" || char === "&" || char === "[" || char === ".") {
      end = index;
      break;
    }
  }
  const name = text.slice(0, end).trim();
  return name.length > 0 ? name : null;
}

function firstParameterType(functionNode: SyntaxNode): string | null {
  const parameters = functionNode.childForFieldName("parameters");
  const firstParameter = parameters?.namedChildren[0];
  if (firstParameter === undefined) return null;
  return normalizedTypeName(firstParameter.childForFieldName("type"));
}

function functionFact(name: string, node: SyntaxNode): FunctionFact {
  return {
    name,
    line: node.startPosition.row + 1,
    firstParameterType: firstParameterType(node),
    returnsPlainObject: returnsPlainObject(node),
  };
}

function declarationFunctionFacts(node: SyntaxNode): FunctionFact[] {
  if (node.type === "function_declaration" || node.type === "generator_function_declaration") {
    const name = node.childForFieldName("name")?.text;
    return name !== undefined ? [functionFact(name, node)] : [];
  }

  if (node.type !== "lexical_declaration") return [];

  const facts: FunctionFact[] = [];
  for (const declarator of node.namedChildren) {
    if (declarator.type !== "variable_declarator") continue;
    const name = declarator.childForFieldName("name")?.text;
    const value = declarator.childForFieldName("value");
    if (name === undefined || value === null) continue;
    if (value.type === "arrow_function" || value.type === "function") {
      facts.push(functionFact(name, value));
    }
  }
  return facts;
}

function topLevelFunctionFacts(root: SyntaxNode): FunctionFact[] {
  const facts: FunctionFact[] = [];
  for (const child of root.namedChildren) {
    if (child.type === "export_statement") {
      for (const exportedChild of child.namedChildren) {
        facts.push(...declarationFunctionFacts(exportedChild));
      }
      continue;
    }
    facts.push(...declarationFunctionFacts(child));
  }
  return facts;
}

function severityScore(severity: SludgeSeverity): number {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

function containsTypeTag(comment: string): boolean {
  return comment.includes("@type ") || comment.includes("@type{") || comment.includes("@type\t");
}

function buildSummary(report: Omit<SludgeReport, "summary">): string {
  if (report.scannedFiles === 0) {
    return "No supported source files scanned.";
  }
  if (report.totalSignals === 0) {
    return `No sludge signals found across ${String(report.scannedFiles)} files.`;
  }
  return `${String(report.totalSignals)} sludge signals across ${String(report.filesWithSignals)} of ${String(report.scannedFiles)} scanned files.`;
}

export function analyzeSludgeFile(filePath: string, source: string): SludgeFileReport | null {
  if (detectLang(filePath) === null) return null;

  const outline = extractOutlineForFile(filePath, source);
  const parsed = parseStructuredTreeForFile(filePath, source);
  if (outline === null || parsed === null) return null;

  try {
    let typedefCount = 0;
    let typeCastCount = 0;
    for (const child of parsed.root.children) {
      walk(child, (node) => {
        if (node.type !== "comment") return;
        if (node.text.includes("@typedef")) typedefCount++;
        if (containsTypeTag(node.text)) typeCastCount++;
      });
    }

    const typeNames = collectTypeNames(outline.entries);
    const classCount = countOutlineEntries(outline.entries, (entry) => entry.kind === "class");
    const functionCount = countOutlineEntries(outline.entries, (entry) => entry.kind === "function");
    const symbolCount = countOutlineEntries(outline.entries, () => true);
    const functions = topLevelFunctionFacts(parsed.root);
    const signals: SludgeSignal[] = [];

    if (typedefCount > 0 && typedefCount >= classCount) {
      const severity: SludgeSeverity = typedefCount >= 3 && classCount === 0 ? "high" : "medium";
      signals.push({
        kind: "phantom_shape",
        severity,
        message: "JSDoc typedefs outnumber class declarations.",
        evidence: `${String(typedefCount)} typedefs, ${String(classCount)} classes`,
      });
    }

    if (typeCastCount >= 3) {
      signals.push({
        kind: "cast_density",
        severity: typeCastCount >= 6 ? "high" : "medium",
        message: "Dense JSDoc type casts suggest the type system is being hand-held.",
        evidence: `${String(typeCastCount)} @type comments`,
      });
    }

    let homelessConstructorCount = 0;
    let freeFunctionDataBehaviorCount = 0;
    for (const fact of functions) {
      if (startsWithConstructorPrefix(fact.name) && fact.returnsPlainObject) {
        homelessConstructorCount++;
        signals.push({
          kind: "homeless_constructor",
          severity: "medium",
          message: "Factory-like free function returns a plain object instead of owning behavior on a type.",
          line: fact.line,
          symbol: fact.name,
          evidence: "returns object literal",
        });
      }

      if (fact.firstParameterType !== null && typeNames.has(fact.firstParameterType)) {
        freeFunctionDataBehaviorCount++;
        signals.push({
          kind: "free_function_data_behavior",
          severity: "low",
          message: "Free function takes a project type as its first parameter.",
          line: fact.line,
          symbol: fact.name,
          evidence: `first parameter type ${fact.firstParameterType}`,
        });
      }
    }

    if (symbolCount > 30) {
      signals.push({
        kind: "god_file",
        severity: symbolCount > 60 ? "high" : "medium",
        message: "Single file exposes a large number of structural symbols.",
        evidence: `${String(symbolCount)} outline entries`,
      });
    }

    const score = signals.reduce((sum, signal) => sum + severityScore(signal.severity), 0);
    return {
      path: filePath,
      score,
      metrics: {
        typedefCount,
        typeCastCount,
        classCount,
        functionCount,
        symbolCount,
        homelessConstructorCount,
        freeFunctionDataBehaviorCount,
      },
      signals,
    };
  } finally {
    parsed.delete();
  }
}

export async function detectSludge(options: DetectSludgeOptions): Promise<SludgeReport> {
  const args = ["ls-files"];
  if (options.path !== undefined) {
    args.push("--", options.path);
  }

  const result = await options.git.run({ cwd: options.cwd, args });
  const candidatePaths = result.status === 0
    ? result.stdout.split("\n").map((line) => line.trim()).filter((line) => line.length > 0)
    : [];

  const supportedPaths = candidatePaths.filter((filePath) => detectLang(filePath) !== null);
  const files: SludgeFileReport[] = [];
  for (const filePath of supportedPaths) {
    const source = await options.fs.readFile(options.resolvePath(filePath), "utf-8").catch(() => null);
    if (source === null) continue;
    const report = analyzeSludgeFile(filePath, source);
    if (report !== null && report.signals.length > 0) {
      files.push(report);
    }
  }

  files.sort((left, right) => right.score - left.score || left.path.localeCompare(right.path));
  const withoutSummary = {
    scannedFiles: supportedPaths.length,
    filesWithSignals: files.length,
    totalSignals: files.reduce((sum, file) => sum + file.signals.length, 0),
    score: files.reduce((sum, file) => sum + file.score, 0),
    files,
  };

  return {
    ...withoutSummary,
    summary: buildSummary(withoutSummary),
  };
}

import { detectLang } from "../parser/lang.js";
import { parseStructuredTreeAsync } from "../parser/runtime.js";
import type { GitClient } from "../ports/git.js";
import type { PathOps } from "../ports/paths.js";
import type { ReferenceCountResult } from "../operations/structural-review.js";
import { analyzeStaticTypeScriptReferences } from "./ast-import-resolver.js";
import { createGoReferenceContextResolver } from "./go-reference-context.js";
import {
  analyzeDirectSymbolImportReferences,
  analyzeQualifiedReferences,
  isQualifiedReferenceLanguage,
} from "./qualified-reference-resolver.js";
import type { ImportBindingDiagnostic } from "./import-diagnostic.js";

type TSNode = import("web-tree-sitter").SyntaxNode;

export interface ReferenceScanResult extends ReferenceCountResult {
  readonly warnings: readonly ImportBindingDiagnostic[];
  readonly confidence: "complete" | "partial";
}

export interface ImportReferenceImpactOptions {
  readonly cwd: string;
  readonly git: GitClient;
  readonly pathOps: PathOps;
  readonly symbolName: string;
  readonly filePath: string;
  readonly ref: string;
}

export interface ImportDiagnosticsOptions extends Pick<
  ImportReferenceImpactOptions,
  "cwd" | "git" | "pathOps" | "ref"
> {
  readonly candidateTargetFilePaths?: readonly string[] | undefined;
}

export interface CommittedReferenceAnalysis {
  readonly diagnostics: readonly ImportBindingDiagnostic[];
  countReferences(symbolName: string, filePath: string): ReferenceScanResult;
}

async function resolveCommitAtRef(
  opts: Pick<ImportReferenceImpactOptions, "cwd" | "git" | "ref">,
): Promise<string> {
  const result = await opts.git.run({
    args: ["rev-parse", "--verify", `${opts.ref}^{commit}`],
    cwd: opts.cwd,
  });
  if (result.error !== undefined || result.status !== 0) {
    throw result.error ?? new Error(
      result.stderr.trim() || `git rev-parse failed with status ${String(result.status)}`,
    );
  }
  const commitId = result.stdout.trim();
  if (commitId === "") throw new Error(`git rev-parse returned no commit for ${opts.ref}`);
  return commitId;
}

async function listFilesAtRef(
  opts: Pick<ImportReferenceImpactOptions, "cwd" | "git" | "ref">,
): Promise<readonly string[]> {
  const result = await opts.git.run({
    args: ["ls-tree", "-r", "-z", "--name-only", opts.ref],
    cwd: opts.cwd,
  });
  if (result.error !== undefined || result.status !== 0) {
    throw result.error ?? new Error(
      result.stderr.trim() || `git ls-tree failed with status ${String(result.status)}`,
    );
  }
  return result.stdout === "" ? [] : result.stdout.split("\0").filter((filePath) => filePath !== "");
}

interface RefAnalysisContext {
  readonly files: readonly string[];
  readonly knownFiles: ReadonlySet<string>;
  readFile(filePath: string): Promise<string | null>;
  goContext: ReturnType<typeof createGoReferenceContextResolver>;
}

function createRefAnalysisContext(
  opts: Pick<ImportReferenceImpactOptions, "cwd" | "git" | "ref">,
  files: readonly string[],
  candidateTargetFilePaths: readonly string[],
): RefAnalysisContext {
  const knownFiles = new Set([...files, ...candidateTargetFilePaths]);
  const committedFiles = new Set(files);
  const content = new Map<string, Promise<string | null>>();
  const readFile = (filePath: string): Promise<string | null> => {
    const existing = content.get(filePath);
    if (existing !== undefined) return existing;
    // listFilesAtRef already proved the ref and path exist. Read the blob
    // directly so a repository-wide scan does not repeat ref/object probes for
    // every source file.
    const pending = opts.git.run({ args: ["show", `${opts.ref}:${filePath}`], cwd: opts.cwd })
      .then((result) => {
        if (result.error !== undefined || result.status !== 0) {
          throw result.error ?? new Error(
            result.stderr.trim() || `git show failed with status ${String(result.status)}`,
          );
        }
        return result.stdout;
      });
    content.set(filePath, pending);
    return pending;
  };
  return {
    files,
    knownFiles,
    readFile,
    goContext: createGoReferenceContextResolver(committedFiles, readFile),
  };
}

async function analyzeFile(
  filePath: string,
  opts: Pick<ImportReferenceImpactOptions, "pathOps">,
  refContext: RefAnalysisContext,
) {
  const language = detectLang(filePath);
  if (language === null || !isQualifiedReferenceLanguage(language)) return null;
  const source = await refContext.readFile(filePath);
  if (source === null) return null;
  const go = language === "go" ? await refContext.goContext(filePath) : undefined;
  const parsed = await parseStructuredTreeAsync(language, source);
  try {
    const qualified = analyzeQualifiedReferences(language, filePath, parsed.root, {
      pathOps: opts.pathOps,
      knownFiles: refContext.knownFiles,
      ...(go !== undefined ? { go } : {}),
    });
    const staticReferences = language === "ts" || language === "tsx" || language === "js"
      ? analyzeStaticTypeScriptReferences(parsed.root, filePath, opts.pathOps, refContext.knownFiles)
      : analyzeDirectSymbolImportReferences(language, filePath, parsed.root, {
        pathOps: opts.pathOps,
        knownFiles: refContext.knownFiles,
        ...(go !== undefined ? { go } : {}),
      });
    return {
      ...qualified,
      staticReferences,
      dynamicReferences: analyzeDynamicReferenceFacts(language, parsed.root),
      hasParseErrors: parsed.root.hasError(),
    };
  } finally {
    parsed.delete();
  }
}

interface DynamicReferenceFacts {
  readonly language: "python" | "ts" | "tsx" | "js" | "rust" | "go";
  readonly targetSpecifiers: readonly string[];
  readonly memberNames: readonly string[];
  readonly hasUnknownTargetSpecifier: boolean;
  readonly hasUnknownMember: boolean;
  readonly computedNamespaceAccesses: readonly {
    readonly binding: string;
    readonly member: string | null;
    readonly startIndex: number;
  }[];
}

function syntaxStringValue(node: TSNode | undefined): string | null {
  if (node === undefined || !["string", "string_literal", "interpreted_string_literal", "raw_string_literal"].includes(node.type)) return null;
  const text = node.text;
  const quoteIndex = text.search(/['"]/u);
  if (quoteIndex < 0) return null;
  const quote = text.charAt(quoteIndex);
  const quoteLength = text.startsWith(quote.repeat(3), quoteIndex) ? 3 : 1;
  const start = quoteIndex + quoteLength;
  const end = text.length - quoteLength;
  return end < start ? null : text.slice(start, end);
}

function analyzeDynamicReferenceFacts(
  language: "python" | "ts" | "tsx" | "js" | "rust" | "go",
  root: TSNode,
): DynamicReferenceFacts {
  const targetSpecifiers = new Set<string>();
  const memberNames = new Set<string>();
  const computedNamespaceAccesses: {
    binding: string;
    member: string | null;
    startIndex: number;
  }[] = [];
  let hasUnknownTargetSpecifier = false;
  let hasUnknownMember = false;
  const visit = (node: TSNode): void => {
    const member = language === "python" && node.type === "attribute"
      ? node.childForFieldName("attribute")
      : (language === "ts" || language === "tsx" || language === "js") && node.type === "member_expression"
        ? node.childForFieldName("property")
        : undefined;
    if (member !== null && member !== undefined) memberNames.add(member.text);

    if (language === "python" && node.type === "call") {
      const fn = node.childForFieldName("function");
      const args = node.childForFieldName("arguments")?.namedChildren ?? [];
      const isImportlibCall = fn?.type === "attribute" &&
          fn.childForFieldName("object")?.text === "importlib" &&
          fn.childForFieldName("attribute")?.text === "import_module";
      const isBuiltinImportCall = fn?.type === "identifier" && fn.text === "__import__";
      if (isImportlibCall || isBuiltinImportCall) {
        const importedModule = syntaxStringValue(args[0]);
        if (importedModule === null) hasUnknownTargetSpecifier = true;
        else targetSpecifiers.add(importedModule);
      }
      if (fn?.type === "identifier" && fn.text === "getattr") {
        const name = syntaxStringValue(args[1]);
        if (name === null) hasUnknownMember = true;
        else memberNames.add(name);
        const binding = args[0];
        if (binding?.type === "identifier") {
          computedNamespaceAccesses.push({
            binding: binding.text,
            member: name,
            startIndex: node.startIndex,
          });
        }
      }
    }

    if ((language === "ts" || language === "tsx" || language === "js") && node.type === "call_expression") {
      const fn = node.childForFieldName("function");
      if (fn?.type === "import") {
        const value = syntaxStringValue(node.childForFieldName("arguments")?.namedChildren[0]);
        if (value === null) hasUnknownTargetSpecifier = true;
        else targetSpecifiers.add(value);
      }
    }
    if ((language === "ts" || language === "tsx" || language === "js") && node.type === "subscript_expression") {
      const binding = node.childForFieldName("object");
      if (binding?.type === "identifier") {
        computedNamespaceAccesses.push({
          binding: binding.text,
          member: syntaxStringValue(node.childForFieldName("index") ?? undefined),
          startIndex: node.startIndex,
        });
      }
    }
    for (const child of node.namedChildren) visit(child);
  };
  visit(root);
  return {
    language,
    targetSpecifiers: [...targetSpecifiers],
    memberNames: [...memberNames],
    hasUnknownTargetSpecifier,
    hasUnknownMember,
    computedNamespaceAccesses,
  };
}

function normalizedDynamicTargetPath(
  facts: DynamicReferenceFacts,
  specifier: string,
  referencingDirectory: string,
  pathOps: PathOps,
): string {
  const withoutExtension = specifier.replace(/\.(?:pyi?|tsx?|jsx?|mjs|cjs|rs|go)$/u, "");
  if (facts.language === "python") {
    const relative = /^(\.+)(.*)$/u.exec(withoutExtension);
    if (relative !== null) {
      const dots = relative[1] ?? "";
      let base = referencingDirectory;
      for (let level = 1; level < dots.length; level++) base = parentDirectory(base);
      const suffix = (relative[2] ?? "").replaceAll(".", "/");
      return suffix === "" ? base : pathOps.normalize(pathOps.join(base, suffix));
    }
    return withoutExtension.replaceAll(".", "/");
  }
  return withoutExtension.startsWith(".")
    ? pathOps.normalize(pathOps.join(referencingDirectory, withoutExtension))
    : withoutExtension;
}

function hasUnsupportedDynamicReference(
  facts: DynamicReferenceFacts,
  referencingFilePath: string,
  symbolName: string,
  targetFilePath: string,
  pathOps: PathOps,
  bindings: readonly {
    readonly name: string;
    readonly targetFilePath: string | null;
    readonly scopeStartIndex?: number | undefined;
    readonly scopeEndIndex?: number | undefined;
  }[],
): boolean {
  if (facts.computedNamespaceAccesses.some((access) =>
    (access.member === null || access.member === symbolName) &&
    bindings.some((binding) =>
      binding.name === access.binding &&
      binding.targetFilePath === targetFilePath &&
      access.startIndex >= (binding.scopeStartIndex ?? 0) &&
      access.startIndex < (binding.scopeEndIndex ?? Number.POSITIVE_INFINITY)
    )
  )) return true;
  if (!facts.memberNames.includes(symbolName) && !facts.hasUnknownMember) return false;
  if (facts.hasUnknownTargetSpecifier) return true;
  const targetModulePath = targetFilePath
    .replace(/\.(?:pyi?|tsx?|jsx?|mjs|cjs|rs|go)$/u, "")
    .replace(/\/__init__$/u, "");
  const referencingDirectory = referencingFilePath.includes("/")
    ? referencingFilePath.slice(0, referencingFilePath.lastIndexOf("/"))
    : "";
  return facts.targetSpecifiers.some((specifier) => {
    const candidate = normalizedDynamicTargetPath(facts, specifier, referencingDirectory, pathOps);
    return candidate === targetModulePath;
  });
}

function parentDirectory(filePath: string): string {
  return filePath.includes("/") ? filePath.slice(0, filePath.lastIndexOf("/")) : "";
}

function compareCodePoint(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export async function analyzeCommittedReferencesAtRef(
  opts: ImportDiagnosticsOptions,
): Promise<CommittedReferenceAnalysis> {
  const commitId = await resolveCommitAtRef(opts);
  const pinnedOpts = { ...opts, ref: commitId };
  const files = await listFilesAtRef(pinnedOpts);
  const refContext = createRefAnalysisContext(pinnedOpts, files, opts.candidateTargetFilePaths ?? []);
  const analyzed: {
    readonly filePath: string;
    readonly analysis: NonNullable<Awaited<ReturnType<typeof analyzeFile>>>;
  }[] = [];
  const diagnostics: ImportBindingDiagnostic[] = [];
  for (const candidate of files) {
    const analysis = await analyzeFile(candidate, opts, refContext);
    if (analysis === null) continue;
    analyzed.push({ filePath: candidate, analysis });
    diagnostics.push(...analysis.diagnostics);
  }
  diagnostics.sort((left, right) =>
    compareCodePoint(left.filePath, right.filePath) ||
    left.range.startLine - right.range.startLine ||
    left.range.startColumn - right.range.startColumn,
  );
  const hasParseErrors = analyzed.some((candidate) => candidate.analysis.hasParseErrors);
  return {
    diagnostics,
    countReferences(symbolName, filePath) {
      const referencingFiles = new Set<string>();
      const warnings = new Map<string, ImportBindingDiagnostic>();
      let unsupportedDynamicSemantics = false;
      let unresolvedQualifiedSemantics = false;
      for (const candidate of analyzed) {
        if (candidate.filePath === filePath) continue;
        for (const access of candidate.analysis.accesses) {
          if (access.targetFilePath !== filePath || access.member !== symbolName) continue;
          if (access.shadow === null) referencingFiles.add(candidate.filePath);
          else {
            const warning = access.shadow;
            const key = [
              warning.filePath,
              warning.binding,
              warning.targetFilePath,
              warning.shadowKind,
              warning.range.startLine,
              warning.range.startColumn,
            ].join(":");
            warnings.set(key, warning);
          }
        }
        for (const reference of candidate.analysis.staticReferences) {
          if (reference.targetFilePath === filePath && reference.importedName === symbolName) {
            referencingFiles.add(candidate.filePath);
          }
        }
        for (const access of candidate.analysis.unresolvedAccesses) {
          const targetsChangedFile = access.targetFilePath === undefined
            ? access.targetDirectoryPath === parentDirectory(filePath)
            : access.targetFilePath === filePath;
          if (!targetsChangedFile || access.member !== symbolName) continue;
          unresolvedQualifiedSemantics = true;
          if (access.shadow !== null) {
            const warning = { ...access.shadow, targetFilePath: filePath };
            const key = [
              warning.filePath,
              warning.binding,
              warning.targetFilePath,
              warning.shadowKind,
              warning.range.startLine,
              warning.range.startColumn,
            ].join(":");
            warnings.set(key, warning);
          }
        }
        if (hasUnsupportedDynamicReference(
          candidate.analysis.dynamicReferences,
          candidate.filePath,
          symbolName,
          filePath,
          opts.pathOps,
          candidate.analysis.bindings,
        )) {
          unsupportedDynamicSemantics = true;
        }
      }
      return {
        referenceCount: referencingFiles.size,
        referencingFiles: [...referencingFiles].sort(),
        warnings: [...warnings.values()],
        confidence: warnings.size === 0 && !unsupportedDynamicSemantics && !unresolvedQualifiedSemantics && !hasParseErrors
          ? "complete"
          : "partial",
      };
    },
  };
}

export async function scanQualifiedReferencesAtRef(
  opts: ImportReferenceImpactOptions,
): Promise<ReferenceScanResult> {
  const analysis = await analyzeCommittedReferencesAtRef({
    ...opts,
    candidateTargetFilePaths: [opts.filePath],
  });
  return analysis.countReferences(opts.symbolName, opts.filePath);
}

export async function importDiagnosticsAtRef(
  opts: ImportDiagnosticsOptions,
): Promise<{
  readonly ref: string;
  readonly diagnostics: readonly ImportBindingDiagnostic[];
  readonly summary: string;
}> {
  const analysis = await analyzeCommittedReferencesAtRef(opts);
  const diagnostics = analysis.diagnostics;
  return {
    ref: opts.ref,
    diagnostics,
    summary: `${String(diagnostics.length)} import binding shadow warning${diagnostics.length === 1 ? "" : "s"}`,
  };
}

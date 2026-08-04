import { detectLang } from "../parser/lang.js";
import { parseStructuredTreeAsync } from "../parser/runtime.js";
import type { GitClient } from "../ports/git.js";
import type { PathOps } from "../ports/paths.js";
import type { ReferenceCountResult } from "../operations/structural-review.js";
import { analyzeStaticTypeScriptReferences } from "./ast-import-resolver.js";
import { buildGoReferenceContext } from "./go-reference-context.js";
import {
  analyzeQualifiedReferences,
  isQualifiedReferenceLanguage,
} from "./qualified-reference-resolver.js";
import type { ImportBindingDiagnostic } from "./import-diagnostic.js";

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

export type ImportDiagnosticsOptions = Pick<
  ImportReferenceImpactOptions,
  "cwd" | "git" | "pathOps" | "ref"
>;

async function listFilesAtRef(
  opts: Pick<ImportReferenceImpactOptions, "cwd" | "git" | "ref">,
): Promise<readonly string[]> {
  const result = await opts.git.run({
    args: ["ls-tree", "-r", "--name-only", opts.ref],
    cwd: opts.cwd,
  });
  if (result.error !== undefined || result.status !== 0) {
    throw result.error ?? new Error(
      result.stderr.trim() || `git ls-tree failed with status ${String(result.status)}`,
    );
  }
  const output = result.stdout.trim();
  return output === "" ? [] : output.split("\n");
}

interface RefAnalysisContext {
  readonly files: readonly string[];
  readonly knownFiles: ReadonlySet<string>;
  readFile(filePath: string): Promise<string | null>;
  goContext(importingFilePath: string): ReturnType<typeof buildGoReferenceContext>;
}

function createRefAnalysisContext(
  opts: Pick<ImportReferenceImpactOptions, "cwd" | "git" | "ref">,
  files: readonly string[],
): RefAnalysisContext {
  const knownFiles = new Set(files);
  const content = new Map<string, Promise<string | null>>();
  const goContexts = new Map<string, ReturnType<typeof buildGoReferenceContext>>();
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
    goContext(importingFilePath) {
      const manifest = [...knownFiles]
        .filter((candidate) => candidate === "go.mod" || candidate.endsWith("/go.mod"))
        .filter((candidate) => {
          const directory = candidate === "go.mod" ? "" : candidate.slice(0, -"/go.mod".length);
          return directory === "" || importingFilePath.startsWith(`${directory}/`);
        })
        .sort((left, right) => right.length - left.length)[0] ?? "";
      const cacheKey = `${manifest}\0${importingFilePath}`;
      const existing = goContexts.get(cacheKey);
      if (existing !== undefined) return existing;
      const pending = buildGoReferenceContext(importingFilePath, knownFiles, readFile);
      goContexts.set(cacheKey, pending);
      return pending;
    },
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
      : [];
    return { ...qualified, staticReferences };
  } finally {
    parsed.delete();
  }
}

function hasUnsupportedDynamicReference(
  source: string,
  symbolName: string,
  targetFilePath: string,
): boolean {
  if (!source.includes(symbolName)) return false;
  const withoutExtension = targetFilePath.replace(/\.(?:pyi?|tsx?|jsx?|mjs|cjs|rs|go)$/u, "");
  const basename = withoutExtension.split("/").at(-1);
  const mentionsTarget = source.includes(withoutExtension) ||
    source.includes(withoutExtension.replaceAll("/", ".")) ||
    (basename !== undefined && source.includes(basename));
  if (!mentionsTarget) return false;
  return /\b(?:importlib|__import__|getattr|reflect)\b|\bimport\s*\(/u.test(source);
}

export async function scanQualifiedReferencesAtRef(
  opts: ImportReferenceImpactOptions,
): Promise<ReferenceScanResult> {
  const files = await listFilesAtRef(opts);
  const refContext = createRefAnalysisContext(opts, files);
  const referencingFiles = new Set<string>();
  const warnings = new Map<string, ImportBindingDiagnostic>();
  let unsupportedDynamicSemantics = false;
  for (const candidate of files) {
    if (candidate === opts.filePath) continue;
    const analysis = await analyzeFile(candidate, opts, refContext);
    if (analysis === null) continue;
    for (const access of analysis.accesses) {
      if (access.targetFilePath !== opts.filePath || access.member !== opts.symbolName) continue;
      if (access.shadow === null) referencingFiles.add(candidate);
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
    for (const reference of analysis.staticReferences) {
      if (reference.targetFilePath === opts.filePath && reference.importedName === opts.symbolName) {
        referencingFiles.add(candidate);
      }
    }
    const source = await refContext.readFile(candidate);
    if (source !== null && hasUnsupportedDynamicReference(source, opts.symbolName, opts.filePath)) {
      unsupportedDynamicSemantics = true;
    }
  }
  return {
    referenceCount: referencingFiles.size,
    referencingFiles: [...referencingFiles].sort(),
    warnings: [...warnings.values()],
    confidence: warnings.size === 0 && !unsupportedDynamicSemantics ? "complete" : "partial",
  };
}

export async function importDiagnosticsAtRef(
  opts: ImportDiagnosticsOptions,
): Promise<{
  readonly ref: string;
  readonly diagnostics: readonly ImportBindingDiagnostic[];
  readonly summary: string;
}> {
  const files = await listFilesAtRef(opts);
  const refContext = createRefAnalysisContext(opts, files);
  const diagnostics: ImportBindingDiagnostic[] = [];
  for (const filePath of files) {
    const analysis = await analyzeFile(filePath, opts, refContext);
    if (analysis !== null) diagnostics.push(...analysis.diagnostics);
  }
  diagnostics.sort((left, right) =>
    left.filePath.localeCompare(right.filePath) ||
    left.range.startLine - right.range.startLine ||
    left.range.startColumn - right.range.startColumn,
  );
  return {
    ref: opts.ref,
    diagnostics,
    summary: `${String(diagnostics.length)} import binding shadow warning${diagnostics.length === 1 ? "" : "s"}`,
  };
}

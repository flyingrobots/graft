import { getFileAtRef } from "../git/diff.js";
import { detectLang } from "../parser/lang.js";
import type { GitClient } from "../ports/git.js";
import type { PathOps } from "../ports/paths.js";
import type { ReferenceCountResult } from "./structural-review.js";

const NAMED_IMPORT_OR_REEXPORT =
  /\b(?:import|export)\s+(?:type\s+)?\{([\s\S]*?)\}\s+from\s+["']([^"']+)["']/g;

export interface ImportReferenceImpactOptions {
  readonly cwd: string;
  readonly git: GitClient;
  readonly pathOps: PathOps;
  readonly symbolName: string;
  readonly filePath: string;
  readonly ref: string;
}

async function listFilesAtRef(opts: Pick<ImportReferenceImpactOptions, "cwd" | "git" | "ref">): Promise<readonly string[]> {
  const result = await opts.git.run({
    args: ["ls-tree", "-r", "--name-only", opts.ref],
    cwd: opts.cwd,
  });
  if (result.error !== undefined || result.status !== 0) {
    throw result.error ?? new Error(result.stderr.trim() || `git ls-tree failed with status ${String(result.status)}`);
  }
  const output = result.stdout.trim();
  return output.length === 0 ? [] : output.split("\n");
}

function compiledSpecifierSourceCandidates(resolvedImportSource: string): readonly string[] {
  const compiledToSourceExtensions: readonly [string, readonly string[]][] = [
    [".js", [".ts", ".tsx"]],
    [".jsx", [".tsx", ".ts"]],
    [".mjs", [".mts", ".ts"]],
    [".cjs", [".cts", ".ts"]],
  ];

  for (const [compiledExtension, sourceExtensions] of compiledToSourceExtensions) {
    if (!resolvedImportSource.endsWith(compiledExtension)) continue;

    const base = resolvedImportSource.slice(0, -compiledExtension.length);
    return sourceExtensions.map((sourceExtension) => `${base}${sourceExtension}`);
  }

  return [];
}

function resolveModulePath(
  importSource: string,
  importingFilePath: string,
  knownFiles: ReadonlySet<string>,
  pathOps: PathOps,
): string | null {
  if (!importSource.startsWith(".") && !importSource.startsWith("/")) {
    return null;
  }

  const dir = importingFilePath.includes("/")
    ? importingFilePath.slice(0, importingFilePath.lastIndexOf("/"))
    : "";
  const raw = dir.length > 0
    ? pathOps.join(dir, importSource)
    : pathOps.normalize(importSource);
  const sourceExtensionCandidates = compiledSpecifierSourceCandidates(raw);
  const candidates = [
    raw,
    ...sourceExtensionCandidates,
    `${raw}.ts`,
    `${raw}.tsx`,
    `${raw}.js`,
    `${raw}.jsx`,
    `${raw}/index.ts`,
    `${raw}/index.tsx`,
    `${raw}/index.js`,
  ];

  return candidates.find((candidate) => knownFiles.has(candidate)) ?? null;
}

function importsSymbol(namedImports: string, symbolName: string): boolean {
  return namedImports
    .split(",")
    .map((part) => part.trim().replace(/^type\s+/, ""))
    .some((part) => {
      const importedName = part.split(/\s+as\s+/u)[0]?.trim();
      return importedName === symbolName;
    });
}

function fileImportsSymbolFromTarget(
  content: string,
  importingFilePath: string,
  symbolName: string,
  targetFilePath: string,
  knownFiles: ReadonlySet<string>,
  pathOps: PathOps,
): boolean {
  NAMED_IMPORT_OR_REEXPORT.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NAMED_IMPORT_OR_REEXPORT.exec(content)) !== null) {
    const namedImports = match[1];
    const importSource = match[2];
    if (namedImports === undefined || importSource === undefined) continue;
    if (!importsSymbol(namedImports, symbolName)) continue;
    if (resolveModulePath(importSource, importingFilePath, knownFiles, pathOps) === targetFilePath) {
      return true;
    }
  }
  return false;
}

export async function countNamedImportReferencesAtRef(
  opts: ImportReferenceImpactOptions,
): Promise<ReferenceCountResult> {
  const files = await listFilesAtRef(opts);
  const knownFiles = new Set(files);
  const referencingFiles: string[] = [];

  for (const candidate of files) {
    if (candidate === opts.filePath || detectLang(candidate) === null) continue;
    const content = await getFileAtRef(opts.ref, candidate, {
      cwd: opts.cwd,
      git: opts.git,
    });
    if (content === null) continue;
    if (fileImportsSymbolFromTarget(
      content,
      candidate,
      opts.symbolName,
      opts.filePath,
      knownFiles,
      opts.pathOps,
    )) {
      referencingFiles.push(candidate);
    }
  }

  return {
    referenceCount: referencingFiles.length,
    referencingFiles,
  };
}

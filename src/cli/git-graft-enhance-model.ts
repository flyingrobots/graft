export type GitGraftEnhanceSemverImpact = "major" | "minor" | "patch" | "none";
export type GitGraftEnhanceSymbolChangeKind = "added" | "removed" | "changed";
export type GitGraftEnhanceProvenanceHintStatus = "available" | "unavailable";

export interface GitGraftEnhanceDiffBucket {
  readonly length: number;
}

export interface GitGraftEnhanceSymbolDiffEntry {
  readonly name?: string | undefined;
  readonly symbol?: string | undefined;
  readonly kind?: string | undefined;
  readonly signature?: string | undefined;
  readonly exported?: boolean | undefined;
}

export interface GitGraftEnhanceFileDiff {
  readonly path: string;
  readonly status: string;
  readonly summary: string;
  readonly diff: {
    readonly added: readonly GitGraftEnhanceSymbolDiffEntry[];
    readonly removed: readonly GitGraftEnhanceSymbolDiffEntry[];
    readonly changed: readonly GitGraftEnhanceSymbolDiffEntry[];
    readonly unchangedCount?: number | undefined;
  };
}

export interface GitGraftEnhanceStructuralInput {
  readonly base: string;
  readonly head: string;
  readonly summary: string;
  readonly layer: string;
  readonly files: readonly GitGraftEnhanceFileDiff[];
  readonly refused?: readonly unknown[] | undefined;
}

export interface GitGraftEnhanceExportsInput {
  readonly base: string;
  readonly head: string;
  readonly added: readonly unknown[];
  readonly removed: readonly unknown[];
  readonly changed: readonly unknown[];
  readonly semverImpact: GitGraftEnhanceSemverImpact;
  readonly summary: string;
}

export interface BuildGitGraftEnhanceModelInput {
  readonly since: string;
  readonly head: string;
  readonly structural: GitGraftEnhanceStructuralInput;
  readonly exports: GitGraftEnhanceExportsInput;
  readonly provenanceHints?: readonly GitGraftEnhanceProvenanceHint[] | undefined;
}

export interface GitGraftEnhanceTopFile {
  readonly path: string;
  readonly status: string;
  readonly changeCount: number;
  readonly summary: string;
}

export interface GitGraftEnhanceModel {
  readonly range: {
    readonly since: string;
    readonly head: string;
  };
  readonly structural: {
    readonly changedFiles: number;
    readonly addedSymbols: number;
    readonly removedSymbols: number;
    readonly changedSymbols: number;
    readonly topFilesByChangeCount: readonly GitGraftEnhanceTopFile[];
  };
  readonly exports: {
    readonly changed: boolean;
    readonly semverImpact: GitGraftEnhanceSemverImpact;
    readonly addedExports: number;
    readonly removedExports: number;
    readonly changedExports: number;
  };
  readonly warnings: readonly string[];
  readonly provenanceHints: readonly GitGraftEnhanceProvenanceHint[];
}

export interface GitGraftEnhanceProvenanceCandidate {
  readonly symbol: string;
  readonly filePath: string;
  readonly changeKind: GitGraftEnhanceSymbolChangeKind;
  readonly ambiguous: boolean;
}

export interface GitGraftEnhanceProvenanceHint {
  readonly symbol: string;
  readonly filePath: string;
  readonly changeKind: GitGraftEnhanceSymbolChangeKind;
  readonly ambiguous: boolean;
  readonly status: GitGraftEnhanceProvenanceHintStatus;
  readonly createdInCommit?: string | null | undefined;
  readonly lastSignatureChange?: string | null | undefined;
  readonly referenceCount?: number | undefined;
  readonly changeCount?: number | undefined;
  readonly reason?: string | undefined;
}

function fileChangeCount(file: GitGraftEnhanceFileDiff): number {
  return file.diff.added.length + file.diff.removed.length + file.diff.changed.length;
}

function topFiles(files: readonly GitGraftEnhanceFileDiff[]): readonly GitGraftEnhanceTopFile[] {
  return [...files]
    .map((file) => ({
      path: file.path,
      status: file.status,
      changeCount: fileChangeCount(file),
      summary: file.summary,
    }))
    .sort((a, b) => b.changeCount - a.changeCount || a.path.localeCompare(b.path))
    .slice(0, 5);
}

function symbolName(entry: GitGraftEnhanceSymbolDiffEntry): string | null {
  const raw = entry.name ?? entry.symbol;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
}

function symbolCandidatesForFile(
  file: GitGraftEnhanceFileDiff,
  changeKind: GitGraftEnhanceSymbolChangeKind,
  entries: readonly GitGraftEnhanceSymbolDiffEntry[],
): GitGraftEnhanceProvenanceCandidate[] {
  return entries.flatMap((entry) => {
    const symbol = symbolName(entry);
    if (symbol === null) return [];
    return [{
      symbol,
      filePath: file.path,
      changeKind,
      ambiguous: false,
    }];
  });
}

export function collectGitGraftEnhanceProvenanceCandidates(
  structural: GitGraftEnhanceStructuralInput,
  limit = 5,
): readonly GitGraftEnhanceProvenanceCandidate[] {
  const candidates = structural.files.flatMap((file) => [
    ...symbolCandidatesForFile(file, "removed", file.diff.removed),
    ...symbolCandidatesForFile(file, "changed", file.diff.changed),
    ...symbolCandidatesForFile(file, "added", file.diff.added),
  ]);
  const symbolCounts = new Map<string, number>();
  for (const candidate of candidates) {
    symbolCounts.set(candidate.symbol, (symbolCounts.get(candidate.symbol) ?? 0) + 1);
  }

  return candidates
    .map((candidate) => ({
      ...candidate,
      ambiguous: (symbolCounts.get(candidate.symbol) ?? 0) > 1,
    }))
    .sort((a, b) =>
      a.filePath.localeCompare(b.filePath) ||
      a.symbol.localeCompare(b.symbol) ||
      a.changeKind.localeCompare(b.changeKind)
    )
    .slice(0, limit);
}

function buildWarnings(input: BuildGitGraftEnhanceModelInput): readonly string[] {
  const warnings: string[] = [];
  if (input.structural.files.length === 0) {
    warnings.push("No structural changes found for this range.");
  }
  const refusedCount = input.structural.refused?.length ?? 0;
  if (refusedCount > 0) {
    warnings.push(`${String(refusedCount)} structural files were refused by policy.`);
  }
  return warnings;
}

export function buildGitGraftEnhanceModel(input: BuildGitGraftEnhanceModelInput): GitGraftEnhanceModel {
  const addedSymbols = input.structural.files.reduce((total, file) => total + file.diff.added.length, 0);
  const removedSymbols = input.structural.files.reduce((total, file) => total + file.diff.removed.length, 0);
  const changedSymbols = input.structural.files.reduce((total, file) => total + file.diff.changed.length, 0);
  const addedExports = input.exports.added.length;
  const removedExports = input.exports.removed.length;
  const changedExports = input.exports.changed.length;

  return {
    range: {
      since: input.since,
      head: input.head,
    },
    structural: {
      changedFiles: input.structural.files.length,
      addedSymbols,
      removedSymbols,
      changedSymbols,
      topFilesByChangeCount: topFiles(input.structural.files),
    },
    exports: {
      changed: addedExports + removedExports + changedExports > 0,
      semverImpact: input.exports.semverImpact,
      addedExports,
      removedExports,
      changedExports,
    },
    warnings: buildWarnings(input),
    provenanceHints: input.provenanceHints ?? [],
  };
}

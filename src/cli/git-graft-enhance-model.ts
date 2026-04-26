export type GitGraftEnhanceSemverImpact = "major" | "minor" | "patch" | "none";

export interface GitGraftEnhanceDiffBucket {
  readonly length: number;
}

export interface GitGraftEnhanceFileDiff {
  readonly path: string;
  readonly status: string;
  readonly summary: string;
  readonly diff: {
    readonly added: GitGraftEnhanceDiffBucket;
    readonly removed: GitGraftEnhanceDiffBucket;
    readonly changed: GitGraftEnhanceDiffBucket;
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
  };
}

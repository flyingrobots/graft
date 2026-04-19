// ---------------------------------------------------------------------------
// Structural Blame — symbol-level blame: who last changed a symbol's
// signature, when it was created, and its full change history.
// ---------------------------------------------------------------------------

import { toJsonObject } from "./result-dto.js";
import type { JsonObject } from "../contracts/json-object.js";

// ---- Public types ---------------------------------------------------------

export interface CommitInfo {
  readonly sha: string;
  readonly author: string;
  readonly date: string;
  readonly message: string;
}

export interface LastSignatureChange extends CommitInfo {
  readonly previousSignature?: string | undefined;
}

export interface BlameHistoryEntry {
  readonly sha: string;
  readonly changeKind: string;
  readonly date: string;
  readonly author: string;
  readonly signature?: string | undefined;
}

export interface StructuralBlameResult {
  readonly symbol: string;
  readonly filePath?: string | undefined;
  readonly currentSignature?: string | undefined;
  readonly kind: string;
  readonly exported: boolean;
  readonly created?: CommitInfo | undefined;
  readonly lastSignatureChange?: LastSignatureChange | undefined;
  readonly changeCount: number;
  readonly referenceCount: number;
  readonly referencingFiles: readonly string[];
  readonly history: readonly BlameHistoryEntry[];
}

// ---- Input types ----------------------------------------------------------

/** A single commit entry from the WARP symbol history. */
export interface SymbolCommitInput {
  readonly sha: string;
  readonly changeKind: string;
  readonly signature?: string | undefined;
}

/** Git metadata for a commit. */
export interface CommitMetaInput {
  readonly author: string;
  readonly date: string;
  readonly message: string;
}

/** Symbol metadata from the most recent commit's WARP observation. */
export interface SymbolMetaInput {
  readonly kind: string;
  readonly exported: boolean;
}

export interface StructuralBlameInput {
  readonly symbolName: string;
  readonly filePath?: string | undefined;
  /** The symbol's commit history from WARP. */
  readonly commits: readonly SymbolCommitInput[];
  /** Git metadata keyed by commit SHA. */
  readonly commitMeta: ReadonlyMap<string, CommitMetaInput>;
  /** Symbol kind/exported from the latest WARP observation. */
  readonly symbolMeta?: SymbolMetaInput | undefined;
  /** Reference count from the reference-counting query. */
  readonly referenceCount: number;
  /** Files referencing this symbol. */
  readonly referencingFiles: readonly string[];
}

// ---- Implementation -------------------------------------------------------

export function structuralBlame(input: StructuralBlameInput): StructuralBlameResult {
  const { symbolName, filePath, commits, commitMeta, symbolMeta, referenceCount, referencingFiles } = input;

  if (commits.length === 0) {
    return {
      symbol: symbolName,
      filePath,
      kind: symbolMeta?.kind ?? "unknown",
      exported: symbolMeta?.exported ?? false,
      changeCount: 0,
      referenceCount,
      referencingFiles,
      history: [],
    };
  }

  // Find creation commit (first "added" entry)
  const creationCommit = commits.find((c) => c.changeKind === "added");

  // Find all "changed" commits
  const changedCommits = commits.filter((c) => c.changeKind === "changed");

  // Build created info
  let created: CommitInfo | undefined;
  if (creationCommit !== undefined) {
    const meta = commitMeta.get(creationCommit.sha);
    if (meta !== undefined) {
      created = { sha: creationCommit.sha, author: meta.author, date: meta.date, message: meta.message };
    }
  }

  // Sort all commits by date (most recent first)
  const sortedDesc = [...commits].sort((a, b) => {
    const dateA = commitMeta.get(a.sha)?.date ?? "";
    const dateB = commitMeta.get(b.sha)?.date ?? "";
    return dateB.localeCompare(dateA);
  });

  // Sort all commits by date (oldest first)
  const sortedAsc = [...commits].sort((a, b) => {
    const dateA = commitMeta.get(a.sha)?.date ?? "";
    const dateB = commitMeta.get(b.sha)?.date ?? "";
    return dateA.localeCompare(dateB);
  });

  // Find last signature change — most recent by date among "changed" commits
  let lastSignatureChange: LastSignatureChange | undefined;
  if (changedCommits.length > 0) {
    const sorted = [...changedCommits].sort((a, b) => {
      const dateA = commitMeta.get(a.sha)?.date ?? "";
      const dateB = commitMeta.get(b.sha)?.date ?? "";
      return dateB.localeCompare(dateA);
    });
    const lastChanged = sorted[0];
    if (lastChanged !== undefined) {
      const meta = commitMeta.get(lastChanged.sha);
      if (meta !== undefined) {
        // Find the previous signature from the commit just before this one
        const changeIdx = sortedAsc.findIndex((c) => c.sha === lastChanged.sha);
        let previousSignature: string | undefined;
        for (let i = changeIdx - 1; i >= 0; i--) {
          const prev = sortedAsc[i];
          if (prev?.signature !== undefined) {
            previousSignature = prev.signature;
            break;
          }
        }
        lastSignatureChange = {
          sha: lastChanged.sha,
          author: meta.author,
          date: meta.date,
          message: meta.message,
          previousSignature,
        };
      }
    }
  }

  // Get current signature from the most recent commit
  const mostRecent = sortedDesc[0];
  const currentSignature = mostRecent?.signature;

  // Build history entries with metadata (most recent first)
  const historyEntries: BlameHistoryEntry[] = sortedDesc.map((c) => {
    const meta = commitMeta.get(c.sha);
    return {
      sha: c.sha,
      changeKind: c.changeKind,
      date: meta?.date ?? "",
      author: meta?.author ?? "",
      signature: c.signature,
    };
  });

  return {
    symbol: symbolName,
    filePath,
    currentSignature,
    kind: symbolMeta?.kind ?? "unknown",
    exported: symbolMeta?.exported ?? false,
    created,
    lastSignatureChange,
    changeCount: commits.length,
    referenceCount,
    referencingFiles,
    history: historyEntries,
  };
}

/**
 * Convert a StructuralBlameResult to a plain JsonObject for MCP responses.
 */
export function structuralBlameToJson(result: StructuralBlameResult): JsonObject {
  return toJsonObject(result);
}
